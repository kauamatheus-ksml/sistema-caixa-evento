// Arquivo: vendas.js - Controle da página de vendas
// Sistema de Controle de Caixa para Eventos

/**
 * Classe para gerenciar a página de vendas
 */
class PaginaVendas {
    constructor() {
        this.cartaoAtual = null;
        this.carrinho = [];
        this.produtos = this.carregarProdutos();
        this.categoriaAtiva = 'todos';
        this.processandoVenda = false;
        this.inicializar();
    }

    /**
     * Inicializa a página de vendas
     */
    inicializar() {
        console.log('Página de vendas inicializada');
        this.configurarEventos();
        this.renderizarProdutos();
        this.atualizarCarrinho();
        this.validarFormulario();
        this.criarProdutosDemo();
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
            });

            inputCartao.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.lerCartaoManual();
                }
            });
        }

        // Filtros de categoria
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.filtrarPorCategoria(e.target.dataset.categoria || 'todos');
            });
        });

        // Configurar callback para leitura de cartão
        window.onCartaoLido = (resultado) => {
            this.processarCartaoLido(resultado);
        };

        window.onErroLeitura = (erro) => {
            this.mostrarErro('Erro na leitura do cartão. Tente novamente.');
        };

        // Eventos do carrinho
        this.configurarEventosCarrinho();
    }

    /**
     * Configura eventos específicos do carrinho
     */
    configurarEventosCarrinho() {
        // Delegação de eventos para botões dinâmicos do carrinho
        const carrinho = document.querySelector('.cart');
        if (carrinho) {
            carrinho.addEventListener('click', (e) => {
                const target = e.target.closest('button');
                if (!target) return;

                const produtoId = target.dataset.produtoId;
                const acao = target.dataset.acao;

                if (acao === 'aumentar') {
                    this.adicionarAoCarrinho(produtoId);
                } else if (acao === 'diminuir') {
                    this.removerDoCarrinho(produtoId, 1);
                } else if (acao === 'remover') {
                    this.removerDoCarrinho(produtoId);
                }
            });
        }
    }

    /**
     * Cria produtos de demonstração
     */
    criarProdutosDemo() {
        const produtosDemo = [
            {
                id: 'cerveja_lata',
                nome: 'Cerveja Lata',
                descricao: 'Cerveja lata 350ml - Skol, Brahma, Antarctica',
                preco: 8.00,
                categoria: 'bebidas',
                estoque: 45,
                ativo: true,
                emoji: '🍺'
            },
            {
                id: 'refrigerante',
                nome: 'Refrigerante',
                descricao: 'Refrigerante lata 350ml - Coca-Cola, Pepsi, Guaraná',
                preco: 5.00,
                categoria: 'bebidas',
                estoque: 32,
                ativo: true,
                emoji: '🥤'
            },
            {
                id: 'agua_mineral',
                nome: 'Água Mineral',
                descricao: 'Água mineral 500ml - Crystal, Bonafont',
                preco: 3.00,
                categoria: 'bebidas',
                estoque: 78,
                ativo: true,
                emoji: '💧'
            },
            {
                id: 'pizza_fatia',
                nome: 'Pizza Fatia',
                descricao: 'Fatia de pizza - Calabresa, Margherita, Portuguesa',
                preco: 12.00,
                categoria: 'comidas',
                estoque: 16,
                ativo: true,
                emoji: '🍕'
            },
            {
                id: 'hot_dog',
                nome: 'Hot Dog',
                descricao: 'Hot dog completo com batata palha e molhos',
                preco: 10.00,
                categoria: 'comidas',
                estoque: 23,
                ativo: true,
                emoji: '🌭'
            },
            {
                id: 'pipoca',
                nome: 'Pipoca Doce',
                descricao: 'Pipoca doce pacote 100g',
                preco: 6.00,
                categoria: 'snacks',
                estoque: 8,
                ativo: true,
                emoji: '🍿'
            },
            {
                id: 'amendoim',
                nome: 'Amendoim',
                descricao: 'Amendoim torrado pacote 50g',
                preco: 4.00,
                categoria: 'snacks',
                estoque: 3,
                ativo: true,
                emoji: '🥜'
            },
            {
                id: 'energetico',
                nome: 'Energético',
                descricao: 'Energético lata 250ml - Red Bull, Monster',
                preco: 12.00,
                categoria: 'bebidas',
                estoque: 0,
                ativo: false,
                emoji: '⚡'
            }
        ];

        // Salva produtos se não existirem
        produtosDemo.forEach(produto => {
            if (!this.produtos[produto.id]) {
                this.produtos[produto.id] = produto;
            }
        });

        this.salvarProdutos();
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

        if (!dadosCartao.ativo) {
            this.mostrarErro('Cartão bloqueado. Contate a administração.');
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
     * Filtra produtos por categoria
     * @param {string} categoria - Categoria a filtrar
     */
    filtrarPorCategoria(categoria) {
        this.categoriaAtiva = categoria;
        
        // Atualiza botões de filtro
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.categoria === categoria || (categoria === 'todos' && !btn.dataset.categoria)) {
                btn.classList.add('active');
            }
        });

        this.renderizarProdutos();
    }

    /**
     * Renderiza produtos na interface
     */
    renderizarProdutos() {
        const grid = document.querySelector('.products-grid');
        if (!grid) return;

        const produtosFiltrados = Object.values(this.produtos).filter(produto => {
            if (this.categoriaAtiva === 'todos') return true;
            return produto.categoria === this.categoriaAtiva;
        });

        grid.innerHTML = produtosFiltrados.map(produto => {
            const statusEstoque = this.obterStatusEstoque(produto.estoque);
            const podeBeber = produto.ativo && produto.estoque > 0;

            return `
                <div class="product-card ${!podeBeber ? 'disabled' : ''}" 
                     onclick="${podeBeber ? `paginaVendas.adicionarAoCarrinho('${produto.id}')` : ''}">
                    <div class="product-image">${produto.emoji}</div>
                    <div class="product-name">${produto.nome}</div>
                    <div class="product-description">${produto.descricao}</div>
                    <div class="product-price">R$ ${produto.preco.toFixed(2).replace('.', ',')}</div>
                    <div class="product-stock ${statusEstoque.classe}">
                        ${produto.estoque === 0 ? 'Sem estoque' : `Em estoque: ${produto.estoque}`}
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Adiciona produto ao carrinho
     * @param {string} produtoId - ID do produto
     * @param {number} quantidade - Quantidade a adicionar
     */
    adicionarAoCarrinho(produtoId, quantidade = 1) {
        const produto = this.produtos[produtoId];
        if (!produto || !produto.ativo || produto.estoque <= 0) {
            this.mostrarErro('Produto indisponível');
            return;
        }

        // Verifica se já existe no carrinho
        const itemExistente = this.carrinho.find(item => item.id === produtoId);
        
        if (itemExistente) {
            // Verifica estoque
            if (itemExistente.quantidade + quantidade > produto.estoque) {
                this.mostrarErro(`Estoque insuficiente. Disponível: ${produto.estoque}`);
                return;
            }
            itemExistente.quantidade += quantidade;
        } else {
            // Adiciona novo item
            this.carrinho.push({
                id: produtoId,
                nome: produto.nome,
                preco: produto.preco,
                quantidade: quantidade
            });
        }

        this.atualizarCarrinho();
        this.validarFormulario();
        this.mostrarSucesso(`${produto.nome} adicionado ao carrinho`);
    }

    /**
     * Remove produto do carrinho
     * @param {string} produtoId - ID do produto
     * @param {number} quantidade - Quantidade a remover (opcional, remove tudo se não especificado)
     */
    removerDoCarrinho(produtoId, quantidade = null) {
        const indice = this.carrinho.findIndex(item => item.id === produtoId);
        if (indice === -1) return;

        const item = this.carrinho[indice];

        if (quantidade === null || item.quantidade <= quantidade) {
            // Remove item completamente
            this.carrinho.splice(indice, 1);
        } else {
            // Diminui quantidade
            item.quantidade -= quantidade;
        }

        this.atualizarCarrinho();
        this.validarFormulario();
    }

    /**
     * Atualiza interface do carrinho
     */
    atualizarCarrinho() {
        const container = document.querySelector('.cart-items');
        const totalElement = document.querySelector('.total-value');
        
        if (!container) return;

        if (this.carrinho.length === 0) {
            container.innerHTML = `
                <div class="cart-empty">
                    <i class="fas fa-shopping-cart"></i>
                    <span>Carrinho vazio</span>
                </div>
            `;
        } else {
            container.innerHTML = this.carrinho.map(item => `
                <div class="cart-item">
                    <div class="cart-item-info">
                        <div class="cart-item-name">${item.nome}</div>
                        <div class="cart-item-price">R$ ${item.preco.toFixed(2).replace('.', ',')}</div>
                    </div>
                    <div class="quantity-controls">
                        <button class="qty-btn" data-produto-id="${item.id}" data-acao="diminuir">-</button>
                        <span class="quantity">${item.quantidade}</span>
                        <button class="qty-btn" data-produto-id="${item.id}" data-acao="aumentar">+</button>
                        <button class="remove-btn" data-produto-id="${item.id}" data-acao="remover">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `).join('');
        }

        // Atualiza total
        const total = this.calcularTotal();
        if (totalElement) {
            totalElement.textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
        }

        // Atualiza subtotal se existir
        const subtotalElement = document.querySelector('.subtotal-value');
        if (subtotalElement) {
            subtotalElement.textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
        }
    }

    /**
     * Calcula total do carrinho
     * @returns {number} Total do carrinho
     */
    calcularTotal() {
        return this.carrinho.reduce((total, item) => {
            return total + (item.preco * item.quantidade);
        }, 0);
    }

    /**
     * Finaliza a venda
     */
    async finalizarVenda() {
        if (this.processandoVenda) return;

        try {
            // Validações
            if (!this.cartaoAtual) {
                this.mostrarErro('Nenhum cartão identificado');
                return;
            }

            if (this.carrinho.length === 0) {
                this.mostrarErro('Carrinho vazio');
                return;
            }

            const total = this.calcularTotal();
            
            if (this.cartaoAtual.saldo < total) {
                this.mostrarErro(`Saldo insuficiente. Saldo atual: R$ ${this.cartaoAtual.saldo.toFixed(2).replace('.', ',')}`);
                return;
            }

            // Confirma venda
            if (!confirm(`Confirmar venda de R$ ${total.toFixed(2).replace('.', ',')}?`)) {
                return;
            }

            this.processandoVenda = true;
            this.mostrarLoading('Processando venda...');

            // Processa a venda
            const resultado = await this.processarVenda();
            
            if (resultado.sucesso) {
                this.mostrarModalSucesso(resultado);
                this.atualizarEstoqueProdutos();
                this.limparCarrinho();
                this.atualizarInterfaceCartao();
            } else {
                this.mostrarErro(resultado.erro || 'Erro na venda');
            }

        } catch (error) {
            console.error('Erro na venda:', error);
            this.mostrarErro('Erro inesperado na venda. Tente novamente.');
        } finally {
            this.processandoVenda = false;
            this.esconderLoading();
        }
    }

    /**
     * Processa a venda no backend
     * @returns {Promise<Object>} Resultado da venda
     */
    async processarVenda() {
        return new Promise((resolve) => {
            setTimeout(() => {
                const total = this.calcularTotal();
                const produtos = this.carrinho.map(item => ({
                    id: item.id,
                    nome: item.nome,
                    preco: item.preco,
                    quantidade: item.quantidade
                }));

                const resultado = window.debitarCartao(
                    this.cartaoAtual.numero,
                    total,
                    produtos,
                    'PDV_VENDAS'
                );
                
                if (resultado.sucesso) {
                    this.cartaoAtual = resultado.cartao;
                }
                
                resolve(resultado);
            }, 2000);
        });
    }

    /**
     * Atualiza estoque dos produtos após venda
     */
    atualizarEstoqueProdutos() {
        this.carrinho.forEach(item => {
            if (this.produtos[item.id]) {
                this.produtos[item.id].estoque -= item.quantidade;
                
                // Desativa produto se estoque zerou
                if (this.produtos[item.id].estoque <= 0) {
                    this.produtos[item.id].ativo = false;
                }
            }
        });

        this.salvarProdutos();
        this.renderizarProdutos();
    }

    /**
     * Limpa o carrinho
     */
    limparCarrinho() {
        this.carrinho = [];
        this.atualizarCarrinho();
        this.validarFormulario();
    }

    /**
     * Atualiza interface do cartão identificado
     */
    atualizarInterfaceCartao() {
        if (!this.cartaoAtual) return;

        // Atualiza saldo exibido
        const saldoElement = document.querySelector('.balance-value');
        if (saldoElement) {
            saldoElement.textContent = `R$ ${this.cartaoAtual.saldo.toFixed(2).replace('.', ',')}`;
        }

        // Mostra área do saldo
        const balanceArea = document.querySelector('.balance-display');
        if (balanceArea) {
            balanceArea.style.display = 'block';
        }
    }

    /**
     * Valida se a venda pode ser finalizada
     */
    validarFormulario() {
        const btnFinalizar = document.getElementById('btnFinalizarVenda');
        const temCartao = this.cartaoAtual !== null;
        const temItens = this.carrinho.length > 0;
        const cartaoAtivo = this.cartaoAtual ? this.cartaoAtual.ativo : false;
        
        let temSaldo = false;
        if (this.cartaoAtual && temItens) {
            const total = this.calcularTotal();
            temSaldo = this.cartaoAtual.saldo >= total;
        }

        if (btnFinalizar) {
            btnFinalizar.disabled = !(temCartao && temItens && cartaoAtivo && temSaldo);
            
            if (!cartaoAtivo && this.cartaoAtual) {
                btnFinalizar.innerHTML = '<i class="fas fa-ban"></i> CARTÃO BLOQUEADO';
            } else if (!temSaldo && this.cartaoAtual && temItens) {
                btnFinalizar.innerHTML = '<i class="fas fa-exclamation-triangle"></i> SALDO INSUFICIENTE';
            } else {
                btnFinalizar.innerHTML = '<i class="fas fa-check"></i> FINALIZAR VENDA';
            }
        }
    }

    /**
     * Obtém status do estoque
     * @param {number} quantidade - Quantidade em estoque
     * @returns {Object} Status do estoque
     */
    obterStatusEstoque(quantidade) {
        if (quantidade === 0) {
            return { classe: 'out-of-stock', texto: 'Sem estoque' };
        } else if (quantidade <= 10) {
            return { classe: 'low-stock', texto: 'Estoque baixo' };
        } else {
            return { classe: 'in-stock', texto: 'Em estoque' };
        }
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
     * Mostra modal de sucesso da venda
     * @param {Object} resultado - Resultado da venda
     */
    mostrarModalSucesso(resultado) {
        const total = this.calcularTotal();
        const itens = this.carrinho.length;
        
        alert(`✅ Venda realizada com sucesso!
        
Valor: R$ ${total.toFixed(2).replace('.', ',')}
Itens: ${itens}
Cartão: **** ${this.cartaoAtual.numero.slice(-4)}
Novo saldo: R$ ${resultado.cartao.saldo.toFixed(2).replace('.', ',')}

Obrigado pela preferência!`);
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
        alert(`❌ ${mensagem}`);
        console.error('Erro nas vendas:', mensagem);
    }

    /**
     * Mostra mensagem de sucesso
     * @param {string} mensagem - Mensagem de sucesso
     */
    mostrarSucesso(mensagem) {
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
window.lerCartaoNFC = function() {
    return paginaVendas.lerCartaoNFC();
};

window.lerCartaoManual = function() {
    paginaVendas.lerCartaoManual();
};

window.finalizarVenda = function() {
    paginaVendas.finalizarVenda();
};

window.voltarPagina = function() {
    paginaVendas.voltarPagina();
};

// Inicializa página quando DOM carregar
let paginaVendas;

document.addEventListener('DOMContentLoaded', function() {
    // Aguarda o gerenciador de cartões estar disponível
    if (typeof gerenciadorCartao !== 'undefined') {
        paginaVendas = new PaginaVendas();
    } else {
        // Tenta novamente após 100ms
        setTimeout(() => {
            paginaVendas = new PaginaVendas();
        }, 100);
    }
});

// Previne saída acidental durante venda
window.addEventListener('beforeunload', function(e) {
    if (paginaVendas && paginaVendas.processandoVenda) {
        e.preventDefault();
        e.returnValue = 'Venda em andamento. Tem certeza que deseja sair?';
    }
});

console.log('Sistema de vendas CaixaEvent carregado com sucesso!');