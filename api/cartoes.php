<?php
// Arquivo: cartoes.php - API para gerenciamento de cartões
require_once 'config.php';

$database = new DatabaseConfig();
$db = $database->getConnection();

// Criar tabelas se não existirem
$database->criarTabelas();

$method = $_SERVER['REQUEST_METHOD'];
$request = isset($_GET['request']) ? $_GET['request'] : '';

try {
    switch ($method) {
        case 'GET':
            if (isset($_GET['numero'])) {
                buscarCartao($_GET['numero'], $db);
            } elseif ($request === 'estatisticas') {
                obterEstatisticas($db);
            } elseif ($request === 'todos') {
                listarTodosCartoes($db);
            } else {
                jsonResponse(['erro' => 'Parâmetros inválidos'], 400);
            }
            break;

        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);
            
            if ($request === 'recarga') {
                realizarRecarga($input, $db);
            } elseif ($request === 'compra') {
                realizarCompra($input, $db);
            } elseif ($request === 'correcao') {
                corrigirSaldo($input, $db);
            } elseif ($request === 'criar') {
                criarCartao($input, $db);
            } else {
                jsonResponse(['erro' => 'Ação não especificada'], 400);
            }
            break;

        case 'PUT':
            $input = json_decode(file_get_contents('php://input'), true);
            alterarStatusCartao($input, $db);
            break;

        default:
            jsonResponse(['erro' => 'Método não permitido'], 405);
    }
} catch (Exception $e) {
    logError("Erro na API de cartões", ['erro' => $e->getMessage(), 'request' => $request]);
    jsonResponse(['erro' => 'Erro interno do servidor'], 500);
}

