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

function buyer_address_json(int $status, array $data): never
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

if (($_SESSION['user']['role'] ?? '') !== 'Pembeli') {
    buyer_address_json(403, ['error' => 'Akses hanya untuk akun Pembeli.']);
}

$method = $_SERVER['REQUEST_METHOD'];
if (!in_array($method, ['GET', 'PUT'], true)) {
    header('Allow: GET, PUT');
    buyer_address_json(405, ['error' => 'Metode permintaan tidak diizinkan.']);
}

if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}
if ($method === 'PUT' &&
    !hash_equals($_SESSION['csrf_token'], (string) ($_SERVER['HTTP_X_CSRF_TOKEN'] ?? ''))) {
    buyer_address_json(403, ['error' => 'Token keamanan tidak valid. Muat ulang halaman lalu coba lagi.']);
}

try {
    $pdo = database();
    $userId = (int) ($_SESSION['user']['id'] ?? 0);

    if ($method === 'GET') {
        $query = $pdo->prepare(
            "SELECT users.address FROM users
             INNER JOIN roles ON roles.id = users.role_id
             WHERE users.id = ? AND roles.role_name = 'pembeli' AND users.status = 'aktif'"
        );
        $query->execute([$userId]);
        $address = $query->fetchColumn();
        if ($address === false) {
            buyer_address_json(404, ['error' => 'Akun Pembeli tidak ditemukan atau tidak aktif.']);
        }
        buyer_address_json(200, ['address' => $address ?? '', 'csrfToken' => $_SESSION['csrf_token']]);
    }

    $input = json_decode(file_get_contents('php://input') ?: '', true);
    if (!is_array($input) || !is_string($input['address'] ?? null)) {
        buyer_address_json(400, ['error' => 'Alamat pembeli tidak valid.']);
    }

    $address = trim($input['address']);
    $characterCount = preg_match_all('/./us', $address, $characters);
    if ($address === '' || $characterCount === false || $characterCount > 1000) {
        buyer_address_json(422, ['error' => 'Alamat pembeli wajib diisi dan maksimal 1000 karakter.']);
    }

    $update = $pdo->prepare(
        "UPDATE users SET address = ?
         WHERE id = ? AND role_id = (SELECT id FROM roles WHERE role_name = 'pembeli')"
    );
    $update->execute([$address, $userId]);
    if ($update->rowCount() === 0) {
        $exists = $pdo->prepare(
            "SELECT users.id FROM users
             INNER JOIN roles ON roles.id = users.role_id
             WHERE users.id = ? AND roles.role_name = 'pembeli'"
        );
        $exists->execute([$userId]);
        if ($exists->fetchColumn() === false) {
            buyer_address_json(404, ['error' => 'Akun Pembeli tidak ditemukan.']);
        }
    }

    buyer_address_json(200, ['message' => 'Alamat pembeli berhasil disimpan.', 'address' => $address]);
} catch (PDOException $error) {
    error_log('Buyer address database error: ' . $error->getMessage());
    buyer_address_json(503, ['error' => 'Alamat pembeli tidak dapat disimpan ke database.']);
} catch (Throwable $error) {
    error_log('Buyer address error: ' . $error->getMessage());
    buyer_address_json(500, ['error' => 'Terjadi kesalahan saat menyimpan alamat pembeli.']);
}
