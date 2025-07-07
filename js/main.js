// Arquivo: main.js - Controle da navegação principal e dashboard
// Sistema de Controle de Caixa para Eventos

/**
 * Classe principal para gerenciar o dashboard do CaixaEvent
 */
class DashboardPrincipal {
    constructor() {
        this.intervalosAtualizacao = {};
        this.dadosCache = {};
        this.consultaRapidaAberta = false;
        this.ultimaAtualizacao = new Date();
        this.inicializar();
    }

    /**
     * Inicializa o dashboard principal
     */
    inicializar() {
        console.log('Dashboard principal inicializado');
        this.configurarEventos();
        this.iniciarRelogios();
        this.carregarDashboard();
        this.configurarAtualizacaoAutomatica();
        this.verificarEstadoSistema();
    }

    /**
     * Configura eventos dos elementos da página
     */
    configurarEventos() {
        // Consulta rápida
        const inputCartaoRapido = document.getElementById('numeroCartaoRapido');
        if (inputCartaoRapido) {
            inputCartaoRapido.addEventListener('input', (e) => {
                this.formatarNumeroCartao(e.target);
            });

            inputCartaoRapido.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.consultarCartaoRapido();
                }
            });
        }

        // Atalhos de teclado
        document.addEventListener('keydown', (e) => {
            this.gerenciarAtalhosTeclado(e);
        });

        // Detecta quando a janela ganha foco para atualizar dados
        window.addEventListener('focus', () => {
            this.atualizarDashboard();
        });

        // Detecta mudanças de visibilidade da página
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.atualizarDashboard();
            }
        });
    }

    /**
     * Inicia relógios e contadores de tempo
     */
    iniciarRelogios() {
        // Relógio principal
        this.atualizarRelogio();
        this.intervalosAtualizacao.relogio = setInterval(() => {
            this.atualizarRelogio();
        }, 1000);

        // Uptime do sistema
        this.iniciarContadorUptime();
    }

    /**
     * Atualiza relógio no header
     */
    atualizarRelogio() {
        const agora = new Date();
        const horaFormatada = agora.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        
        const dataFormatada = agora.toLocaleDateString('pt-BR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const elementoTempo = document.getElementById('currentTime');
        if (elementoTempo) {
            elementoTempo.innerHTML = `
                <div class="time">${horaFormatada}</div>
                <div class="date">${dataFormatada}</div>
            `;
        }
    }

    /**
     * Inicia contador de uptime do sistema
     */
    iniciarContadorUptime() {
        const inicioSistema = localStorage.getItem('caixaevent_inicio_sistema') || new Date().toISOString();
        if (!localStorage.getItem('caixaevent_inicio_sistema')) {
            localStorage.setItem('caixaevent_inicio_sistema', inicioSistema);
        }

        this.intervalosAtualizacao.uptime = setInterval(() => {
            this.atualizarUptime(new Date(inicioSistema));
        }, 60000); // Atualiza a cada minuto

        // Atualiza imediatamente
        this.atualizarUptime(new Date(inicioSistema));
    }

    /**
     * Atualiza contador de uptime
     * @param {Date} inicioSistema - Data de início do sistema
     */
    atualizarUptime(inicioSistema) {
        const agora = new Date();
        const tempoUptime = agora - inicioSistema;
        const horas = Math.floor(tempoUptime / (1000 * 60 * 60));
        
        const elementoUptime = document.getElementById('systemUptime');
        if (elementoUptime) {
            if (horas < 24) {
                elementoUptime.textContent = `${horas}h online`;
            } else {
                const dias = Math.floor(horas / 24);
                elementoUptime.textContent = `${dias}d online`;
            }
        }
    }

    /**
     * Carrega dados do dashboard
     */
    async carregarDashboard() {
        try {
            this.mostrarLoading('Carregando dashboard...');
            
            // Aguarda o gerenciador de cartões estar disponível
            await this.aguardarGerenciadorCartao();
            
            // Carrega todas as seções
            await Promise.all([
                this.atualizarEstatisticas(),
                this.atualizarAtividadesRecentes(),
                this.atualizarAlertas(),
                this.atualizarNavegacao()
            ]);

            this.atualizarUltimaAtualizacao();
            
        } catch (error) {
            console.error('Erro ao carregar dashboard:', error);
            this.mostrarErro('Erro ao carregar dados do dashboard');
        } finally {
            this.esconderLoading();
        }
    }

    /**
     * Aguarda o gerenciador de cartões estar disponível
     * @returns {Promise} Promise que resolve quando o gerenciador estiver pronto
     */
    aguardarGerenciadorCartao() {
        return new Promise((resolve) => {
            if (typeof gerenciadorCartao !== 'undefined') {
                resolve();
                return;
            }

            const interval = setInterval(() => {
                if (typeof gerenciadorCartao !== 'undefined') {
                    clearInterval(interval);
                    resolve();
                }
            }, 100);

            // Timeout após 5 segundos
            setTimeout(() => {
                clearInterval(interval);
                resolve();
            }, 5000);
        });
    }

    /**
     * Atualiza estatísticas do dashboard
     */
    async atualizarEstatisticas() {
        try {
            const relatorios = gerenciadorCartao.obterRelatorios();
            const { estatisticas, estatisticasHoje } = relatorios;

            // Total de vendas hoje
            this.atualizarElemento('totalVendasHoje', 
                this.formatarMoeda(estatisticasHoje.totalVendas));

            // Cartões ativos
            this.atualizarElemento('cartoesAtivos', estatisticas.cartoesAtivos);
            this.atualizarElemento('totalCartoes', `Total: ${estatisticas.totalCartoes} cartões`);

            // Saldo total do sistema
            this.atualizarElemento('saldoTotalSistema', 
                this.formatarMoeda(estatisticas.saldoTotalSistema));
            this.atualizarElemento('recargasHoje', 
                `Recargas hoje: ${this.formatarMoeda(estatisticasHoje.totalRecargas)}`);

            // Produtos em alerta
            const alertasProdutos = await this.obterAlertasProdutos();
            this.atualizarElemento('produtosAlerta', alertasProdutos.total);
            this.atualizarElemento('totalProdutos', 
                `Total: ${alertasProdutos.totalProdutos} produtos`);

            // Calcula e exibe mudança percentual das vendas
            this.calcularMudancaVendas(estatisticasHoje.totalVendas);

            // Cache dos dados para comparação futura
            this.dadosCache.ultimasEstatisticas = { estatisticas, estatisticasHoje };

        } catch (error) {
            console.error('Erro ao atualizar estatísticas:', error);
        }
    }

    /**
     * Obtém alertas de produtos (estoque baixo/zero)
     * @returns {Promise<Object>} Dados dos alertas de produtos
     */
    async obterAlertasProdutos() {
        try {
            const produtos = JSON.parse(localStorage.getItem('caixaevent_produtos') || '{}');
            const produtosArray = Object.values(produtos);
            
            const semEstoque = produtosArray.filter(p => p.estoque === 0).length;
            const estoqueBaixo = produtosArray.filter(p => 
                p.estoque > 0 && p.estoque <= (p.estoqueMinimo || 10)
            ).length;

            return {
                total: semEstoque + estoqueBaixo,
                semEstoque,
                estoqueBaixo,
                totalProdutos: produtosArray.length
            };
        } catch (error) {
            console.error('Erro ao obter alertas de produtos:', error);
            return { total: 0, semEstoque: 0, estoqueBaixo: 0, totalProdutos: 0 };
        }
    }

    /**
     * Calcula mudança percentual das vendas
     * @param {number} vendasHoje - Total de vendas hoje
     */
    calcularMudancaVendas(vendasHoje) {
        // Simula comparação com dia anterior (em produção seria com dados reais)
        const vendasOntem = this.dadosCache.vendasOntem || (vendasHoje * 0.85);
        let percentual = 0;
        let classe = 'positive';
        let icone = 'fas fa-arrow-up';

        if (vendasOntem > 0) {
            percentual = ((vendasHoje - vendasOntem) / vendasOntem * 100);
            
            if (percentual < 0) {
                classe = 'negative';
                icone = 'fas fa-arrow-down';
            }
        }

        const elementoChange = document.getElementById('changeVendas');
        const elementoPercentual = document.getElementById('percentualVendas');

        if (elementoChange && elementoPercentual) {
            elementoChange.className = `stat-change ${classe}`;
            elementoChange.querySelector('i').className = icone;
            elementoPercentual.textContent = `${percentual >= 0 ? '+' : ''}${percentual.toFixed(1)}%`;
        }
    }

    /**
     * Atualiza seção de atividades recentes
     */
    async atualizarAtividadesRecentes() {
        try {
            await Promise.all([
                this.atualizarUltimasTransacoes(),
                this.atualizarProdutosMaisVendidos()
            ]);
        } catch (error) {
            console.error('Erro ao atualizar atividades recentes:', error);
        }
    }

    /**
     * Atualiza últimas transações
     */
    atualizarUltimasTransacoes() {
        const container = document.getElementById('ultimasTransacoes');
        if (!container) return;

        try {
            const relatorios = gerenciadorCartao.obterRelatorios();
            const transacoes = relatorios.ultimasTransacoes.slice(0, 5);

            if (transacoes.length === 0) {
                container.innerHTML = `
                    <div class="activity-item empty">
                        <i class="fas fa-info-circle"></i>
                        <span>Nenhuma transação hoje</span>
                    </div>
                `;
                return;
            }

            container.innerHTML = transacoes.map(transacao => {
                const tempo = this.calcularTempoDecorrido(transacao.timestamp);
                const tipo = this.formatarTipoTransacao(transacao.tipo);
                const icone = this.obterIconeTransacao(transacao.tipo);
                
                return `
                    <div class="activity-item ${transacao.tipo}">
                        <i class="${icone}"></i>
                        <div class="activity-content">
                            <div class="activity-title">${tipo}</div>
                            <div class="activity-time">${tempo}</div>
                        </div>
                        <div class="activity-value">
                            ${this.formatarValorTransacao(transacao)}
                        </div>
                    </div>
                `;
            }).join('');

        } catch (error) {
            container.innerHTML = `
                <div class="activity-item error">
                    <i class="fas fa-exclamation-circle"></i>
                    <span>Erro ao carregar transações</span>
                </div>
            `;
        }
    }

    /**
     * Atualiza produtos mais vendidos
     */
    atualizarProdutosMaisVendidos() {
        const container = document.getElementById('produtosMaisVendidos');
        if (!container) return;

        try {
            const produtos = this.calcularProdutosMaisVendidos();

            if (produtos.length === 0) {
                container.innerHTML = `
                    <div class="activity-item empty">
                        <i class="fas fa-box-open"></i>
                        <span>Nenhuma venda registrada</span>
                    </div>
                `;
                return;
            }

            container.innerHTML = produtos.slice(0, 3).map((produto, index) => `
                <div class="activity-item product-rank-${index + 1}">
                    <div class="rank-badge">${index + 1}º</div>
                    <div class="activity-content">
                        <div class="activity-title">${produto.nome}</div>
                        <div class="activity-detail">${produto.quantidadeVendida} vendidos</div>
                    </div>
                    <div class="activity-value">
                        ${this.formatarMoeda(produto.totalVendido)}
                    </div>
                </div>
            `).join('');

        } catch (error) {
            container.innerHTML = `
                <div class="activity-item error">
                    <i class="fas fa-exclamation-circle"></i>
                    <span>Erro ao carregar produtos</span>
                </div>
            `;
        }
    }

    /**
     * Calcula produtos mais vendidos baseado nas transações
     * @returns {Array} Lista de produtos ordenada por vendas
     */
    calcularProdutosMaisVendidos() {
        try {
            const produtos = JSON.parse(localStorage.getItem('caixaevent_produtos') || '{}');
            const produtosVendas = {};

            // Analisa transações de compra para contar vendas
            Object.values(gerenciadorCartao.cartoes).forEach(cartao => {
                cartao.transacoes
                    .filter(t => t.tipo === 'compra' && t.produtos)
                    .forEach(transacao => {
                        transacao.produtos.forEach(produto => {
                            if (!produtosVendas[produto.id]) {
                                produtosVendas[produto.id] = {
                                    id: produto.id,
                                    nome: produto.nome,
                                    quantidadeVendida: 0,
                                    totalVendido: 0
                                };
                            }
                            produtosVendas[produto.id].quantidadeVendida += produto.quantidade;
                            produtosVendas[produto.id].totalVendido += produto.preco * produto.quantidade;
                        });
                    });
            });

            return Object.values(produtosVendas)
                .sort((a, b) => b.quantidadeVendida - a.quantidadeVendida);

        } catch (error) {
            console.error('Erro ao calcular produtos mais vendidos:', error);
            return [];
        }
    }

    /**
     * Atualiza alertas do sistema
     */
    async atualizarAlertas() {
        const container = document.getElementById('alertasSistema');
        if (!container) return;

        try {
            const alertas = await this.obterAlertasSistema();

            if (alertas.length === 0) {
                container.innerHTML = `
                    <div class="activity-item success">
                        <i class="fas fa-check-circle"></i>
                        <span>Sistema funcionando normalmente</span>
                    </div>
                `;
                return;
            }

            container.innerHTML = alertas.slice(0, 3).map(alerta => `
                <div class="activity-item ${alerta.tipo}">
                    <i class="${alerta.icone}"></i>
                    <div class="activity-content">
                        <div class="activity-title">${alerta.titulo}</div>
                        <div class="activity-detail">${alerta.descricao}</div>
                    </div>
                </div>
            `).join('');

        } catch (error) {
            container.innerHTML = `
                <div class="activity-item error">
                    <i class="fas fa-exclamation-circle"></i>
                    <span>Erro ao carregar alertas</span>
                </div>
            `;
        }
    }

    /**
     * Obtém alertas do sistema
     * @returns {Promise<Array>} Lista de alertas
     */
    async obterAlertasSistema() {
        const alertas = [];

        try {
            // Verifica produtos com estoque baixo
            const alertasProdutos = await this.obterAlertasProdutos();
            
            if (alertasProdutos.semEstoque > 0) {
                alertas.push({
                    tipo: 'warning',
                    icone: 'fas fa-exclamation-triangle',
                    titulo: 'Produtos sem estoque',
                    descricao: `${alertasProdutos.semEstoque} produto(s) sem estoque`
                });
            }

            if (alertasProdutos.estoqueBaixo > 0) {
                alertas.push({
                    tipo: 'info',
                    icone: 'fas fa-info-circle',
                    titulo: 'Estoque baixo',
                    descricao: `${alertasProdutos.estoqueBaixo} produto(s) com estoque baixo`
                });
            }

            // Verifica cartões inativos
            const estatisticas = gerenciadorCartao.obterRelatorios().estatisticas;
            const cartoesInativos = estatisticas.totalCartoes - estatisticas.cartoesAtivos;
            
            if (cartoesInativos > 0) {
                alertas.push({
                    tipo: 'info',
                    icone: 'fas fa-credit-card',
                    titulo: 'Cartões bloqueados',
                    descricao: `${cartoesInativos} cartão(s) bloqueado(s)`
                });
            }

            // Verifica se há muito saldo parado no sistema
            if (estatisticas.saldoTotalSistema > 10000) {
                alertas.push({
                    tipo: 'info',
                    icone: 'fas fa-wallet',
                    titulo: 'Alto saldo no sistema',
                    descricao: `${this.formatarMoeda(estatisticas.saldoTotalSistema)} em cartões`
                });
            }

        } catch (error) {
            console.error('Erro ao obter alertas do sistema:', error);
        }

        return alertas;
    }

    /**
     * Atualiza estatísticas da navegação
     */
    atualizarNavegacao() {
        try {
            const relatorios = gerenciadorCartao.obterRelatorios();
            const { estatisticasHoje } = relatorios;

            // Recargas hoje
            this.atualizarElemento('recargasHojeCount', 
                `${estatisticasHoje.recargas} recargas hoje`);

            // Vendas hoje
            this.atualizarElemento('vendasHojeCount', 
                `${estatisticasHoje.vendas} vendas hoje`);

            // Alertas de estoque
            this.obterAlertasProdutos().then(alertas => {
                this.atualizarElemento('alertasEstoque', 
                    alertas.total > 0 ? `${alertas.total} alertas de estoque` : 'Estoque OK');
            });

        } catch (error) {
            console.error('Erro ao atualizar navegação:', error);
        }
    }

    /**
     * Configura atualização automática do dashboard
     */
    configurarAtualizacaoAutomatica() {
        // Atualiza a cada 30 segundos
        this.intervalosAtualizacao.dashboard = setInterval(() => {
            this.atualizarDashboard(true); // true = atualização silenciosa
        }, 30000);

        // Atualiza atividades recentes a cada 15 segundos
        this.intervalosAtualizacao.atividades = setInterval(() => {
            this.atualizarAtividadesRecentes();
        }, 15000);
    }

    /**
     * Atualiza dashboard completo
     * @param {boolean} silenciosa - Se deve ser uma atualização silenciosa
     */
    async atualizarDashboard(silenciosa = false) {
        try {
            if (!silenciosa) {
                this.mostrarLoading('Atualizando dashboard...');
            }

            await this.carregarDashboard();
            
            if (!silenciosa) {
                this.mostrarSucesso('Dashboard atualizado!');
            }

        } catch (error) {
            console.error('Erro ao atualizar dashboard:', error);
            if (!silenciosa) {
                this.mostrarErro('Erro ao atualizar dashboard');
            }
        } finally {
            if (!silenciosa) {
                this.esconderLoading();
            }
        }
    }

    /**
     * Abre modal de consulta rápida
     */
    abrirConsultaRapida() {
        const modal = document.getElementById('modalConsultaRapida');
        if (modal) {
            modal.style.display = 'flex';
            this.consultaRapidaAberta = true;
            
            // Foca no input
            setTimeout(() => {
                const input = document.getElementById('numeroCartaoRapido');
                if (input) input.focus();
            }, 100);
        }
    }

    /**
     * Fecha modal de consulta rápida
     */
    fecharConsultaRapida() {
        const modal = document.getElementById('modalConsultaRapida');
        if (modal) {
            modal.style.display = 'none';
            this.consultaRapidaAberta = false;
            
            // Limpa campos
            document.getElementById('numeroCartaoRapido').value = '';
            const resultado = document.getElementById('resultadoConsultaRapida');
            if (resultado) {
                resultado.style.display = 'none';
            }
        }
    }

    /**
     * Consulta cartão rápida
     */
    consultarCartaoRapido() {
        const numeroCartao = document.getElementById('numeroCartaoRapido').value.replace(/\D/g, '');
        
        if (!numeroCartao || numeroCartao.length !== 16) {
            this.mostrarErro('Digite um número de cartão válido (16 dígitos)');
            return;
        }

        const cartao = gerenciadorCartao.buscarCartao(numeroCartao);
        if (!cartao) {
            this.mostrarErro('Cartão não encontrado');
            return;
        }

        this.exibirResultadoConsultaRapida(cartao);
    }

    /**
     * Lê cartão via NFC na consulta rápida
     */
    async lerCartaoNFCRapido() {
        try {
            const resultado = await gerenciadorCartao.simularLeituraNFC();
            if (resultado.sucesso) {
                document.getElementById('numeroCartaoRapido').value = 
                    this.formatarNumeroExibicao(resultado.numero);
                this.consultarCartaoRapido();
            }
        } catch (error) {
            this.mostrarErro('Erro na leitura NFC');
        }
    }

    /**
     * Exibe resultado da consulta rápida
     * @param {Object} cartao - Dados do cartão
     */
    exibirResultadoConsultaRapida(cartao) {
        const container = document.getElementById('resultadoConsultaRapida');
        if (!container) return;

        const ultimaTransacao = cartao.transacoes[cartao.transacoes.length - 1];
        
        container.innerHTML = `
            <div class="consulta-info">
                <div class="consulta-saldo">
                    <div class="saldo-label">Saldo Atual</div>
                    <div class="saldo-value">${this.formatarMoeda(cartao.saldo)}</div>
                </div>
                
                <div class="consulta-detalhes">
                    <div class="detalhe-item">
                        <span>Cartão:</span>
                        <strong>**** ${cartao.numero.slice(-4)}</strong>
                    </div>
                    <div class="detalhe-item">
                        <span>Status:</span>
                        <span class="status-badge ${cartao.ativo ? 'active' : 'inactive'}">
                            ${cartao.ativo ? 'Ativo' : 'Bloqueado'}
                        </span>
                    </div>
                    <div class="detalhe-item">
                        <span>Total recarregado:</span>
                        <strong>${this.formatarMoeda(cartao.totalRecargas)}</strong>
                    </div>
                    <div class="detalhe-item">
                        <span>Total gasto:</span>
                        <strong>${this.formatarMoeda(cartao.totalGastos)}</strong>
                    </div>
                    ${ultimaTransacao ? `
                        <div class="detalhe-item">
                            <span>Última transação:</span>
                            <strong>${this.formatarDataHora(ultimaTransacao.data)}</strong>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
        
        container.style.display = 'block';
    }

    /**
     * Gera relatório rápido do dia
     */
    gerarRelatorioRapido() {
        try {
            const relatorios = gerenciadorCartao.obterRelatorios();
            const { estatisticas, estatisticasHoje } = relatorios;
            
            const relatorio = {
                data: new Date().toISOString(),
                resumoDia: {
                    totalVendas: estatisticasHoje.totalVendas,
                    totalRecargas: estatisticasHoje.totalRecargas,
                    numeroTransacoes: estatisticasHoje.totalTransacoes,
                    saldoLiquido: estatisticasHoje.totalRecargas - estatisticasHoje.totalVendas
                },
                estatisticasGerais: {
                    totalCartoes: estatisticas.totalCartoes,
                    cartoesAtivos: estatisticas.cartoesAtivos,
                    saldoTotalSistema: estatisticas.saldoTotalSistema
                },
                produtosMaisVendidos: this.calcularProdutosMaisVendidos().slice(0, 5)
            };

            // Download do relatório
            this.downloadJSON(relatorio, `relatorio_rapido_${new Date().toISOString().split('T')[0]}.json`);
            this.mostrarSucesso('Relatório gerado com sucesso!');

        } catch (error) {
            console.error('Erro ao gerar relatório:', error);
            this.mostrarErro('Erro ao gerar relatório');
        }
    }

    /**
     * Verifica estado geral do sistema
     */
    verificarEstadoSistema() {
        try {
            const problemas = [];

            // Verifica se há dados básicos
            if (Object.keys(gerenciadorCartao.cartoes).length === 0) {
                problemas.push('Nenhum cartão cadastrado no sistema');
            }

            const produtos = JSON.parse(localStorage.getItem('caixaevent_produtos') || '{}');
            if (Object.keys(produtos).length === 0) {
                problemas.push('Nenhum produto cadastrado no estoque');
            }

            // Exibe avisos se necessário
            if (problemas.length > 0) {
                console.warn('Avisos do sistema:', problemas);
            }

        } catch (error) {
            console.error('Erro ao verificar estado do sistema:', error);
        }
    }

    /**
     * Gerencia atalhos de teclado
     * @param {KeyboardEvent} e - Evento do teclado
     */
    gerenciarAtalhosTeclado(e) {
        // Ctrl/Cmd + teclas
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 'r':
                    e.preventDefault();
                    window.location.href = 'pages/recarga.html';
                    break;
                case 'v':
                    e.preventDefault();
                    window.location.href = 'pages/vendas.html';
                    break;
                case 'c':
                    e.preventDefault();
                    this.abrirConsultaRapida();
                    break;
                case 'u':
                    e.preventDefault();
                    this.atualizarDashboard();
                    break;
            }
        }

        // ESC para fechar modais
        if (e.key === 'Escape' && this.consultaRapidaAberta) {
            this.fecharConsultaRapida();
        }
    }

    /**
     * Atualiza timestamp da última atualização
     */
    atualizarUltimaAtualizacao() {
        this.ultimaAtualizacao = new Date();
        const elemento = document.getElementById('lastUpdate');
        if (elemento) {
            elemento.textContent = this.ultimaAtualizacao.toLocaleTimeString('pt-BR');
        }
    }

    // ========== FUNÇÕES UTILITÁRIAS ==========

    /**
     * Formata valor monetário
     * @param {number} valor - Valor a formatar
     * @returns {string} Valor formatado
     */
    formatarMoeda(valor) {
        return `R$ ${valor.toFixed(2).replace('.', ',')}`;
    }

    /**
     * Formata número do cartão durante digitação
     * @param {HTMLElement} input - Input do cartão
     */
    formatarNumeroCartao(input) {
        let valor = input.value.replace(/\D/g, '');
        
        if (valor.length > 16) {
            valor = valor.substring(0, 16);
        }

        valor = valor.replace(/(\d{4})(?=\d)/g, '$1 ');
        input.value = valor;
    }

    /**
     * Formata número para exibição
     * @param {string} numero - Número do cartão
     * @returns {string} Número formatado
     */
    formatarNumeroExibicao(numero) {
        return numero.replace(/(\d{4})(?=\d)/g, '$1 ');
    }

    /**
     * Formata data e hora
     * @param {string} dataISO - Data em formato ISO
     * @returns {string} Data formatada
     */
    formatarDataHora(dataISO) {
        return new Date(dataISO).toLocaleString('pt-BR');
    }

    /**
     * Calcula tempo decorrido desde uma data
     * @param {string} dataISO - Data em formato ISO
     * @returns {string} Tempo decorrido formatado
     */
    calcularTempoDecorrido(dataISO) {
        const agora = new Date();
        const data = new Date(dataISO);
        const diferenca = agora - data;

        const minutos = Math.floor(diferenca / (1000 * 60));
        const horas = Math.floor(diferenca / (1000 * 60 * 60));
        const dias = Math.floor(diferenca / (1000 * 60 * 60 * 24));

        if (dias > 0) return `${dias}d atrás`;
        if (horas > 0) return `${horas}h atrás`;
        if (minutos > 0) return `${minutos}min atrás`;
        return 'Agora mesmo';
    }

    /**
     * Formata tipo de transação
     * @param {string} tipo - Tipo da transação
     * @returns {string} Tipo formatado
     */
    formatarTipoTransacao(tipo) {
        const tipos = {
            'recarga': 'Recarga',
            'compra': 'Venda',
            'correcao': 'Correção',
            'bloqueio': 'Bloqueio',
            'desbloqueio': 'Desbloqueio'
        };
        return tipos[tipo] || tipo;
    }

    /**
     * Obtém ícone para tipo de transação
     * @param {string} tipo - Tipo da transação
     * @returns {string} Classe do ícone
     */
    obterIconeTransacao(tipo) {
        const icones = {
            'recarga': 'fas fa-plus-circle',
            'compra': 'fas fa-shopping-cart',
            'correcao': 'fas fa-edit',
            'bloqueio': 'fas fa-ban',
            'desbloqueio': 'fas fa-unlock'
        };
        return icones[tipo] || 'fas fa-exchange-alt';
    }

    /**
     * Formata valor da transação
     * @param {Object} transacao - Dados da transação
     * @returns {string} Valor formatado
     */
    formatarValorTransacao(transacao) {
        if (transacao.tipo === 'recarga') {
            return `+${this.formatarMoeda(transacao.dados.valor)}`;
        } else if (transacao.tipo === 'compra') {
            return `-${this.formatarMoeda(transacao.dados.valor)}`;
        }
        return this.formatarMoeda(Math.abs(transacao.dados.valor || 0));
    }

    /**
     * Atualiza elemento na interface
     * @param {string} id - ID do elemento
     * @param {string|number} valor - Valor a exibir
     */
    atualizarElemento(id, valor) {
        const elemento = document.getElementById(id);
        if (elemento) {
            elemento.textContent = valor;
        }
    }

    /**
     * Faz download de objeto JSON
     * @param {Object} objeto - Objeto para download
     * @param {string} nomeArquivo - Nome do arquivo
     */
    downloadJSON(objeto, nomeArquivo) {
        const dataStr = JSON.stringify(objeto, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = nomeArquivo;
        link.click();
    }

    /**
     * Mostra overlay de loading
     * @param {string} texto - Texto do loading
     */
    mostrarLoading(texto = 'Carregando...') {
        const overlay = document.getElementById('loadingOverlay');
        const textoElement = document.getElementById('loadingText');
        
        if (overlay) {
            if (textoElement) textoElement.textContent = texto;
            overlay.style.display = 'flex';
        }
    }

    /**
     * Esconde overlay de loading
     */
    esconderLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    /**
     * Mostra mensagem de erro
     * @param {string} mensagem - Mensagem de erro
     */
    mostrarErro(mensagem) {
        console.error('Erro no dashboard:', mensagem);
        // Em produção implementar toast/notificação
        alert(`❌ ${mensagem}`);
    }

    /**
     * Mostra mensagem de sucesso
     * @param {string} mensagem - Mensagem de sucesso
     */
    mostrarSucesso(mensagem) {
        console.log('Sucesso:', mensagem);
        // Em produção implementar toast/notificação
    }

    /**
     * Destrói intervalos ao sair da página
     */
    destruir() {
        Object.values(this.intervalosAtualizacao).forEach(interval => {
            clearInterval(interval);
        });
    }
}

