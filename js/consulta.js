// Arquivo: consulta.js - Controle da página de consulta de saldo
// Sistema de Controle de Caixa para Eventos

/**
 * Classe para gerenciar a página de consulta de saldo
 */
class PaginaConsulta {
    constructor() {
        this.cartaoAtual = null;
        this.consultasRecentes = this.carregarConsultasRecentes();
        this.transacoesFiltradas = [];
        this.transacoesCarregadas = 10;
        this.filtroAtivo = 'todas';
        this.processandoConsulta = false;
        this.inicializar();
    }

    /**
     * Inicializa a página de consulta
     */
    inicializar() {
        console.log('Página de consulta inicializada');
        this.configurarEventos();
        this.atualizarConsultasRecentes();
        this.atualizarContadorConsultas();
        this.verificarCartaoPreenchido();
    }

    /**
     * Configura eventos dos elementos da página
     */
    configurarEventos() {
        // Input do cartão
        const inputCartao = document.getElementById('numeroCartao');
        if (inputCartao) {
            inputCartao.addEventListener('input', (e) => {
                this.formatarNumeroCartao(e.target);
            });

            inputCartao.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.lerCartaoManual();
                }
            });
        }

        // Filtro de transações
        const filtroTransacoes = document.getElementById('filtroTransacoes');
        if (filtroTransacoes) {
            filtroTransacoes.addEventListener('change', () => {
                this.filtrarTransacoes();
            });
        }

        // Configurar callback para leitura de cartão
        window.onCartaoLido = (resultado) => {
            this.processarCartaoLido(resultado);
        };

        window.onErroLeitura = (erro) => {
            this.mostrarErro('Erro na leitura do cartão. Tente novamente.');
        };

        // Detecta quando a janela ganha foco para atualizar
        window.addEventListener('focus', () => {
            if (this.cartaoAtual) {
                this.atualizarDadosCartao();
            }
        });
    }

    /**
     * Verifica se há cartão pré-preenchido (vindo de outras páginas)
     */
    verificarCartaoPreenchido() {
        const cartaoPreenchido = localStorage.getItem('cartao_preenchido');
        if (cartaoPreenchido) {
            const inputCartao = document.getElementById('numeroCartao');
            if (inputCartao) {
                inputCartao.value = this.formatarNumeroExibicao(cartaoPreenchido);
                setTimeout(() => {
                    this.lerCartaoManual();
                }, 500);
            }
            localStorage.removeItem('cartao_preenchido');
        }
    }

    /**
     * Lê cartão via NFC simulado
     */
    async lerCartaoNFC() {
        if (this.processandoConsulta) return;

        try {
            this.processandoConsulta = true;
            this.mostrarLoading('Aguarde, lendo cartão...');
            
            const resultado = await window.lerCartaoNFC();
            this.processarCartaoLido(resultado);
            
        } catch (error) {
            console.error('Erro na leitura NFC:', error);
            this.mostrarErro('Erro na leitura NFC. Tente novamente ou digite o número manualmente.');
        } finally {
            this.processandoConsulta = false;
            this.esconderLoading();
        }
    }

    /**
     * Lê cartão via input manual
     */
    lerCartaoManual() {
        if (this.processandoConsulta) return;

        const numeroCartao = document.getElementById('numeroCartao').value.replace(/\D/g, '');
        
        if (!numeroCartao) {
            this.mostrarErro('Digite o número do cartão');
            this.focarInputCartao();
            return;
        }

        if (numeroCartao.length !== 16) {
            this.mostrarErro('Número do cartão deve ter 16 dígitos');
            this.focarInputCartao();
            return;
        }

        this.processandoConsulta = true;
        this.mostrarLoading('Consultando cartão...');

        // Simula delay de consulta
        setTimeout(() => {
            const resultado = {
                sucesso: true,
                numero: numeroCartao,
                timestamp: new Date().toISOString(),
                metodo: 'manual'
            };

            this.processarCartaoLido(resultado);
            this.processandoConsulta = false;
            this.esconderLoading();
        }, 800);
    }

    /**
     * Processa cartão lido (NFC ou manual)
     * @param {Object} resultado - Resultado da leitura
     */
    processarCartaoLido(resultado) {
        if (!resultado.sucesso) {
            this.mostrarErro('Falha na leitura do cartão');
            return;
        }

        try {
            // Busca dados do cartão
            const dadosCartao = window.buscarCartao(resultado.numero);
            if (!dadosCartao) {
                this.mostrarErro('Cartão não encontrado no sistema');
                this.mostrarSugestaoCartaoNovo(resultado.numero);
                return;
            }

            // Armazena cartão atual
            this.cartaoAtual = dadosCartao;

            // Atualiza interface
            this.exibirResultadosConsulta();
            
            // Adiciona à lista de consultas recentes
            this.adicionarConsultaRecente(dadosCartao);

            // Preenche o input se veio de NFC
            if (resultado.metodo === 'nfc_simulado') {
                document.getElementById('numeroCartao').value = this.formatarNumeroExibicao(resultado.numero);
            }

            this.mostrarSucesso('Cartão consultado com sucesso!');

        } catch (error) {
            console.error('Erro ao processar cartão:', error);
            this.mostrarErro('Erro interno ao consultar cartão');
        }
    }

    /**
     * Mostra sugestão para cartão não encontrado
     * @param {string} numeroCartao - Número do cartão não encontrado
     */
    mostrarSugestaoCartaoNovo(numeroCartao) {
        const confirmacao = confirm(`Cartão ${this.formatarNumeroExibicao(numeroCartao)} não encontrado.\n\nDeseja criar um novo cartão com este número?`);
        
        if (confirmacao) {
            // Redireciona para recarga com cartão novo
            localStorage.setItem('cartao_novo', numeroCartao);
            window.location.href = 'recarga.html';
        }
    }

    /**
     * Exibe resultados da consulta na interface
     */
    exibirResultadosConsulta() {
        if (!this.cartaoAtual) return;

        const cartao = this.cartaoAtual;
        
        // Mostra seção de resultados
        const secaoResultados = document.getElementById('consultationResults');
        if (secaoResultados) {
            secaoResultados.style.display = 'block';
            
            // Scroll suave para os resultados
            secaoResultados.scrollIntoView({ 
                behavior: 'smooth',
                block: 'start'
            });
        }

        // Preenche informações básicas do cartão
        this.preencherInformacoesBasicas(cartao);
        
        // Preenche estatísticas detalhadas
        this.preencherEstatisticasDetalhadas(cartao);

        // Carrega histórico de transações
        this.carregarHistoricoTransacoes(cartao);

        // Atualiza timestamp
        this.atualizarTimestampConsulta();
    }

    /**
     * Preenche informações básicas do cartão
     * @param {Object} cartao - Dados do cartão
     */
    preencherInformacoesBasicas(cartao) {
        // Saldo atual
        this.atualizarElemento('saldoAtual', this.formatarMoeda(cartao.saldo));
        
        // Número do cartão mascarado
        this.atualizarElemento('numeroCartaoExibicao', `**** **** **** ${cartao.numero.slice(-4)}`);
        
        // Status do cartão
        const statusElement = document.getElementById('statusCartao');
        if (statusElement) {
            statusElement.innerHTML = `
                Status: <span class="status-badge ${cartao.ativo ? 'active' : 'inactive'}">
                    ${cartao.ativo ? 'Ativo' : 'Bloqueado'}
                </span>
            `;
        }

        // Total recarregado
        this.atualizarElemento('totalRecarregado', this.formatarMoeda(cartao.totalRecargas));
        
        // Total gasto
        this.atualizarElemento('totalGasto', this.formatarMoeda(cartao.totalGastos));

        // Contadores de transações
        const recargas = cartao.transacoes.filter(t => t.tipo === 'recarga').length;
        const compras = cartao.transacoes.filter(t => t.tipo === 'compra').length;
        
        this.atualizarElemento('recargas', `${recargas} recarga${recargas !== 1 ? 's' : ''}`);
        this.atualizarElemento('compras', `${compras} compra${compras !== 1 ? 's' : ''}`);
    }

    /**
     * Preenche estatísticas detalhadas do cartão
     * @param {Object} cartao - Dados do cartão
     */
    preencherEstatisticasDetalhadas(cartao) {
        // Data de criação
        this.atualizarElemento('dataCriacao', this.formatarData(cartao.dataCriacao));

        // Última transação
        const ultimaTransacao = cartao.transacoes[cartao.transacoes.length - 1];
        this.atualizarElemento('ultimaTransacao', 
            ultimaTransacao ? this.formatarDataHora(ultimaTransacao.data) : 'Nenhuma transação');

        // Média por compra
        const compras = cartao.transacoes.filter(t => t.tipo === 'compra');
        const mediaPorCompra = compras.length > 0 ? cartao.totalGastos / compras.length : 0;
        this.atualizarElemento('mediaPorCompra', this.formatarMoeda(mediaPorCompra));

        // Transações hoje
        const hoje = new Date().toISOString().split('T')[0];
        const transacoesHoje = cartao.transacoes.filter(t => t.data.startsWith(hoje)).length;
        this.atualizarElemento('transacoesHoje', transacoesHoje);

        // Maior recarga
        const recargas = cartao.transacoes.filter(t => t.tipo === 'recarga');
        const maiorRecarga = recargas.length > 0 ? Math.max(...recargas.map(r => r.valor)) : 0;
        this.atualizarElemento('maiorRecarga', this.formatarMoeda(maiorRecarga));

        // Maior compra
        const comprasValues = compras.map(c => Math.abs(c.valor));
        const maiorCompra = comprasValues.length > 0 ? Math.max(...comprasValues) : 0;
        this.atualizarElemento('maiorCompra', this.formatarMoeda(maiorCompra));
    }

    /**
     * Carrega e exibe histórico de transações
     * @param {Object} cartao - Dados do cartão
     */
    carregarHistoricoTransacoes(cartao) {
        this.transacoesFiltradas = [...cartao.transacoes].reverse(); // Mais recentes primeiro
        this.transacoesCarregadas = 10;
        this.renderizarTransacoes();
    }

    /**
     * Renderiza transações na interface
     */
    renderizarTransacoes() {
        const container = document.getElementById('transactionsContainer');
        if (!container) return;

        const transacoes = this.transacoesFiltradas.slice(0, this.transacoesCarregadas);

        if (transacoes.length === 0) {
            container.innerHTML = `
                <div class="transactions-empty">
                    <i class="fas fa-info-circle"></i>
                    <span>Nenhuma transação encontrada</span>
                    <small>Este cartão ainda não possui transações ou elas foram filtradas</small>
                </div>
            `;
            this.atualizarPaginacao(false);
            return;
        }

        container.innerHTML = transacoes.map(transacao => {
            const isPositive = transacao.valor > 0;
            const icon = this.obterIconeTransacao(transacao.tipo);
            const tempoDecorrido = this.calcularTempoDecorrido(transacao.data);
            
            return `
                <div class="transaction-item ${transacao.tipo}" onclick="abrirDetalhesTransacao('${transacao.id}')">
                    <div class="transaction-icon">
                        <i class="${icon}"></i>
                    </div>
                    <div class="transaction-content">
                        <div class="transaction-title">
                            ${this.formatarTipoTransacao(transacao.tipo)}
                        </div>
                        <div class="transaction-date">
                            ${this.formatarDataHora(transacao.data)}
                        </div>
                        <div class="transaction-description">
                            ${transacao.descricao || this.gerarDescricaoTransacao(transacao)}
                        </div>
                        <div class="transaction-time">
                            ${tempoDecorrido}
                        </div>
                    </div>
                    <div class="transaction-value ${isPositive ? 'positive' : 'negative'}">
                        ${isPositive ? '+' : ''}${this.formatarMoeda(Math.abs(transacao.valor))}
                    </div>
                    <div class="transaction-arrow">
                        <i class="fas fa-chevron-right"></i>
                    </div>
                </div>
            `;
        }).join('');

        // Atualiza paginação
        this.atualizarPaginacao(this.transacoesCarregadas < this.transacoesFiltradas.length);
    }

    /**
     * Gera descrição automática para transação
     * @param {Object} transacao - Dados da transação
     * @returns {string} Descrição da transação
     */
    gerarDescricaoTransacao(transacao) {
        switch (transacao.tipo) {
            case 'recarga':
                return `Recarga de ${this.formatarMoeda(transacao.valor)} realizada`;
            case 'compra':
                if (transacao.produtos && transacao.produtos.length > 0) {
                    const nomesProdutos = transacao.produtos.map(p => p.nome).slice(0, 2).join(', ');
                    const outrosProdutos = transacao.produtos.length > 2 ? ` e mais ${transacao.produtos.length - 2}` : '';
                    return `Compra: ${nomesProdutos}${outrosProdutos}`;
                }
                return `Compra de ${this.formatarMoeda(Math.abs(transacao.valor))}`;
            case 'correcao':
                return transacao.motivo || 'Correção de saldo administrativa';
            default:
                return transacao.descricao || 'Transação do sistema';
        }
    }

    /**
     * Filtra transações baseado no filtro selecionado
     */
    filtrarTransacoes() {
        const filtro = document.getElementById('filtroTransacoes').value;
        this.filtroAtivo = filtro;
        
        if (!this.cartaoAtual) return;

        let transacoesFiltradas = [...this.cartaoAtual.transacoes];

        switch (filtro) {
            case 'recarga':
                transacoesFiltradas = transacoesFiltradas.filter(t => t.tipo === 'recarga');
                break;
            case 'compra':
                transacoesFiltradas = transacoesFiltradas.filter(t => t.tipo === 'compra');
                break;
            case 'hoje':
                const hoje = new Date().toISOString().split('T')[0];
                transacoesFiltradas = transacoesFiltradas.filter(t => t.data.startsWith(hoje));
                break;
            case 'semana':
                const umaSemanaAtras = new Date();
                umaSemanaAtras.setDate(umaSemanaAtras.getDate() - 7);
                transacoesFiltradas = transacoesFiltradas.filter(t => new Date(t.data) >= umaSemanaAtras);
                break;
        }

        this.transacoesFiltradas = transacoesFiltradas.reverse();
        this.transacoesCarregadas = 10;
        this.renderizarTransacoes();

        // Feedback sobre filtro aplicado
        if (filtro !== 'todas') {
            this.mostrarInfo(`Filtro aplicado: ${this.obterNomeFiltro(filtro)} (${transacoesFiltradas.length} transações)`);
        }
    }

    /**
     * Obtém nome amigável do filtro
     * @param {string} filtro - Código do filtro
     * @returns {string} Nome do filtro
     */
    obterNomeFiltro(filtro) {
        const nomes = {
            'todas': 'Todas as transações',
            'recarga': 'Apenas recargas',
            'compra': 'Apenas compras',
            'hoje': 'Apenas hoje',
            'semana': 'Última semana'
        };
        return nomes[filtro] || filtro;
    }

    /**
     * Carrega mais transações (paginação)
     */
    carregarMaisTransacoes() {
        this.transacoesCarregadas += 10;
        this.renderizarTransacoes();
        this.mostrarInfo('Mais transações carregadas');
    }

    /**
     * Atualiza controles de paginação
     * @param {boolean} temMais - Se há mais transações para carregar
     */
    atualizarPaginacao(temMais) {
        const paginationContainer = document.getElementById('paginationContainer');
        if (paginationContainer) {
            paginationContainer.style.display = temMais ? 'block' : 'none';
        }
    }

    /**
     * Atualiza histórico de transações (refresh)
     */
    atualizarHistorico() {
        if (this.cartaoAtual) {
            // Recarrega dados do cartão
            const dadosAtualizados = window.buscarCartao(this.cartaoAtual.numero);
            if (dadosAtualizados) {
                this.cartaoAtual = dadosAtualizados;
                this.carregarHistoricoTransacoes(dadosAtualizados);
                this.preencherInformacoesBasicas(dadosAtualizados);
                this.preencherEstatisticasDetalhadas(dadosAtualizados);
                this.mostrarSucesso('Histórico atualizado!');
            }
        }
    }

    /**
     * Atualiza dados do cartão atual
     */
    atualizarDadosCartao() {
        if (this.cartaoAtual) {
            const dadosAtualizados = window.buscarCartao(this.cartaoAtual.numero);
            if (dadosAtualizados) {
                this.cartaoAtual = dadosAtualizados;
                this.preencherInformacoesBasicas(dadosAtualizados);
            }
        }
    }

    /**
     * Adiciona consulta à lista de consultas recentes
     * @param {Object} cartao - Dados do cartão consultado
     */
    adicionarConsultaRecente(cartao) {
        const consulta = {
            numero: cartao.numero,
            saldo: cartao.saldo,
            data: new Date().toISOString(),
            ativo: cartao.ativo
        };

        // Remove consulta existente do mesmo cartão
        this.consultasRecentes = this.consultasRecentes.filter(c => c.numero !== cartao.numero);
        
        // Adiciona no início
        this.consultasRecentes.unshift(consulta);

        // Mantém apenas as últimas 15 consultas
        this.consultasRecentes = this.consultasRecentes.slice(0, 15);

        this.salvarConsultasRecentes();
        this.atualizarConsultasRecentes();
        this.atualizarContadorConsultas();
    }

    /**
     * Atualiza lista de consultas recentes na interface
     */
    atualizarConsultasRecentes() {
        const container = document.getElementById('recentConsultations');
        if (!container) return;

        if (this.consultasRecentes.length === 0) {
            container.innerHTML = `
                <div class="recent-empty">
                    <i class="fas fa-info-circle"></i>
                    <span>Nenhuma consulta realizada ainda</span>
                    <small>As consultas aparecerão aqui para acesso rápido</small>
                </div>
            `;
            return;
        }

        container.innerHTML = this.consultasRecentes.slice(0, 8).map(consulta => `
            <div class="recent-item" onclick="consultarCartao('${consulta.numero}')">
                <div class="recent-icon">
                    <i class="fas fa-credit-card"></i>
                </div>
                <div class="recent-content">
                    <div class="recent-card">**** **** **** ${consulta.numero.slice(-4)}</div>
                    <div class="recent-date">${this.calcularTempoDecorrido(consulta.data)}</div>
                </div>
                <div class="recent-value">
                    ${this.formatarMoeda(consulta.saldo)}
                </div>
                <div class="recent-status">
                    <span class="status-indicator ${consulta.ativo ? 'active' : 'inactive'}"></span>
                </div>
            </div>
        `).join('');
    }

    /**
     * Realiza nova consulta
     */
    novaConsulta() {
        this.cartaoAtual = null;
        document.getElementById('numeroCartao').value = '';
        
        const secaoResultados = document.getElementById('consultationResults');
        if (secaoResultados) {
            secaoResultados.style.display = 'none';
        }
        
        // Reset do filtro
        const filtroTransacoes = document.getElementById('filtroTransacoes');
        if (filtroTransacoes) {
            filtroTransacoes.value = 'todas';
        }
        
        this.focarInputCartao();
        this.mostrarSucesso('Pronto para nova consulta!');
    }

    /**
     * Foca no input do cartão
     */
    focarInputCartao() {
        const inputCartao = document.getElementById('numeroCartao');
        if (inputCartao) {
            inputCartao.focus();
            inputCartao.select();
        }
    }

    /**
     * Atualiza timestamp da última consulta
     */
    atualizarTimestampConsulta() {
        const elemento = document.getElementById('ultimaAtualizacao');
        if (elemento) {
            elemento.textContent = 'Atualizado agora';
        }
    }

    /**
     * Atualiza contador de consultas do dia
     */
    atualizarContadorConsultas() {
        try {
            const hoje = new Date().toISOString().split('T')[0];
            const consultasHoje = this.consultasRecentes.filter(c => c.data.startsWith(hoje)).length;
            
            const contador = document.getElementById('consultasContador');
            if (contador) {
                contador.textContent = consultasHoje;
            }
        } catch (error) {
            console.error('Erro ao atualizar contador:', error);
        }
    }

    // ========== NAVEGAÇÃO E INTEGRAÇÃO ==========

    /**
     * Vai para página de recarga com cartão pré-preenchido
     */
    irParaRecarga() {
        if (this.cartaoAtual) {
            localStorage.setItem('cartao_preenchido', this.cartaoAtual.numero);
            this.mostrarInfo('Redirecionando para recarga...');
            setTimeout(() => {
                window.location.href = 'recarga.html';
            }, 800);
        }
    }

    /**
     * Vai para página de vendas com cartão pré-preenchido
     */
    irParaVendas() {
        if (this.cartaoAtual) {
            localStorage.setItem('cartao_preenchido', this.cartaoAtual.numero);
            this.mostrarInfo('Redirecionando para vendas...');
            setTimeout(() => {
                window.location.href = 'vendas.html';
            }, 800);
        }
    }

    /**
     * Imprime consulta atual
     */
    imprimirConsulta() {
        if (!this.cartaoAtual) {
            this.mostrarErro('Nenhum cartão consultado para imprimir');
            return;
        }

        // Prepara dados para impressão
        const dadosImpressao = {
            cartao: this.cartaoAtual,
            dataConsulta: new Date().toLocaleString('pt-BR'),
            operador: 'CONSULTA'
        };

        // Armazena dados temporariamente
        window.dadosImpressao = dadosImpressao;
        
        // Abre janela de impressão
        window.print();
        
        this.mostrarSucesso('Enviado para impressão');
    }

    /**
     * Volta para página anterior
     */
    voltarPagina() {
        if (window.history.length > 1) {
            window.history.back();
        } else {
            window.location.href = '../index.html';
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
     * Formata data para exibição
     * @param {string} dataISO - Data em formato ISO
     * @returns {string} Data formatada
     */
    formatarData(dataISO) {
        return new Date(dataISO).toLocaleDateString('pt-BR');
    }

    /**
     * Formata data e hora para exibição
     * @param {string} dataISO - Data em formato ISO
     * @returns {string} Data e hora formatadas
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

        const segundos = Math.floor(diferenca / 1000);
        const minutos = Math.floor(diferenca / (1000 * 60));
        const horas = Math.floor(diferenca / (1000 * 60 * 60));
        const dias = Math.floor(diferenca / (1000 * 60 * 60 * 24));

        if (dias > 0) return `${dias}d atrás`;
        if (horas > 0) return `${horas}h atrás`;
        if (minutos > 0) return `${minutos}min atrás`;
        if (segundos > 30) return `${segundos}s atrás`;
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
            'compra': 'Compra',
            'correcao': 'Correção',
            'bloqueio': 'Bloqueio',
            'desbloqueio': 'Desbloqueio',
            'recarga_inicial': 'Saldo Inicial'
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
            'desbloqueio': 'fas fa-unlock',
            'recarga_inicial': 'fas fa-star'
        };
        return icones[tipo] || 'fas fa-exchange-alt';
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
     * Carrega consultas recentes do localStorage
     * @returns {Array} Lista de consultas recentes
     */
    carregarConsultasRecentes() {
        try {
            const dados = localStorage.getItem('caixaevent_consultas_recentes');
            return dados ? JSON.parse(dados) : [];
        } catch (error) {
            console.error('Erro ao carregar consultas recentes:', error);
            return [];
        }
    }

    /**
     * Salva consultas recentes no localStorage
     */
    salvarConsultasRecentes() {
        try {
            localStorage.setItem('caixaevent_consultas_recentes', JSON.stringify(this.consultasRecentes));
        } catch (error) {
            console.error('Erro ao salvar consultas recentes:', error);
        }
    }

    // ========== SISTEMA DE MENSAGENS ==========

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
        this.mostrarToast(mensagem, 'error');
        console.error('Erro na consulta:', mensagem);
    }

    /**
     * Mostra mensagem de sucesso
     * @param {string} mensagem - Mensagem de sucesso
     */
    mostrarSucesso(mensagem) {
        this.mostrarToast(mensagem, 'success');
        console.log('Sucesso na consulta:', mensagem);
    }

    /**
     * Mostra mensagem informativa
     * @param {string} mensagem - Mensagem informativa
     */
    mostrarInfo(mensagem) {
        this.mostrarToast(mensagem, 'info');
    }

    /**
     * Sistema de toast para notificações
     * @param {string} mensagem - Mensagem a exibir
     * @param {string} tipo - Tipo da mensagem (success, error, warning, info)
     */
    mostrarToast(mensagem, tipo = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${tipo}`;
        
        const icones = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };

        toast.innerHTML = `
            <i class="${icones[tipo] || icones.info}"></i>
            <span>${mensagem}</span>
            <button class="toast-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;

        container.appendChild(toast);

        // Auto remove após 5 segundos
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 5000);

        // Animação de entrada
        setTimeout(() => {
            toast.classList.add('show');
        }, 100);
    }
}

