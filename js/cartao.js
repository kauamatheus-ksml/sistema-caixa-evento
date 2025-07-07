// Arquivo: cartao.js - Gerenciamento de cartões e operações NFC
// Sistema de Controle de Caixa para Eventos

/**
 * Classe principal para gerenciamento de cartões
 */
class GerenciadorCartao {
    constructor() {
        this.prefixoCartao = '1234'; // Prefixo padrão dos cartões do evento
        this.cartoes = this.carregarCartoes();
        this.historico = this.carregarHistorico();
        this.statusNFC = 'aguardando';
        this.inicializar();
    }

    /**
     * Inicializa o sistema de cartões
     */
    inicializar() {
        console.log('Sistema de cartões inicializado');
        this.criarCartoesDemo(); // Criar cartões de demonstração se necessário
    }

    /**
     * Cria cartões de demonstração para testes
     */
    criarCartoesDemo() {
        const cartoesDemo = [
            '1234567890123456',
            '1234567890123457',
            '1234567890123458',
            '1234567890123459'
        ];

        cartoesDemo.forEach(numero => {
            if (!this.cartoes[numero]) {
                this.criarNovoCartao(numero, Math.random() * 100); // Saldo aleatório para demo
            }
        });
    }

    /**
     * Simula leitura NFC do cartão
     * @returns {Promise<Object>} Resultado da leitura
     */
    async simularLeituraNFC() {
        return new Promise((resolve, reject) => {
            this.atualizarStatusNFC('lendo', 'Lendo cartão NFC...', 'fas fa-spinner fa-spin');
            
            // Simula delay de leitura NFC real (1-3 segundos)
            const delay = Math.random() * 2000 + 1000;
            
            setTimeout(() => {
                try {
                    // Simula 95% de sucesso na leitura
                    if (Math.random() > 0.05) {
                        const cartaoSimulado = this.obterCartaoAleatorio();
                        this.atualizarStatusNFC('sucesso', 'Cartão lido com sucesso!', 'fas fa-check-circle');
                        
                        resolve({
                            sucesso: true,
                            numero: cartaoSimulado,
                            timestamp: new Date().toISOString(),
                            metodo: 'nfc_simulado'
                        });
                    } else {
                        throw new Error('Falha na leitura NFC');
                    }
                } catch (error) {
                    this.atualizarStatusNFC('erro', 'Erro na leitura. Tente novamente.', 'fas fa-exclamation-triangle');
                    reject({
                        sucesso: false,
                        erro: error.message,
                        timestamp: new Date().toISOString()
                    });
                }
            }, delay);
        });
    }

    /**
     * Obtém um cartão aleatório para simulação
     * @returns {string} Número do cartão
     */
    obterCartaoAleatorio() {
        const numerosCartoes = Object.keys(this.cartoes);
        if (numerosCartoes.length === 0) {
            // Se não há cartões, cria um novo
            const novoNumero = this.gerarNumeroCartao();
            this.criarNovoCartao(novoNumero);
            return novoNumero;
        }
        
        const indiceAleatorio = Math.floor(Math.random() * numerosCartoes.length);
        return numerosCartoes[indiceAleatorio];
    }

    /**
     * Valida número do cartão
     * @param {string} numero - Número do cartão
     * @returns {boolean} Se o número é válido
     */
    validarNumeroCartao(numero) {
        if (!numero || typeof numero !== 'string') return false;
        
        // Remove espaços e hífens
        numero = numero.replace(/[\s-]/g, '');
        
        // Verifica se tem 16 dígitos e começa com o prefixo correto
        return numero.length === 16 && 
               numero.startsWith(this.prefixoCartao) && 
               /^\d+$/.test(numero);
    }

    /**
     * Busca dados do cartão
     * @param {string} numero - Número do cartão
     * @returns {Object|null} Dados do cartão ou null se não encontrado
     */
    buscarCartao(numero) {
        if (!this.validarNumeroCartao(numero)) {
            return null;
        }

        // Se o cartão não existe, cria um novo
        if (!this.cartoes[numero]) {
            return this.criarNovoCartao(numero);
        }

        return this.cartoes[numero];
    }

