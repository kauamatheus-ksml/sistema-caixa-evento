<?php
// Arquivo: config.php - Configuração do banco MySQL Hostinger
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Responde a requisições OPTIONS (CORS preflight)
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

// Configurações do banco MySQL Hostinger
class DatabaseConfig {
    private $host = 'srv406.hstgr.io'; // ou o host fornecido pela Hostinger
    private $db_name = 'u383946504_sce'; // nome do banco
    private $username = 'u383946504_sce'; // usuário
    private $password = 'Aaku_2004'; // senha fornecida
    private $charset = 'utf8mb4';
    
    public $conn;

    public function getConnection() {
        $this->conn = null;
        
        try {
            $dsn = "mysql:host=" . $this->host . ";dbname=" . $this->db_name . ";charset=" . $this->charset;
            $this->conn = new PDO($dsn, $this->username, $this->password);
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        } catch(PDOException $exception) {
            error_log("Erro de conexão: " . $exception->getMessage());
            http_response_code(500);
            echo json_encode(['erro' => 'Erro de conexão com banco de dados']);
            exit();
        }
        
        return $this->conn;
    }

    public function criarTabelas() {
        try {
            // Tabela de cartões
            $sql_cartoes = "CREATE TABLE IF NOT EXISTS cartoes (
                numero VARCHAR(16) PRIMARY KEY,
                saldo DECIMAL(10,2) DEFAULT 0.00,
                ativo BOOLEAN DEFAULT TRUE,
                data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                ultima_transacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                total_recargas DECIMAL(10,2) DEFAULT 0.00,
                total_gastos DECIMAL(10,2) DEFAULT 0.00,
                INDEX idx_ativo (ativo),
                INDEX idx_ultima_transacao (ultima_transacao)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

            // Tabela de transações
            $sql_transacoes = "CREATE TABLE IF NOT EXISTS transacoes (
                id VARCHAR(50) PRIMARY KEY,
                numero_cartao VARCHAR(16) NOT NULL,
                tipo ENUM('recarga', 'compra', 'correcao', 'bloqueio', 'desbloqueio') NOT NULL,
                valor DECIMAL(10,2) NOT NULL,
                saldo_anterior DECIMAL(10,2) NOT NULL,
                saldo_novo DECIMAL(10,2) NOT NULL,
                data_transacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                operador VARCHAR(50) DEFAULT 'SISTEMA',
                descricao TEXT,
                produtos JSON NULL,
                terminal VARCHAR(20) DEFAULT 'WEB',
                FOREIGN KEY (numero_cartao) REFERENCES cartoes(numero) ON DELETE CASCADE,
                INDEX idx_cartao_data (numero_cartao, data_transacao),
                INDEX idx_tipo (tipo),
                INDEX idx_data (data_transacao)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

            // Tabela de produtos
            $sql_produtos = "CREATE TABLE IF NOT EXISTS produtos (
                id VARCHAR(50) PRIMARY KEY,
                nome VARCHAR(100) NOT NULL,
                descricao TEXT,
                preco DECIMAL(10,2) NOT NULL,
                categoria ENUM('bebidas', 'comidas', 'snacks', 'outros') DEFAULT 'outros',
                estoque INT DEFAULT 0,
                estoque_minimo INT DEFAULT 10,
                ativo BOOLEAN DEFAULT TRUE,
                emoji VARCHAR(10) DEFAULT '📦',
                data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                ultima_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                total_vendido INT DEFAULT 0,
                INDEX idx_categoria (categoria),
                INDEX idx_ativo (ativo),
                INDEX idx_estoque (estoque)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

            // Tabela de log administrativo
            $sql_logs = "CREATE TABLE IF NOT EXISTS logs_admin (
                id INT AUTO_INCREMENT PRIMARY KEY,
                operacao VARCHAR(50) NOT NULL,
                dados JSON,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                ip_address VARCHAR(45),
                user_agent TEXT,
                INDEX idx_operacao (operacao),
                INDEX idx_timestamp (timestamp)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

            $this->conn->exec($sql_cartoes);
            $this->conn->exec($sql_transacoes);
            $this->conn->exec($sql_produtos);
            $this->conn->exec($sql_logs);

            // Inserir produtos demo se tabela estiver vazia
            $this->inserirProdutosDemo();
            
            return true;
        } catch(PDOException $e) {
            error_log("Erro ao criar tabelas: " . $e->getMessage());
            return false;
        }
    }

    private function inserirProdutosDemo() {
        $stmt = $this->conn->prepare("SELECT COUNT(*) FROM produtos");
        $stmt->execute();
        $count = $stmt->fetchColumn();

        if ($count == 0) {
            $produtos = [
                ['cerveja_lata', 'Cerveja Lata 350ml', 'Cerveja lata 350ml - Skol, Brahma, Antarctica', 8.00, 'bebidas', 45, 10, '🍺'],
                ['refrigerante', 'Refrigerante Lata', 'Refrigerante lata 350ml - Coca-Cola, Pepsi, Guaraná', 5.00, 'bebidas', 32, 15, '🥤'],
                ['agua_mineral', 'Água Mineral 500ml', 'Água mineral 500ml - Crystal, Bonafont', 3.00, 'bebidas', 78, 20, '💧'],
                ['pizza_fatia', 'Pizza Fatia', 'Fatia de pizza - Calabresa, Margherita, Portuguesa', 12.00, 'comidas', 16, 5, '🍕'],
                ['hot_dog', 'Hot Dog Completo', 'Hot dog completo com batata palha e molhos', 10.00, 'comidas', 23, 5, '🌭'],
                ['pipoca', 'Pipoca Doce', 'Pipoca doce pacote 100g', 6.00, 'snacks', 8, 10, '🍿'],
                ['amendoim', 'Amendoim Torrado', 'Amendoim torrado pacote 50g', 4.00, 'snacks', 3, 10, '🥜']
            ];

            $sql = "INSERT INTO produtos (id, nome, descricao, preco, categoria, estoque, estoque_minimo, emoji) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
            $stmt = $this->conn->prepare($sql);

            foreach ($produtos as $produto) {
                $stmt->execute($produto);
            }
        }
    }
}

// Função utilitária para resposta JSON
function jsonResponse($data, $status = 200) {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit();
}

// Função para log de erro
function logError($message, $context = []) {
    error_log(date('Y-m-d H:i:s') . " - " . $message . " - " . json_encode($context));
}
?>