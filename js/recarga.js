// Arquivo: recarga.js - Controle da página de recarga de saldo
// Sistema de Controle de Caixa para Eventos

/**
 * Classe para gerenciar a página de recarga
 */
class PaginaRecarga {
    constructor() {
        this.cartaoAtual = null;
        this.valorSelecionado = 0;
        this.processandoRecarga = false;
        this.inicializar();
    }

    /**
     * Inicializa a página de recarga
     */
    inicializar() {
        console.log('Página de recarga inicializada');
        this.configurarEventos();
        this.atualizarHistoricoRecargas();
        this.resetarFormulario();
    }

    /**
     * Configura eventos dos elementos da página
     */
    configurarEventos() {
        // Input do número do cartão
        const inputCartao = document.getElementById('numeroCartao');
        if (inputCartao) {
            inputCartao.addEventListener('input', (e) => {
                this.formatarNumeroCartao(e.target);
                this.validarFormulario();
            });

            inputCartao.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.lerCartaoManual();
                }
            });
        }

        // Input de valor personalizado
        const inputValor = document.getElementById('valorPersonalizado');
        if (inputValor) {
            inputValor.addEventListener('input', () => {
                this.desmarcarBotoesValor();
                this.valorSelecionado = parseFloat(inputValor.value) || 0;
                this.validarFormulario();
            });

            inputValor.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.realizarRecarga();
                }
            });
        }

        // Configurar callback para leitura de cartão
        window.onCartaoLido = (resultado) => {
            this.processarCartaoLido(resultado);
        };

        window.onErroLeitura = (erro) => {
            this.mostrarErro('Erro na leitura do cartão. Tente novamente.');
        };
    }

    /**
     * Lê cartão via NFC simulado
     */
    async lerCartaoNFC() {
        try {
            this.mostrarLoading('Aguarde, lendo cartão...');
            const resultado = await window.lerCartaoNFC();
            this.processarCartaoLido(resultado);
        } catch (error) {
            this.mostrarErro('Erro na leitura NFC. Tente novamente ou digite o número manualmente.');
        } finally {
            this.esconderLoading();
        }
    }

    /**
     * Lê cartão via input manual
     */
    lerCartaoManual() {
        const numeroCartao = document.getElementById('numeroCartao').value.replace(/\D/g, '');
        
        if (!numeroCartao) {
            this.mostrarErro('Digite o número do cartão');
            return;
        }

        if (numeroCartao.length !== 16) {
            this.mostrarErro('Número do cartão deve ter 16 dígitos');
            return;
        }

        const resultado = {
            sucesso: true,
            numero: numeroCartao,
            timestamp: new Date().toISOString(),
            metodo: 'manual'
        };

        this.processarCartaoLido(resultado);
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

        // Busca dados do cartão
        const dadosCartao = window.buscarCartao(resultado.numero);
        if (!dadosCartao) {
            this.mostrarErro('Cartão inválido');
            return;
        }

        // Armazena cartão atual
        this.cartaoAtual = dadosCartao;

        // Atualiza interface
        this.atualizarInterfaceCartao();
        this.validarFormulario();

        // Preenche o input se veio de NFC
        if (resultado.metodo === 'nfc_simulado') {
            document.getElementById('numeroCartao').value = this.formatarNumeroExibicao(resultado.numero);
        }

        this.mostrarSucesso('Cartão identificado com sucesso!');
    }

    /**
     * Seleciona valor predefinido para recarga
     * @param {number} valor - Valor selecionado
     */
    selecionarValor(valor) {
        this.valorSelecionado = valor;
        
        // Marca o botão selecionado
        this.marcarBotaoValor(valor);
        
        // Limpa input personalizado
        document.getElementById('valorPersonalizado').value = '';
        
        this.validarFormulario();
    }

    /**
     * Realiza a recarga do cartão
     */
    async realizarRecarga() {
        if (this.processandoRecarga) return;

        try {
            // Validações
            if (!this.cartaoAtual) {
                this.mostrarErro('Nenhum cartão identificado');
                return;
            }

            if (!this.valorSelecionado || this.valorSelecionado <= 0) {
                this.mostrarErro('Selecione um valor para recarga');
                return;
            }

            if (this.valorSelecionado > 1000) {
                this.mostrarErro('Valor máximo para recarga é R$ 1.000,00');
                return;
            }

            this.processandoRecarga = true;
            this.mostrarLoading('Processando recarga...');

            // Realiza a recarga
            const resultado = await this.processarRecarga();
            
            if (resultado.sucesso) {
                this.mostrarModalSucesso(resultado);
                this.atualizarHistoricoRecargas();
                this.atualizarInterfaceCartao();
            } else {
                this.mostrarErro(resultado.erro || 'Erro na recarga');
            }

        } catch (error) {
            console.error('Erro na recarga:', error);
            this.mostrarErro('Erro inesperado na recarga. Tente novamente.');
        } finally {
            this.processandoRecarga = false;
            this.esconderLoading();
        }
    }

    /**
     * Processa a recarga no backend
     * @returns {Promise<Object>} Resultado da recarga
     */
    async processarRecarga() {
        return new Promise((resolve) => {
            // Simula delay de processamento
            setTimeout(() => {
                const resultado = window.recarregarCartao(
                    this.cartaoAtual.numero,
                    this.valorSelecionado,
                    'CAIXA_RECARGA'
                );
                
                if (resultado.sucesso) {
                    this.cartaoAtual = resultado.cartao;
                }
                
                resolve(resultado);
            }, 1500);
        });
    }

    /**
     * Atualiza interface do cartão identificado
     */
    atualizarInterfaceCartao() {
        if (!this.cartaoAtual) return;

        // Mostra área de saldo
        const saldoAtual = document.getElementById('saldoAtual');
        saldoAtual.style.display = 'block';
        saldoAtual.classList.add('show');

        // Atualiza valor do saldo
        document.getElementById('valorSaldo').textContent = 
            `R$ ${this.cartaoAtual.saldo.toFixed(2).replace('.', ',')}`;

        // Atualiza info do cartão
        document.getElementById('infoCartao').textContent = 
            `Cartão **** ${this.cartaoAtual.numero.slice(-4)}`;

        // Atualiza status se cartão bloqueado
        if (!this.cartaoAtual.ativo) {
            this.mostrarErro('Atenção: Este cartão está bloqueado');
        }
    }

    /**
     * Atualiza histórico de recargas na interface
     */
    atualizarHistoricoRecargas() {
        const container = document.getElementById('historicoRecargas');
        if (!container) return;

        // Obtém últimas recargas do sistema
        const relatorios = gerenciadorCartao.obterRelatorios();
        const recargasRecentes = relatorios.ultimasTransacoes
            .filter(t => t.dados && t.tipo === 'recarga')
            .slice(0, 5);

        if (recargasRecentes.length === 0) {
            container.innerHTML = `
                <div class="no-history">
                    <i class="fas fa-info-circle"></i>
                    <span>Nenhuma recarga realizada ainda hoje</span>
                </div>
            `;
            return;
        }

        // Constrói HTML do histórico
        container.innerHTML = recargasRecentes.map(recarga => {
            const data = new Date(recarga.dados.data);
            const dataFormatada = this.formatarDataHora(data);
            
            return `
                <div class="history-item">
                    <div class="history-info">
                        <div class="history-card">Cartão **** ${recarga.dados.cartao.slice(-4)}</div>
                        <div class="history-date">${dataFormatada}</div>
                    </div>
                    <div class="history-amount">+ R$ ${recarga.dados.valor.toFixed(2).replace('.', ',')}</div>
                </div>
            `;
        }).join('');
    }

    /**
     * Marca botão de valor selecionado
     * @param {number} valor - Valor do botão
     */
    marcarBotaoValor(valor) {
        // Remove seleção de todos os botões
        document.querySelectorAll('.amount-btn').forEach(btn => {
            btn.classList.remove('selected');
        });

        // Marca o botão correto
        document.querySelectorAll('.amount-btn').forEach(btn => {
            if (btn.textContent.includes(valor.toString())) {
                btn.classList.add('selected');
            }
        });
    }

    /**
     * Desmarca todos os botões de valor
     */
    desmarcarBotoesValor() {
        document.querySelectorAll('.amount-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
    }

    /**
     * Valida se o formulário está completo
     */
    validarFormulario() {
        const btnRecarregar = document.getElementById('btnRecarregar');
        const temCartao = this.cartaoAtual !== null;
        const temValor = this.valorSelecionado > 0;
        const cartaoAtivo = this.cartaoAtual ? this.cartaoAtual.ativo : false;

        if (btnRecarregar) {
            btnRecarregar.disabled = !(temCartao && temValor && cartaoAtivo);
            
            if (!cartaoAtivo && this.cartaoAtual) {
                btnRecarregar.innerHTML = '<i class="fas fa-ban"></i> CARTÃO BLOQUEADO';
            } else {
                btnRecarregar.innerHTML = '<i class="fas fa-plus"></i> RECARREGAR SALDO';
            }
        }
    }

    /**
     * Formata número do cartão durante digitação
     * @param {HTMLElement} input - Input do cartão
     */
    formatarNumeroCartao(input) {
        let valor = input.value.replace(/\D/g, '');
        
        // Limita a 16 dígitos
        if (valor.length > 16) {
            valor = valor.substring(0, 16);
        }

        // Formata com espaços: 1234 5678 9012 3456
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
     * Formata data e hora para exibição
     * @param {Date} data - Data a formatar
     * @returns {string} Data formatada
     */
    formatarDataHora(data) {
        const agora = new Date();
        const hoje = agora.toDateString() === data.toDateString();
        
        if (hoje) {
            return `Hoje, ${data.toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}`;
        } else {
            return data.toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
    }

    /**
     * Mostra modal de sucesso da recarga
     * @param {Object} resultado - Resultado da recarga
     */
    mostrarModalSucesso(resultado) {
        const modal = document.getElementById('modalConfirmacao');
        if (!modal) return;

        // Preenche dados do modal
        document.getElementById('valorRecarga').textContent = 
            `R$ ${this.valorSelecionado.toFixed(2).replace('.', ',')}`;
        
        document.getElementById('cartaoRecarga').textContent = 
            `**** ${this.cartaoAtual.numero.slice(-4)}`;
        
        document.getElementById('novoSaldo').textContent = 
            `R$ ${resultado.cartao.saldo.toFixed(2).replace('.', ',')}`;

        // Mostra modal
        modal.style.display = 'block';

        // Auto-fecha após 10 segundos
        setTimeout(() => {
            this.fecharModal();
        }, 10000);
    }

    /**
     * Fecha modal de confirmação
     */
    fecharModal() {
        const modal = document.getElementById('modalConfirmacao');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    /**
     * Prepara para nova recarga
     */
    novaRecarga() {
        this.fecharModal();
        this.resetarFormulario();
    }

    /**
     * Reseta formulário para nova operação
     */
    resetarFormulario() {
        // Limpa inputs
        document.getElementById('numeroCartao').value = '';
        document.getElementById('valorPersonalizado').value = '';

        // Esconde saldo atual
        const saldoAtual = document.getElementById('saldoAtual');
        saldoAtual.style.display = 'none';
        saldoAtual.classList.remove('show');

        // Desmarca botões
        this.desmarcarBotoesValor();

        // Reset variáveis
        this.cartaoAtual = null;
        this.valorSelecionado = 0;

        // Valida formulário
        this.validarFormulario();

        // Reset status NFC
        gerenciadorCartao.atualizarStatusNFC(
            'aguardando',
            'Toque na área acima para simular NFC',
            'fas fa-wifi'
        );
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
        // Implementar toast ou alert de erro
        alert(`❌ ${mensagem}`);
        console.error('Erro na recarga:', mensagem);
    }

    /**
     * Mostra mensagem de sucesso
     * @param {string} mensagem - Mensagem de sucesso
     */
    mostrarSucesso(mensagem) {
        // Implementar toast de sucesso
        console.log('Sucesso:', mensagem);
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
}

// Funções globais para compatibilidade com HTML
window.lerCartaoNFC = function() {
    return paginaRecarga.lerCartaoNFC();
};

window.lerCartaoManual = function() {
    paginaRecarga.lerCartaoManual();
};

window.selecionarValor = function(valor) {
    paginaRecarga.selecionarValor(valor);
};

window.realizarRecarga = function() {
    paginaRecarga.realizarRecarga();
};

window.fecharModal = function() {
    paginaRecarga.fecharModal();
};

window.novaRecarga = function() {
    paginaRecarga.novaRecarga();
};

window.voltarPagina = function() {
    paginaRecarga.voltarPagina();
};

// Inicializa página quando DOM carregar
let paginaRecarga;

document.addEventListener('DOMContentLoaded', function() {
    // Aguarda o gerenciador de cartões estar disponível
    if (typeof gerenciadorCartao !== 'undefined') {
        paginaRecarga = new PaginaRecarga();
    } else {
        // Tenta novamente após 100ms
        setTimeout(() => {
            paginaRecarga = new PaginaRecarga();
        }, 100);
    }
});

// Previne saída acidental durante recarga
window.addEventListener('beforeunload', function(e) {
    if (paginaRecarga && paginaRecarga.processandoRecarga) {
        e.preventDefault();
        e.returnValue = 'Recarga em andamento. Tem certeza que deseja sair?';
    }
});

console.log('Sistema de recarga CaixaEvent carregado com sucesso!');