    /**
     * Cria um novo cartão
     * @param {string} numero - Número do cartão
     * @param {number} saldoInicial - Saldo inicial (padrão: 0)
     * @returns {Object} Dados do novo cartão
     */
    criarNovoCartao(numero, saldoInicial = 0) {
        const agora = new Date().toISOString();
        
        const novoCartao = {
            numero: numero,
            saldo: saldoInicial,
            ativo: true,
            dataCriacao: agora,
            ultimaTransacao: agora,
            totalRecargas: saldoInicial > 0 ? saldoInicial : 0,
            totalGastos: 0,
            transacoes: saldoInicial > 0 ? [{
                id: this.gerarIdTransacao(),
                tipo: 'recarga_inicial',
                valor: saldoInicial,
                saldoAnterior: 0,
                saldoNovo: saldoInicial,
                data: agora,
                operador: 'SISTEMA',
                descricao: 'Saldo inicial do cartão'
            }] : []
        };

        this.cartoes[numero] = novoCartao;
        this.salvarCartoes();

        console.log(`Novo cartão criado: ${numero} com saldo R$ ${saldoInicial.toFixed(2)}`);
        return novoCartao;
    }

    /**
     * Realiza recarga no cartão
     * @param {string} numero - Número do cartão
     * @param {number} valor - Valor da recarga
     * @param {string} operador - Identificação do operador
     * @returns {Object} Resultado da operação
     */
    recarregarCartao(numero, valor, operador = 'CAIXA') {
        try {
            // Validações
            if (!this.validarNumeroCartao(numero)) {
                throw new Error('Número de cartão inválido');
            }

            if (!valor || valor <= 0 || valor > 1000) {
                throw new Error('Valor de recarga inválido (R$ 1,00 - R$ 1.000,00)');
            }

            // Busca ou cria o cartão
            let cartao = this.buscarCartao(numero);
            if (!cartao) {
                cartao = this.criarNovoCartao(numero);
            }

            if (!cartao.ativo) {
                throw new Error('Cartão bloqueado. Contate a administração.');
            }

            // Realiza a recarga
            const saldoAnterior = cartao.saldo;
            const novoSaldo = saldoAnterior + valor;
            const agora = new Date().toISOString();

            // Atualiza dados do cartão
            cartao.saldo = novoSaldo;
            cartao.ultimaTransacao = agora;
            cartao.totalRecargas += valor;

            // Cria registro da transação
            const transacao = {
                id: this.gerarIdTransacao(),
                tipo: 'recarga',
                valor: valor,
                saldoAnterior: saldoAnterior,
                saldoNovo: novoSaldo,
                data: agora,
                operador: operador,
                descricao: `Recarga de R$ ${valor.toFixed(2)}`
            };

            cartao.transacoes.push(transacao);

            // Mantém apenas as últimas 50 transações por cartão
            if (cartao.transacoes.length > 50) {
                cartao.transacoes = cartao.transacoes.slice(-50);
            }

            // Salva os dados
            this.cartoes[numero] = cartao;
            this.salvarCartoes();

            // Adiciona ao histórico global
            this.adicionarAoHistorico('recarga', {
                cartao: numero,
                valor: valor,
                operador: operador,
                data: agora
            });

            console.log(`Recarga realizada: ${numero} - R$ ${valor.toFixed(2)} - Novo saldo: R$ ${novoSaldo.toFixed(2)}`);

            return {
                sucesso: true,
                cartao: cartao,
                transacao: transacao,
                mensagem: 'Recarga realizada com sucesso!'
            };

        } catch (error) {
            console.error('Erro na recarga:', error.message);
            return {
                sucesso: false,
                erro: error.message
            };
        }
    }

