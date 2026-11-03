<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/page-bootstrap.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function admin_json(int $status, array $data): never
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

if (($_SESSION['user']['role'] ?? '') !== 'Admin') {
    admin_json(403, ['error' => 'Akses hanya untuk Admin.']);
}

$resource = (string) ($_GET['resource'] ?? '');
$resources = ['users', 'categories', 'products', 'reports', 'prices'];
if (!in_array($resource, $resources, true)) {
    admin_json(404, ['error' => 'Jenis data tidak ditemukan.']);
}

$method = $_SERVER['REQUEST_METHOD'];
if (!in_array($method, ['GET', 'POST', 'PUT', 'DELETE'], true)) {
    header('Allow: GET, POST, PUT, DELETE');
    admin_json(405, ['error' => 'Metode permintaan tidak diizinkan.']);
}
if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}
if ($method !== 'GET' && !hash_equals($_SESSION['csrf_token'], (string) ($_SERVER['HTTP_X_CSRF_TOKEN'] ?? ''))) {
    admin_json(403, ['error' => 'Token keamanan tidak valid. Muat ulang halaman lalu coba lagi.']);
}

$input = json_decode(file_get_contents('php://input') ?: '{}', true);
if (!is_array($input)) {
    admin_json(400, ['error' => 'Data permintaan tidak valid.']);
}
$id = filter_var($_GET['id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);

function required_string(array $input, string $key, int $maxLength, string $label): string
{
    $value = trim((string) ($input[$key] ?? ''));
    if ($value === '' || strlen($value) > $maxLength) {
        admin_json(422, ['error' => "{$label} wajib diisi (maksimal {$maxLength} karakter)."]);
    }
    return $value;
}

function optional_date(array $input, string $key, string $label): ?string
{
    $value = trim((string) ($input[$key] ?? ''));
    if ($value === '') {
        return null;
    }
    $date = DateTime::createFromFormat('!Y-m-d', $value);
    if (!$date || $date->format('Y-m-d') !== $value) {
        admin_json(422, ['error' => "{$label} tidak valid."]);
    }
    return $value;
}

try {
    $pdo = database();

    if ($method === 'GET') {
        $rows = match ($resource) {
            'users' => $pdo->query(
                'SELECT users.id, users.role_id, users.name, users.email, users.phone, users.address, users.status,
                        roles.role_name AS role, users.created_at
                 FROM users INNER JOIN roles ON roles.id = users.role_id ORDER BY users.created_at DESC'
            )->fetchAll(),
            'categories' => $pdo->query(
                'SELECT categories.id, categories.category_name,
                        COUNT(products.id) AS product_count
                 FROM categories LEFT JOIN products ON products.category_id = categories.id
                 GROUP BY categories.id ORDER BY categories.category_name'
            )->fetchAll(),
            'products' => $pdo->query(
                'SELECT products.id, products.product_name, products.description, products.price, products.stock,
                        products.unit, products.harvest_date, products.image, products.status, products.created_at,
                        users.id AS farmer_id, users.name AS farmer_name, users.address AS region,
                        categories.id AS category_id, categories.category_name
                 FROM products INNER JOIN users ON users.id = products.farmer_id
                 LEFT JOIN categories ON categories.id = products.category_id
                 WHERE products.status <> \'draf\'
                 ORDER BY products.created_at DESC'
            )->fetchAll(),
            'reports' => $pdo->query(
                'SELECT reports.id, reports.report_name, reports.report_type, reports.start_date,
                        reports.end_date, reports.file_name, reports.created_at, users.name AS admin_name
                 FROM reports INNER JOIN users ON users.id = reports.admin_id
                 ORDER BY reports.created_at DESC'
            )->fetchAll(),
            'prices' => $pdo->query(
                'SELECT id, commodity_name, market_location, price, price_unit, source_name, record_date, status
                 FROM market_prices ORDER BY record_date DESC, id DESC'
            )->fetchAll(),
        };
        $extra = [];
        if ($resource === 'users') {
            $extra['roles'] = $pdo->query('SELECT id, role_name FROM roles ORDER BY role_name')->fetchAll();
        } elseif ($resource === 'products') {
            $extra['farmers'] = $pdo->query(
                "SELECT id, name FROM users WHERE status = 'aktif' AND role_id = (SELECT id FROM roles WHERE role_name = 'petani') ORDER BY name"
            )->fetchAll();
            $extra['categories'] = $pdo->query('SELECT id, category_name FROM categories ORDER BY category_name')->fetchAll();
        }
        admin_json(200, ['rows' => $rows, 'csrfToken' => $_SESSION['csrf_token'], ...$extra]);
    }

    if ($method === 'DELETE') {
        if (!$id) {
            admin_json(400, ['error' => 'ID data tidak valid.']);
        }
        if ($resource === 'users') {
            if ($id === (int) ($_SESSION['user']['id'] ?? 0)) {
                admin_json(422, ['error' => 'Akun yang sedang digunakan tidak dapat dihapus.']);
            }
            $target = $pdo->prepare(
                'SELECT users.id, roles.role_name AS role, users.status
                 FROM users INNER JOIN roles ON roles.id = users.role_id WHERE users.id = ?'
            );
            $target->execute([$id]);
            $user = $target->fetch();
            if (!$user) {
                admin_json(404, ['error' => 'Akun tidak ditemukan.']);
            }
            if ($user['role'] === 'admin' && $user['status'] === 'aktif') {
                $activeAdmins = (int) $pdo->query(
                    "SELECT COUNT(*) FROM users INNER JOIN roles ON roles.id = users.role_id WHERE roles.role_name = 'admin' AND users.status = 'aktif'"
                )->fetchColumn();
                if ($activeAdmins <= 1) {
                    admin_json(422, ['error' => 'Admin aktif terakhir tidak dapat dihapus atau dinonaktifkan.']);
                }
            }
        }
        $table = ['users' => 'users', 'categories' => 'categories', 'products' => 'products', 'reports' => 'reports', 'prices' => 'market_prices'][$resource];
        $statement = $pdo->prepare("DELETE FROM `{$table}` WHERE id = ?");
        $statement->execute([$id]);
        if ($statement->rowCount() === 0) {
            admin_json(404, ['error' => 'Data tidak ditemukan.']);
        }
        admin_json(200, ['message' => 'Data berhasil dihapus.']);
    }

    if ($method === 'PUT' && !$id) {
        admin_json(400, ['error' => 'ID data tidak valid.']);
    }

    if ($resource === 'users') {
        $name = required_string($input, 'name', 100, 'Nama');
        $email = strtolower(required_string($input, 'email', 100, 'Email'));
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            admin_json(422, ['error' => 'Format email tidak valid.']);
        }
        $roleId = filter_var($input['role_id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        if (!$roleId || !in_array((string) ($input['status'] ?? ''), ['aktif', 'nonaktif'], true)) {
            admin_json(422, ['error' => 'Peran atau status akun tidak valid.']);
        }
        $roleQuery = $pdo->prepare('SELECT role_name FROM roles WHERE id = ?');
        $roleQuery->execute([$roleId]);
        $roleName = $roleQuery->fetchColumn();
        if ($roleName === false) {
            admin_json(422, ['error' => 'Peran akun tidak ditemukan.']);
        }
        $phone = trim((string) ($input['phone'] ?? ''));
        $address = trim((string) ($input['address'] ?? ''));
        if (strlen($phone) > 20 || strlen($address) > 1000) {
            admin_json(422, ['error' => 'Nomor telepon atau alamat terlalu panjang.']);
        }
        if ($method === 'POST') {
            $password = (string) ($input['password'] ?? '');
            if (strlen($password) < 8) {
                admin_json(422, ['error' => 'Kata sandi akun baru minimal 8 karakter.']);
            }
            $statement = $pdo->prepare(
                'INSERT INTO users (role_id, name, email, password, phone, address, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?)'
            );
            $statement->execute([$roleId, $name, $email, password_hash($password, PASSWORD_DEFAULT), $phone ?: null, $address ?: null, $input['status']]);
        } else {
            $currentRole = $pdo->prepare(
                'SELECT roles.role_name FROM users INNER JOIN roles ON roles.id = users.role_id WHERE users.id = ?'
            );
            $currentRole->execute([$id]);
            $oldRole = $currentRole->fetchColumn();
            if ($oldRole === false) {
                admin_json(404, ['error' => 'Akun tidak ditemukan.']);
            }
            if ($oldRole === 'admin' && ((int) ($_SESSION['user']['id'] ?? 0) === $id) &&
                ($roleName !== 'admin' || $input['status'] !== 'aktif')) {
                admin_json(422, ['error' => 'Akun Admin yang sedang digunakan harus tetap aktif sebagai Admin.']);
            }
            if ($oldRole === 'admin' && ($roleName !== 'admin' || $input['status'] !== 'aktif')) {
                $activeAdmins = (int) $pdo->query(
                    "SELECT COUNT(*) FROM users INNER JOIN roles ON roles.id = users.role_id WHERE roles.role_name = 'admin' AND users.status = 'aktif'"
                )->fetchColumn();
                if ($activeAdmins <= 1) {
                    admin_json(422, ['error' => 'Admin aktif terakhir tidak dapat dihapus atau dinonaktifkan.']);
                }
            }
            $statement = $pdo->prepare(
                'UPDATE users SET role_id = ?, name = ?, email = ?, phone = ?, address = ?, status = ? WHERE id = ?'
            );
            $statement->execute([$roleId, $name, $email, $phone ?: null, $address ?: null, $input['status'], $id]);
        }
    } elseif ($resource === 'categories') {
        $name = required_string($input, 'category_name', 100, 'Nama kategori');
        $duplicate = $pdo->prepare('SELECT id FROM categories WHERE category_name = ? AND (? IS NULL OR id <> ?) LIMIT 1');
        $duplicate->execute([$name, $id, $id]);
        if ($duplicate->fetchColumn() !== false) {
            admin_json(409, ['error' => 'Nama kategori tersebut sudah digunakan.']);
        }
        if ($method === 'POST') {
            $statement = $pdo->prepare('INSERT INTO categories (category_name) VALUES (?)');
            $statement->execute([$name]);
        } else {
            $statement = $pdo->prepare('UPDATE categories SET category_name = ? WHERE id = ?');
            $statement->execute([$name, $id]);
        }
    } elseif ($resource === 'products') {
        $name = required_string($input, 'product_name', 150, 'Nama produk');
        $farmerId = filter_var($input['farmer_id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        $categoryId = ($input['category_id'] ?? '') === '' ? null : filter_var($input['category_id'], FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        $price = filter_var($input['price'] ?? null, FILTER_VALIDATE_FLOAT);
        $stock = filter_var($input['stock'] ?? null, FILTER_VALIDATE_FLOAT);
        $status = (string) ($input['status'] ?? '');
        if (!$farmerId || ($categoryId === false) || $price === false || $price < 0 ||
            $stock === false || $stock < 0 || !is_finite((float) $stock) ||
            !in_array($status, ['tersedia', 'habis', 'nonaktif'], true)) {
            admin_json(422, ['error' => 'Petani, kategori, harga, stok, atau status produk tidak valid.']);
        }
        $unit = trim((string) ($input['unit'] ?? 'kg'));
        if (!in_array($unit, ['kg', 'ton', 'ikat'], true)) {
            admin_json(422, ['error' => 'Satuan produk tidak valid.']);
        }
        $harvestDate = optional_date($input, 'harvest_date', 'Tanggal panen');
        $farmerCheck = $pdo->prepare(
            "SELECT users.id FROM users INNER JOIN roles ON roles.id = users.role_id
             WHERE users.id = ? AND users.status = 'aktif' AND roles.role_name = 'petani'"
        );
        $farmerCheck->execute([$farmerId]);
        if ($farmerCheck->fetchColumn() === false) {
            admin_json(422, ['error' => 'Pilih akun petani aktif yang valid.']);
        }
        $description = trim((string) ($input['description'] ?? ''));
        if (strlen($description) > 5000) {
            admin_json(422, ['error' => 'Deskripsi maksimal 5000 karakter.']);
        }
        $image = trim((string) ($input['image'] ?? ''));
        if (strlen($image) > 255) {
            admin_json(422, ['error' => 'Alamat gambar maksimal 255 karakter.']);
        }
        if ($method === 'POST') {
            $statement = $pdo->prepare(
                'INSERT INTO products (farmer_id, category_id, product_name, description, price, stock, unit, harvest_date, image, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
            );
            $statement->execute([$farmerId, $categoryId, $name, $description ?: null, $price, $stock, $unit, $harvestDate, $image ?: null, $status]);
        } else {
            $statement = $pdo->prepare(
                'UPDATE products SET farmer_id = ?, category_id = ?, product_name = ?, description = ?, price = ?, stock = ?, unit = ?, harvest_date = ?, image = ?, status = ? WHERE id = ?'
            );
            $statement->execute([$farmerId, $categoryId, $name, $description ?: null, $price, $stock, $unit, $harvestDate, $image ?: null, $status, $id]);
        }
    } elseif ($resource === 'reports') {
        $name = required_string($input, 'report_name', 150, 'Nama laporan');
        $type = trim((string) ($input['report_type'] ?? ''));
        $file = trim((string) ($input['file_name'] ?? ''));
        if (strlen($type) > 50 || strlen($file) > 255) {
            admin_json(422, ['error' => 'Jenis laporan atau nama file terlalu panjang.']);
        }
        $startDate = optional_date($input, 'start_date', 'Tanggal awal');
        $endDate = optional_date($input, 'end_date', 'Tanggal akhir');
        if ($startDate && $endDate && $startDate > $endDate) {
            admin_json(422, ['error' => 'Tanggal awal tidak boleh melewati tanggal akhir.']);
        }
        if ($method === 'POST') {
            $statement = $pdo->prepare(
                'INSERT INTO reports (admin_id, report_name, report_type, start_date, end_date, file_name)
                 VALUES (?, ?, ?, ?, ?, ?)'
            );
            $statement->execute([(int) $_SESSION['user']['id'], $name, $type ?: null, $startDate, $endDate, $file ?: null]);
        } else {
            $statement = $pdo->prepare(
                'UPDATE reports SET report_name = ?, report_type = ?, start_date = ?, end_date = ?, file_name = ? WHERE id = ?'
            );
            $statement->execute([$name, $type ?: null, $startDate, $endDate, $file ?: null, $id]);
        }
    } else {
        $commodity = required_string($input, 'commodity_name', 150, 'Nama komoditas');
        $location = required_string($input, 'market_location', 150, 'Pasar atau lokasi');
        $source = required_string($input, 'source_name', 150, 'Sumber data');
        $unit = required_string($input, 'price_unit', 30, 'Satuan harga');
        $price = filter_var($input['price'] ?? null, FILTER_VALIDATE_FLOAT);
        $date = optional_date($input, 'record_date', 'Tanggal pencatatan');
        $status = (string) ($input['status'] ?? '');
        if ($price === false || $price < 0 || !$date || !in_array($status, ['terverifikasi', 'menunggu', 'ditolak'], true)) {
            admin_json(422, ['error' => 'Harga, tanggal pencatatan, atau status tidak valid.']);
        }
        if ($method === 'POST') {
            $statement = $pdo->prepare(
                'INSERT INTO market_prices (commodity_name, market_location, price, price_unit, source_name, record_date, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?)'
            );
            $statement->execute([$commodity, $location, $price, $unit, $source, $date, $status]);
        } else {
            $statement = $pdo->prepare(
                'UPDATE market_prices SET commodity_name = ?, market_location = ?, price = ?, price_unit = ?, source_name = ?, record_date = ?, status = ? WHERE id = ?'
            );
            $statement->execute([$commodity, $location, $price, $unit, $source, $date, $status, $id]);
        }
    }

    if ($method === 'PUT' && $statement->rowCount() === 0) {
        $check = $pdo->prepare('SELECT id FROM `' . (['users' => 'users', 'categories' => 'categories', 'products' => 'products', 'reports' => 'reports', 'prices' => 'market_prices'][$resource]) . '` WHERE id = ?');
        $check->execute([$id]);
        if ($check->fetchColumn() === false) {
            admin_json(404, ['error' => 'Data tidak ditemukan.']);
        }
    }
    admin_json(200, ['message' => $method === 'POST' ? 'Data berhasil ditambahkan.' : 'Perubahan berhasil disimpan.']);
} catch (PDOException $error) {
    error_log('Admin data operation failed: ' . $error->getMessage());
    if ($error->getCode() === '23000') {
        admin_json(409, ['error' => 'Data duplikat atau masih digunakan oleh data lain. Periksa kembali isian Anda.']);
    }
    admin_json(500, ['error' => 'Data tidak dapat disimpan. Periksa konfigurasi database.']);
} catch (Throwable $error) {
    error_log('Admin data error: ' . $error->getMessage());
    admin_json(500, ['error' => 'Terjadi kesalahan saat mengelola data.']);
}
