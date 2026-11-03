<?php
declare(strict_types=1);

function database(): PDO
{
    static $connection = null;
    if ($connection instanceof PDO) {
        return $connection;
    }

    $localConfigFile = __DIR__ . '/database.local.php';
    $localConfig = is_file($localConfigFile) ? require $localConfigFile : [];
    if (!is_array($localConfig)) {
        throw new RuntimeException('Konfigurasi database lokal harus mengembalikan array.');
    }

    $host = getenv('DB_HOST') ?: ($localConfig['host'] ?? '127.0.0.1');
    $name = getenv('DB_NAME') ?: ($localConfig['name'] ?? 'tanihubungan_db');
    $user = getenv('DB_USER') ?: ($localConfig['user'] ?? 'root');
    $password = getenv('DB_PASSWORD') ?: ($localConfig['password'] ?? '');

    try {
        $connection = new PDO(
            "mysql:host={$host};dbname={$name};charset=utf8mb4",
            $user,
            $password,
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]
        );
    } catch (PDOException $error) {
        error_log('Database connection failed: ' . $error->getMessage());
        throw $error;
    }

    return $connection;
}