    /**
     * Realiza compra/débito no cartão
     * @param {string} numero - Número do cartão
     * @param {number} valor - Valor da compra
     * @param {Array} produtos - Lista de produtos comprados
     * @param {string} operador - Identificação do operador
     * @returns {Object} Resultado da operação
     */
    debitarCartao(numero, valor, produtos = [], operador = 'PDV') {
        try {
            // Validações
            if (!this.validarNumeroCartao(numero)) {
                throw new Error('Número de cartão inválido');
            }

            if (!valor || valor <= 0) {
                throw new Error('Valor de compra inválido');
            }

            const cartao = this.buscarCartao(numero);
            if (!cartao) {
                throw new Error('Cartão não encontrado');
            }

            if (!cartao.ativo) {
                throw new Error('Cartão bloqueado');
            }

            if (cartao.saldo < valor) {
                throw new Error(`Saldo insuficiente. Saldo atual: R$ ${cartao.saldo.toFixed(2)}`);
            }

            // Realiza o débito
            const saldoAnterior = cartao.saldo;
            const novoSaldo = saldoAnterior - valor;
            const agora = new Date().toISOString();

            // Atualiza dados do cartão
            cartao.saldo = novoSaldo;
            cartao.ultimaTransacao = agora;
            cartao.totalGastos += valor;

            // Cria registro da transação
            const transacao = {
                id: this.gerarIdTransacao(),
                tipo: 'compra',
                valor: -valor, // Valor negativo para débito
                saldoAnterior: saldoAnterior,
                saldoNovo: novoSaldo,
                data: agora,
                operador: operador,
                produtos: produtos,
                descricao: `Compra de R$ ${valor.toFixed(2)} - ${produtos.length} item(s)`
            };

            cartao.transacoes.push(transacao);

            // Salva os dados
            this.cartoes[numero] = cartao;
            this.salvarCartoes();

            // Adiciona ao histórico global
            this.adicionarAoHistorico('compra', {
                cartao: numero,
                valor: valor,
                produtos: produtos,
                operador: operador,
                data: agora
            });

            console.log(`Compra realizada: ${numero} - R$ ${valor.toFixed(2)} - Novo saldo: R$ ${novoSaldo.toFixed(2)}`);

            return {
                sucesso: true,
                cartao: cartao,
                transacao: transacao,
                mensagem: 'Compra realizada com sucesso!'
            };

        } catch (error) {
            console.error('Erro na compra:', error.message);
            return {
                sucesso: false,
                erro: error.message
            };
        }
    }

    /**
     * Corrige saldo do cartão (função administrativa)
     * @param {string} numero - Número do cartão
     * @param {number} novoSaldo - Novo saldo do cartão
     * @param {string} motivo - Motivo da correção
     * @param {string} operador - Operador que fez a correção
     * @returns {Object} Resultado da operação
     */
    corrigirSaldo(numero, novoSaldo, motivo, operador = 'ADMIN') {
        try {
            if (!this.validarNumeroCartao(numero)) {
                throw new Error('Número de cartão inválido');
            }

            if (novoSaldo < 0 || novoSaldo > 10000) {
                throw new Error('Valor de saldo inválido');
            }

            const cartao = this.buscarCartao(numero);
            if (!cartao) {
                throw new Error('Cartão não encontrado');
            }

            const saldoAnterior = cartao.saldo;
            const diferenca = novoSaldo - saldoAnterior;
            const agora = new Date().toISOString();

            // Atualiza saldo
            cartao.saldo = novoSaldo;
            cartao.ultimaTransacao = agora;

            // Cria registro da correção
            const transacao = {
                id: this.gerarIdTransacao(),
                tipo: 'correcao',
                valor: diferenca,
                saldoAnterior: saldoAnterior,
                saldoNovo: novoSaldo,
                data: agora,
                operador: operador,
                motivo: motivo,
                descricao: `Correção de saldo: ${diferenca >= 0 ? '+' : ''}R$ ${diferenca.toFixed(2)}`
            };

            cartao.transacoes.push(transacao);

            // Salva os dados
            this.cartoes[numero] = cartao;
            this.salvarCartoes();

            // Log de segurança
            this.adicionarAoHistorico('correcao', {
                cartao: numero,
                saldoAnterior: saldoAnterior,
                saldoNovo: novoSaldo,
                diferenca: diferenca,
                motivo: motivo,
                operador: operador,
                data: agora
            });

            console.log(`Correção de saldo: ${numero} - ${saldoAnterior.toFixed(2)} → ${novoSaldo.toFixed(2)}`);

            return {
                sucesso: true,
                cartao: cartao,
                transacao: transacao,
                mensagem: 'Saldo corrigido com sucesso!'
            };

        } catch (error) {
            console.error('Erro na correção:', error.message);
            return {
                sucesso: false,
                erro: error.message
            };
        }
    }

    /**
     * Obtém histórico de transações de um cartão
     * @param {string} numero - Número do cartão
     * @param {number} limite - Limite de transações (padrão: 10)
     * @returns {Array} Lista de transações
     */
    obterHistoricoCartao(numero, limite = 10) {
        const cartao = this.buscarCartao(numero);
        if (!cartao || !cartao.transacoes) {
            return [];
        }

        return cartao.transacoes
            .slice(-limite)
            .reverse(); // Mais recentes primeiro
    }

