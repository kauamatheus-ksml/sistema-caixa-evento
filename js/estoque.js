// Arquivo: estoque.js - Controle da página de estoque
// Sistema de Controle de Caixa para Eventos

/**
 * Classe para gerenciar a página de estoque
 */
class PaginaEstoque {
    constructor() {
        this.produtos = this.carregarProdutos();
        this.filtroAtivo = 'todos';
        this.buscaAtiva = '';
        this.produtoEditando = null;
        this.inicializar();
    }

    /**
     * Inicializa a página de estoque
     */
    inicializar() {
        console.log('Página de estoque inicializada');
        this.configurarEventos();
        this.renderizarTabela();
        this.atualizarEstatisticas();
        this.criarProdutosDemo();
    }

    /**
     * Configura eventos dos elementos da página
     */
    configurarEventos() {
        // Busca de produtos
        const inputBusca = document.getElementById('buscaProdutos');
        if (inputBusca) {
            inputBusca.addEventListener('input', (e) => {
                this.buscaAtiva = e.target.value.toLowerCase();
                this.renderizarTabela();
            });
        }

        // Filtros de categoria
        const selectCategoria = document.getElementById('filtroCategoria');
        if (selectCategoria) {
            selectCategoria.addEventListener('change', (e) => {
                this.filtroAtivo = e.target.value;
                this.renderizarTabela();
            });
        }

        // Filtros de status
        const selectStatus = document.getElementById('filtroStatus');
        if (selectStatus) {
            selectStatus.addEventListener('change', (e) => {
                this.filtroStatus = e.target.value;
                this.renderizarTabela();
            });
        }

        // Botão adicionar produto
        const btnAdicionar = document.getElementById('btnAdicionarProduto');
        if (btnAdicionar) {
            btnAdicionar.addEventListener('click', () => {
                this.abrirModalProduto();
            });
        }

        // Modal de produto
        this.configurarModalProduto();

        // Delegação de eventos para tabela
        this.configurarEventosTabela();
    }

