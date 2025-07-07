// Arquivo: admin.js - Sistema administrativo do CaixaEvent
// Sistema de Controle de Caixa para Eventos

/**
 * Classe para gerenciar o painel administrativo
 */
class PaginaAdmin {
    constructor() {
        this.logado = false;
        this.senhaAdmin = 'admin123'; // Em produção, usar hash
        this.configuracoes = this.carregarConfiguracoes();
        this.logOperacoes = this.carregarLogOperacoes();
        this.inicializar();
    }

    /**
     * Inicializa a página administrativa
     */
    inicializar() {
        console.log('Página administrativa inicializada');
        this.configurarEventos();
        this.verificarLogin();
        this.atualizarInterface();
    }

    /**
     * Configura eventos dos elementos da página
     */
    configurarEventos() {
        // Login
        const formLogin = document.getElementById('formLogin');
        if (formLogin) {
            formLogin.addEventListener('submit', (e) => {
                e.preventDefault();
                this.realizarLogin();
            });
        }

        const inputSenha = document.getElementById('senhaAdmin');
        if (inputSenha) {
            inputSenha.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.realizarLogin();
                }
            });
        }

        // Botão logout
        const btnLogout = document.getElementById('btnLogout');
        if (btnLogout) {
            btnLogout.addEventListener('click', () => {
                this.realizarLogout();
            });
        }

        // Correção de saldo
        const formCorrecao = document.getElementById('formCorrecaoSaldo');
        if (formCorrecao) {
            formCorrecao.addEventListener('submit', (e) => {
                e.preventDefault();
                this.corrigirSaldo();
            });
        }

        // Buscar cartão para correção
        const btnBuscarCartao = document.getElementById('btnBuscarCartao');
        if (btnBuscarCartao) {
            btnBuscarCartao.addEventListener('click', () => {
                this.buscarCartaoCorrecao();
            });
        }

        // Relatórios
        const btnGerarRelatorio = document.getElementById('btnGerarRelatorio');
        if (btnGerarRelatorio) {
            btnGerarRelatorio.addEventListener('click', () => {
                this.gerarRelatorio();
            });
        }

        const btnExportarRelatorio = document.getElementById('btnExportarRelatorio');
        if (btnExportarRelatorio) {
            btnExportarRelatorio.addEventListener('click', () => {
                this.exportarRelatorio();
            });
        }

        // Backup e Restore
        const btnFazerBackup = document.getElementById('btnFazerBackup');
        if (btnFazerBackup) {
            btnFazerBackup.addEventListener('click', () => {
                this.fazerBackup();
            });
        }

        const inputRestore = document.getElementById('inputRestore');
        if (inputRestore) {
            inputRestore.addEventListener('change', (e) => {
                this.restaurarBackup(e.target.files[0]);
            });
        }

        const btnImportarDados = document.getElementById('btnImportarDados');
        if (btnImportarDados) {
            btnImportarDados.addEventListener('click', () => {
                document.getElementById('inputRestore').click();
            });
        }

        // Configurações
        const formConfiguracoes = document.getElementById('formConfiguracoes');
        if (formConfiguracoes) {
            formConfiguracoes.addEventListener('submit', (e) => {
                e.preventDefault();
                this.salvarConfiguracoes();
            });
        }

        // Limpeza de dados
        const btnLimparDados = document.getElementById('btnLimparDados');
        if (btnLimparDados) {
            btnLimparDados.addEventListener('click', () => {
                this.limparDadosSistema();
            });
        }

        // Atualização automática dos relatórios
        setInterval(() => {
            if (this.logado) {
                this.atualizarDashboard();
            }
        }, 30000); // Atualiza a cada 30 segundos
    }

    /**
     * Verifica se já está logado
     */
    verificarLogin() {
        const loginSalvo = sessionStorage.getItem('caixaevent_admin_login');
        if (loginSalvo) {
            this.logado = true;
            this.mostrarPainelAdmin();
        } else {
            this.mostrarTelaLogin();
        }
    }

    /**
     * Realiza login administrativo
     */
    realizarLogin() {
        const senha = document.getElementById('senhaAdmin').value;
        
        if (!senha) {
            this.mostrarErro('Digite a senha administrativa');
            return;
        }

        if (senha === this.senhaAdmin) {
            this.logado = true;
            sessionStorage.setItem('caixaevent_admin_login', 'true');
            
            // Log de acesso
            this.adicionarLogOperacao('login', {
                usuario: 'ADMIN',
                ip: 'localhost',
                timestamp: new Date().toISOString()
            });

            this.mostrarPainelAdmin();
            this.mostrarSucesso('Login realizado com sucesso!');
        } else {
            this.mostrarErro('Senha incorreta');
            
            // Log de tentativa de acesso negado
            this.adicionarLogOperacao('login_negado', {
                tentativa: senha.substring(0, 3) + '***',
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * Realiza logout
     */
    realizarLogout() {
        this.logado = false;
        sessionStorage.removeItem('caixaevent_admin_login');
        
        this.adicionarLogOperacao('logout', {
            usuario: 'ADMIN',
            timestamp: new Date().toISOString()
        });

        this.mostrarTelaLogin();
        this.mostrarSucesso('Logout realizado com sucesso!');
    }

    /**
     * Mostra tela de login
     */
    mostrarTelaLogin() {
        const telaLogin = document.getElementById('telaLogin');
        const painelAdmin = document.getElementById('painelAdmin');
        
        if (telaLogin) telaLogin.style.display = 'flex';
        if (painelAdmin) painelAdmin.style.display = 'none';
        
        // Limpa campo de senha
        const inputSenha = document.getElementById('senhaAdmin');
        if (inputSenha) {
            inputSenha.value = '';
            inputSenha.focus();
        }
    }

    /**
     * Mostra painel administrativo
     */
    mostrarPainelAdmin() {
        const telaLogin = document.getElementById('telaLogin');
        const painelAdmin = document.getElementById('painelAdmin');
        
        if (telaLogin) telaLogin.style.display = 'none';
        if (painelAdmin) painelAdmin.style.display = 'block';
        
        this.atualizarDashboard();
        this.atualizarLogOperacoes();
    }

    /**
     * Busca cartão para correção de saldo
     */
    buscarCartaoCorrecao() {
        const numeroCartao = document.getElementById('numeroCartaoCorrecao').value.replace(/\D/g, '');
        
        if (!numeroCartao || numeroCartao.length !== 16) {
            this.mostrarErro('Digite um número de cartão válido (16 dígitos)');
            return;
        }

        const cartao = gerenciadorCartao.buscarCartao(numeroCartao);
        if (!cartao) {
            this.mostrarErro('Cartão não encontrado');
            return;
        }

        // Preenche dados do cartão
        this.preencherDadosCartaoCorrecao(cartao);
    }

    /**
     * Preenche dados do cartão para correção
     * @param {Object} cartao - Dados do cartão
     */
    preencherDadosCartaoCorrecao(cartao) {
        const infoCartao = document.getElementById('infoCartaoCorrecao');
        const saldoAtualCorrecao = document.getElementById('saldoAtualCorrecao');
        const divCorrecao = document.getElementById('divCorrecaoSaldo');

        if (infoCartao) {
            infoCartao.innerHTML = `
                <div class="card-info-item">
                    <strong>Cartão:</strong> **** ${cartao.numero.slice(-4)}
                </div>
                <div class="card-info-item">
                    <strong>Status:</strong> 
                    <span class="status-badge ${cartao.ativo ? 'active' : 'inactive'}">
                        ${cartao.ativo ? 'Ativo' : 'Bloqueado'}
                    </span>
                </div>
                <div class="card-info-item">
                    <strong>Criado em:</strong> ${this.formatarData(cartao.dataCriacao)}
                </div>
                <div class="card-info-item">
                    <strong>Total recarregado:</strong> R$ ${cartao.totalRecargas.toFixed(2).replace('.', ',')}
                </div>
                <div class="card-info-item">
                    <strong>Total gasto:</strong> R$ ${cartao.totalGastos.toFixed(2).replace('.', ',')}
                </div>
            `;
        }

        if (saldoAtualCorrecao) {
            saldoAtualCorrecao.textContent = `R$ ${cartao.saldo.toFixed(2).replace('.', ',')}`;
        }

        if (divCorrecao) {
            divCorrecao.style.display = 'block';
        }

        // Armazena cartão para correção
        this.cartaoParaCorrecao = cartao;
    }

    /**
     * Corrige saldo do cartão
     */
    corrigirSaldo() {
        if (!this.cartaoParaCorrecao) {
            this.mostrarErro('Primeiro busque um cartão válido');
            return;
        }

        const novoSaldo = parseFloat(document.getElementById('novoSaldoCorrecao').value) || 0;
        const motivo = document.getElementById('motivoCorrecao').value.trim();

        if (novoSaldo < 0 || novoSaldo > 10000) {
            this.mostrarErro('Saldo deve estar entre R$ 0,00 e R$ 10.000,00');
            return;
        }

        if (!motivo || motivo.length < 10) {
            this.mostrarErro('Motivo deve ter pelo menos 10 caracteres');
            return;
        }

        const saldoAnterior = this.cartaoParaCorrecao.saldo;
        const diferenca = novoSaldo - saldoAnterior;

        if (!confirm(`Confirmar correção de saldo?
        
Cartão: **** ${this.cartaoParaCorrecao.numero.slice(-4)}
Saldo atual: R$ ${saldoAnterior.toFixed(2).replace('.', ',')}
Novo saldo: R$ ${novoSaldo.toFixed(2).replace('.', ',')}
Diferença: ${diferenca >= 0 ? '+' : ''}R$ ${diferenca.toFixed(2).replace('.', ',')}
Motivo: ${motivo}

Esta operação será registrada no log de segurança.`)) {
            return;
        }

        // Realiza correção
        const resultado = gerenciadorCartao.corrigirSaldo(
            this.cartaoParaCorrecao.numero,
            novoSaldo,
            motivo,
            'ADMIN'
        );

        if (resultado.sucesso) {
            this.mostrarSucesso('Saldo corrigido com sucesso!');
            
            // Log de operação
            this.adicionarLogOperacao('correcao_saldo', {
                cartao: this.cartaoParaCorrecao.numero,
                saldoAnterior: saldoAnterior,
                saldoNovo: novoSaldo,
                diferenca: diferenca,
                motivo: motivo,
                operador: 'ADMIN',
                timestamp: new Date().toISOString()
            });

            // Limpa formulário
            this.limparFormularioCorrecao();
            this.atualizarDashboard();
        } else {
            this.mostrarErro(resultado.erro);
        }
    }

    /**
     * Limpa formulário de correção
     */
    limparFormularioCorrecao() {
        document.getElementById('formCorrecaoSaldo').reset();
        document.getElementById('infoCartaoCorrecao').innerHTML = '';
        document.getElementById('divCorrecaoSaldo').style.display = 'none';
        this.cartaoParaCorrecao = null;
    }

    /**
     * Gera relatório completo do sistema
     */
    gerarRelatorio() {
        const relatorios = gerenciadorCartao.obterRelatorios();
        const agora = new Date();
        
        this.atualizarRelatorioEstatisticas(relatorios);
        this.atualizarRelatorioTransacoes(relatorios);
        this.atualizarRelatorioCartoes();

        // Mostra seção de relatórios
        const secaoRelatorios = document.getElementById('secaoRelatorios');
        if (secaoRelatorios) {
            secaoRelatorios.style.display = 'block';
        }

        this.mostrarSucesso('Relatório gerado com sucesso!');
    }

    /**
     * Atualiza relatório de estatísticas
     * @param {Object} relatorios - Dados dos relatórios
     */
    atualizarRelatorioEstatisticas(relatorios) {
        const container = document.getElementById('relatorioEstatisticas');
        if (!container) return;

        const { estatisticas, estatisticasHoje } = relatorios;

        container.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card">
                    <h4>Sistema Geral</h4>
                    <div class="stat-item">
                        <span>Total de Cartões:</span>
                        <strong>${estatisticas.totalCartoes}</strong>
                    </div>
                    <div class="stat-item">
                        <span>Cartões Ativos:</span>
                        <strong>${estatisticas.cartoesAtivos}</strong>
                    </div>
                    <div class="stat-item">
                        <span>Saldo Total Sistema:</span>
                        <strong>R$ ${estatisticas.saldoTotalSistema.toFixed(2).replace('.', ',')}</strong>
                    </div>
                    <div class="stat-item">
                        <span>Total Recarregado:</span>
                        <strong>R$ ${estatisticas.totalRecarregadoSistema.toFixed(2).replace('.', ',')}</strong>
                    </div>
                    <div class="stat-item">
                        <span>Total Vendido:</span>
                        <strong>R$ ${estatisticas.totalGastoSistema.toFixed(2).replace('.', ',')}</strong>
                    </div>
                </div>

                <div class="stat-card">
                    <h4>Movimentação Hoje</h4>
                    <div class="stat-item">
                        <span>Total Transações:</span>
                        <strong>${estatisticasHoje.totalTransacoes}</strong>
                    </div>
                    <div class="stat-item">
                        <span>Recargas:</span>
                        <strong>${estatisticasHoje.recargas} (R$ ${estatisticasHoje.totalRecargas.toFixed(2).replace('.', ',')})</strong>
                    </div>
                    <div class="stat-item">
                        <span>Vendas:</span>
                        <strong>${estatisticasHoje.vendas} (R$ ${estatisticasHoje.totalVendas.toFixed(2).replace('.', ',')})</strong>
                    </div>
                    <div class="stat-item">
                        <span>Saldo Líquido Hoje:</span>
                        <strong class="${estatisticasHoje.totalRecargas - estatisticasHoje.totalVendas >= 0 ? 'positive' : 'negative'}">
                            R$ ${(estatisticasHoje.totalRecargas - estatisticasHoje.totalVendas).toFixed(2).replace('.', ',')}
                        </strong>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Atualiza relatório de transações
     * @param {Object} relatorios - Dados dos relatórios
     */
    atualizarRelatorioTransacoes(relatorios) {
        const container = document.getElementById('relatorioTransacoes');
        if (!container) return;

        const transacoes = relatorios.transacoesHoje.slice(0, 20); // Últimas 20

        if (transacoes.length === 0) {
            container.innerHTML = '<p>Nenhuma transação registrada hoje.</p>';
            return;
        }

        container.innerHTML = `
            <table class="transactions-table">
                <thead>
                    <tr>
                        <th>Hora</th>
                        <th>Cartão</th>
                        <th>Tipo</th>
                        <th>Valor</th>
                        <th>Operador</th>
                    </tr>
                </thead>
                <tbody>
                    ${transacoes.map(t => `
                        <tr>
                            <td>${new Date(t.data).toLocaleTimeString('pt-BR')}</td>
                            <td>**** ${t.numeroCartao.slice(-4)}</td>
                            <td>
                                <span class="transaction-type ${t.tipo}">
                                    ${this.formatarTipoTransacao(t.tipo)}
                                </span>
                            </td>
                            <td class="${t.valor >= 0 ? 'positive' : 'negative'}">
                                ${t.valor >= 0 ? '+' : ''}R$ ${Math.abs(t.valor).toFixed(2).replace('.', ',')}
                            </td>
                            <td>${t.operador}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    /**
     * Atualiza relatório de cartões
     */
    atualizarRelatorioCartoes() {
        const container = document.getElementById('relatorioCartoes');
        if (!container) return;

        const cartoes = Object.values(gerenciadorCartao.cartoes)
            .sort((a, b) => b.saldo - a.saldo)
            .slice(0, 10); // Top 10 por saldo

        container.innerHTML = `
            <table class="cards-table">
                <thead>
                    <tr>
                        <th>Cartão</th>
                        <th>Saldo</th>
                        <th>Total Recarregado</th>
                        <th>Total Gasto</th>
                        <th>Status</th>
                        <th>Última Transação</th>
                    </tr>
                </thead>
                <tbody>
                    ${cartoes.map(cartao => `
                        <tr>
                            <td>**** ${cartao.numero.slice(-4)}</td>
                            <td>R$ ${cartao.saldo.toFixed(2).replace('.', ',')}</td>
                            <td>R$ ${cartao.totalRecargas.toFixed(2).replace('.', ',')}</td>
                            <td>R$ ${cartao.totalGastos.toFixed(2).replace('.', ',')}</td>
                            <td>
                                <span class="status-badge ${cartao.ativo ? 'active' : 'inactive'}">
                                    ${cartao.ativo ? 'Ativo' : 'Bloqueado'}
                                </span>
                            </td>
                            <td>${this.formatarData(cartao.ultimaTransacao)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    /**
     * Exporta relatório para arquivo
     */
    exportarRelatorio() {
        const relatorios = gerenciadorCartao.obterRelatorios();
        const agora = new Date();
        
        const dadosExportacao = {
            dataRelatorio: agora.toISOString(),
            estatisticas: relatorios.estatisticas,
            estatisticasHoje: relatorios.estatisticasHoje,
            transacoesHoje: relatorios.transacoesHoje,
            cartoes: Object.values(gerenciadorCartao.cartoes).map(cartao => ({
                numero: '**** ' + cartao.numero.slice(-4),
                saldo: cartao.saldo,
                ativo: cartao.ativo,
                totalRecargas: cartao.totalRecargas,
                totalGastos: cartao.totalGastos,
                ultimaTransacao: cartao.ultimaTransacao
            })),
            logOperacoes: this.logOperacoes.slice(-50) // Últimas 50 operações
        };

        const dataStr = JSON.stringify(dadosExportacao, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `relatorio_caixaevent_${agora.toISOString().split('T')[0]}.json`;
        link.click();

        this.mostrarSucesso('Relatório exportado com sucesso!');
    }

    /**
     * Faz backup completo do sistema
     */
    fazerBackup() {
        const dadosBackup = gerenciadorCartao.exportarDados();
        
        // Adiciona dados administrativos
        dadosBackup.configuracoes = this.configuracoes;
        dadosBackup.logOperacoes = this.logOperacoes;
        
        const dataStr = JSON.stringify(dadosBackup, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `backup_caixaevent_${new Date().toISOString().split('T')[0]}.json`;
        link.click();

        // Log da operação
        this.adicionarLogOperacao('backup', {
            totalCartoes: Object.keys(gerenciadorCartao.cartoes).length,
            totalTransacoes: gerenciadorCartao.historico.length,
            operador: 'ADMIN',
            timestamp: new Date().toISOString()
        });

        this.mostrarSucesso('Backup realizado com sucesso!');
    }

    /**
     * Restaura backup do sistema
     * @param {File} arquivo - Arquivo de backup
     */
    async restaurarBackup(arquivo) {
        if (!arquivo) return;

        if (!confirm('ATENÇÃO: Esta operação irá sobrescrever todos os dados atuais do sistema!\n\nTem certeza que deseja continuar?')) {
            return;
        }

        try {
            const texto = await this.lerArquivo(arquivo);
            const dadosBackup = JSON.parse(texto);

            // Valida estrutura do backup
            if (!dadosBackup.cartoes || !dadosBackup.versao) {
                throw new Error('Arquivo de backup inválido');
            }

            // Restaura dados
            const sucesso = gerenciadorCartao.importarDados(dadosBackup);
            
            if (sucesso) {
                // Restaura configurações administrativas
                if (dadosBackup.configuracoes) {
                    this.configuracoes = dadosBackup.configuracoes;
                    this.salvarConfiguracoes();
                }

                if (dadosBackup.logOperacoes) {
                    this.logOperacoes = dadosBackup.logOperacoes;
                    this.salvarLogOperacoes();
                }

                // Log da operação
                this.adicionarLogOperacao('restore', {
                    nomeArquivo: arquivo.name,
                    tamanhoArquivo: arquivo.size,
                    operador: 'ADMIN',
                    timestamp: new Date().toISOString()
                });

                this.atualizarDashboard();
                this.mostrarSucesso('Backup restaurado com sucesso!');
            } else {
                throw new Error('Erro ao restaurar dados');
            }

        } catch (error) {
            console.error('Erro no restore:', error);
            this.mostrarErro('Erro ao restaurar backup: ' + error.message);
        }
    }

    /**
     * Lê arquivo como texto
     * @param {File} arquivo - Arquivo a ler
     * @returns {Promise<string>} Conteúdo do arquivo
     */
    lerArquivo(arquivo) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('Erro ao ler arquivo'));
            reader.readAsText(arquivo);
        });
    }

    /**
     * Salva configurações do sistema
     */
    salvarConfiguracoes() {
        const novasConfiguracoes = {
            nomeEvento: document.getElementById('nomeEvento').value || 'CaixaEvent',
            senhaAdmin: document.getElementById('novaSenhaAdmin').value || this.senhaAdmin,
            limiteRecarga: parseFloat(document.getElementById('limiteRecarga').value) || 1000,
            alertaEstoqueBaixo: parseInt(document.getElementById('alertaEstoqueBaixo').value) || 10,
            backupAutomatico: document.getElementById('backupAutomatico').checked,
            logDetalhado: document.getElementById('logDetalhado').checked,
            ultimaAtualizacao: new Date().toISOString()
        };

        // Valida dados
        if (novasConfiguracoes.limiteRecarga < 10 || novasConfiguracoes.limiteRecarga > 10000) {
            this.mostrarErro('Limite de recarga deve estar entre R$ 10,00 e R$ 10.000,00');
            return;
        }

        this.configuracoes = novasConfiguracoes;
        this.senhaAdmin = novasConfiguracoes.senhaAdmin;
        
        localStorage.setItem('caixaevent_config_admin', JSON.stringify(this.configuracoes));

        // Log da operação
        this.adicionarLogOperacao('configuracao', {
            operador: 'ADMIN',
            timestamp: new Date().toISOString()
        });

        this.mostrarSucesso('Configurações salvas com sucesso!');
    }

    /**
     * Limpa dados do sistema
     */
    limparDadosSistema() {
        const opcao = prompt(`ATENÇÃO: Esta operação irá apagar dados do sistema!

Escolha o que deseja limpar:
1 - Apenas transações de hoje
2 - Todas as transações (mantém cartões)
3 - Tudo (cartões e transações)
4 - Cancelar

Digite o número da opção:`);

        if (!opcao || opcao === '4') return;

        let confirmacao = '';
        let operacao = '';

        switch (opcao) {
            case '1':
                confirmacao = 'todas as transações de hoje';
                operacao = 'transacoes_hoje';
                break;
            case '2':
                confirmacao = 'todas as transações (cartões serão mantidos)';
                operacao = 'todas_transacoes';
                break;
            case '3':
                confirmacao = 'TODOS os dados (cartões e transações)';
                operacao = 'todos_dados';
                break;
            default:
                this.mostrarErro('Opção inválida');
                return;
        }

        if (!confirm(`Tem certeza que deseja apagar ${confirmacao}?\n\nEsta ação não pode ser desfeita!`)) {
            return;
        }

        // Executa limpeza
        try {
            switch (operacao) {
                case 'transacoes_hoje':
                    this.limparTransacoesHoje();
                    break;
                case 'todas_transacoes':
                    this.limparTodasTransacoes();
                    break;
                case 'todos_dados':
                    this.limparTodosDados();
                    break;
            }

            // Log da operação
            this.adicionarLogOperacao('limpeza_dados', {
                tipo: operacao,
                operador: 'ADMIN',
                timestamp: new Date().toISOString()
            });

            this.atualizarDashboard();
            this.mostrarSucesso('Dados limpos com sucesso!');

        } catch (error) {
            console.error('Erro na limpeza:', error);
            this.mostrarErro('Erro ao limpar dados');
        }
    }

    /**
     * Limpa transações de hoje
     */
    limparTransacoesHoje() {
        const hoje = new Date().toISOString().split('T')[0];
        
        Object.values(gerenciadorCartao.cartoes).forEach(cartao => {
            cartao.transacoes = cartao.transacoes.filter(t => 
                !t.data.startsWith(hoje)
            );
        });

        gerenciadorCartao.historico = gerenciadorCartao.historico.filter(h =>
            !h.timestamp.startsWith(hoje)
        );

        gerenciadorCartao.salvarCartoes();
        gerenciadorCartao.salvarHistorico();
    }

    /**
     * Limpa todas as transações
     */
    limparTodasTransacoes() {
        Object.values(gerenciadorCartao.cartoes).forEach(cartao => {
            cartao.transacoes = [];
            cartao.totalRecargas = cartao.saldo; // Mantém saldo atual como recarga inicial
            cartao.totalGastos = 0;
        });

        gerenciadorCartao.historico = [];
        gerenciadorCartao.salvarCartoes();
        gerenciadorCartao.salvarHistorico();
    }

    /**
     * Limpa todos os dados
     */
    limparTodosDados() {
        gerenciadorCartao.cartoes = {};
        gerenciadorCartao.historico = [];
        gerenciadorCartao.salvarCartoes();
        gerenciadorCartao.salvarHistorico();
        
        // Limpa também produtos
        localStorage.removeItem('caixaevent_produtos');
    }

    /**
     * Atualiza dashboard administrativo
     */
    atualizarDashboard() {
        if (!this.logado) return;

        const relatorios = gerenciadorCartao.obterRelatorios();
        
        // Atualiza cards do dashboard
        this.atualizarCardDashboard('dashTotalCartoes', relatorios.estatisticas.totalCartoes);
        this.atualizarCardDashboard('dashSaldoTotal', `R$ ${relatorios.estatisticas.saldoTotalSistema.toFixed(2).replace('.', ',')}`);
        this.atualizarCardDashboard('dashVendasHoje', `R$ ${relatorios.estatisticasHoje.totalVendas.toFixed(2).replace('.', ',')}`);
        this.atualizarCardDashboard('dashRecargasHoje', `R$ ${relatorios.estatisticasHoje.totalRecargas.toFixed(2).replace('.', ',')}`);
        
        // Atualiza última atualização
        const ultimaAtualizacao = document.getElementById('ultimaAtualizacao');
        if (ultimaAtualizacao) {
            ultimaAtualizacao.textContent = new Date().toLocaleTimeString('pt-BR');
        }
    }

    /**
     * Atualiza card do dashboard
     * @param {string} id - ID do elemento
     * @param {string|number} valor - Valor a exibir
     */
    atualizarCardDashboard(id, valor) {
        const elemento = document.getElementById(id);
        if (elemento) {
            elemento.textContent = valor;
        }
    }

    /**
     * Atualiza log de operações na interface
     */
    atualizarLogOperacoes() {
        const container = document.getElementById('logOperacoes');
        if (!container) return;

        const logsRecentes = this.logOperacoes.slice(-20).reverse(); // Últimos 20, mais recentes primeiro

        if (logsRecentes.length === 0) {
            container.innerHTML = '<p>Nenhuma operação registrada.</p>';
            return;
        }

        container.innerHTML = `
            <table class="log-table">
                <thead>
                    <tr>
                        <th>Data/Hora</th>
                        <th>Operação</th>
                        <th>Detalhes</th>
                        <th>Operador</th>
                    </tr>
                </thead>
                <tbody>
                    ${logsRecentes.map(log => `
                        <tr>
                            <td>${this.formatarDataHora(log.timestamp)}</td>
                            <td>
                                <span class="operation-type ${log.operacao}">
                                    ${this.formatarTipoOperacao(log.operacao)}
                                </span>
                            </td>
                            <td>${this.formatarDetalhesLog(log)}</td>
                            <td>${log.dados.operador || 'SISTEMA'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    /**
     * Adiciona operação ao log
     * @param {string} operacao - Tipo da operação
     * @param {Object} dados - Dados da operação
     */
    adicionarLogOperacao(operacao, dados) {
        const logEntry = {
            id: 'LOG_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            operacao: operacao,
            dados: dados,
            timestamp: new Date().toISOString()
        };

        this.logOperacoes.push(logEntry);

        // Mantém apenas os últimos 500 logs
        if (this.logOperacoes.length > 500) {
            this.logOperacoes = this.logOperacoes.slice(-500);
        }

        this.salvarLogOperacoes();
        
        // Atualiza interface se logado
        if (this.logado) {
            this.atualizarLogOperacoes();
        }
    }

    /**
     * Atualiza interface completa
     */
    atualizarInterface() {
        if (this.logado) {
            this.carregarConfiguracoesTela();
        }
    }

    /**
     * Carrega configurações na tela
     */
    carregarConfiguracoesTela() {
        if (document.getElementById('nomeEvento')) {
            document.getElementById('nomeEvento').value = this.configuracoes.nomeEvento || 'CaixaEvent';
        }
        if (document.getElementById('limiteRecarga')) {
            document.getElementById('limiteRecarga').value = this.configuracoes.limiteRecarga || 1000;
        }
        if (document.getElementById('alertaEstoqueBaixo')) {
            document.getElementById('alertaEstoqueBaixo').value = this.configuracoes.alertaEstoqueBaixo || 10;
        }
        if (document.getElementById('backupAutomatico')) {
            document.getElementById('backupAutomatico').checked = this.configuracoes.backupAutomatico || false;
        }
        if (document.getElementById('logDetalhado')) {
            document.getElementById('logDetalhado').checked = this.configuracoes.logDetalhado || false;
        }
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
     * Formata tipo de operação
     * @param {string} operacao - Tipo da operação
     * @returns {string} Operação formatada
     */
    formatarTipoOperacao(operacao) {
        const operacoes = {
            'login': 'Login',
            'logout': 'Logout',
            'login_negado': 'Login Negado',
            'correcao_saldo': 'Correção Saldo',
            'backup': 'Backup',
            'restore': 'Restore',
            'configuracao': 'Configuração',
            'limpeza_dados': 'Limpeza Dados'
        };
        return operacoes[operacao] || operacao;
    }

    /**
     * Formata detalhes do log
     * @param {Object} log - Entrada do log
     * @returns {string} Detalhes formatados
     */
    formatarDetalhesLog(log) {
        switch (log.operacao) {
            case 'correcao_saldo':
                return `Cartão **** ${log.dados.cartao.slice(-4)}: ${log.dados.saldoAnterior.toFixed(2)} → ${log.dados.saldoNovo.toFixed(2)}`;
            case 'backup':
                return `${log.dados.totalCartoes} cartões, ${log.dados.totalTransacoes} transações`;
            case 'restore':
                return `Arquivo: ${log.dados.nomeArquivo}`;
            case 'limpeza_dados':
                return `Tipo: ${log.dados.tipo}`;
            case 'login_negado':
                return `Tentativa: ${log.dados.tentativa}`;
            default:
                return '-';
        }
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
     * Mostra mensagem de erro
     * @param {string} mensagem - Mensagem de erro
     */
    mostrarErro(mensagem) {
        alert(`❌ ${mensagem}`);
        console.error('Erro admin:', mensagem);
    }

    /**
     * Mostra mensagem de sucesso
     * @param {string} mensagem - Mensagem de sucesso
     */
    mostrarSucesso(mensagem) {
        console.log('Sucesso admin:', mensagem);
    }

    /**
     * Carrega configurações do localStorage
     * @returns {Object} Configurações salvas
     */
    carregarConfiguracoes() {
        try {
            const dados = localStorage.getItem('caixaevent_config_admin');
            return dados ? JSON.parse(dados) : {
                nomeEvento: 'CaixaEvent',
                senhaAdmin: 'admin123',
                limiteRecarga: 1000,
                alertaEstoqueBaixo: 10,
                backupAutomatico: false,
                logDetalhado: true
            };
        } catch (error) {
            console.error('Erro ao carregar configurações:', error);
            return {};
        }
    }

    /**
     * Carrega log de operações do localStorage
     * @returns {Array} Log de operações
     */
    carregarLogOperacoes() {
        try {
            const dados = localStorage.getItem('caixaevent_log_operacoes');
            return dados ? JSON.parse(dados) : [];
        } catch (error) {
            console.error('Erro ao carregar log:', error);
            return [];
        }
    }

    /**
     * Salva log de operações no localStorage
     */
    salvarLogOperacoes() {
        try {
            localStorage.setItem('caixaevent_log_operacoes', JSON.stringify(this.logOperacoes));
        } catch (error) {
            console.error('Erro ao salvar log:', error);
        }
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
window.realizarLogin = function() {
    paginaAdmin.realizarLogin();
};

window.realizarLogout = function() {
    paginaAdmin.realizarLogout();
};

window.buscarCartaoCorrecao = function() {
    paginaAdmin.buscarCartaoCorrecao();
};

window.corrigirSaldo = function() {
    paginaAdmin.corrigirSaldo();
};

window.gerarRelatorio = function() {
    paginaAdmin.gerarRelatorio();
};

window.exportarRelatorio = function() {
    paginaAdmin.exportarRelatorio();
};

window.fazerBackup = function() {
    paginaAdmin.fazerBackup();
};

window.salvarConfiguracoes = function() {
    paginaAdmin.salvarConfiguracoes();
};

window.limparDadosSistema = function() {
    paginaAdmin.limparDadosSistema();
};

window.voltarPagina = function() {
    paginaAdmin.voltarPagina();
};

// Inicializa página quando DOM carregar
let paginaAdmin;

document.addEventListener('DOMContentLoaded', function() {
    // Aguarda o gerenciador de cartões estar disponível
    if (typeof gerenciadorCartao !== 'undefined') {
        paginaAdmin = new PaginaAdmin();
    } else {
        // Tenta novamente após 100ms
        setTimeout(() => {
            paginaAdmin = new PaginaAdmin();
        }, 100);
    }
});

console.log('Sistema administrativo CaixaEvent carregado com sucesso!');