    /**
     * Obtém estatísticas do cartão
     * @param {string} numero - Número do cartão
     * @returns {Object} Estatísticas do cartão
     */
    obterEstatisticasCartao(numero) {
        const cartao = this.buscarCartao(numero);
        if (!cartao) {
            return null;
        }

        return {
            numero: cartao.numero,
            saldoAtual: cartao.saldo,
            totalRecargas: cartao.totalRecargas,
            totalGastos: cartao.totalGastos,
            quantidadeTransacoes: cartao.transacoes.length,
            dataCriacao: cartao.dataCriacao,
            ultimaTransacao: cartao.ultimaTransacao,
            ativo: cartao.ativo
        };
    }

    /**
     * Bloqueia ou desbloqueia cartão
     * @param {string} numero - Número do cartão
     * @param {boolean} bloquear - True para bloquear, false para desbloquear
     * @param {string} motivo - Motivo do bloqueio/desbloqueio
     * @param {string} operador - Operador responsável
     * @returns {Object} Resultado da operação
     */
    alterarStatusCartao(numero, bloquear, motivo, operador = 'ADMIN') {
        try {
            const cartao = this.buscarCartao(numero);
            if (!cartao) {
                throw new Error('Cartão não encontrado');
            }

            const statusAnterior = cartao.ativo;
            cartao.ativo = !bloquear;

            const transacao = {
                id: this.gerarIdTransacao(),
                tipo: bloquear ? 'bloqueio' : 'desbloqueio',
                valor: 0,
                saldoAnterior: cartao.saldo,
                saldoNovo: cartao.saldo,
                data: new Date().toISOString(),
                operador: operador,
                motivo: motivo,
                descricao: `Cartão ${bloquear ? 'bloqueado' : 'desbloqueado'}: ${motivo}`
            };

            cartao.transacoes.push(transacao);
            this.cartoes[numero] = cartao;
            this.salvarCartoes();

            return {
                sucesso: true,
                cartao: cartao,
                mensagem: `Cartão ${bloquear ? 'bloqueado' : 'desbloqueado'} com sucesso!`
            };

        } catch (error) {
            return {
                sucesso: false,
                erro: error.message
            };
        }
    }

    /**
     * Gera um novo número de cartão
     * @returns {string} Número do cartão gerado
     */
    gerarNumeroCartao() {
        let numero;
        do {
            // Gera 12 dígitos aleatórios após o prefixo
            const sufixo = Math.floor(Math.random() * 999999999999).toString().padStart(12, '0');
            numero = this.prefixoCartao + sufixo;
        } while (this.cartoes[numero]); // Garante que o número é único

        return numero;
    }

