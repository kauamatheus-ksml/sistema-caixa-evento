<?php
// Arquivo: api/teste-debug.php - Teste específico de conectividade MySQL
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

echo json_encode([
    'timestamp' => date('Y-m-d H:i:s'),
    'status' => 'success',
    'message' => 'Teste de conectividade MySQL',
    'servidor' => $_SERVER['SERVER_NAME'] ?? 'localhost',
    'php_version' => phpversion(),
    'extensions' => [
        'pdo' => extension_loaded('pdo'),
        'pdo_mysql' => extension_loaded('pdo_mysql'),
        'json' => extension_loaded('json')
    ]
], JSON_UNESCAPED_UNICODE);
?>