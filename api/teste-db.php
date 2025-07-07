<?php
require_once 'config.php';
$database = new DatabaseConfig();
$db = $database->getConnection();
echo "✅ Conexão MySQL funcionando!";
?>