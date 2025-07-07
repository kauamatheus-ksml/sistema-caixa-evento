<?php
// Arquivo: config.php - Configuração do banco MySQL Hostinger

// Define os cabeçalhos CORS para permitir requisições de qualquer origem
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Responde a requisições OPTIONS (CORS preflight) para evitar problemas de CORS
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

/**
 * Classe DatabaseConfig para gerenciar a conexão com o banco de dados MySQL
 * e a criação das tabelas.
 */
class DatabaseConfig {
    // Propriedades privadas para as credenciais do banco de dados
    private $host = 'srv406.hstgr.io'; // Host do banco de dados fornecido pela Hostinger
    private $db_name = 'u383946504_sce'; // Nome do banco de dados
    private $username = 'u383946504_sce'; // Nome de usuário do banco de dados
    private $password = 'Aaku_2004'; // Senha do banco de dados
    private $charset = 'utf8mb4'; // Conjunto de caracteres para a conexão

    // Propriedade pública para a conexão PDO
    public $conn;

    /**
     * Obtém uma conexão com o banco de dados usando PDO.
     * Em caso de falha na conexão, registra o erro e retorna uma resposta JSON de erro.
     *
     * @return PDO|null A instância PDO da conexão ou null em caso de erro.
     */
    public function getConnection() {
        $this->conn = null; // Inicializa a conexão como nula

        try {
            // Constrói a string DSN (Data Source Name) para a conexão MySQL
            $dsn = "mysql:host=" . $this->host . ";dbname=" . $this->db_name . ";charset=" . $this->charset;
            // Cria uma nova instância PDO
            $this->conn = new PDO($dsn, $this->username, $this->password);
            // Define o modo de erro para lançar exceções em caso de erros SQL
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            // Define o modo de busca padrão para retornar arrays associativos
            $this->conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        } catch(PDOException $exception) {
            // Captura exceções PDO (erros de conexão)
            // Registra o erro no log do servidor para depuração
            error_log("Erro de conexão com o banco de dados: " . $exception->getMessage());
            // Define o código de status HTTP para 500 (Internal Server Error)
            http_response_code(500);
            // Retorna uma resposta JSON com a mensagem de erro
            echo json_encode(['erro' => 'Não foi possível conectar ao banco de dados. Verifique as credenciais ou o status do servidor.', 'detalhe' => $exception->getMessage()], JSON_UNESCAPED_UNICODE);
            exit(); // Encerra a execução do script
        }

        return $this->conn; // Retorna a conexão estabelecida
    }

    /**
     * Cria as tabelas necessárias no banco de dados se elas ainda não existirem.
     *
     * @return bool True se as tabelas foram criadas/verificadas com sucesso, false em caso de erro.
     */
    public function criarTabelas() {
        try {
            // SQL para criar a tabela 'cartoes'
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

            // SQL para criar a tabela 'transacoes'
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

            // SQL para criar a tabela 'produtos'
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

            // SQL para criar a tabela 'logs_admin'
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

            // Executa as queries para criar as tabelas
            $this->conn->exec($sql_cartoes);
            $this->conn->exec($sql_transacoes);
            $this->conn->exec($sql_produtos);
            $this->conn->exec($sql_logs);

            // Insere produtos de demonstração se a tabela 'produtos' estiver vazia
            $this->inserirProdutosDemo();
            
            return true; // Retorna verdadeiro se as tabelas foram criadas/verificadas com sucesso
        } catch(PDOException $e) {
            // Captura exceções PDO (erros na criação de tabelas)
            error_log("Erro ao criar tabelas: " . $e->getMessage());
            return false; // Retorna falso em caso de erro
        }
    }

    /**
     * Insere produtos de demonstração na tabela 'produtos' se ela estiver vazia.
     */
    private function inserirProdutosDemo() {
        // Verifica se a tabela 'produtos' está vazia
        $stmt = $this->conn->prepare("SELECT COUNT(*) FROM produtos");
        $stmt->execute();
        $count = $stmt->fetchColumn();

        if ($count == 0) {
            // Array de produtos de demonstração
            $produtos = [
                ['cerveja_lata', 'Cerveja Lata 350ml', 'Cerveja lata 350ml - Skol, Brahma, Antarctica', 8.00, 'bebidas', 45, 10, '🍺'],
                ['refrigerante', 'Refrigerante Lata', 'Refrigerante lata 350ml - Coca-Cola, Pepsi, Guaraná', 5.00, 'bebidas', 32, 15, '🥤'],
                ['agua_mineral', 'Água Mineral 500ml', 'Água mineral 500ml - Crystal, Bonafont', 3.00, 'bebidas', 78, 20, '💧'],
                ['pizza_fatia', 'Pizza Fatia', 'Fatia de pizza - Calabresa, Margherita, Portuguesa', 12.00, 'comidas', 16, 5, '🍕'],
                ['hot_dog', 'Hot Dog Completo', 'Hot dog completo com batata palha e molhos', 10.00, 'comidas', 23, 5, '🌭'],
                ['pipoca', 'Pipoca Doce', 'Pipoca doce pacote 100g', 6.00, 'snacks', 8, 10, '🍿'],
                ['amendoim', 'Amendoim Torrado', 'Amendoim torrado pacote 50g', 4.00, 'snacks', 3, 10, '🥜']
            ];

            // Prepara a query SQL para inserção
            $sql = "INSERT INTO produtos (id, nome, descricao, preco, categoria, estoque, estoque_minimo, emoji) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
            $stmt = $this->conn->prepare($sql);

            // Executa a inserção para cada produto
            foreach ($produtos as $produto) {
                $stmt->execute($produto);
            }
        }
    }
}

/**
 * Função utilitária para enviar respostas JSON.
 *
 * @param mixed $data Os dados a serem codificados como JSON.
 * @param int $status O código de status HTTP da resposta.
 */
function jsonResponse($data, $status = 200) {
    http_response_code($status); // Define o código de status HTTP
    echo json_encode($data, JSON_UNESCAPED_UNICODE); // Codifica e imprime os dados JSON
    exit(); // Encerra a execução do script
}

/**
 * Função para registrar mensagens de erro no log do servidor.
 *
 * @param string $message A mensagem de erro.
 * @param array $context Um array associativo com dados de contexto adicionais.
 */
function logError($message, $context = []) {
    error_log(date('Y-m-d H:i:s') . " - " . $message . " - " . json_encode($context));
}
?>
