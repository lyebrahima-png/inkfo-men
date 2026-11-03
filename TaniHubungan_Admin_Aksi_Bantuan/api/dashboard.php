<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/page-bootstrap.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function dashboard_json(int $status, array $data): never
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

$role = (string) ($_SESSION['user']['role'] ?? '');
if (!in_array($role, ['Admin', 'Petani'], true)) {
    dashboard_json(403, ['error' => 'Akses dashboard tidak diizinkan.']);
}
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    header('Allow: GET');
    dashboard_json(405, ['error' => 'Metode permintaan tidak diizinkan.']);
}

try {
    $pdo = database();
    if ($role === 'Petani') {
        $statement = $pdo->prepare(
            "SELECT
                COUNT(CASE WHEN status = 'tersedia' AND stock > 0 THEN 1 END) AS active_offers,
                COALESCE(SUM(CASE WHEN status = 'tersedia' AND stock > 0 THEN price * stock ELSE 0 END), 0) AS active_offer_value,
                COUNT(CASE WHEN status = 'habis' THEN 1 END) AS depleted_offers,
                COUNT(CASE WHEN status = 'draf' THEN 1 END) AS draft_offers
             FROM products
             WHERE farmer_id = ?"
        );
        $statement->execute([(int) ($_SESSION['user']['id'] ?? 0)]);
        dashboard_json(200, $statement->fetch());
    }

    $roleCounts = $pdo->query(
        'SELECT roles.role_name, COUNT(users.id) AS total
         FROM roles
         LEFT JOIN users ON users.role_id = roles.id
         GROUP BY roles.id, roles.role_name'
    )->fetchAll(PDO::FETCH_KEY_PAIR);
    $activeOffers = (int) $pdo->query(
        "SELECT COUNT(*) FROM products WHERE status = 'tersedia' AND stock > 0"
    )->fetchColumn();
    $transactionsThisMonth = (int) $pdo->query(
        "SELECT COUNT(*) FROM orders
         WHERE order_date >= DATE_FORMAT(CURRENT_DATE, '%Y-%m-01')
           AND order_date < DATE_FORMAT(CURRENT_DATE + INTERVAL 1 MONTH, '%Y-%m-01')"
    )->fetchColumn();

    dashboard_json(200, [
        'farmers' => (int) ($roleCounts['petani'] ?? 0),
        'buyers' => (int) ($roleCounts['pembeli'] ?? 0),
        'active_offers' => $activeOffers,
        'transactions_this_month' => $transactionsThisMonth,
    ]);
} catch (Throwable $error) {
    error_log('Dashboard data error: ' . $error->getMessage());
    dashboard_json(503, ['error' => 'Ringkasan dashboard tidak dapat dimuat dari database.']);
}