// Funções globais para compatibilidade com HTML
window.lerCartaoNFC = function() {
    return paginaConsulta.lerCartaoNFC();
};

window.lerCartaoManual = function() {
    paginaConsulta.lerCartaoManual();
};

window.filtrarTransacoes = function() {
    paginaConsulta.filtrarTransacoes();
};

window.atualizarHistorico = function() {
    paginaConsulta.atualizarHistorico();
};

window.carregarMaisTransacoes = function() {
    paginaConsulta.carregarMaisTransacoes();
};

window.consultarCartao = function(numeroCartao) {
    const inputCartao = document.getElementById('numeroCartao');
    if (inputCartao) {
        inputCartao.value = paginaConsulta.formatarNumeroExibicao(numeroCartao);
        paginaConsulta.lerCartaoManual();
    }
};

window.novaConsulta = function() {
    paginaConsulta.novaConsulta();
};

window.irParaRecarga = function() {
    paginaConsulta.irParaRecarga();
};

window.irParaVendas = function() {
    paginaConsulta.irParaVendas();
};

window.imprimirConsulta = function() {
    paginaConsulta.imprimirConsulta();
};

window.voltarPagina = function() {
    paginaConsulta.voltarPagina();
};

window.abrirDetalhesTransacao = function(transacaoId) {
    console.log('Detalhes da transação:', transacaoId);
    // Implementar modal de detalhes se necessário
};

window.consultarUltimasTransacoes = function() {
    window.location.href = '../pages/admin.html';
};

window.verificarCartoesAtivos = function() {
    window.location.href = '../pages/admin.html';
};

window.gerarRelatorioConsultas = function() {
    window.location.href = '../pages/admin.html';
};

// Instância global da página de consulta
let paginaConsulta;

// Inicializa quando DOM carregar
document.addEventListener('DOMContentLoaded', function() {
    // Aguarda o gerenciador de cartões estar disponível
    if (typeof gerenciadorCartao !== 'undefined') {
        paginaConsulta = new PaginaConsulta();
    } else {
        // Tenta novamente após 100ms
        setTimeout(() => {
            paginaConsulta = new PaginaConsulta();
        }, 100);
    }
});

// Previne saída acidental durante consulta
window.addEventListener('beforeunload', function(e) {
    if (paginaConsulta && paginaConsulta.processandoConsulta) {
        e.preventDefault();
        e.returnValue = 'Consulta em andamento. Tem certeza que deseja sair?';
    }
});

console.log('Sistema de consulta CaixaEvent carregado com sucesso!');