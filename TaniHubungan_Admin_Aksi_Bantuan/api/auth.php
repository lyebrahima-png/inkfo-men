<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

session_set_cookie_params([
    'httponly' => true,
    'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
    'samesite' => 'Lax',
]);
session_start();

function respond(int $status, array $data): never
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

$action = $_GET['action'] ?? '';
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');
    respond(405, ['error' => 'Metode permintaan tidak diizinkan.']);
}

if ($action === 'logout') {
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $cookie = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $cookie['path'], $cookie['domain'], $cookie['secure'], $cookie['httponly']);
    }
    session_destroy();
    respond(200, ['message' => 'Anda berhasil keluar.']);
}

$input = json_decode(file_get_contents('php://input') ?: '', true);
if (!is_array($input)) {
    respond(400, ['error' => 'Data permintaan tidak valid.']);
}

try {
    $pdo = database();

    if ($action === 'register') {
        $name = trim((string) ($input['name'] ?? ''));
        $email = strtolower(trim((string) ($input['email'] ?? '')));
        $password = (string) ($input['password'] ?? '');
        $role = strtolower(trim((string) ($input['role'] ?? '')));

        preg_match_all('/./us', $name, $nameCharacters);
        if ($name === '' || count($nameCharacters[0]) > 100) {
            respond(422, ['error' => 'Nama wajib diisi dan maksimal 100 karakter.']);
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 100) {
            respond(422, ['error' => 'Alamat email tidak valid.']);
        }
        if (strlen($password) < 6) {
            respond(422, ['error' => 'Kata sandi minimal 6 karakter.']);
        }
        if (!in_array($role, ['petani', 'pembeli'], true)) {
            respond(422, ['error' => 'Peran pendaftaran tidak valid.']);
        }

        $roleQuery = $pdo->prepare('SELECT id FROM roles WHERE role_name = :role LIMIT 1');
        $roleQuery->execute(['role' => $role]);
        $roleId = $roleQuery->fetchColumn();
        if ($roleId === false) {
            respond(503, ['error' => 'Peran akun belum tersedia. Impor data roles dari file SQL terlebih dahulu.']);
        }

        $exists = $pdo->prepare('SELECT id FROM users WHERE email = :email LIMIT 1');
        $exists->execute(['email' => $email]);
        if ($exists->fetchColumn() !== false) {
            respond(409, ['error' => 'Email sudah terdaftar. Silakan masuk.']);
        }

        $insert = $pdo->prepare(
            "INSERT INTO users (role_id, name, email, password, status)
             VALUES (:role_id, :name, :email, :password, 'aktif')"
        );
        $insert->execute([
            'role_id' => $roleId,
            'name' => $name,
            'email' => $email,
            'password' => password_hash($password, PASSWORD_DEFAULT),
        ]);
        respond(201, ['message' => 'Pendaftaran berhasil. Silakan masuk.']);
    }

    if ($action === 'login') {
        $email = strtolower(trim((string) ($input['email'] ?? '')));
        $password = (string) ($input['password'] ?? '');
        $role = strtolower(trim((string) ($input['role'] ?? '')));
        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || $password === '' ||
            !in_array($role, ['admin', 'petani', 'pembeli'], true)) {
            respond(422, ['error' => 'Email, kata sandi, atau peran tidak valid.']);
        }

        $query = $pdo->prepare(
            'SELECT users.id, users.name, users.email, users.password, users.status, roles.role_name
             FROM users INNER JOIN roles ON roles.id = users.role_id
             WHERE users.email = :email LIMIT 1'
        );
        $query->execute(['email' => $email]);
        $user = $query->fetch();
        if (!$user || $user['status'] !== 'aktif' || $user['role_name'] !== $role ||
            !password_verify($password, $user['password'])) {
            respond(401, ['error' => 'Email, kata sandi, atau peran tidak sesuai.']);
        }

        session_regenerate_id(true);
        $_SESSION['user'] = [
            'id' => (int) $user['id'],
            'name' => $user['name'],
            'email' => $user['email'],
            'role' => ucfirst($user['role_name']),
        ];
        respond(200, ['message' => 'Berhasil masuk.', 'user' => $_SESSION['user']]);
    }

    respond(404, ['error' => 'Aksi autentikasi tidak dikenal.']);
} catch (PDOException $error) {
    error_log('Authentication database error: ' . $error->getMessage());
    if ($error->getCode() === '23000') {
        respond(409, ['error' => 'Email sudah terdaftar. Silakan masuk.']);
    }
    respond(503, ['error' => 'Database tidak dapat diakses. Pastikan MariaDB aktif dan database sudah diimpor.']);
} catch (Throwable $error) {
    error_log('Authentication error: ' . $error->getMessage());
    respond(500, ['error' => 'Terjadi kesalahan pada server.']);
}