// Funções globais para compatibilidade com HTML
window.atualizarDashboard = function() {
    if (dashboardPrincipal) {
        dashboardPrincipal.atualizarDashboard();
    }
};

window.abrirConsultaRapida = function() {
    if (dashboardPrincipal) {
        dashboardPrincipal.abrirConsultaRapida();
    }
};

window.fecharConsultaRapida = function() {
    if (dashboardPrincipal) {
        dashboardPrincipal.fecharConsultaRapida();
    }
};

window.consultarCartaoRapido = function() {
    if (dashboardPrincipal) {
        dashboardPrincipal.consultarCartaoRapido();
    }
};

window.lerCartaoNFCRapido = function() {
    if (dashboardPrincipal) {
        dashboardPrincipal.lerCartaoNFCRapido();
    }
};

window.gerarRelatorioRapido = function() {
    if (dashboardPrincipal) {
        dashboardPrincipal.gerarRelatorioRapido();
    }
};

// Instância global do dashboard
let dashboardPrincipal;

// Inicializa quando DOM carregar
document.addEventListener('DOMContentLoaded', function() {
    // Aguarda o gerenciador de cartões estar disponível
    if (typeof gerenciadorCartao !== 'undefined') {
        dashboardPrincipal = new DashboardPrincipal();
    } else {
        // Tenta novamente após 100ms
        setTimeout(() => {
            dashboardPrincipal = new DashboardPrincipal();
        }, 100);
    }
});

// Cleanup ao sair da página
window.addEventListener('beforeunload', function() {
    if (dashboardPrincipal) {
        dashboardPrincipal.destruir();
    }
});

console.log('Sistema principal CaixaEvent carregado com sucesso!'); 