<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/page-bootstrap.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function offers_json(int $status, array $data): never
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

$role = (string) ($_SESSION['user']['role'] ?? '');
if (!in_array($role, ['Admin', 'Petani', 'Pembeli'], true)) {
    offers_json(403, ['error' => 'Silakan masuk dengan akun yang sesuai untuk melihat penawaran.']);
}

$method = $_SERVER['REQUEST_METHOD'];
if (!in_array($method, ['GET', 'POST', 'PUT'], true)) {
    header('Allow: GET, POST, PUT');
    offers_json(405, ['error' => 'Metode permintaan tidak diizinkan.']);
}

if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}
if ($method !== 'GET' &&
    ($role !== 'Petani' ||
     !hash_equals($_SESSION['csrf_token'], (string) ($_SERVER['HTTP_X_CSRF_TOKEN'] ?? '')))) {
    offers_json(403, ['error' => 'Sesi Petani atau token keamanan tidak valid. Muat ulang halaman lalu coba lagi.']);
}

try {
    $pdo = database();
    $userId = (int) ($_SESSION['user']['id'] ?? 0);

    if ($method === 'GET') {
        $where = match ($role) {
            'Petani' => 'products.farmer_id = ?',
            'Pembeli' => "products.status = 'tersedia' AND products.stock > 0 AND users.status = 'aktif'",
            default => "products.status <> 'draf'",
        };
        $statement = $pdo->prepare(
            "SELECT products.id, products.product_name,
                    COALESCE(categories.category_name,
                        CASE
                            WHEN LOWER(products.product_name) IN ('beras', 'padi') THEN 'Beras & Padi'
                            WHEN LOWER(products.product_name) IN ('cabai merah', 'cabai', 'bawang merah', 'tomat', 'kentang') THEN 'Sayuran'
                            ELSE 'Biji-bijian'
                        END
                    ) AS category_name,
                    products.description, products.price, products.stock, products.unit,
                    products.harvest_date, products.image, products.status, products.created_at,
                    users.id AS farmer_id, users.name AS farmer_name, users.address AS region
             FROM products
             INNER JOIN users ON users.id = products.farmer_id
             INNER JOIN roles ON roles.id = users.role_id
             LEFT JOIN categories ON categories.id = products.category_id
             WHERE {$where}
               AND (? <> 'Pembeli' OR roles.role_name = 'petani')
             ORDER BY products.created_at DESC, products.id DESC"
        );
        $statement->execute([
            ...($role === 'Petani' ? [$userId] : []),
            $role,
        ]);
        $rows = $statement->fetchAll();
        $summary = [
            'active_count' => 0,
            'active_value' => 0,
            'depleted_count' => 0,
            'draft_count' => 0,
        ];
        foreach ($rows as $offer) {
            if ($offer['status'] === 'tersedia' && (float) $offer['stock'] > 0) {
                $summary['active_count']++;
                $summary['active_value'] += (float) $offer['price'] * (float) $offer['stock'];
            } elseif ($offer['status'] === 'habis') {
                $summary['depleted_count']++;
            } elseif ($offer['status'] === 'draf') {
                $summary['draft_count']++;
            }
        }
        offers_json(200, [
            'rows' => $rows,
            'summary' => $summary,
            'commodities' => $role === 'Petani'
                ? $pdo->query('SELECT id, category_name AS name FROM categories ORDER BY category_name')->fetchAll()
                : [],
            'csrfToken' => $_SESSION['csrf_token'],
        ]);
    }

    if ($method === 'PUT') {
        if ($role !== 'Petani') {
            offers_json(403, ['error' => 'Hanya Petani yang dapat menerbitkan penawaran.']);
        }
        $input = json_decode(file_get_contents('php://input') ?: '', true);
        $offerId = is_array($input)
            ? filter_var($input['id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]])
            : false;
        if (!$offerId || ($input['action'] ?? '') !== 'publish') {
            offers_json(422, ['error' => 'Permintaan penerbitan penawaran tidak valid.']);
        }

        $publish = $pdo->prepare(
            "UPDATE products SET status = 'tersedia'
             WHERE id = ? AND farmer_id = ? AND status = 'draf' AND stock > 0"
        );
        $publish->execute([$offerId, $userId]);
        if ($publish->rowCount() !== 1) {
            offers_json(409, ['error' => 'Draf tidak ditemukan, stok kosong, atau penawaran sudah diterbitkan.']);
        }
        offers_json(200, ['message' => 'Penawaran diterbitkan dan kini terlihat oleh Pembeli serta Admin.']);
    }

    if ($role !== 'Petani') {
        offers_json(403, ['error' => 'Hanya Petani yang dapat membuat penawaran.']);
    }

    $categoryId = filter_var($_POST['category_id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
    if (!$categoryId) {
        offers_json(422, ['error' => 'Pilih komoditas yang dikelola Admin.']);
    }
    $categoryQuery = $pdo->prepare('SELECT category_name FROM categories WHERE id = ?');
    $categoryQuery->execute([$categoryId]);
    $productName = $categoryQuery->fetchColumn();
    if ($productName === false) {
        offers_json(422, ['error' => 'Komoditas tidak lagi tersedia. Muat ulang pilihan komoditas.']);
    }

    $quantityRaw = trim((string) ($_POST['quantity'] ?? ''));
    $quantity = filter_var($quantityRaw, FILTER_VALIDATE_FLOAT);
    if ($quantity === false || $quantity <= 0 || !is_finite((float) $quantity) || $quantity > 999999999) {
        offers_json(422, ['error' => 'Jumlah hasil panen harus lebih besar dari 0.']);
    }

    $unit = (string) ($_POST['unit'] ?? '');
    if (!in_array($unit, ['kg', 'ton', 'ikat'], true)) {
        offers_json(422, ['error' => 'Pilih satuan kg, ton, atau ikat.']);
    }

    $priceRaw = trim((string) ($_POST['price'] ?? ''));
    $price = filter_var($priceRaw, FILTER_VALIDATE_FLOAT);
    if ($price === false || $price <= 0 || !is_finite((float) $price) || $price > 9999999999999) {
        offers_json(422, ['error' => 'Harga harus lebih besar dari 0.']);
    }

    $harvestDate = (string) ($_POST['harvest_date'] ?? '');
    $parsedDate = DateTime::createFromFormat('!Y-m-d', $harvestDate);
    if (!$parsedDate || $parsedDate->format('Y-m-d') !== $harvestDate) {
        offers_json(422, ['error' => 'Tanggal panen tidak valid.']);
    }

    $imagePath = null;
    $uploadedFile = $_FILES['photo'] ?? null;
    if (is_array($uploadedFile) && ($uploadedFile['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_NO_FILE) {
        if (($uploadedFile['error'] ?? UPLOAD_ERR_OK) !== UPLOAD_ERR_OK) {
            offers_json(422, ['error' => 'Foto gagal diunggah. Pilih ulang foto berukuran maksimal 5 MB.']);
        }
        if (($uploadedFile['size'] ?? 0) <= 0 || $uploadedFile['size'] > 5 * 1024 * 1024) {
            offers_json(422, ['error' => 'Ukuran foto maksimal 5 MB.']);
        }

        $fileInfo = new finfo(FILEINFO_MIME_TYPE);
        $mimeType = $fileInfo->file((string) $uploadedFile['tmp_name']);
        $extensions = ['image/jpeg' => 'jpg', 'image/png' => 'png'];
        $imageInfo = @getimagesize((string) $uploadedFile['tmp_name']);
        if (!isset($extensions[$mimeType]) || $imageInfo === false || $imageInfo['mime'] !== $mimeType) {
            offers_json(422, ['error' => 'Foto harus berupa gambar PNG atau JPG yang valid.']);
        }

        $uploadDirectory = __DIR__ . '/../uploads/harvest';
        if (!is_dir($uploadDirectory) &&
            !mkdir($uploadDirectory, 0755, true) &&
            !is_dir($uploadDirectory)) {
            throw new RuntimeException('Direktori penyimpanan foto tidak dapat dibuat.');
        }
        $fileName = bin2hex(random_bytes(16)) . '.' . $extensions[$mimeType];
        if (!move_uploaded_file((string) $uploadedFile['tmp_name'], $uploadDirectory . '/' . $fileName)) {
            throw new RuntimeException('Foto yang diunggah tidak dapat disimpan.');
        }
        $imagePath = 'uploads/harvest/' . $fileName;
    }

    $insert = $pdo->prepare(
        "INSERT INTO products
            (farmer_id, category_id, product_name, price, stock, unit, harvest_date, image, status)
         SELECT ?, ?, ?, ?, ?, ?, ?, ?, 'draf'
         FROM users
         INNER JOIN roles ON roles.id = users.role_id
         WHERE users.id = ? AND users.status = 'aktif' AND roles.role_name = 'petani'"
    );
    $insert->execute([
        $userId,
        (int) $categoryId,
        $productName,
        $price,
        $quantity,
        $unit,
        $harvestDate,
        $imagePath,
        $userId,
    ]);

    if ($insert->rowCount() !== 1) {
        if ($imagePath !== null && is_file(__DIR__ . '/../' . $imagePath)) {
            unlink(__DIR__ . '/../' . $imagePath);
        }
        offers_json(403, ['error' => 'Akun Petani tidak ditemukan atau tidak aktif.']);
    }

    offers_json(201, [
        'message' => 'Draf penawaran berhasil disimpan secara privat. Pilih Terbitkan jika siap ditampilkan.',
        'id' => (int) $pdo->lastInsertId(),
    ]);
} catch (PDOException $error) {
    error_log('Offer database error: ' . $error->getMessage());
    offers_json(503, ['error' => 'Penawaran gagal disimpan ke database. Periksa skema database dan coba lagi.']);
} catch (Throwable $error) {
    error_log('Offer request error: ' . $error->getMessage());
    offers_json(500, ['error' => 'Terjadi kesalahan saat menyimpan penawaran.']);
}