    /**
     * Configura eventos do modal de produto
     */
    configurarModalProduto() {
        const modal = document.getElementById('modalProduto');
        const btnSalvar = document.getElementById('btnSalvarProduto');
        const btnCancelar = document.getElementById('btnCancelarProduto');
        const btnFechar = document.querySelector('.modal-close');

        if (btnSalvar) {
            btnSalvar.addEventListener('click', () => {
                this.salvarProduto();
            });
        }

        if (btnCancelar) {
            btnCancelar.addEventListener('click', () => {
                this.fecharModalProduto();
            });
        }

        if (btnFechar) {
            btnFechar.addEventListener('click', () => {
                this.fecharModalProduto();
            });
        }

        // Fecha modal clicando fora
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.fecharModalProduto();
                }
            });
        }

        // Validação em tempo real
        const inputs = ['nomeProduto', 'precoProduto', 'estoqueProduto'];
        inputs.forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.addEventListener('input', () => {
                    this.validarFormularioProduto();
                });
            }
        });
    }

    /**
     * Configura eventos da tabela (delegação)
     */
    configurarEventosTabela() {
        const tabela = document.querySelector('.products-table');
        if (tabela) {
            tabela.addEventListener('click', (e) => {
                const target = e.target.closest('button');
                if (!target) return;

                const produtoId = target.dataset.produtoId;
                const acao = target.dataset.acao;

                if (acao === 'editar') {
                    this.editarProduto(produtoId);
                } else if (acao === 'excluir') {
                    this.excluirProduto(produtoId);
                } else if (acao === 'toggle-status') {
                    this.alterarStatusProduto(produtoId);
                }
            });
        }
    }

    /**
     * Cria produtos de demonstração se não existirem
     */
    criarProdutosDemo() {
        if (Object.keys(this.produtos).length > 0) return;

        const produtosDemo = [
            {
                id: 'cerveja_lata',
                nome: 'Cerveja Lata 350ml',
                descricao: 'Cerveja lata 350ml - Skol, Brahma, Antarctica',
                preco: 8.00,
                categoria: 'bebidas',
                estoque: 45,
                estoqueMinimo: 10,
                ativo: true,
                dataCriacao: new Date().toISOString(),
                ultimaAtualizacao: new Date().toISOString()
            },
            {
                id: 'refrigerante',
                nome: 'Refrigerante Lata',
                descricao: 'Refrigerante lata 350ml - Coca-Cola, Pepsi, Guaraná',
                preco: 5.00,
                categoria: 'bebidas',
                estoque: 32,
                estoqueMinimo: 15,
                ativo: true,
                dataCriacao: new Date().toISOString(),
                ultimaAtualizacao: new Date().toISOString()
            },
            {
                id: 'agua_mineral',
                nome: 'Água Mineral 500ml',
                descricao: 'Água mineral 500ml - Crystal, Bonafont',
                preco: 3.00,
                categoria: 'bebidas',
                estoque: 78,
                estoqueMinimo: 20,
                ativo: true,
                dataCriacao: new Date().toISOString(),
                ultimaAtualizacao: new Date().toISOString()
            },
            {
                id: 'pizza_fatia',
                nome: 'Pizza Fatia',
                descricao: 'Fatia de pizza - Calabresa, Margherita, Portuguesa',
                preco: 12.00,
                categoria: 'comidas',
                estoque: 16,
                estoqueMinimo: 5,
                ativo: true,
                dataCriacao: new Date().toISOString(),
                ultimaAtualizacao: new Date().toISOString()
            },
            {
                id: 'hot_dog',
                nome: 'Hot Dog Completo',
                descricao: 'Hot dog completo com batata palha e molhos',
                preco: 10.00,
                categoria: 'comidas',
                estoque: 23,
                estoqueMinimo: 5,
                ativo: true,
                dataCriacao: new Date().toISOString(),
                ultimaAtualizacao: new Date().toISOString()
            },
            {
                id: 'pipoca',
                nome: 'Pipoca Doce',
                descricao: 'Pipoca doce pacote 100g',
                preco: 6.00,
                categoria: 'snacks',
                estoque: 8,
                estoqueMinimo: 10,
                ativo: true,
                dataCriacao: new Date().toISOString(),
                ultimaAtualizacao: new Date().toISOString()
            },
            {
                id: 'amendoim',
                nome: 'Amendoim Torrado',
                descricao: 'Amendoim torrado pacote 50g',
                preco: 4.00,
                categoria: 'snacks',
                estoque: 3,
                estoqueMinimo: 10,
                ativo: true,
                dataCriacao: new Date().toISOString(),
                ultimaAtualizacao: new Date().toISOString()
            },
            {
                id: 'energetico',
                nome: 'Energético Lata',
                descricao: 'Energético lata 250ml - Red Bull, Monster',
                preco: 12.00,
                categoria: 'bebidas',
                estoque: 0,
                estoqueMinimo: 5,
                ativo: false,
                dataCriacao: new Date().toISOString(),
                ultimaAtualizacao: new Date().toISOString()
            }
        ];

        produtosDemo.forEach(produto => {
            this.produtos[produto.id] = produto;
        });

        this.salvarProdutos();
    }

    /**
     * Renderiza tabela de produtos
     */
    renderizarTabela() {
        const tbody = document.querySelector('.products-table tbody');
        if (!tbody) return;

        const produtosFiltrados = this.filtrarProdutos();

        if (produtosFiltrados.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="no-products">
                        <i class="fas fa-box-open"></i>
                        <span>Nenhum produto encontrado</span>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = produtosFiltrados.map(produto => {
            const statusEstoque = this.obterStatusEstoque(produto);
            const statusProduto = produto.ativo ? 'Ativo' : 'Inativo';

            return `
                <tr class="${!produto.ativo ? 'inactive' : ''}">
                    <td>
                        <div class="product-info">
                            <div class="product-name">${produto.nome}</div>
                            <div class="product-description">${produto.descricao}</div>
                        </div>
                    </td>
                    <td>
                        <span class="category-badge category-${produto.categoria}">
                            ${this.formatarCategoria(produto.categoria)}
                        </span>
                    </td>
                    <td class="price">R$ ${produto.preco.toFixed(2).replace('.', ',')}</td>
                    <td>
                        <div class="stock-info">
                            <span class="stock-quantity ${statusEstoque.classe}">
                                ${produto.estoque}
                            </span>
                            <span class="stock-minimum">
                                Mín: ${produto.estoqueMinimo || 0}
                            </span>
                        </div>
                    </td>
                    <td>
                        <span class="status-badge ${statusEstoque.classe}">
                            ${statusEstoque.texto}
                        </span>
                    </td>
                    <td class="actions">
                        <button class="action-btn edit-btn" 
                                data-produto-id="${produto.id}" 
                                data-acao="editar"
                                title="Editar produto">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn toggle-btn" 
                                data-produto-id="${produto.id}" 
                                data-acao="toggle-status"
                                title="${produto.ativo ? 'Desativar' : 'Ativar'} produto">
                            <i class="fas fa-${produto.ativo ? 'eye-slash' : 'eye'}"></i>
                        </button>
                        <button class="action-btn delete-btn" 
                                data-produto-id="${produto.id}" 
                                data-acao="excluir"
                                title="Excluir produto">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    /**
     * Filtra produtos baseado nos filtros ativos
     * @returns {Array} Lista de produtos filtrados
     */
    filtrarProdutos() {
        return Object.values(this.produtos).filter(produto => {
            // Filtro de categoria
            if (this.filtroAtivo !== 'todos' && produto.categoria !== this.filtroAtivo) {
                return false;
            }

            // Filtro de status
            if (this.filtroStatus) {
                if (this.filtroStatus === 'ativo' && !produto.ativo) return false;
                if (this.filtroStatus === 'inativo' && produto.ativo) return false;
                if (this.filtroStatus === 'estoque-baixo' && produto.estoque > produto.estoqueMinimo) return false;
                if (this.filtroStatus === 'sem-estoque' && produto.estoque > 0) return false;
            }

            // Filtro de busca
            if (this.buscaAtiva) {
                const busca = this.buscaAtiva.toLowerCase();
                return produto.nome.toLowerCase().includes(busca) ||
                       produto.descricao.toLowerCase().includes(busca);
            }

            return true;
        });
    }

    /**
     * Abre modal para adicionar/editar produto
     * @param {Object} produto - Produto para editar (opcional)
     */
    abrirModalProduto(produto = null) {
        const modal = document.getElementById('modalProduto');
        const titulo = document.getElementById('tituloModal');
        
        this.produtoEditando = produto;

        if (produto) {
            // Modo edição
            titulo.textContent = 'Editar Produto';
            this.preencherFormularioProduto(produto);
        } else {
            // Modo criação
            titulo.textContent = 'Novo Produto';
            this.limparFormularioProduto();
        }

        modal.style.display = 'flex';
        document.getElementById('nomeProduto').focus();
    }

    /**
     * Fecha modal de produto
     */
    fecharModalProduto() {
        const modal = document.getElementById('modalProduto');
        modal.style.display = 'none';
        this.produtoEditando = null;
        this.limparFormularioProduto();
    }

    /**
     * Preenche formulário com dados do produto
     * @param {Object} produto - Dados do produto
     */
    preencherFormularioProduto(produto) {
        document.getElementById('nomeProduto').value = produto.nome;
        document.getElementById('descricaoProduto').value = produto.descricao;
        document.getElementById('precoProduto').value = produto.preco.toFixed(2);
        document.getElementById('categoriaProduto').value = produto.categoria;
        document.getElementById('estoqueProduto').value = produto.estoque;
        document.getElementById('estoqueMinimoProduto').value = produto.estoqueMinimo || 0;
        document.getElementById('ativoProduto').checked = produto.ativo;
    }

    /**
     * Limpa formulário do produto
     */
    limparFormularioProduto() {
        document.getElementById('formProduto').reset();
        document.getElementById('ativoProduto').checked = true;
        this.validarFormularioProduto();
    }

    /**
     * Valida formulário do produto
     */
    validarFormularioProduto() {
        const nome = document.getElementById('nomeProduto').value.trim();
        const preco = parseFloat(document.getElementById('precoProduto').value) || 0;
        const estoque = parseInt(document.getElementById('estoqueProduto').value) || 0;
        
        const btnSalvar = document.getElementById('btnSalvarProduto');
        const valido = nome.length >= 3 && preco > 0 && estoque >= 0;
        
        btnSalvar.disabled = !valido;
    }

    /**
     * Salva produto (criar ou editar)
     */
    salvarProduto() {
        try {
            const formData = this.obterDadosFormulario();
            
            if (!this.validarDadosProduto(formData)) {
                return;
            }

            if (this.produtoEditando) {
                // Editar produto existente
                this.atualizarProduto(this.produtoEditando.id, formData);
            } else {
                // Criar novo produto
                this.criarNovoProduto(formData);
            }

            this.fecharModalProduto();
            this.renderizarTabela();
            this.atualizarEstatisticas();
            this.mostrarSucesso('Produto salvo com sucesso!');

        } catch (error) {
            console.error('Erro ao salvar produto:', error);
            this.mostrarErro('Erro ao salvar produto. Tente novamente.');
        }
    }

    /**
     * Obtém dados do formulário
     * @returns {Object} Dados do formulário
     */
    obterDadosFormulario() {
        return {
            nome: document.getElementById('nomeProduto').value.trim(),
            descricao: document.getElementById('descricaoProduto').value.trim(),
            preco: parseFloat(document.getElementById('precoProduto').value) || 0,
            categoria: document.getElementById('categoriaProduto').value,
            estoque: parseInt(document.getElementById('estoqueProduto').value) || 0,
            estoqueMinimo: parseInt(document.getElementById('estoqueMinimoProduto').value) || 0,
            ativo: document.getElementById('ativoProduto').checked
        };
    }

    /**
     * Valida dados do produto
     * @param {Object} dados - Dados a validar
     * @returns {boolean} Se os dados são válidos
     */
    validarDadosProduto(dados) {
        if (dados.nome.length < 3) {
            this.mostrarErro('Nome deve ter pelo menos 3 caracteres');
            return false;
        }

        if (dados.preco <= 0) {
            this.mostrarErro('Preço deve ser maior que zero');
            return false;
        }

        if (dados.estoque < 0) {
            this.mostrarErro('Estoque não pode ser negativo');
            return false;
        }

        // Verifica se nome já existe (apenas para produtos novos)
        if (!this.produtoEditando) {
            const nomeExiste = Object.values(this.produtos).some(p => 
                p.nome.toLowerCase() === dados.nome.toLowerCase()
            );

            if (nomeExiste) {
                this.mostrarErro('Já existe um produto com este nome');
                return false;
            }
        }

        return true;
    }

    /**
     * Cria novo produto
     * @param {Object} dados - Dados do produto
     */
    criarNovoProduto(dados) {
        const id = this.gerarIdProduto(dados.nome);
        const agora = new Date().toISOString();

        const produto = {
            id: id,
            ...dados,
            dataCriacao: agora,
            ultimaAtualizacao: agora,
            totalVendido: 0
        };

        this.produtos[id] = produto;
        this.salvarProdutos();

        console.log('Novo produto criado:', produto);
    }

    /**
     * Atualiza produto existente
     * @param {string} id - ID do produto
     * @param {Object} dados - Novos dados
     */
    atualizarProduto(id, dados) {
        if (!this.produtos[id]) {
            throw new Error('Produto não encontrado');
        }

        const produto = this.produtos[id];
        
        // Atualiza campos
        Object.assign(produto, dados, {
            ultimaAtualizacao: new Date().toISOString()
        });

        this.produtos[id] = produto;
        this.salvarProdutos();

        console.log('Produto atualizado:', produto);
    }

    /**
     * Edita produto
     * @param {string} produtoId - ID do produto
     */
    editarProduto(produtoId) {
        const produto = this.produtos[produtoId];
        if (!produto) {
            this.mostrarErro('Produto não encontrado');
            return;
        }

        this.abrirModalProduto(produto);
    }

    /**
     * Exclui produto
     * @param {string} produtoId - ID do produto
     */
    excluirProduto(produtoId) {
        const produto = this.produtos[produtoId];
        if (!produto) {
            this.mostrarErro('Produto não encontrado');
            return;
        }

        if (!confirm(`Tem certeza que deseja excluir "${produto.nome}"?\n\nEsta ação não pode ser desfeita.`)) {
            return;
        }

        delete this.produtos[produtoId];
        this.salvarProdutos();
        this.renderizarTabela();
        this.atualizarEstatisticas();
        
        this.mostrarSucesso('Produto excluído com sucesso!');
        console.log('Produto excluído:', produtoId);
    }

    /**
     * Altera status do produto (ativo/inativo)
     * @param {string} produtoId - ID do produto
     */
    alterarStatusProduto(produtoId) {
        const produto = this.produtos[produtoId];
        if (!produto) {
            this.mostrarErro('Produto não encontrado');
            return;
        }

        const novoStatus = !produto.ativo;
        produto.ativo = novoStatus;
        produto.ultimaAtualizacao = new Date().toISOString();

        this.produtos[produtoId] = produto;
        this.salvarProdutos();
        this.renderizarTabela();
        this.atualizarEstatisticas();

        const statusTexto = novoStatus ? 'ativado' : 'desativado';
        this.mostrarSucesso(`Produto ${statusTexto} com sucesso!`);
    }

    /**
     * Atualiza estatísticas do estoque
     */
    atualizarEstatisticas() {
        const produtos = Object.values(this.produtos);
        const stats = {
            total: produtos.length,
            ativos: produtos.filter(p => p.ativo).length,
            inativos: produtos.filter(p => !p.ativo).length,
            estoqueBaixo: produtos.filter(p => p.estoque <= p.estoqueMinimo).length,
            semEstoque: produtos.filter(p => p.estoque === 0).length,
            valorTotalEstoque: produtos.reduce((total, p) => total + (p.preco * p.estoque), 0)
        };

        // Atualiza elementos na interface
        this.atualizarElementoEstatistica('totalProdutos', stats.total);
        this.atualizarElementoEstatistica('produtosAtivos', stats.ativos);
        this.atualizarElementoEstatistica('produtosEstoqueBaixo', stats.estoqueBaixo);
        this.atualizarElementoEstatistica('produtosSemEstoque', stats.semEstoque);
        this.atualizarElementoEstatistica('valorTotalEstoque', `R$ ${stats.valorTotalEstoque.toFixed(2).replace('.', ',')}`);

        // Atualiza alertas
        this.atualizarAlertas(stats);
    }

    /**
     * Atualiza elemento de estatística na interface
     * @param {string} id - ID do elemento
     * @param {string|number} valor - Valor a exibir
     */
    atualizarElementoEstatistica(id, valor) {
        const elemento = document.getElementById(id);
        if (elemento) {
            elemento.textContent = valor;
        }
    }

    /**
     * Atualiza alertas de estoque
     * @param {Object} stats - Estatísticas
     */
    atualizarAlertas(stats) {
        const alertsContainer = document.getElementById('alertasEstoque');
        if (!alertsContainer) return;

        const alertas = [];

        if (stats.semEstoque > 0) {
            alertas.push({
                tipo: 'danger',
                icone: 'fas fa-exclamation-triangle',
                texto: `${stats.semEstoque} produto(s) sem estoque`
            });
        }

        if (stats.estoqueBaixo > 0) {
            alertas.push({
                tipo: 'warning',
                icone: 'fas fa-exclamation-circle',
                texto: `${stats.estoqueBaixo} produto(s) com estoque baixo`
            });
        }

        if (alertas.length === 0) {
            alertsContainer.innerHTML = `
                <div class="alert alert-success">
                    <i class="fas fa-check-circle"></i>
                    <span>Todos os produtos em estoque adequado</span>
                </div>
            `;
        } else {
            alertsContainer.innerHTML = alertas.map(alerta => `
                <div class="alert alert-${alerta.tipo}">
                    <i class="${alerta.icone}"></i>
                    <span>${alerta.texto}</span>
                </div>
            `).join('');
        }
    }

    /**
     * Obtém status do estoque de um produto
     * @param {Object} produto - Produto
     * @returns {Object} Status do estoque
     */
    obterStatusEstoque(produto) {
        if (produto.estoque === 0) {
            return {
                classe: 'sem-estoque',
                texto: 'Sem estoque'
            };
        } else if (produto.estoque <= produto.estoqueMinimo) {
            return {
                classe: 'estoque-baixo',
                texto: 'Estoque baixo'
            };
        } else {
            return {
                classe: 'estoque-ok',
                texto: 'Em estoque'
            };
        }
    }

    /**
     * Formata nome da categoria
     * @param {string} categoria - Categoria
     * @returns {string} Categoria formatada
     */
    formatarCategoria(categoria) {
        const categorias = {
            'bebidas': 'Bebidas',
            'comidas': 'Comidas',
            'snacks': 'Snacks',
            'outros': 'Outros'
        };

        return categorias[categoria] || categoria;
    }

    /**
     * Gera ID único para produto
     * @param {string} nome - Nome do produto
     * @returns {string} ID gerado
     */
    gerarIdProduto(nome) {
        // Remove caracteres especiais e espaços
        let id = nome.toLowerCase()
                     .normalize('NFD')
                     .replace(/[\u0300-\u036f]/g, '') // Remove acentos
                     .replace(/[^a-z0-9]/g, '_')       // Substitui caracteres especiais por _
                     .replace(/_+/g, '_')              // Remove _ duplicados
                     .replace(/^_|_$/g, '');           // Remove _ do início e fim

        // Adiciona timestamp se ID já existir
        if (this.produtos[id]) {
            id += '_' + Date.now();
        }

        return id;
    }

    /**
     * Exporta dados do estoque
     * @returns {Object} Dados para exportação
     */
    exportarEstoque() {
        return {
            produtos: this.produtos,
            estatisticas: this.obterEstatisticasCompletas(),
            dataExportacao: new Date().toISOString(),
            versao: '1.0'
        };
    }

    /**
     * Importa dados do estoque
     * @param {Object} dados - Dados para importar
     * @returns {boolean} Sucesso na importação
     */
    importarEstoque(dados) {
        try {
            if (dados.produtos) {
                this.produtos = dados.produtos;
                this.salvarProdutos();
                this.renderizarTabela();
                this.atualizarEstatisticas();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Erro ao importar estoque:', error);
            return false;
        }
    }

    /**
     * Obtém estatísticas completas
     * @returns {Object} Estatísticas completas
     */
    obterEstatisticasCompletas() {
        const produtos = Object.values(this.produtos);
        
        return {
            totalProdutos: produtos.length,
            produtosAtivos: produtos.filter(p => p.ativo).length,
            valorTotalEstoque: produtos.reduce((total, p) => total + (p.preco * p.estoque), 0),
            produtosPorCategoria: this.agruparPorCategoria(produtos),
            alertasEstoque: {
                semEstoque: produtos.filter(p => p.estoque === 0).length,
                estoqueBaixo: produtos.filter(p => p.estoque <= p.estoqueMinimo).length
            }
        };
    }

    /**
     * Agrupa produtos por categoria
     * @param {Array} produtos - Lista de produtos
     * @returns {Object} Produtos agrupados por categoria
     */
    agruparPorCategoria(produtos) {
        return produtos.reduce((grupos, produto) => {
            const categoria = produto.categoria;
            if (!grupos[categoria]) {
                grupos[categoria] = [];
            }
            grupos[categoria].push(produto);
            return grupos;
        }, {});
    }

    /**
     * Mostra mensagem de erro
     * @param {string} mensagem - Mensagem de erro
     */
    mostrarErro(mensagem) {
        alert(`❌ ${mensagem}`);
        console.error('Erro no estoque:', mensagem);
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
     * Carrega produtos do localStorage
     * @returns {Object} Produtos salvos
     */
    carregarProdutos() {
        try {
            const dados = localStorage.getItem('caixaevent_produtos');
            return dados ? JSON.parse(dados) : {};
        } catch (error) {
            console.error('Erro ao carregar produtos:', error);
            return {};
        }
    }

    /**
     * Salva produtos no localStorage
     */
    salvarProdutos() {
        try {
            localStorage.setItem('caixaevent_produtos', JSON.stringify(this.produtos));
        } catch (error) {
            console.error('Erro ao salvar produtos:', error);
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
window.abrirModalProduto = function() {
    paginaEstoque.abrirModalProduto();
};

window.fecharModalProduto = function() {
    paginaEstoque.fecharModalProduto();
};

window.salvarProduto = function() {
    paginaEstoque.salvarProduto();
};

window.voltarPagina = function() {
    paginaEstoque.voltarPagina();
};

// Inicializa página quando DOM carregar
let paginaEstoque;

document.addEventListener('DOMContentLoaded', function() {
    paginaEstoque = new PaginaEstoque();
});

console.log('Sistema de estoque CaixaEvent carregado com sucesso!');