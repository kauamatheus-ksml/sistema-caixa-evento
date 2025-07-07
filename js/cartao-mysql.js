// Arquivo: cartao-mysql.js - Integração com API PHP/MySQL
// Substitui o localStorage por chamadas para API

class GerenciadorCartaoMySQL {
    constructor() {
        this.baseURL = './api'; // Caminho para APIs PHP
        this.cache = new Map(); // Cache local para performance
        this.inicializar();
    }

    inicializar() {
        console.log('Gerenciador MySQL inicializado');
        // Testa conexão com API
        this.testarConexao();
    }

    async testarConexao() {
        try {
            const response = await fetch(`${this.baseURL}/cartoes.php?request=estatisticas`);
            if (response.ok) {
                console.log('✅ Conexão com API MySQL estabelecida');
            } else {
                console.error('❌ Erro na conexão com API:', response.status);
            }
        } catch (error) {
            console.error('❌ Erro ao conectar com API:', error);
        }
    }

    async buscarCartao(numero) {
        try {
            // Verifica cache primeiro
            const cacheKey = `cartao_${numero}`;
            if (this.cache.has(cacheKey)) {
                const cached = this.cache.get(cacheKey);
                // Cache válido por 30 segundos
                if (Date.now() - cached.timestamp < 30000) {
                    return cached.data;
                }
            }

            const response = await fetch(`${this.baseURL}/cartoes.php?numero=${numero}`);
            
            if (response.status === 404) {
                return null; // Cartão não encontrado
            }

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            
            // Salva no cache
            this.cache.set(cacheKey, {
                data: data,
                timestamp: Date.now()
            });

            return data;
        } catch (error) {
            console.error('Erro ao buscar cartão:', error);
            return null;
        }
    }

    async criarNovoCartao(numero, saldoInicial = 0) {
        try {
            const response = await fetch(`${this.baseURL}/cartoes.php?request=criar`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    numero: numero,
                    saldoInicial: saldoInicial
                })
            });

            const result = await response.json();
            
            if (result.sucesso) {
                // Limpa cache
                this.cache.delete(`cartao_${numero}`);
                return result.cartao;
            } else {
                throw new Error(result.erro || 'Erro ao criar cartão');
            }
        } catch (error) {
            console.error('Erro ao criar cartão:', error);
            return null;
        }
    }

    async recarregarCartao(numero, valor, operador = 'CAIXA') {
        try {
            const response = await fetch(`${this.baseURL}/cartoes.php?request=recarga`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    numero: numero,
                    valor: valor,
                    operador: operador
                })
            });

            const result = await response.json();
            
            if (result.sucesso) {
                // Limpa cache do cartão
                this.cache.delete(`cartao_${numero}`);
                this.cache.delete('estatisticas');
                
                return {
                    sucesso: true,
                    cartao: result.cartao,
                    transacao: result.transacao,
                    mensagem: result.mensagem
                };
            } else {
                return {
                    sucesso: false,
                    erro: result.erro
                };
            }
        } catch (error) {
            console.error('Erro na recarga:', error);
            return {
                sucesso: false,
                erro: 'Erro de conexão'
            };
        }
    }

    async debitarCartao(numero, valor, produtos = [], operador = 'PDV') {
        try {
            const response = await fetch(`${this.baseURL}/cartoes.php?request=compra`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    numero: numero,
                    valor: valor,
                    produtos: produtos,
                    operador: operador
                })
            });

            const result = await response.json();
            
            if (result.sucesso) {
                // Limpa cache
                this.cache.delete(`cartao_${numero}`);
                this.cache.delete('estatisticas');
                
                return {
                    sucesso: true,
                    cartao: result.cartao,
                    transacao: result.transacao,
                    mensagem: result.mensagem
                };
            } else {
                return {
                    sucesso: false,
                    erro: result.erro
                };
            }
        } catch (error) {
            console.error('Erro na compra:', error);
            return {
                sucesso: false,
                erro: 'Erro de conexão'
            };
        }
    }

    async obterRelatorios() {
        try {
            // Verifica cache
            if (this.cache.has('estatisticas')) {
                const cached = this.cache.get('estatisticas');
                if (Date.now() - cached.timestamp < 60000) { // Cache de 1 minuto
                    return cached.data;
                }
            }

            const response = await fetch(`${this.baseURL}/cartoes.php?request=estatisticas`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            
            // Salva no cache
            this.cache.set('estatisticas', {
                data: data,
                timestamp: Date.now()
            });

            return data;
        } catch (error) {
            console.error('Erro ao obter relatórios:', error);
            return {
                estatisticas: {
                    totalCartoes: 0,
                    cartoesAtivos: 0,
                    saldoTotalSistema: 0,
                    totalRecarregadoSistema: 0,
                    totalGastoSistema: 0
                },
                estatisticasHoje: {
                    recargas: 0,
                    vendas: 0,
                    totalRecargas: 0,
                    totalVendas: 0,
                    totalTransacoes: 0
                }
            };
        }
    }

    // Simulação NFC (mantém a mesma implementação)
    async simularLeituraNFC() {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (Math.random() > 0.05) {
                    // Gera número aleatório para demo
                    const numero = '1234' + Math.floor(Math.random() * 100000000000).toString().padStart(12, '0');
                    resolve({
                        sucesso: true,
                        numero: numero,
                        timestamp: new Date().toISOString(),
                        metodo: 'nfc_simulado'
                    });
                } else {
                    reject({
                        sucesso: false,
                        erro: 'Falha na leitura NFC',
                        timestamp: new Date().toISOString()
                    });
                }
            }, Math.random() * 2000 + 1000);
        });
    }

    validarNumeroCartao(numero) {
        if (!numero || typeof numero !== 'string') return false;
        numero = numero.replace(/[\s-]/g, '');
        // Flexível: 4 a 16 dígitos
        return numero.length >= 4 && numero.length <= 16 && /^\d+$/.test(numero);
    }

    // Métodos para compatibilidade com código existente
    get cartoes() {
        console.warn('cartoes getter não disponível no modo MySQL');
        return {};
    }

    get historico() {
        console.warn('historico getter não disponível no modo MySQL');
        return [];
    }
}

// Substitui a instância global
const gerenciadorCartao = new GerenciadorCartaoMySQL();

// Funções globais para compatibilidade
window.lerCartaoNFC = async function() {
    try {
        const resultado = await gerenciadorCartao.simularLeituraNFC();
        if (typeof window.onCartaoLido === 'function') {
            window.onCartaoLido(resultado);
        }
        return resultado;
    } catch (error) {
        if (typeof window.onErroLeitura === 'function') {
            window.onErroLeitura(error);
        }
        throw error;
    }
};

window.buscarCartao = function(numero) {
    return gerenciadorCartao.buscarCartao(numero);
};

window.recarregarCartao = function(numero, valor, operador) {
    return gerenciadorCartao.recarregarCartao(numero, valor, operador);
};

window.debitarCartao = function(numero, valor, produtos, operador) {
    return gerenciadorCartao.debitarCartao(numero, valor, produtos, operador);
};

window.gerenciadorCartao = gerenciadorCartao;

console.log('Sistema de cartões MySQL CaixaEvent carregado!');