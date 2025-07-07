<?php
// Arquivo: produtos.php - API para gerenciamento de produtos
require_once 'config.php';

$database = new DatabaseConfig();
$db = $database->getConnection();
$database->criarTabelas();

$method = $_SERVER['REQUEST_METHOD'];
$request = isset($_GET['request']) ? $_GET['request'] : '';

try {
    switch ($method) {
        case 'GET':
            if ($request === 'todos') {
                listarProdutos($db);
            } elseif (isset($_GET['id'])) {
                buscarProduto($_GET['id'], $db);
            } else {
                jsonResponse(['erro' => 'Parâmetros inválidos'], 400);
            }
            break;

        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);
            criarProduto($input, $db);
            break;

        case 'PUT':
            $input = json_decode(file_get_contents('php://input'), true);
            if (isset($_GET['id'])) {
                atualizarProduto($_GET['id'], $input, $db);
            } else {
                jsonResponse(['erro' => 'ID do produto não especificado'], 400);
            }
            break;

        case 'DELETE':
            if (isset($_GET['id'])) {
                excluirProduto($_GET['id'], $db);
            } else {
                jsonResponse(['erro' => 'ID do produto não especificado'], 400);
            }
            break;

        default:
            jsonResponse(['erro' => 'Método não permitido'], 405);
    }
} catch (Exception $e) {
    logError("Erro na API de produtos", ['erro' => $e->getMessage(), 'request' => $request]);
    jsonResponse(['erro' => 'Erro interno do servidor'], 500);
}

function listarProdutos($db) {
    try {
        $stmt = $db->query("SELECT * FROM produtos ORDER BY nome");
        $produtos = $stmt->fetchAll();

        $response = [];
        foreach ($produtos as $produto) {
            $response[$produto['id']] = [
                'id' => $produto['id'],
                'nome' => $produto['nome'],
                'descricao' => $produto['descricao'],
                'preco' => (float)$produto['preco'],
                'categoria' => $produto['categoria'],
                'estoque' => (int)$produto['estoque'],
                'estoqueMinimo' => (int)$produto['estoque_minimo'],
                'ativo' => (bool)$produto['ativo'],
                'emoji' => $produto['emoji'],
                'dataCriacao' => $produto['data_criacao'],
                'ultimaAtualizacao' => $produto['ultima_atualizacao'],
                'totalVendido' => (int)$produto['total_vendido']
            ];
        }

        jsonResponse($response);
    } catch (Exception $e) {
        logError("Erro ao listar produtos", ['erro' => $e->getMessage()]);
        jsonResponse(['erro' => 'Erro ao listar produtos'], 500);
    }
}

function criarProduto($data, $db) {
    try {
        $id = $data['id'] ?? '';
        $nome = $data['nome'] ?? '';
        $descricao = $data['descricao'] ?? '';
        $preco = (float)($data['preco'] ?? 0);
        $categoria = $data['categoria'] ?? 'outros';
        $estoque = (int)($data['estoque'] ?? 0);
        $estoqueMinimo = (int)($data['estoqueMinimo'] ?? 10);
        $ativo = $data['ativo'] ?? true;
        $emoji = $data['emoji'] ?? '📦';

        if (empty($id) || empty($nome) || $preco <= 0) {
            jsonResponse(['erro' => 'Dados do produto inválidos'], 400);
        }

        $stmt = $db->prepare("
            INSERT INTO produtos 
            (id, nome, descricao, preco, categoria, estoque, estoque_minimo, ativo, emoji) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([$id, $nome, $descricao, $preco, $categoria, $estoque, $estoqueMinimo, $ativo, $emoji]);

        jsonResponse([
            'sucesso' => true,
            'mensagem' => 'Produto criado com sucesso',
            'produto' => [
                'id' => $id,
                'nome' => $nome,
                'preco' => $preco,
                'estoque' => $estoque
            ]
        ]);
    } catch (Exception $e) {
        if ($e->getCode() == 23000) { // Duplicate entry
            jsonResponse(['erro' => 'Produto com este ID já existe'], 409);
        }
        logError("Erro ao criar produto", ['dados' => $data, 'erro' => $e->getMessage()]);
        jsonResponse(['erro' => 'Erro ao criar produto'], 500);
    }
}

function atualizarProduto($id, $data, $db) {
    try {
        $fields = [];
        $values = [];

        $allowedFields = ['nome', 'descricao', 'preco', 'categoria', 'estoque', 'estoque_minimo', 'ativo', 'emoji'];
        
        foreach ($allowedFields as $field) {
            if (isset($data[$field])) {
                $dbField = $field === 'estoqueMinimo' ? 'estoque_minimo' : $field;
                $fields[] = "$dbField = ?";
                $values[] = $data[$field];
            }
        }

        if (empty($fields)) {
            jsonResponse(['erro' => 'Nenhum campo para atualizar'], 400);
        }

        $values[] = $id;
        $sql = "UPDATE produtos SET " . implode(', ', $fields) . " WHERE id = ?";
        
        $stmt = $db->prepare($sql);
        $stmt->execute($values);

        if ($stmt->rowCount() == 0) {
            jsonResponse(['erro' => 'Produto não encontrado'], 404);
        }

        jsonResponse([
            'sucesso' => true,
            'mensagem' => 'Produto atualizado com sucesso'
        ]);
    } catch (Exception $e) {
        logError("Erro ao atualizar produto", ['id' => $id, 'dados' => $data, 'erro' => $e->getMessage()]);
        jsonResponse(['erro' => 'Erro ao atualizar produto'], 500);
    }
}
?>