function buscarCartao($numero, $db) {
    try {
        // Buscar dados do cartão
        $stmt = $db->prepare("SELECT * FROM cartoes WHERE numero = ?");
        $stmt->execute([$numero]);
        $cartao = $stmt->fetch();

        if (!$cartao) {
            jsonResponse(['erro' => 'Cartão não encontrado'], 404);
        }

        // Buscar transações do cartão
        $stmt = $db->prepare("
            SELECT * FROM transacoes 
            WHERE numero_cartao = ? 
            ORDER BY data_transacao DESC 
            LIMIT 50
        ");
        $stmt->execute([$numero]);
        $transacoes = $stmt->fetchAll();

        // Formatar resposta
        $response = [
            'numero' => $cartao['numero'],
            'saldo' => (float)$cartao['saldo'],
            'ativo' => (bool)$cartao['ativo'],
            'dataCriacao' => $cartao['data_criacao'],
            'ultimaTransacao' => $cartao['ultima_transacao'],
            'totalRecargas' => (float)$cartao['total_recargas'],
            'totalGastos' => (float)$cartao['total_gastos'],
            'transacoes' => array_map(function($t) {
                return [
                    'id' => $t['id'],
                    'tipo' => $t['tipo'],
                    'valor' => (float)$t['valor'],
                    'saldoAnterior' => (float)$t['saldo_anterior'],
                    'saldoNovo' => (float)$t['saldo_novo'],
                    'data' => $t['data_transacao'],
                    'operador' => $t['operador'],
                    'descricao' => $t['descricao'],
                    'produtos' => $t['produtos'] ? json_decode($t['produtos'], true) : null
                ];
            }, $transacoes)
        ];

        jsonResponse($response);
    } catch (Exception $e) {
        logError("Erro ao buscar cartão", ['numero' => $numero, 'erro' => $e->getMessage()]);
        jsonResponse(['erro' => 'Erro ao buscar cartão'], 500);
    }
}

function criarCartao($data, $db) {
    try {
        $numero = $data['numero'] ?? '';
        $saldoInicial = (float)($data['saldoInicial'] ?? 0);

        if (empty($numero) || !preg_match('/^\d{4,16}$/', $numero)) {
            jsonResponse(['erro' => 'Número de cartão inválido'], 400);
        }

        // Verificar se cartão já existe
        $stmt = $db->prepare("SELECT numero FROM cartoes WHERE numero = ?");
        $stmt->execute([$numero]);
        if ($stmt->fetch()) {
            jsonResponse(['erro' => 'Cartão já existe'], 409);
        }

        $db->beginTransaction();

        // Criar cartão
        $stmt = $db->prepare("
            INSERT INTO cartoes (numero, saldo, total_recargas) 
            VALUES (?, ?, ?)
        ");
        $stmt->execute([$numero, $saldoInicial, $saldoInicial]);

        // Criar transação inicial se há saldo
        if ($saldoInicial > 0) {
            $transacaoId = 'TXN_' . time() . '_' . uniqid();
            $stmt = $db->prepare("
                INSERT INTO transacoes 
                (id, numero_cartao, tipo, valor, saldo_anterior, saldo_novo, operador, descricao) 
                VALUES (?, ?, 'recarga', ?, 0, ?, 'SISTEMA', 'Saldo inicial do cartão')
            ");
            $stmt->execute([$transacaoId, $numero, $saldoInicial, $saldoInicial]);
        }

        $db->commit();

        jsonResponse([
            'sucesso' => true,
            'mensagem' => 'Cartão criado com sucesso',
            'cartao' => [
                'numero' => $numero,
                'saldo' => $saldoInicial,
                'ativo' => true
            ]
        ]);
    } catch (Exception $e) {
        $db->rollBack();
        logError("Erro ao criar cartão", ['dados' => $data, 'erro' => $e->getMessage()]);
        jsonResponse(['erro' => 'Erro ao criar cartão'], 500);
    }
}

function realizarRecarga($data, $db) {
    try {
        $numero = $data['numero'] ?? '';
        $valor = (float)($data['valor'] ?? 0);
        $operador = $data['operador'] ?? 'SISTEMA';

        if (empty($numero) || $valor <= 0 || $valor > 1000) {
            jsonResponse(['erro' => 'Dados de recarga inválidos'], 400);
        }

        $db->beginTransaction();

        // Buscar cartão
        $stmt = $db->prepare("SELECT * FROM cartoes WHERE numero = ? FOR UPDATE");
        $stmt->execute([$numero]);
        $cartao = $stmt->fetch();

        if (!$cartao) {
            // Criar cartão automaticamente
            $stmt = $db->prepare("
                INSERT INTO cartoes (numero, saldo, total_recargas) 
                VALUES (?, ?, ?)
            ");
            $stmt->execute([$numero, $valor, $valor]);
            $saldoAnterior = 0;
            $novoSaldo = $valor;
        } else {
            if (!$cartao['ativo']) {
                $db->rollBack();
                jsonResponse(['erro' => 'Cartão bloqueado'], 403);
            }

            $saldoAnterior = (float)$cartao['saldo'];
            $novoSaldo = $saldoAnterior + $valor;

            // Atualizar saldo
            $stmt = $db->prepare("
                UPDATE cartoes 
                SET saldo = ?, total_recargas = total_recargas + ? 
                WHERE numero = ?
            ");
            $stmt->execute([$novoSaldo, $valor, $numero]);
        }

        // Inserir transação
        $transacaoId = 'TXN_' . time() . '_' . uniqid();
        $stmt = $db->prepare("
            INSERT INTO transacoes 
            (id, numero_cartao, tipo, valor, saldo_anterior, saldo_novo, operador, descricao) 
            VALUES (?, ?, 'recarga', ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $transacaoId, $numero, $valor, $saldoAnterior, $novoSaldo, $operador,
            "Recarga de R$ " . number_format($valor, 2, ',', '.')
        ]);

        $db->commit();

        jsonResponse([
            'sucesso' => true,
            'mensagem' => 'Recarga realizada com sucesso',
            'cartao' => [
                'numero' => $numero,
                'saldo' => $novoSaldo,
                'ativo' => true
            ],
            'transacao' => [
                'id' => $transacaoId,
                'valor' => $valor,
                'saldoAnterior' => $saldoAnterior,
                'saldoNovo' => $novoSaldo
            ]
        ]);
    } catch (Exception $e) {
        $db->rollBack();
        logError("Erro na recarga", ['dados' => $data, 'erro' => $e->getMessage()]);
        jsonResponse(['erro' => 'Erro ao processar recarga'], 500);
    }
}

function realizarCompra($data, $db) {
    try {
        $numero = $data['numero'] ?? '';
        $valor = (float)($data['valor'] ?? 0);
        $produtos = $data['produtos'] ?? [];
        $operador = $data['operador'] ?? 'PDV';

        if (empty($numero) || $valor <= 0) {
            jsonResponse(['erro' => 'Dados de compra inválidos'], 400);
        }

        $db->beginTransaction();

        // Buscar cartão
        $stmt = $db->prepare("SELECT * FROM cartoes WHERE numero = ? FOR UPDATE");
        $stmt->execute([$numero]);
        $cartao = $stmt->fetch();

        if (!$cartao) {
            $db->rollBack();
            jsonResponse(['erro' => 'Cartão não encontrado'], 404);
        }

        if (!$cartao['ativo']) {
            $db->rollBack();
            jsonResponse(['erro' => 'Cartão bloqueado'], 403);
        }

        $saldoAnterior = (float)$cartao['saldo'];
        if ($saldoAnterior < $valor) {
            $db->rollBack();
            jsonResponse(['erro' => 'Saldo insuficiente'], 400);
        }

        $novoSaldo = $saldoAnterior - $valor;

        // Atualizar saldo
        $stmt = $db->prepare("
            UPDATE cartoes 
            SET saldo = ?, total_gastos = total_gastos + ? 
            WHERE numero = ?
        ");
        $stmt->execute([$novoSaldo, $valor, $numero]);

        // Inserir transação
        $transacaoId = 'TXN_' . time() . '_' . uniqid();
        $stmt = $db->prepare("
            INSERT INTO transacoes 
            (id, numero_cartao, tipo, valor, saldo_anterior, saldo_novo, operador, descricao, produtos) 
            VALUES (?, ?, 'compra', ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $transacaoId, $numero, -$valor, $saldoAnterior, $novoSaldo, $operador,
            "Compra de R$ " . number_format($valor, 2, ',', '.'),
            json_encode($produtos)
        ]);

        $db->commit();

        jsonResponse([
            'sucesso' => true,
            'mensagem' => 'Compra realizada com sucesso',
            'cartao' => [
                'numero' => $numero,
                'saldo' => $novoSaldo,
                'ativo' => true
            ],
            'transacao' => [
                'id' => $transacaoId,
                'valor' => $valor,
                'saldoAnterior' => $saldoAnterior,
                'saldoNovo' => $novoSaldo
            ]
        ]);
    } catch (Exception $e) {
        $db->rollBack();
        logError("Erro na compra", ['dados' => $data, 'erro' => $e->getMessage()]);
        jsonResponse(['erro' => 'Erro ao processar compra'], 500);
    }
}

function obterEstatisticas($db) {
    try {
        // Estatísticas gerais
        $stmt = $db->query("
            SELECT 
                COUNT(*) as total_cartoes,
                COUNT(CASE WHEN ativo = 1 THEN 1 END) as cartoes_ativos,
                COALESCE(SUM(saldo), 0) as saldo_total_sistema,
                COALESCE(SUM(total_recargas), 0) as total_recarregado,
                COALESCE(SUM(total_gastos), 0) as total_gasto
            FROM cartoes
        ");
        $estatisticas = $stmt->fetch();

        // Estatísticas do dia
        $stmt = $db->query("
            SELECT 
                COUNT(CASE WHEN tipo = 'recarga' THEN 1 END) as recargas_hoje,
                COUNT(CASE WHEN tipo = 'compra' THEN 1 END) as vendas_hoje,
                COALESCE(SUM(CASE WHEN tipo = 'recarga' THEN valor ELSE 0 END), 0) as total_recargas_hoje,
                COALESCE(SUM(CASE WHEN tipo = 'compra' THEN ABS(valor) ELSE 0 END), 0) as total_vendas_hoje
            FROM transacoes 
            WHERE DATE(data_transacao) = CURDATE()
        ");
        $estatisticasHoje = $stmt->fetch();

        jsonResponse([
            'estatisticas' => [
                'totalCartoes' => (int)$estatisticas['total_cartoes'],
                'cartoesAtivos' => (int)$estatisticas['cartoes_ativos'],
                'saldoTotalSistema' => (float)$estatisticas['saldo_total_sistema'],
                'totalRecarregadoSistema' => (float)$estatisticas['total_recarregado'],
                'totalGastoSistema' => (float)$estatisticas['total_gasto']
            ],
            'estatisticasHoje' => [
                'recargas' => (int)$estatisticasHoje['recargas_hoje'],
                'vendas' => (int)$estatisticasHoje['vendas_hoje'],
                'totalRecargas' => (float)$estatisticasHoje['total_recargas_hoje'],
                'totalVendas' => (float)$estatisticasHoje['total_vendas_hoje'],
                'totalTransacoes' => (int)$estatisticasHoje['recargas_hoje'] + (int)$estatisticasHoje['vendas_hoje']
            ]
        ]);
    } catch (Exception $e) {
        logError("Erro ao obter estatísticas", ['erro' => $e->getMessage()]);
        jsonResponse(['erro' => 'Erro ao obter estatísticas'], 500);
    }
}
?>