    /**
     * Gera ID único para transação
     * @returns {string} ID da transação
     */
    gerarIdTransacao() {
        return 'TXN_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Atualiza status do leitor NFC na interface
     * @param {string} status - Status (aguardando, lendo, sucesso, erro)
     * @param {string} texto - Texto a exibir
     * @param {string} icone - Classe do ícone
     */
    atualizarStatusNFC(status, texto, icone) {
        this.statusNFC = status;
        
        // Atualiza interface se o elemento existir
        const statusElement = document.getElementById('statusNFC');
        if (statusElement) {
            const cores = {
                'aguardando': '#6B7280',
                'lendo': '#2563EB',
                'sucesso': '#16A34A',
                'erro': '#DC2626'
            };

            statusElement.innerHTML = `
                <i class="${icone}" style="color: ${cores[status] || '#6B7280'}"></i>
                <span style="color: ${cores[status] || '#6B7280'}">${texto}</span>
            `;
        }
    }

    /**
     * Adiciona evento ao histórico global
     * @param {string} tipo - Tipo do evento
     * @param {Object} dados - Dados do evento
     */
    adicionarAoHistorico(tipo, dados) {
        const evento = {
            id: this.gerarIdTransacao(),
            tipo: tipo,
            dados: dados,
            timestamp: new Date().toISOString()
        };

        this.historico.push(evento);

        // Mantém apenas os últimos 1000 eventos
        if (this.historico.length > 1000) {
            this.historico = this.historico.slice(-1000);
        }

        this.salvarHistorico();
    }

    /**
     * Obtém relatórios e estatísticas gerais
     * @returns {Object} Relatórios do sistema
     */
    obterRelatorios() {
        const cartoes = Object.values(this.cartoes);
        const agora = new Date();
        const hoje = agora.toISOString().split('T')[0];

        // Estatísticas gerais
        const estatisticas = {
            totalCartoes: cartoes.length,
            cartoesAtivos: cartoes.filter(c => c.ativo).length,
            saldoTotalSistema: cartoes.reduce((total, c) => total + c.saldo, 0),
            totalRecarregadoSistema: cartoes.reduce((total, c) => total + c.totalRecargas, 0),
            totalGastoSistema: cartoes.reduce((total, c) => total + c.totalGastos, 0)
        };

        // Transações do dia
        const transacoesHoje = [];
        cartoes.forEach(cartao => {
            cartao.transacoes.forEach(transacao => {
                if (transacao.data.startsWith(hoje)) {
                    transacoesHoje.push({
                        ...transacao,
                        numeroCartao: cartao.numero
                    });
                }
            });
        });

        // Estatísticas do dia
        const estatisticasHoje = {
            totalTransacoes: transacoesHoje.length,
            totalRecargas: transacoesHoje.filter(t => t.tipo === 'recarga').reduce((total, t) => total + t.valor, 0),
            totalVendas: transacoesHoje.filter(t => t.tipo === 'compra').reduce((total, t) => total + Math.abs(t.valor), 0),
            recargas: transacoesHoje.filter(t => t.tipo === 'recarga').length,
            vendas: transacoesHoje.filter(t => t.tipo === 'compra').length
        };

        return {
            estatisticas,
            estatisticasHoje,
            transacoesHoje,
            ultimasTransacoes: this.historico.slice(-20).reverse()
        };
    }

    /**
     * Carrega cartões do localStorage
     * @returns {Object} Cartões salvos
     */
    carregarCartoes() {
        try {
            const dados = localStorage.getItem('caixaevent_cartoes');
            return dados ? JSON.parse(dados) : {};
        } catch (error) {
            console.error('Erro ao carregar cartões:', error);
            return {};
        }
    }

    /**
     * Salva cartões no localStorage
     */
    salvarCartoes() {
        try {
            localStorage.setItem('caixaevent_cartoes', JSON.stringify(this.cartoes));
        } catch (error) {
            console.error('Erro ao salvar cartões:', error);
        }
    }

    /**
     * Carrega histórico do localStorage
     * @returns {Array} Histórico salvo
     */
    carregarHistorico() {
        try {
            const dados = localStorage.getItem('caixaevent_historico');
            return dados ? JSON.parse(dados) : [];
        } catch (error) {
            console.error('Erro ao carregar histórico:', error);
            return [];
        }
    }

    /**
     * Salva histórico no localStorage
     */
    salvarHistorico() {
        try {
            localStorage.setItem('caixaevent_historico', JSON.stringify(this.historico));
        } catch (error) {
            console.error('Erro ao salvar histórico:', error);
        }
    }

    /**
     * Exporta dados para backup
     * @returns {Object} Dados para backup
     */
    exportarDados() {
        return {
            cartoes: this.cartoes,
            historico: this.historico,
            dataExportacao: new Date().toISOString(),
            versao: '1.0'
        };
    }

    /**
     * Importa dados de backup
     * @param {Object} dadosBackup - Dados do backup
     * @returns {boolean} Sucesso na importação
     */
    importarDados(dadosBackup) {
        try {
            if (dadosBackup.cartoes) {
                this.cartoes = dadosBackup.cartoes;
                this.salvarCartoes();
            }

            if (dadosBackup.historico) {
                this.historico = dadosBackup.historico;
                this.salvarHistorico();
            }

            console.log('Dados importados com sucesso');
            return true;
        } catch (error) {
            console.error('Erro ao importar dados:', error);
            return false;
        }
    }
}

// Instância global do gerenciador de cartões
const gerenciadorCartao = new GerenciadorCartao();

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

// Exporta o gerenciador para uso em outros arquivos
window.gerenciadorCartao = gerenciadorCartao;

console.log('Sistema de cartões CaixaEvent carregado com sucesso!');