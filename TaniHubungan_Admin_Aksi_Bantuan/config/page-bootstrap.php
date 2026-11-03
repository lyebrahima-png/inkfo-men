<?php
declare(strict_types=1);

session_set_cookie_params([
    'httponly' => true,
    'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
    'samesite' => 'Lax',
]);
session_start();

$pageName = basename($_SERVER['SCRIPT_NAME'] ?? '');
$requiredRole = str_starts_with($pageName, 'admin-') ? 'Admin'
    : (str_starts_with($pageName, 'petani-') ? 'Petani'
        : (str_starts_with($pageName, 'pembeli-') ? 'Pembeli' : null));

if ($requiredRole !== null &&
    (!isset($_SESSION['user']) || ($_SESSION['user']['role'] ?? '') !== $requiredRole)) {
    header('Location: login.php');
    exit;
}
