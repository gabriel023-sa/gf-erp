const STORAGE_KEY = 'gf-erp-data-v1';
const AUTH_TOKEN_KEY = 'gf-erp-auth-token';
const LOCAL_MIGRATION_KEY = 'gf-erp-local-migrated-v1';
const API_BASE_URL = window.GF_ERP_API_BASE || '';
const MONTHLY_REVENUE_GOAL = 10000;
const COST_WARNING_TEXT = 'Atenção: há vendas com custo não informado. O lucro pode estar superestimado.';
const filteredModules = new Set(['sales', 'cash', 'payables', 'receivables']);
const mobileCardModules = new Set(['sales', 'stock', 'cash', 'payables', 'receivables', 'quotes', 'production']);

const modules = [
  { id: 'dashboard', title: 'Dashboard', icon: '01' },
  { id: 'sales', title: 'Vendas', icon: '02' },
  { id: 'quotes', title: 'Orcamentos', icon: '03' },
  { id: 'clients', title: 'Clientes', icon: '04' },
  { id: 'products', title: 'Produtos', icon: '05' },
  { id: 'stock', title: 'Estoque', icon: '06' },
  { id: 'cash', title: 'Caixa', icon: '07' },
  { id: 'payables', title: 'Contas a Pagar', icon: '08' },
  { id: 'receivables', title: 'Contas a Receber', icon: '09' },
  { id: 'reports', title: 'Relatorios', icon: '10' },
  { id: 'production', title: 'Producao', icon: '11' }
];

const schemas = {
  sales: {
    title: 'venda',
    fields: [
      { name: 'date', label: 'Data da venda', type: 'date', required: true },
      { name: 'clientId', label: 'Cliente', type: 'select', source: 'clients', required: true },
      { name: 'productId', label: 'Produto', type: 'select', source: 'products', required: true },
      { name: 'quantity', label: 'Quantidade', type: 'number', min: 1, step: 1, required: true },
      { name: 'value', label: 'Valor total', type: 'number', min: 0, step: 0.01, required: true },
      { name: 'paymentMethod', label: 'Forma de pagamento', type: 'select', options: ['Pix', 'Dinheiro', 'Debito', 'Credito', 'Parcelado'], required: true },
      { name: 'status', label: 'Status', type: 'select', options: ['Recebido', 'A receber', 'Entregue', 'Em producao'], required: true },
      { name: 'createProductionOrder', label: 'Gerar pedido de producao automaticamente', type: 'checkbox' },
      { name: 'biancaCommission', label: 'Comissao da Bianca 5%', type: 'checkbox' },
      { name: 'notes', label: 'Observacoes', type: 'textarea', full: true }
    ],
    columns: ['date', 'clientId', 'productId', 'quantity', 'value', 'paymentMethod', 'status', 'biancaCommission', 'saleProfit']
  },
  quotes: {
    title: 'orcamento',
    fields: [
      { name: 'date', label: 'Data do orcamento', type: 'date', required: true },
      { name: 'clientName', label: 'Nome do cliente', type: 'text', required: true },
      { name: 'phone', label: 'Telefone', type: 'tel', required: true },
      { name: 'productId', label: 'Produto', type: 'select', source: 'products', required: true },
      { name: 'quantity', label: 'Quantidade', type: 'number', min: 1, step: 1, required: true },
      { name: 'unitValue', label: 'Valor unitario', type: 'number', min: 0, step: 0.01, required: true },
      { name: 'totalValue', label: 'Valor total', type: 'number', min: 0, step: 0.01 },
      { name: 'deadline', label: 'Prazo de entrega', type: 'date', required: true },
      { name: 'status', label: 'Status do orcamento', type: 'select', options: ['Enviado', 'Aprovado', 'Recusado'], required: true },
      { name: 'notes', label: 'Observacoes', type: 'textarea', full: true }
    ],
    columns: ['date', 'clientName', 'phone', 'productId', 'quantity', 'unitValue', 'totalValue', 'deadline', 'status']
  },
  clients: {
    title: 'cliente',
    fields: [
      { name: 'name', label: 'Nome', type: 'text', required: true },
      { name: 'phone', label: 'Telefone', type: 'tel' },
      { name: 'email', label: 'E-mail', type: 'email' },
      { name: 'document', label: 'CPF/CNPJ', type: 'text' },
      { name: 'address', label: 'Endereco', type: 'textarea', full: true }
    ],
    columns: ['name', 'phone', 'email', 'document']
  },
  products: {
    title: 'produto',
    fields: [
      { name: 'name', label: 'Nome do produto', type: 'text', required: true },
      { name: 'photoUrl', label: 'Foto do produto (URL)', type: 'url' },
      { name: 'category', label: 'Categoria', type: 'text' },
      { name: 'supplier', label: 'Fornecedor', type: 'text' },
      { name: 'internalCode', label: 'Codigo interno', type: 'text' },
      { name: 'cost', label: 'Custo unitario', type: 'number', min: 0, step: 0.01 },
      { name: 'price', label: 'Preco de venda', type: 'number', min: 0, step: 0.01 },
      { name: 'minStock', label: 'Estoque minimo', type: 'number', step: 1, required: true },
      { name: 'idealStock', label: 'Estoque ideal', type: 'number', step: 1 },
      { name: 'profitMargin', label: 'Margem de lucro %', type: 'number', min: 0, step: 0.01 },
      { name: 'avgProductionTime', label: 'Tempo medio de producao', type: 'text' },
      { name: 'active', label: 'Produto ativo', type: 'checkbox', defaultValue: true },
      { name: 'inventoryItemId', label: 'Item de estoque vinculado', type: 'select', source: 'inventoryItems' },
      { name: 'stockUsageQty', label: 'Qtd. baixada por venda', type: 'number', min: 0, step: 0.01 },
      { name: 'notes', label: 'Observacoes', type: 'textarea', full: true }
    ],
    columns: ['productPhoto', 'name', 'internalCode', 'category', 'supplier', 'cost', 'price', 'profitMargin', 'active', 'estimatedProfit', 'inventoryItemId', 'stockUsageQty']
  },
  production: {
    title: 'pedido de producao',
    fields: [
      { name: 'orderNumber', label: 'Numero do pedido', type: 'text', required: true },
      { name: 'clientId', label: 'Cliente', type: 'select', source: 'clients', required: true },
      { name: 'productId', label: 'Produto', type: 'select', source: 'products', required: true },
      { name: 'quantity', label: 'Quantidade', type: 'number', min: 1, step: 1, required: true },
      { name: 'productionType', label: 'Tipo de producao', type: 'select', options: ['Sublimacao', 'Impressao 3D', 'Grafica', 'Outro'], required: true },
      { name: 'status', label: 'Status', type: 'select', options: ['Novo', 'Arte', 'Aprovado', 'Produzindo', 'Acabamento', 'Pronto', 'Entregue', 'Cancelado'], required: true },
      { name: 'entryDate', label: 'Data de entrada', type: 'date', required: true },
      { name: 'deadline', label: 'Prazo de entrega', type: 'date', required: true },
      { name: 'responsible', label: 'Responsavel', type: 'text' },
      { name: 'notes', label: 'Observacoes', type: 'textarea', full: true }
    ],
    columns: ['orderNumber', 'clientId', 'productId', 'quantity', 'productionType', 'status', 'entryDate', 'deadline', 'responsible', 'saleLink']
  },
  stock: {
    title: 'movimento de estoque',
    fields: [
      { name: 'date', label: 'Data', type: 'date', required: true },
      { name: 'inventoryItemId', label: 'Item de estoque', type: 'select', source: 'inventoryItems', required: true },
      { name: 'type', label: 'Tipo', type: 'select', options: ['Entrada', 'Saida'], required: true },
      { name: 'quantity', label: 'Quantidade', type: 'number', min: 1, step: 1, required: true },
      { name: 'reason', label: 'Motivo', type: 'text' }
    ],
    columns: ['date', 'inventoryItemId', 'type', 'quantity', 'reason', 'originInfo']
  },
  cash: {
    title: 'lancamento de caixa',
    fields: [
      { name: 'date', label: 'Data', type: 'date', required: true },
      { name: 'description', label: 'Descricao', type: 'text', required: true },
      { name: 'type', label: 'Tipo', type: 'select', options: ['Entrada', 'Saida'], required: true },
      { name: 'value', label: 'Valor', type: 'number', min: 0, step: 0.01, required: true },
      { name: 'category', label: 'Categoria', type: 'text' }
    ],
    columns: ['date', 'description', 'type', 'value', 'category']
  },
  payables: {
    title: 'conta a pagar',
    fields: [
      { name: 'dueDate', label: 'Vencimento', type: 'date', required: true },
      { name: 'supplier', label: 'Fornecedor', type: 'text', required: true },
      { name: 'description', label: 'Descricao', type: 'text', required: true },
      { name: 'expenseType', label: 'Tipo de despesa', type: 'select', options: ['Fixa', 'Variavel'], required: true },
      { name: 'frequency', label: 'Frequencia', type: 'select', options: ['Unica', 'Mensal recorrente', 'Parcelada'], required: true },
      { name: 'installment', label: 'Parcela atual', type: 'number', min: 0, step: 1 },
      { name: 'installmentsTotal', label: 'Total de parcelas', type: 'number', min: 0, step: 1 },
      { name: 'value', label: 'Valor', type: 'number', min: 0, step: 0.01, required: true },
      { name: 'status', label: 'Status', type: 'select', options: ['Aberta', 'Paga'], required: true },
      { name: 'paymentDate', label: 'Data real de pagamento', type: 'date' }
    ],
    columns: ['dueDate', 'supplier', 'description', 'expenseType', 'frequency', 'installmentInfo', 'value', 'status', 'paymentDate']
  },
  receivables: {
    title: 'conta a receber',
    fields: [
      { name: 'dueDate', label: 'Vencimento', type: 'date', required: true },
      { name: 'clientId', label: 'Cliente', type: 'select', source: 'clients', required: true },
      { name: 'description', label: 'Descricao', type: 'text', required: true },
      { name: 'value', label: 'Valor', type: 'number', min: 0, step: 0.01, required: true },
      { name: 'status', label: 'Status', type: 'select', options: ['Aberta', 'Recebida'], required: true },
      { name: 'receivedDate', label: 'Data real de recebimento', type: 'date' }
    ],
    columns: ['dueDate', 'clientId', 'description', 'value', 'status', 'receivedDate']
  }
};

const labels = {
  date: 'Data',
  dueDate: 'Vencimento',
  clientId: 'Cliente',
  clientName: 'Cliente',
  productId: 'Produto',
  inventoryItemId: 'Item de estoque',
  quantity: 'Qtd.',
  value: 'Valor',
  unitValue: 'Valor unitario',
  totalValue: 'Valor total',
  deadline: 'Prazo',
  paymentMethod: 'Forma de pagamento',
  status: 'Status',
  biancaCommission: 'Comissao Bianca',
  saleProfit: 'Lucro estimado',
  name: 'Nome',
  phone: 'Telefone',
  email: 'E-mail',
  document: 'CPF/CNPJ',
  category: 'Categoria',
  productPhoto: 'Foto',
  photoUrl: 'Foto',
  supplier: 'Fornecedor',
  internalCode: 'Codigo interno',
  cost: 'Custo unitario',
  price: 'Preco de venda',
  estimatedProfit: 'Lucro estimado',
  stock: 'Estoque',
  minStock: 'Estoque minimo',
  idealStock: 'Estoque ideal',
  profitMargin: 'Margem %',
  avgProductionTime: 'Tempo medio',
  active: 'Ativo',
  stockUsageQty: 'Baixa por venda',
  notes: 'Observacoes',
  type: 'Tipo',
  reason: 'Motivo',
  description: 'Descricao',
  supplier: 'Fornecedor',
  expenseType: 'Tipo',
  frequency: 'Frequencia',
  installment: 'Parcela atual',
  installmentsTotal: 'Total parcelas',
  installmentInfo: 'Parcelas',
  paymentDate: 'Data de pagamento',
  receivedDate: 'Data de recebimento',
  originInfo: 'Origem',
  orderNumber: 'Pedido',
  productionType: 'Tipo',
  entryDate: 'Entrada',
  responsible: 'Responsavel',
  saleLink: 'Venda'
};

const emptyData = {
  sales: [],
  quotes: [],
  clients: [],
  products: [],
  production: [],
  equipment: [],
  inventoryItems: [],
  stock: [],
  cash: [],
  payables: [],
  receivables: []
};

const sampleData = {
  clients: [
    { id: 'c1', name: 'Ana Paula', phone: '(11) 99999-1000', email: 'ana@email.com', document: '123.456.789-00', address: 'Sao Paulo, SP' },
    { id: 'c2', name: 'Loja Maker', phone: '(11) 3333-2211', email: 'compras@lojamaker.com', document: '12.345.678/0001-90', address: 'Santo Andre, SP' }
  ],
  products: [
    { id: 'p1', name: 'Caneca branca personalizada', photoUrl: '', category: 'Canecas personalizadas', supplier: 'Fornecedor de canecas', internalCode: 'GF-CAN-BR', cost: 11, price: 25, stock: 0, minStock: 0, idealStock: 30, profitMargin: 127.27, avgProductionTime: '30 min', active: true, inventoryItemId: 'i1', stockUsageQty: 1, notes: '' },
    { id: 'p2', name: 'Caneca magica personalizada', photoUrl: '', category: 'Canecas personalizadas', supplier: 'Fornecedor de canecas', internalCode: 'GF-CAN-MAG', cost: 20, price: 40, stock: 0, minStock: 0, idealStock: 20, profitMargin: 100, avgProductionTime: '35 min', active: true, inventoryItemId: 'i2', stockUsageQty: 1, notes: '' },
    { id: 'p3', name: 'Peca impressa 3D sob encomenda', photoUrl: '', category: 'Impressao 3D', supplier: 'Producao interna', internalCode: 'GF-3D-SOB', cost: null, price: null, stock: 0, minStock: 0, idealStock: 0, profitMargin: null, avgProductionTime: 'Variavel', active: true, inventoryItemId: 'i7', stockUsageQty: 1, notes: 'Custo variavel e preco variavel conforme projeto.' }
  ],
  inventoryItems: [
    { id: 'i1', name: 'Canecas brancas', category: 'Sublimacao', quantity: 8, minStock: 5, idealStock: 30, unit: 'un', unitCost: 11 },
    { id: 'i2', name: 'Canecas magicas', category: 'Sublimacao', quantity: 4, minStock: 3, idealStock: 20, unit: 'un', unitCost: 20 },
    { id: 'i3', name: 'Papel sublimatico', category: 'Sublimacao', quantity: 50, minStock: 20, idealStock: 100, unit: 'folhas', unitCost: 0 },
    { id: 'i4', name: 'Tinta sublimatica', category: 'Sublimacao', quantity: 2, minStock: 1, idealStock: 3, unit: 'kit', unitCost: 0 },
    { id: 'i5', name: 'Fita termica', category: 'Sublimacao', quantity: 3, minStock: 1, idealStock: 5, unit: 'rolo', unitCost: 0 },
    { id: 'i6', name: 'Caixas para entrega', category: 'Embalagem', quantity: 20, minStock: 10, idealStock: 50, unit: 'un', unitCost: 0 },
    { id: 'i7', name: 'Filamento PLA', category: 'Impressao 3D', quantity: 2, minStock: 1, idealStock: 4, unit: 'kg', unitCost: 74.9 },
    { id: 'i8', name: 'Filamento PETG', category: 'Impressao 3D', quantity: 1, minStock: 1, idealStock: 3, unit: 'kg', unitCost: 0 }
  ],
  sales: [
    { id: 's1', date: today(), clientId: 'c1', productId: 'p1', quantity: 2, value: 50, paymentMethod: 'Pix', status: 'Recebido', biancaCommission: true, notes: 'Canecas brancas personalizadas' }
  ],
  quotes: [
    { id: 'q1', date: today(), clientName: 'Loja Maker', phone: '(11) 3333-2211', productId: 'p2', quantity: 3, unitValue: 40, totalValue: 120, deadline: today(7), status: 'Enviado', notes: 'Orcamento inicial de exemplo.' }
  ],
  stock: [
    { id: 'st1', date: today(), inventoryItemId: 'i1', type: 'Entrada', quantity: 10, reason: 'Estoque inicial' },
    { id: 'st2', date: today(), inventoryItemId: 'i1', type: 'Saida', quantity: 2, reason: 'Venda - Caneca branca personalizada', sourceSaleId: 's1' }
  ],
  cash: [
    { id: 'ca1', date: today(), description: 'Venda caneca branca personalizada', type: 'Entrada', value: 50, category: 'Vendas', sourceSaleId: 's1' },
    { id: 'ca2', date: today(), description: 'Filamento PLA', type: 'Saida', value: 74.9, category: 'Insumos' }
  ],
  payables: [
    { id: 'pa-inf-01', dueDate: today(7), supplier: 'InfinityPay', description: 'Maquininha InfinityPay', expenseType: 'Fixa', frequency: 'Parcelada', installment: 1, installmentsTotal: 12, value: 16.58, status: 'Aberta', paymentDate: '' },
    { id: 'pa-gpt-01', dueDate: today(5), supplier: 'OpenAI', description: 'ChatGPT Plus', expenseType: 'Fixa', frequency: 'Mensal recorrente', installment: null, installmentsTotal: null, value: 0, status: 'Aberta', paymentDate: '' },
    { id: 'pa-est-01', dueDate: today(10), supplier: 'Fornecedor de estoque', description: 'Compra de estoque', expenseType: 'Variavel', frequency: 'Unica', installment: null, installmentsTotal: null, value: 360, status: 'Aberta', paymentDate: '' },
    { id: 'pa-ene-01', dueDate: today(15), supplier: 'Concessionaria de energia', description: 'Energia', expenseType: 'Fixa', frequency: 'Mensal recorrente', installment: null, installmentsTotal: null, value: 0, status: 'Aberta', paymentDate: '' },
    { id: 'pa-emb-01', dueDate: today(12), supplier: 'Fornecedor de embalagens', description: 'Embalagens', expenseType: 'Variavel', frequency: 'Unica', installment: null, installmentsTotal: null, value: 0, status: 'Aberta', paymentDate: '' },
    { id: 'pa-man-01', dueDate: today(20), supplier: 'Assistencia tecnica', description: 'Manutencao de equipamentos', expenseType: 'Variavel', frequency: 'Unica', installment: null, installmentsTotal: null, value: 0, status: 'Aberta', paymentDate: '' }
  ],
  production: [
    { id: 'pr1', orderNumber: 'GF-0001', clientId: 'c1', productId: 'p1', quantity: 2, productionType: 'Sublimacao', status: 'Produzindo', entryDate: today(), deadline: today(2), responsible: 'Gabriel', notes: 'Pedido inicial gerado para acompanhamento.', sourceSaleId: 's1' }
  ],
  equipment: [
    { id: 'eq1', name: 'Creality K1', status: 'Livre', currentJob: '', remainingTime: '', material: 'Filamento PLA', notes: '' },
    { id: 'eq2', name: 'Creality Hi Combo', status: 'Livre', currentJob: '', remainingTime: '', material: 'Filamento PETG', notes: '' },
    { id: 'eq3', name: 'Epson L3250', status: 'Livre', currentJob: '', remainingTime: '', material: 'Tinta sublimatica', notes: '' },
    { id: 'eq4', name: 'Prensa de Canecas Mecolor', status: 'Livre', currentJob: '', remainingTime: '', material: 'Canecas', notes: '' }
  ],
  receivables: [
    { id: 're1', dueDate: today(5), clientId: 'c2', description: 'Pedido de brindes 3D', value: 520, status: 'Aberta', receivedDate: '' }
  ]
};

let data = structuredClone(emptyData);
let activeModule = 'dashboard';
let editing = null;
let authToken = localStorage.getItem(AUTH_TOKEN_KEY);
let currentUser = null;
let realtimeSocket = null;
let deferredInstallPrompt = null;
let dashboardCharts = {};
let waitingServiceWorker = null;
let refreshingForUpdate = false;

const menu = document.querySelector('#menu');
const pageTitle = document.querySelector('#pageTitle');
const dialog = document.querySelector('#entryDialog');
const entryForm = document.querySelector('#entryForm');
const formFields = document.querySelector('#formFields');
const dialogTitle = document.querySelector('#dialogTitle');
const toast = document.querySelector('#toast');
const loginForm = document.querySelector('#loginForm');
const loginMessage = document.querySelector('#loginMessage');
const syncStatus = document.querySelector('#syncStatus');
const updateBanner = document.querySelector('#updateBanner');
const refreshAppButton = document.querySelector('#refreshApp');

init();

async function init() {
  setDefaultMonthFilters();
  renderMenu();
  bindActions();
  bindAuthActions();
  registerServiceWorker();
  setupInstallPrompt();

  if (!authToken) {
    showLogin();
    return;
  }

  try {
    await startAuthenticatedApp();
  } catch {
    logout(false);
    showLogin('Sessao expirada. Entre novamente.');
  }
}

function renderMenu() {
  menu.innerHTML = modules.map(module => `
    <button type="button" data-view="${module.id}" class="${module.id === activeModule ? 'active' : ''}">
      <span class="nav-icon">${module.icon}</span>
      <span>${module.title}</span>
    </button>
  `).join('');

  menu.querySelectorAll('button').forEach(button => {
    button.addEventListener('click', () => openView(button.dataset.view));
  });
}

function bindActions() {
  document.querySelectorAll('[data-open-form]').forEach(button => {
    button.addEventListener('click', () => openForm(button.dataset.openForm));
  });

  document.querySelector('#closeDialog').addEventListener('click', () => dialog.close());
  document.querySelector('#cancelForm').addEventListener('click', () => dialog.close());
  entryForm.addEventListener('submit', saveForm);

  document.querySelector('#seedData').addEventListener('click', () => {
    if (!confirm('Restaurar os dados de exemplo? Os dados atuais serao substituidos.')) return;
    data = structuredClone(sampleData);
    persist();
    renderAll();
    showToast('Dados de exemplo restaurados.');
  });

  document.querySelector('#clearData').addEventListener('click', () => {
    if (!confirm('Limpar todos os dados do GF ERP?')) return;
    data = structuredClone(emptyData);
    persist();
    renderAll();
    showToast('Dados limpos.');
  });

  document.querySelector('#exportData').addEventListener('click', exportBackup);
  document.querySelector('#importData').addEventListener('change', importBackup);
  document.querySelector('#exportMonthlyPdf').addEventListener('click', exportMonthlyReportPdf);
  document.querySelector('#logoutButton').addEventListener('click', () => logout(true));
  document.querySelector('#installApp').addEventListener('click', installPwa);
  refreshAppButton.addEventListener('click', activateWaitingServiceWorker);

  document.querySelectorAll('[data-month-filter]').forEach(input => {
    input.addEventListener('change', () => renderAll());
  });

  document.querySelectorAll('[data-clear-filter]').forEach(button => {
    button.addEventListener('click', () => {
      const input = document.querySelector(`[data-month-filter="${button.dataset.clearFilter}"]`);
      if (!input) return;
      input.value = '';
      renderAll();
    });
  });
}

function bindAuthActions() {
  loginForm.addEventListener('submit', async event => {
    event.preventDefault();
    loginMessage.textContent = '';
    const email = document.querySelector('#loginEmail').value.trim();
    const password = document.querySelector('#loginPassword').value;

    try {
      const response = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: { email, password },
        skipAuth: true
      });
      authToken = response.token;
      currentUser = response.user;
      localStorage.setItem(AUTH_TOKEN_KEY, authToken);
      await startAuthenticatedApp();
      showToast('Login realizado.');
    } catch {
      loginMessage.textContent = 'E-mail ou senha invalidos.';
    }
  });
}

async function startAuthenticatedApp() {
  setSyncStatus('Sincronizando...', 'offline');
  const session = await apiRequest('/api/auth/me');
  currentUser = session.user;
  await loadRemoteData();
  await offerLocalMigration();
  showApp();
  connectRealtime();
  renderAll();
  setSyncStatus('Online', 'online');
}

function showLogin(message = '') {
  document.body.classList.add('auth-required');
  loginMessage.textContent = message;
}

function showApp() {
  document.body.classList.remove('auth-required');
}

function logout(showMessage) {
  authToken = null;
  currentUser = null;
  localStorage.removeItem(AUTH_TOKEN_KEY);
  if (realtimeSocket) realtimeSocket.close();
  realtimeSocket = null;
  data = structuredClone(emptyData);
  showLogin(showMessage ? 'Sessao encerrada.' : '');
}

function openView(viewId) {
  activeModule = viewId;
  document.querySelectorAll('.view').forEach(view => view.classList.toggle('active', view.id === viewId));
  menu.querySelectorAll('button').forEach(button => button.classList.toggle('active', button.dataset.view === viewId));
  pageTitle.textContent = modules.find(module => module.id === viewId).title;
}

function openForm(moduleId, recordId = null) {
  const schema = schemas[moduleId];
  const record = recordId ? data[moduleId].find(item => item.id === recordId) : getDefaultRecord(moduleId);
  if (moduleId === 'stock' && record && record.sourceSaleId) {
    alert('Este e um movimento automatico gerado por venda e nao pode ser alterado manualmente.');
    return;
  }
  editing = { moduleId, recordId };
  dialogTitle.textContent = recordId ? `Editar ${schema.title}` : `Novo ${schema.title}`;
  formFields.innerHTML = schema.fields.map(field => renderField(field, record[field.name])).join('');
  dialog.showModal();
}

function getDefaultRecord(moduleId) {
  if (moduleId === 'production') {
    return { orderNumber: nextProductionOrderNumber(), status: 'Novo', entryDate: today(), deadline: today(7), responsible: 'Gabriel' };
  }
  return {};
}

function renderField(field, value = '') {
  const required = field.required ? 'required' : '';
  const full = field.full ? ' full' : '';
  const safeValue = value ?? '';

  if (field.type === 'checkbox') {
    const checked = (value === '' ? field.defaultValue : value) ? 'checked' : '';
    return `<div class="field checkbox-field${full}"><label><input name="${field.name}" type="checkbox" value="1" ${checked}> ${field.label}</label></div>`;
  }

  if (field.type === 'select') {
    const options = getOptions(field).map(option => {
      const selected = String(option.value) === String(safeValue) ? 'selected' : '';
      return `<option value="${escapeHtml(option.value)}" ${selected}>${escapeHtml(option.label)}</option>`;
    }).join('');
    return `<div class="field${full}"><label>${field.label}</label><select name="${field.name}" ${required}><option value="">Selecione</option>${options}</select></div>`;
  }

  if (field.type === 'textarea') {
    return `<div class="field${full}"><label>${field.label}</label><textarea name="${field.name}" ${required}>${escapeHtml(safeValue)}</textarea></div>`;
  }

  const min = field.min !== undefined ? `min="${field.min}"` : '';
  const step = field.step !== undefined ? `step="${field.step}"` : '';
  return `<div class="field${full}"><label>${field.label}</label><input name="${field.name}" type="${field.type}" value="${escapeHtml(safeValue)}" ${required} ${min} ${step}></div>`;
}

function getOptions(field) {
  if (field.options) return field.options.map(value => ({ value, label: value }));
  if (field.source === 'clients') return data.clients.map(client => ({ value: client.id, label: client.name }));
  if (field.source === 'products') return data.products.map(product => ({ value: product.id, label: product.name }));
  if (field.source === 'inventoryItems') return data.inventoryItems.map(item => ({ value: item.id, label: item.name }));
  return [];
}

function saveForm(event) {
  event.preventDefault();
  const { moduleId, recordId } = editing;
  const schema = schemas[moduleId];
  const formData = new FormData(entryForm);
  const previousRecord = recordId ? data[moduleId].find(item => item.id === recordId) : null;
  const record = previousRecord ? { ...previousRecord } : { id: makeId(moduleId) };

  schema.fields.forEach(field => {
    const raw = formData.get(field.name);
    record[field.name] = field.type === 'checkbox'
      ? formData.has(field.name)
      : field.type === 'number'
      ? (raw === '' && !field.required ? null : Number(raw || 0))
      : raw;
  });

  if (moduleId === 'products') {
    record.stock = Number(record.stock || 0);
    record.stockUsageQty = Number(record.stockUsageQty || 0);
    record.active = record.active !== false;
    if (record.profitMargin === null && record.cost && record.price) {
      record.profitMargin = ((Number(record.price) - Number(record.cost)) / Number(record.cost)) * 100;
    }
  }

  if (moduleId === 'quotes') {
    record.totalValue = Number(record.quantity || 0) * Number(record.unitValue || 0);
  }

  if (moduleId === 'production') {
    record.status = record.status || 'Novo';
    record.entryDate = record.entryDate || today();
    record.orderNumber = record.orderNumber || nextProductionOrderNumber();
  }

  if (moduleId === 'payables') {
    record.paymentDate = record.status === 'Paga'
      ? (record.paymentDate || today())
      : '';
  }

  if (moduleId === 'receivables') {
    record.receivedDate = record.status === 'Recebida'
      ? (record.receivedDate || today())
      : '';
  }

  if (recordId) {
    data[moduleId] = data[moduleId].map(item => item.id === recordId ? record : item);
    syncUpdatedRecord(moduleId, previousRecord, record);
  } else {
    data[moduleId].push(record);
    applySideEffects(moduleId, record);
  }

  persist();
  renderAll();
  dialog.close();
  showToast('Registro salvo.');
}

function applySideEffects(moduleId, record) {
  if (moduleId === 'sales') {
    syncSaleSideEffects(record, null);
  }

  if (moduleId === 'stock') {
    syncStockMovement(record, null);
  }

  if (moduleId === 'payables') {
    syncPayableCash(record);
  }

  if (moduleId === 'receivables') {
    syncReceivableCash(record);
  }

  if (moduleId === 'sales' && shouldCreateProductionFromSale(record)) {
    createProductionFromSale(record);
  }
}

function syncUpdatedRecord(moduleId, previousRecord, record) {
  if (!previousRecord) return;

  if (moduleId === 'sales') syncSaleSideEffects(record, previousRecord);
  if (moduleId === 'stock') syncStockMovement(record, previousRecord);
  if (moduleId === 'payables') syncPayableCash(record);
  if (moduleId === 'receivables') syncReceivableCash(record);
  if (moduleId === 'sales' && shouldCreateProductionFromSale(record)) createProductionFromSale(record);
}

function renderAll() {
  Object.keys(schemas).forEach(renderTable);
  renderStockOverview();
  renderProductionKanban();
  renderEquipmentBoard();
  renderPayablesSummary();
  renderDashboard();
  renderReports();
}

function renderTable(moduleId) {
  const target = document.querySelector(`#${moduleId}Table`);
  const allRows = data[moduleId];
  const rows = getFilteredRows(moduleId, allRows);
  const schema = schemas[moduleId];
  target.classList.toggle('mobile-card-table', mobileCardModules.has(moduleId));

  if (allRows.length && !rows.length) {
    target.innerHTML = '<div class="empty">Nenhum registro para o filtro selecionado.</div>';
    return;
  }

  if (!rows.length) {
    target.innerHTML = '<div class="empty">Nenhum registro cadastrado.</div>';
    return;
  }

  const head = schema.columns.map(column => `<th>${labels[column] || column}</th>`).join('');
  const body = rows.map(row => `
    <tr>
      ${schema.columns.map(column => `<td data-label="${escapeHtml(labels[column] || column)}">${formatCell(column, row[column], row)}</td>`).join('')}
      <td class="actions" data-label="Acoes">${renderRowActions(moduleId, row)}</td>
    </tr>
  `).join('');

  target.innerHTML = `<table><thead><tr>${head}<th>Acoes</th></tr></thead><tbody>${body}</tbody></table>`;
  target.querySelectorAll('[data-edit]').forEach(button => {
    button.addEventListener('click', () => {
      const [targetModule, id] = button.dataset.edit.split(':');
      openForm(targetModule, id);
    });
  });
  target.querySelectorAll('[data-delete]').forEach(button => {
    button.addEventListener('click', () => {
      const [targetModule, id] = button.dataset.delete.split(':');
      removeRecord(targetModule, id);
    });
  });
  target.querySelectorAll('[data-convert-quote]').forEach(button => {
    button.addEventListener('click', () => convertQuoteToSale(button.dataset.convertQuote));
  });
  target.querySelectorAll('[data-create-production]').forEach(button => {
    button.addEventListener('click', () => createProductionFromSaleId(button.dataset.createProduction));
  });
}

function renderRowActions(moduleId, row) {
  if (moduleId === 'stock' && row.sourceSaleId) {
    return '<span class="status warn">Movimento automatico</span>';
  }

  const baseActions = [
    `<button class="mini-button" type="button" title="Editar" data-edit="${moduleId}:${row.id}">E</button>`,
    `<button class="mini-button delete" type="button" title="Excluir" data-delete="${moduleId}:${row.id}">X</button>`
  ];

  if (moduleId === 'quotes' && row.status === 'Aprovado' && !row.convertedSaleId) {
    baseActions.unshift(`<button class="mini-button convert" type="button" title="Transformar em venda" data-convert-quote="${row.id}">Vender</button>`);
  }

  if (moduleId === 'quotes' && row.convertedSaleId) {
    baseActions.unshift('<span class="status ok">Venda criada</span>');
  }

  if (moduleId === 'sales' && isSaleProduction(row) && !hasProductionForSale(row.id)) {
    baseActions.unshift(`<button class="mini-button convert" type="button" title="Gerar producao" data-create-production="${row.id}">Produzir</button>`);
  }

  if (moduleId === 'production' && row.sourceSaleId) {
    baseActions.unshift('<span class="status warn">Venda vinculada</span>');
  }

  return baseActions.join('');
}

function getFilteredRows(moduleId, rows) {
  if (!filteredModules.has(moduleId)) return rows;

  const monthValue = getMonthFilterValue(moduleId);
  if (!monthValue) return rows;

  const dateField = moduleId === 'sales' || moduleId === 'cash' ? 'date' : 'dueDate';
  return rows.filter(row => matchesMonth(row[dateField], monthValue));
}

function getMonthFilterValue(moduleId) {
  const input = document.querySelector(`[data-month-filter="${moduleId}"]`);
  return input ? input.value : '';
}

function matchesMonth(dateValue, monthValue) {
  if (!monthValue) return true;
  if (!dateValue) return false;
  return String(dateValue).slice(0, 7) === monthValue;
}

function setDefaultMonthFilters() {
  const reportsFilter = document.querySelector('[data-month-filter="reports"]');
  if (reportsFilter && !reportsFilter.value) {
    reportsFilter.value = currentMonthInputValue();
  }
}

function renderDashboard() {
  const cashBalance = sumCash('Entrada') - sumCash('Saida');
  const monthlySales = data.sales.filter(sale => isCurrentMonth(sale.date));
  const salesMonth = monthlySales.reduce((total, sale) => total + Number(sale.value || 0), 0);
  const grossProfitMonth = monthlySales.reduce((total, sale) => {
    const profit = calculateSaleProfit(sale);
    return profit === null ? total : total + profit;
  }, 0);
  const receivable = data.receivables
    .filter(item => item.status !== 'Recebida')
    .reduce((total, item) => total + Number(item.value || 0), 0);
  const payable = data.payables
    .filter(item => item.status !== 'Paga')
    .reduce((total, item) => total + Number(item.value || 0), 0);
  const productionOrders = data.sales.filter(sale => sale.status === 'Em producao').length;
  const deliveredOrders = data.sales.filter(sale => sale.status === 'Entregue').length;
  const goalProgress = Math.min((salesMonth / MONTHLY_REVENUE_GOAL) * 100, 100);
  const goalRemaining = Math.max(MONTHLY_REVENUE_GOAL - salesMonth, 0);
  const commissionsMonth = monthlySales.reduce((total, sale) => total + calculateSaleCommission(sale), 0);
  const expensesMonth = data.payables
    .filter(item => isCurrentMonth(item.dueDate))
    .reduce((total, item) => total + Number(item.value || 0), 0);
  const netProfitMonth = grossProfitMonth - commissionsMonth - expensesMonth;
  const lowStockItems = data.inventoryItems.filter(item => Number(item.minStock) > 0 && Number(item.quantity) <= Number(item.minStock));
  const criticalStockItems = data.inventoryItems.filter(item => getStockLevel(item).className === 'critical-stock');
  const productionToday = data.production.filter(order => !['Entregue', 'Cancelado'].includes(order.status) && order.entryDate === today()).length;
  const lateProduction = data.production.filter(isProductionLate);
  const freeEquipment = data.equipment.filter(item => item.status === 'Livre').length;
  const nextDeadlines = data.production
    .filter(order => !['Entregue', 'Cancelado'].includes(order.status) && order.deadline)
    .sort((a, b) => String(a.deadline).localeCompare(String(b.deadline)))
    .slice(0, 3);
  const averageTicket = monthlySales.length ? salesMonth / monthlySales.length : 0;
  const status = getDailyFinancialStatus(cashBalance, receivable, payable, goalProgress);

  setText('dashboardDateTime', formatDashboardDateTime());
  setText('metricGoalProgress', `${Math.round(goalProgress)}%`);
  setText('metricGoalRemaining', goalRemaining > 0
    ? `Faltam ${money(goalRemaining)} para bater a meta`
    : 'Meta mensal atingida');
  document.querySelector('#goalBar').style.width = `${goalProgress}%`;
  document.querySelector('#goalBar').className = `bar goal-bar ${status.level}`;

  document.querySelector('#dailyFinancialStatus').className = `daily-status ${status.level}`;
  document.querySelector('#dailyFinancialStatus').innerHTML = `
    <span>Situação financeira do dia</span>
    <strong>${escapeHtml(status.title)}</strong>
    <small>${escapeHtml(status.detail)}</small>
  `;

  document.querySelector('#executiveMetrics').innerHTML = [
    { icon: '💰', label: 'Caixa', value: money(cashBalance), detail: 'Saldo atual', level: cashBalance >= 0 ? 'status-good' : 'status-critical' },
    { icon: '📈', label: 'Faturamento do mês', value: money(salesMonth), detail: `${monthlySales.length} venda(s)`, level: goalProgress >= 70 ? 'status-good' : goalProgress >= 40 ? 'status-warning' : 'status-critical' },
    { icon: '💵', label: 'Lucro líquido', value: money(netProfitMonth), detail: 'Estimado no mês', level: netProfitMonth >= 0 ? 'status-good' : 'status-critical' },
    { icon: '📦', label: 'Estoque', value: `${lowStockItems.length}`, detail: 'Itens em atenção', level: lowStockItems.length ? 'status-warning' : 'status-good' },
    { icon: '🧾', label: 'Contas a receber', value: money(receivable), detail: 'Valores em aberto', level: receivable > 0 ? 'status-warning' : 'status-good' },
    { icon: '💸', label: 'Contas a pagar', value: money(payable), detail: 'Compromissos abertos', level: payable > cashBalance && payable > 0 ? 'status-critical' : payable > 0 ? 'status-warning' : 'status-good' },
    { icon: '🎯', label: 'Meta mensal', value: `${Math.round(goalProgress)}%`, detail: money(MONTHLY_REVENUE_GOAL), level: goalProgress >= 70 ? 'status-good' : goalProgress >= 40 ? 'status-warning' : 'status-critical' },
    { icon: '📊', label: 'Ticket médio', value: money(averageTicket), detail: 'Média por venda', level: averageTicket > 0 ? 'status-good' : 'status-warning' },
    { icon: 'OP', label: 'Produção hoje', value: String(productionToday), detail: 'Pedidos ativos iniciados hoje', level: productionToday ? 'status-warning' : 'status-good' },
    { icon: 'AT', label: 'Pedidos atrasados', value: String(lateProduction.length), detail: 'Prazos vencidos', level: lateProduction.length ? 'status-critical' : 'status-good' },
    { icon: 'EQ', label: 'Equipamentos livres', value: String(freeEquipment), detail: `${data.equipment.length} equipamento(s)`, level: freeEquipment ? 'status-good' : 'status-warning' },
    { icon: 'CR', label: 'Estoque crítico', value: String(criticalStockItems.length), detail: 'Itens no mínimo ou abaixo', level: criticalStockItems.length ? 'status-critical' : 'status-good' }
  ].map(card => `
    <article class="executive-card ${card.level}">
      <div class="card-icon">${card.icon}</div>
      <span>${escapeHtml(card.label)}</span>
      <strong>${escapeHtml(card.value)}</strong>
      <small>${escapeHtml(card.detail)}</small>
    </article>
  `).join('');

  document.querySelector('#cfoHighlights').innerHTML = [
    { title: 'Margem bruta estimada', detail: salesMonth > 0 ? `${Math.round((grossProfitMonth / salesMonth) * 100)}% sobre o vendido no mes` : 'Sem vendas no mes', level: grossProfitMonth >= 0 ? 'status-good' : 'status-critical' },
    { title: 'Capital comprometido', detail: `${money(payable)} em contas a pagar abertas`, level: payable > cashBalance && payable > 0 ? 'status-critical' : 'status-warning' },
    { title: 'Recebiveis pendentes', detail: `${money(receivable)} aguardando recebimento`, level: receivable > 0 ? 'status-warning' : 'status-good' },
    { title: 'Operacao', detail: `${productionOrders} pedido(s) em producao e ${deliveredOrders} entregue(s)`, level: productionOrders > 0 ? 'status-warning' : 'status-good' },
    { title: 'Próximos prazos', detail: nextDeadlines.length ? nextDeadlines.map(order => `${order.orderNumber} em ${formatDate(order.deadline)}`).join(' | ') : 'Nenhum prazo pendente', level: lateProduction.length ? 'status-critical' : 'status-good' }
  ].map(item => `
    <div class="stack-item ${item.level}">
      <strong>${escapeHtml(item.title)}</strong>
      <span>${escapeHtml(item.detail)}</span>
    </div>
  `).join('');

  const alerts = getSmartDashboardAlerts(lowStockItems, goalProgress);
  document.querySelector('#stockAlerts').innerHTML = alerts.length
    ? alerts.map(alert => `<div class="stack-item ${alert.level}"><strong>${escapeHtml(alert.title)}</strong><span>${escapeHtml(alert.detail)}</span></div>`).join('')
    : '<div class="empty">Nenhum aviso importante no momento.</div>';

  renderDashboardCharts();
}

function formatDashboardDateTime() {
  return new Date().toLocaleString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getDailyFinancialStatus(cashBalance, receivable, payable, goalProgress) {
  if (cashBalance < 0 || (payable > cashBalance && payable > receivable + cashBalance)) {
    return { title: 'Crítica', detail: 'Contas a pagar exigem prioridade.', level: 'status-critical' };
  }

  if (goalProgress < getExpectedGoalProgress() || payable > cashBalance || receivable > 0) {
    return { title: 'Atenção', detail: 'Acompanhe meta, recebíveis e vencimentos.', level: 'status-warning' };
  }

  return { title: 'Boa', detail: 'Caixa positivo e operação sob controle.', level: 'status-good' };
}

function getExpectedGoalProgress() {
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return (now.getDate() / daysInMonth) * 100;
}

function getSmartDashboardAlerts(lowStockItems, goalProgress) {
  const todayDate = new Date(`${today()}T00:00:00`);
  const nextWeek = new Date(todayDate);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const overdueLimit = new Date(todayDate);
  overdueLimit.setDate(overdueLimit.getDate() - 7);

  const duePayables = data.payables.filter(item => {
    if (item.status === 'Paga' || !item.dueDate) return false;
    const dueDate = new Date(`${item.dueDate}T00:00:00`);
    return dueDate >= todayDate && dueDate <= nextWeek;
  });
  const lateOrders = data.sales.filter(sale => {
    if (sale.status !== 'Em producao' || !sale.date) return false;
    return new Date(`${sale.date}T00:00:00`) < overdueLimit;
  });
  const lateProductionOrders = data.production.filter(isProductionLate);
  const alerts = [];

  if (lowStockItems.length) {
    alerts.push({
      title: 'Estoque baixo',
      detail: `${lowStockItems.length} item(ns) abaixo ou no estoque minimo: ${lowStockItems.slice(0, 3).map(item => item.name).join(', ')}`,
      level: 'status-warning'
    });
  }

  if (duePayables.length) {
    alerts.push({
      title: 'Contas vencendo',
      detail: `${duePayables.length} conta(s) vencem nos proximos 7 dias, total de ${money(sumValues(duePayables))}.`,
      level: 'status-warning'
    });
  }

  if (goalProgress < getExpectedGoalProgress()) {
    alerts.push({
      title: 'Meta abaixo do esperado',
      detail: `Progresso atual de ${Math.round(goalProgress)}% contra ${Math.round(getExpectedGoalProgress())}% esperado para hoje.`,
      level: 'status-critical'
    });
  }

  if (lateOrders.length || lateProductionOrders.length) {
    alerts.push({
      title: 'Pedidos atrasados',
      detail: `${lateOrders.length + lateProductionOrders.length} pedido(s) precisam de revisao de prazo.`,
      level: 'status-critical'
    });
  }

  return alerts;
}

function renderDashboardCharts() {
  if (!window.Chart) return;

  const months = getLastTwelveMonths();
  const revenue = months.map(month => sumValues(data.sales.filter(sale => matchesMonth(sale.date, month.value))));
  const profit = months.map(month => data.sales
    .filter(sale => matchesMonth(sale.date, month.value))
    .reduce((total, sale) => {
      const saleProfit = calculateSaleProfit(sale);
      return saleProfit === null ? total : total + saleProfit;
    }, 0));
  const cashIn = months.map(month => sumValues(data.cash.filter(item => item.type === 'Entrada' && matchesMonth(item.date, month.value))));
  const cashOut = months.map(month => sumValues(data.cash.filter(item => item.type === 'Saida' && matchesMonth(item.date, month.value))));
  const categoryRows = getSalesByCategory();
  const topProducts = rankProductsBySales(data.sales).slice(0, 6);

  upsertDashboardChart('revenueChart', 'bar', {
    labels: months.map(month => month.label),
    datasets: [{ label: 'Faturamento', data: revenue, backgroundColor: '#0d9488', borderRadius: 8 }]
  });
  upsertDashboardChart('profitChart', 'line', {
    labels: months.map(month => month.label),
    datasets: [{ label: 'Lucro', data: profit, borderColor: '#2d6cdf', backgroundColor: 'rgba(45, 108, 223, .12)', fill: true, tension: .35 }]
  });
  upsertDashboardChart('categoryChart', 'doughnut', {
    labels: categoryRows.map(item => item.category),
    datasets: [{ data: categoryRows.map(item => item.total), backgroundColor: ['#0d9488', '#2d6cdf', '#f5b84b', '#b43838', '#7c3aed'] }]
  });
  upsertDashboardChart('cashFlowChart', 'bar', {
    labels: months.map(month => month.label),
    datasets: [
      { label: 'Entradas', data: cashIn, backgroundColor: '#0d9488', borderRadius: 8 },
      { label: 'Saidas', data: cashOut, backgroundColor: '#b43838', borderRadius: 8 }
    ]
  });
  upsertDashboardChart('topProductsChart', 'bar', {
    labels: topProducts.map(item => item.name),
    datasets: [{ label: 'Quantidade vendida', data: topProducts.map(item => item.quantity), backgroundColor: '#f5b84b', borderRadius: 8 }]
  }, { indexAxis: 'y' });
}

function upsertDashboardChart(canvasId, type, dataConfig, extraOptions = {}) {
  const canvas = document.querySelector(`#${canvasId}`);
  if (!canvas) return;

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { boxWidth: 12, color: '#657180' } }
    },
    scales: type === 'doughnut' ? undefined : {
      x: { grid: { display: false }, ticks: { color: '#657180' } },
      y: { beginAtZero: true, grid: { color: '#edf1f4' }, ticks: { color: '#657180' } }
    },
    ...extraOptions
  };

  if (dashboardCharts[canvasId]) {
    dashboardCharts[canvasId].data = dataConfig;
    dashboardCharts[canvasId].options = options;
    dashboardCharts[canvasId].update();
    return;
  }

  dashboardCharts[canvasId] = new Chart(canvas, {
    type,
    data: dataConfig,
    options
  });
}

function getLastTwelveMonths() {
  const formatter = new Intl.DateTimeFormat('pt-BR', { month: 'short' });
  const now = new Date();
  return Array.from({ length: 12 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 11 + index, 1);
    return {
      value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
      label: formatter.format(date).replace('.', '')
    };
  });
}

function getSalesByCategory() {
  const ranking = new Map();
  data.sales.forEach(sale => {
    const product = productById(sale.productId);
    const category = product ? product.category || 'Sem categoria' : 'Sem categoria';
    ranking.set(category, (ranking.get(category) || 0) + Number(sale.value || 0));
  });
  return Array.from(ranking, ([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);
}

function renderReports() {
  const grid = document.querySelector('#monthlyReportGrid');
  if (!grid) return;

  const report = getMonthlyReportData();
  setText('monthlyReportSubtitle', `Resultado financeiro de ${report.monthLabel}.`);

  const cards = [
    { label: 'Faturamento total', value: money(report.revenue), detail: `${report.sales.length} venda(s) no mes` },
    { label: 'Custo dos produtos vendidos', value: money(report.productCost), detail: 'Custo unitario x quantidade' },
    { label: 'Lucro bruto', value: money(report.grossProfit), detail: 'Faturamento menos custos' },
    { label: 'Comissoes pagas', value: money(report.commissions), detail: 'Bianca 5% nas vendas marcadas' },
    { label: 'Despesas', value: money(report.expenses), detail: 'Contas a pagar com vencimento no mes' },
    { label: 'Lucro liquido estimado', value: money(report.netProfit), detail: 'Lucro bruto menos comissoes e despesas' }
  ];

  grid.innerHTML = cards.map(reportCard => `
    <article class="report-card">
      <span>${escapeHtml(reportCard.label)}</span>
      <strong>${escapeHtml(reportCard.value)}</strong>
      <p>${escapeHtml(reportCard.detail)}</p>
    </article>
  `).join('');

  const warning = document.querySelector('#reportCostWarning');
  if (warning) {
    warning.textContent = report.hasMissingCostSales ? COST_WARNING_TEXT : '';
    warning.classList.toggle('hidden', !report.hasMissingCostSales);
  }

  renderRankingTable('topProductsTable', ['Produto', 'Qtd.', 'Faturamento'], report.topProducts, item => [
    item.name,
    Number(item.quantity).toLocaleString('pt-BR'),
    money(item.total)
  ]);

  renderRankingTable('topClientsTable', ['Cliente', 'Compras', 'Faturamento'], report.topClients, item => [
    item.name,
    String(item.count),
    money(item.total)
  ]);
}

function getMonthlyReportData() {
  const monthValue = getMonthFilterValue('reports') || currentMonthInputValue();
  const monthDate = new Date(`${monthValue}-01T00:00:00`);
  const monthLabel = monthDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const sales = data.sales.filter(sale => matchesMonth(sale.date, monthValue));
  const expensesList = data.payables.filter(item => matchesMonth(item.dueDate, monthValue));
  const revenue = sumValues(sales);
  const missingCostSales = sales.filter(sale => calculateSaleProductCost(sale) === null);
  const productCost = sales.reduce((total, sale) => {
    const cost = calculateSaleProductCost(sale);
    return cost === null ? total : total + cost;
  }, 0);
  const commissions = sales.reduce((total, sale) => total + calculateSaleCommission(sale), 0);
  const expenses = sumValues(expensesList);
  const grossProfit = revenue - productCost;
  const netProfit = grossProfit - commissions - expenses;

  return {
    monthLabel,
    monthValue,
    sales,
    expensesList,
    revenue,
    productCost,
    grossProfit,
    commissions,
    expenses,
    netProfit,
    missingCostSales,
    hasMissingCostSales: missingCostSales.length > 0,
    topProducts: rankProductsBySales(sales),
    topClients: rankClientsBySales(sales)
  };
}

function renderRankingTable(targetId, headings, rows, mapRow) {
  const target = document.querySelector(`#${targetId}`);
  if (!target) return;

  if (!rows.length) {
    target.innerHTML = '<div class="empty">Sem dados para este mes.</div>';
    return;
  }

  const head = headings.map(heading => `<th>${escapeHtml(heading)}</th>`).join('');
  const body = rows.slice(0, 5).map(row => `
    <tr>${mapRow(row).map(value => `<td>${escapeHtml(value)}</td>`).join('')}</tr>
  `).join('');

  target.innerHTML = `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

function rankProductsBySales(sales) {
  const ranking = new Map();
  sales.forEach(sale => {
    const name = nameById('products', sale.productId);
    const current = ranking.get(sale.productId) || { name, quantity: 0, total: 0 };
    current.quantity += Number(sale.quantity || 0);
    current.total += Number(sale.value || 0);
    ranking.set(sale.productId, current);
  });

  return [...ranking.values()].sort((a, b) => b.quantity - a.quantity || b.total - a.total);
}

function rankClientsBySales(sales) {
  const ranking = new Map();
  sales.forEach(sale => {
    const name = nameById('clients', sale.clientId);
    const current = ranking.get(sale.clientId) || { name, count: 0, total: 0 };
    current.count += 1;
    current.total += Number(sale.value || 0);
    ranking.set(sale.clientId, current);
  });

  return [...ranking.values()].sort((a, b) => b.total - a.total || b.count - a.count);
}

function exportMonthlyReportPdf() {
  const report = getMonthlyReportData();
  const lines = [
    'GF ERP - Relatorio mensal',
    `Gerado em: ${formatDate(today())}`,
    `Periodo: ${report.monthLabel}`,
    '',
    'Resumo financeiro',
    `Faturamento total: ${money(report.revenue)}`,
    `Custo total dos produtos vendidos: ${money(report.productCost)}`,
    `Lucro bruto: ${money(report.grossProfit)}`,
    `Comissoes pagas: ${money(report.commissions)}`,
    `Despesas: ${money(report.expenses)}`,
    `Lucro liquido estimado: ${money(report.netProfit)}`,
    ...(report.hasMissingCostSales ? ['', COST_WARNING_TEXT, `Vendas afetadas: ${report.missingCostSales.length}`] : []),
    '',
    'Produtos mais vendidos',
    ...formatRankingLines(report.topProducts, item => `${item.name} - ${item.quantity} un - ${money(item.total)}`),
    '',
    'Clientes que mais compraram',
    ...formatRankingLines(report.topClients, item => `${item.name} - ${item.count} compra(s) - ${money(item.total)}`)
  ];

  const blob = createSimplePdf(lines);
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `gf-erp-relatorio-mensal-${today()}.pdf`;
  link.click();
  URL.revokeObjectURL(link.href);
  showToast('Relatorio PDF exportado.');
}

function formatRankingLines(items, formatter) {
  if (!items.length) return ['Sem dados para este mes.'];
  return items.slice(0, 5).map((item, index) => `${index + 1}. ${formatter(item)}`);
}

function removeRecord(moduleId, id) {
  const record = data[moduleId].find(item => item.id === id);
  if (moduleId === 'stock' && record && record.sourceSaleId) {
    alert('Este e um movimento automatico gerado por venda e nao pode ser excluido manualmente.');
    return;
  }
  if (!confirm('Excluir este registro?')) return;
  rollbackRecordEffects(moduleId, record);
  data[moduleId] = data[moduleId].filter(item => item.id !== id);
  persist();
  renderAll();
  showToast('Registro excluido.');
}

function rollbackRecordEffects(moduleId, record) {
  if (!record) return;

  if (moduleId === 'sales') {
    rollbackSaleStock(record);
    data.stock = data.stock.filter(item => item.sourceSaleId !== record.id);
    data.cash = data.cash.filter(item => item.sourceSaleId !== record.id);
    removeReceivablesFromSale(record.id);
  }

  if (moduleId === 'stock') {
    rollbackStockMovement(record);
  }

  if (moduleId === 'payables') {
    data.cash = data.cash.filter(item => item.sourcePayableId !== record.id);
  }

  if (moduleId === 'receivables') {
    data.cash = data.cash.filter(item => item.sourceReceivableId !== record.id);
  }
}

function convertQuoteToSale(quoteId) {
  const quote = data.quotes.find(item => item.id === quoteId);
  if (!quote) return;
  if (quote.status !== 'Aprovado') {
    alert('Somente orcamentos aprovados podem virar venda.');
    return;
  }
  if (quote.convertedSaleId) {
    alert('Este orcamento ja foi transformado em venda.');
    return;
  }

  const clientId = findOrCreateClientFromQuote(quote);
  const sale = {
    id: makeId('sales'),
    date: today(),
    clientId,
    productId: quote.productId,
    quantity: Number(quote.quantity || 0),
    value: Number(quote.totalValue || 0),
    paymentMethod: 'Pix',
    status: 'A receber',
    biancaCommission: false,
    notes: `Venda criada a partir do orcamento ${quote.id}. ${quote.notes || ''}`.trim()
  };

  data.sales.push(sale);
  applySideEffects('sales', sale);
  data.quotes = data.quotes.map(item => item.id === quoteId ? { ...item, convertedSaleId: sale.id } : item);
  persist();
  renderAll();
  openView('sales');
  showToast('Orcamento transformado em venda.');
}

function createProductionFromSaleId(saleId) {
  const sale = data.sales.find(item => item.id === saleId);
  if (!sale) return;
  createProductionFromSale(sale);
  persist();
  renderAll();
  showToast('Pedido de producao criado.');
}

function createProductionFromSale(sale) {
  if (!sale || hasProductionForSale(sale.id) || !isSaleProduction(sale)) return null;

  const product = productById(sale.productId);
  const productionOrder = {
    id: makeId('production'),
    orderNumber: nextProductionOrderNumber(),
    clientId: sale.clientId,
    productId: sale.productId,
    quantity: Number(sale.quantity || 0),
    productionType: inferProductionType(product),
    status: 'Novo',
    entryDate: sale.date || today(),
    deadline: today(7),
    responsible: 'Gabriel',
    notes: sale.notes || '',
    sourceSaleId: sale.id
  };

  data.production.push(productionOrder);
  return productionOrder;
}

function shouldCreateProductionFromSale(sale) {
  return isSaleProduction(sale) && sale.createProductionOrder && !hasProductionForSale(sale.id);
}

function isSaleProduction(sale) {
  return normalizeText(sale.status) === normalizeText('Em producao');
}

function hasProductionForSale(saleId) {
  return data.production.some(order => order.sourceSaleId === saleId);
}

function nextProductionOrderNumber() {
  const nextNumber = data.production.length + 1;
  return `GF-${String(nextNumber).padStart(4, '0')}`;
}

function inferProductionType(product) {
  const category = normalizeText(product ? product.category : '');
  if (category.includes('impressao 3d')) return 'Impressao 3D';
  if (category.includes('caneca') || category.includes('sublim')) return 'Sublimacao';
  return 'Outro';
}

function isProductionLate(order) {
  if (!order.deadline || ['Pronto', 'Entregue', 'Cancelado'].includes(order.status)) return false;
  return new Date(`${order.deadline}T00:00:00`) < new Date(`${today()}T00:00:00`);
}

function findOrCreateClientFromQuote(quote) {
  const normalizedPhone = normalizeText(quote.phone);
  const normalizedName = normalizeText(quote.clientName);
  const existing = data.clients.find(client => (
    normalizeText(client.phone) === normalizedPhone
    || normalizeText(client.name) === normalizedName
  ));
  if (existing) return existing.id;

  const client = {
    id: makeId('clients'),
    name: quote.clientName,
    phone: quote.phone,
    email: '',
    document: '',
    address: ''
  };
  data.clients.push(client);
  return client.id;
}

function renderStockOverview() {
  const target = document.querySelector('#stockOverview');
  if (!target) return;
  renderStockSummary();

  target.innerHTML = data.inventoryItems.map(item => {
    const level = getStockLevel(item);
    return `
      <article class="stock-card ${level.className}">
        <span>${escapeHtml(item.category || 'Estoque')}</span>
        <strong>${escapeHtml(item.name)}</strong>
        <div>
          <b>${formatQuantity(item)}</b>
          <small>${escapeHtml(level.label)} | minimo: ${item.minStock || 0} | ideal: ${item.idealStock || 0} ${escapeHtml(item.unit || '')}</small>
        </div>
      </article>
    `;
  }).join('');
}

function renderStockSummary() {
  const target = document.querySelector('#stockSummary');
  if (!target) return;

  const belowMinimum = data.inventoryItems.filter(item => Number(item.minStock) > 0 && Number(item.quantity) <= Number(item.minStock));
  const stockValue = data.inventoryItems.reduce((total, item) => total + (Number(item.quantity || 0) * Number(item.unitCost || 0)), 0);
  const monthlyEntries = data.stock.filter(item => item.type === 'Entrada' && isCurrentMonth(item.date)).reduce((total, item) => total + Number(item.quantity || 0), 0);
  const monthlyExits = data.stock.filter(item => item.type === 'Saida' && isCurrentMonth(item.date)).reduce((total, item) => total + Number(item.quantity || 0), 0);

  const cards = [
    { label: 'Abaixo do minimo', value: String(belowMinimum.length), detail: 'Itens em alerta' },
    { label: 'Valor estimado', value: money(stockValue), detail: 'Quantidade x custo unitario' },
    { label: 'Entradas do mes', value: String(monthlyEntries), detail: 'Unidades movimentadas' },
    { label: 'Saidas do mes', value: String(monthlyExits), detail: 'Unidades baixadas' }
  ];

  target.innerHTML = cards.map(card => `
    <article class="summary-card">
      <span>${escapeHtml(card.label)}</span>
      <strong>${escapeHtml(card.value)}</strong>
      <p>${escapeHtml(card.detail)}</p>
    </article>
  `).join('');
}

function getStockLevel(item) {
  const quantity = Number(item.quantity || 0);
  const minimum = Number(item.minStock || 0);
  const ideal = Number(item.idealStock || 0);
  if (minimum > 0 && quantity <= minimum) return { label: 'Estoque critico', className: 'critical-stock' };
  if (ideal > 0 && quantity < ideal) return { label: 'Estoque baixo', className: 'low-stock' };
  return { label: 'Estoque ideal', className: 'ideal-stock' };
}

function renderProductionKanban() {
  const target = document.querySelector('#productionKanban');
  if (!target) return;

  const statuses = ['Novo', 'Arte', 'Aprovado', 'Produzindo', 'Acabamento', 'Pronto', 'Entregue'];
  target.innerHTML = statuses.map(status => {
    const orders = data.production.filter(order => order.status === status);
    return `
      <section class="kanban-column">
        <header><strong>${escapeHtml(status)}</strong><span>${orders.length}</span></header>
        <div class="kanban-cards">
          ${orders.length ? orders.map(renderProductionCard).join('') : '<div class="empty kanban-empty">Sem pedidos</div>'}
        </div>
      </section>
    `;
  }).join('');

  target.querySelectorAll('[data-production-status]').forEach(select => {
    select.addEventListener('change', event => updateProductionStatus(event.target.dataset.productionStatus, event.target.value));
  });
}

function renderProductionCard(order) {
  const late = isProductionLate(order);
  return `
    <article class="production-card ${late ? 'late' : ''}">
      <div class="production-card-head">
        <strong>${escapeHtml(order.orderNumber || 'Sem numero')}</strong>
        ${late ? '<span class="status bad">Atrasado</span>' : '<span class="status ok">No prazo</span>'}
      </div>
      <span>${escapeHtml(nameById('clients', order.clientId))}</span>
      <b>${escapeHtml(nameById('products', order.productId))}</b>
      <small>${Number(order.quantity || 0)} un | prazo ${formatDate(order.deadline)}</small>
      <select data-production-status="${escapeHtml(order.id)}" aria-label="Alterar status">
        ${['Novo', 'Arte', 'Aprovado', 'Produzindo', 'Acabamento', 'Pronto', 'Entregue', 'Cancelado'].map(status => `<option value="${status}" ${status === order.status ? 'selected' : ''}>${status}</option>`).join('')}
      </select>
    </article>
  `;
}

function updateProductionStatus(orderId, status) {
  data.production = data.production.map(order => order.id === orderId ? { ...order, status } : order);
  persist();
  renderAll();
  showToast('Status de producao atualizado.');
}

function renderEquipmentBoard() {
  const target = document.querySelector('#equipmentBoard');
  if (!target) return;

  target.innerHTML = data.equipment.map(equipment => `
    <article class="equipment-card ${equipmentStatusClass(equipment.status)}">
      <div class="equipment-head">
        <strong>${escapeHtml(equipment.name)}</strong>
        <select data-equipment-status="${escapeHtml(equipment.id)}" aria-label="Status do equipamento">
          ${['Livre', 'Produzindo', 'Manutencao', 'Parado'].map(status => `<option value="${status}" ${status === equipment.status ? 'selected' : ''}>${status}</option>`).join('')}
        </select>
      </div>
      <label>Trabalho atual <input data-equipment-field="${escapeHtml(equipment.id)}:currentJob" value="${escapeHtml(equipment.currentJob || '')}"></label>
      <label>Tempo restante <input data-equipment-field="${escapeHtml(equipment.id)}:remainingTime" value="${escapeHtml(equipment.remainingTime || '')}"></label>
      <label>Material usado <input data-equipment-field="${escapeHtml(equipment.id)}:material" value="${escapeHtml(equipment.material || '')}"></label>
      <label>Observacoes <textarea data-equipment-field="${escapeHtml(equipment.id)}:notes">${escapeHtml(equipment.notes || '')}</textarea></label>
    </article>
  `).join('');

  target.querySelectorAll('[data-equipment-status]').forEach(select => {
    select.addEventListener('change', event => updateEquipment(event.target.dataset.equipmentStatus, 'status', event.target.value));
  });
  target.querySelectorAll('[data-equipment-field]').forEach(input => {
    input.addEventListener('change', event => {
      const [id, field] = event.target.dataset.equipmentField.split(':');
      updateEquipment(id, field, event.target.value);
    });
  });
}

function updateEquipment(equipmentId, field, value) {
  data.equipment = data.equipment.map(equipment => equipment.id === equipmentId ? { ...equipment, [field]: value } : equipment);
  persist();
  renderEquipmentBoard();
  renderDashboard();
}

function equipmentStatusClass(status) {
  if (status === 'Livre') return 'status-good';
  if (status === 'Produzindo') return 'status-warning';
  return 'status-critical';
}

function renderPayablesSummary() {
  const target = document.querySelector('#payablesSummary');
  if (!target) return;

  const openPayables = data.payables.filter(item => item.status !== 'Paga');
  const fixed = openPayables.filter(item => item.expenseType === 'Fixa');
  const variable = openPayables.filter(item => item.expenseType === 'Variavel');
  const recurring = openPayables.filter(item => item.frequency === 'Mensal recorrente');
  const installment = openPayables.filter(item => item.frequency === 'Parcelada');

  const cards = [
    { label: 'Fixas abertas', value: money(sumValues(fixed)), detail: `${fixed.length} conta(s)` },
    { label: 'Variaveis abertas', value: money(sumValues(variable)), detail: `${variable.length} conta(s)` },
    { label: 'Recorrentes mensais', value: String(recurring.length), detail: 'Despesas mensais cadastradas' },
    { label: 'Parceladas', value: String(installment.length), detail: 'Parcelamentos ativos' }
  ];

  target.innerHTML = cards.map(card => `
    <article class="summary-card">
      <span>${escapeHtml(card.label)}</span>
      <strong>${escapeHtml(card.value)}</strong>
      <p>${escapeHtml(card.detail)}</p>
    </article>
  `).join('');
}

function formatCell(column, value, row) {
  if (column === 'productPhoto') return formatProductPhoto(row);
  if (column === 'clientId') return escapeHtml(nameById('clients', value));
  if (column === 'productId') return escapeHtml(nameById('products', value));
  if (column === 'inventoryItemId') return escapeHtml(nameById('inventoryItems', value));
  if (column === 'originInfo') return row.sourceSaleId ? '<span class="status warn">Movimento automatico</span>' : '<span class="status">Manual</span>';
  if (column === 'saleLink') return row.sourceSaleId ? `<span class="status warn">${escapeHtml(row.sourceSaleId)}</span>` : '<span class="status">Manual</span>';
  if (column === 'estimatedProfit') return formatEstimatedProfit(row);
  if (column === 'saleProfit') return formatSaleProfit(row);
  if (column === 'biancaCommission') return value ? '<span class="status warn">Sim - 5%</span>' : '<span class="status">Nao</span>';
  if (column === 'active') return value !== false ? '<span class="status ok">Ativo</span>' : '<span class="status bad">Inativo</span>';
  if (column === 'installmentInfo') return formatInstallmentInfo(row);
  if (['value', 'price', 'cost', 'unitValue', 'totalValue'].includes(column)) return formatMoneyOrVariable(value);
  if (column === 'profitMargin') return value === null || value === undefined || value === '' ? '<span class="status warn">Variavel</span>' : `${Number(value || 0).toLocaleString('pt-BR')}%`;
  if (['date', 'dueDate', 'deadline', 'paymentDate', 'receivedDate', 'entryDate'].includes(column)) return formatDate(value);
  if (column === 'status') return `<span class="status ${statusClass(value)}">${escapeHtml(value)}</span>`;
  if (column === 'type') return `<span class="status ${value === 'Entrada' ? 'ok' : 'bad'}">${escapeHtml(value)}</span>`;
  return escapeHtml(value ?? '');
}

function statusClass(value) {
  if (['Recebido', 'Pago', 'Paga', 'Recebida', 'Entregue', 'Aprovado', 'Pronto', 'Livre'].includes(value)) return 'ok';
  if (['A receber', 'Pendente', 'Aberta', 'Em producao', 'Novo', 'Arte', 'Produzindo', 'Acabamento'].includes(value)) return 'warn';
  if (['Recusado', 'Cancelado', 'Parado', 'Manutencao'].includes(value)) return 'bad';
  return '';
}

function formatProductPhoto(product) {
  if (!product.photoUrl) return '<span class="product-photo-placeholder">GF</span>';
  return `<img class="product-photo" src="${escapeHtml(product.photoUrl)}" alt="${escapeHtml(product.name || 'Produto')}">`;
}

function nameById(collection, id) {
  const item = data[collection].find(entry => entry.id === id);
  return item ? item.name : 'Nao encontrado';
}

function productById(id) {
  return data.products.find(product => product.id === id);
}

function inventoryItemById(id) {
  return data.inventoryItems.find(item => item.id === id);
}

function syncSaleSideEffects(sale, previousSale) {
  if (previousSale) rollbackSaleStock(previousSale);
  data.stock = data.stock.filter(item => item.sourceSaleId !== sale.id);
  applySaleStockExit(sale);

  data.cash = data.cash.filter(item => item.sourceSaleId !== sale.id);
  removeReceivablesFromSale(sale.id);

  if (isSaleReceived(sale.status)) {
    data.cash.push({
      id: makeId('cash'),
      date: sale.date,
      description: `Venda - ${nameById('products', sale.productId)}`,
      type: 'Entrada',
      value: Number(sale.value || 0),
      category: `Vendas - ${sale.paymentMethod || 'Nao informado'}`,
      sourceSaleId: sale.id
    });
  } else if (isSaleReceivable(sale.status)) {
    data.receivables.push({
      id: makeId('receivables'),
      dueDate: sale.date,
      clientId: sale.clientId,
      description: `Venda pendente - ${nameById('products', sale.productId)}`,
      value: Number(sale.value || 0),
      status: 'Aberta',
      sourceSaleId: sale.id
    });
  }
}

function removeReceivablesFromSale(saleId) {
  const linkedReceivableIds = data.receivables
    .filter(item => item.sourceSaleId === saleId)
    .map(item => item.id);
  data.receivables = data.receivables.filter(item => item.sourceSaleId !== saleId);
  data.cash = data.cash.filter(item => !linkedReceivableIds.includes(item.sourceReceivableId));
}

function applySaleStockExit(sale) {
  const product = productById(sale.productId);
  if (!product || !product.inventoryItemId) return;

  const usageQty = Number(product.stockUsageQty || 1);
  const saleQty = Number(sale.quantity || 0);
  const quantity = usageQty * saleQty;
  if (!quantity) return;

  adjustInventoryStock(product.inventoryItemId, -(usageQty * saleQty));
  data.stock.push({
    id: makeId('stock'),
    date: sale.date,
    inventoryItemId: product.inventoryItemId,
    type: 'Saida',
    quantity,
    reason: `Venda - ${product.name}`,
    sourceSaleId: sale.id
  });
}

function rollbackSaleStock(sale) {
  const product = productById(sale.productId);
  if (!product || !product.inventoryItemId) return;

  const usageQty = Number(product.stockUsageQty || 1);
  const saleQty = Number(sale.quantity || 0);
  const quantity = usageQty * saleQty;
  if (quantity) adjustInventoryStock(product.inventoryItemId, quantity);
}

function syncStockMovement(record, previousRecord) {
  if (previousRecord) rollbackStockMovement(previousRecord);
  applyStockMovement(record);
}

function applyStockMovement(record) {
  const amount = stockMovementAmount(record);
  adjustInventoryStock(record.inventoryItemId, amount);
}

function rollbackStockMovement(record) {
  const amount = stockMovementAmount(record);
  adjustInventoryStock(record.inventoryItemId, -amount);
}

function stockMovementAmount(record) {
  return record.type === 'Entrada' ? Number(record.quantity || 0) : -Number(record.quantity || 0);
}

function syncPayableCash(payable) {
  data.cash = data.cash.filter(item => item.sourcePayableId !== payable.id);
  if (payable.status !== 'Paga') return;

  data.cash.push({
    id: makeId('cash'),
    date: payable.paymentDate || today(),
    description: `Pagamento - ${payable.description}`,
    type: 'Saida',
    value: Number(payable.value || 0),
    category: `Contas a pagar - ${payable.expenseType || 'Despesa'}`,
    sourcePayableId: payable.id
  });
}

function syncReceivableCash(receivable) {
  data.cash = data.cash.filter(item => item.sourceReceivableId !== receivable.id);
  if (receivable.status !== 'Recebida') return;

  data.cash.push({
    id: makeId('cash'),
    date: receivable.receivedDate || today(),
    description: `Recebimento - ${receivable.description}`,
    type: 'Entrada',
    value: Number(receivable.value || 0),
    category: 'Contas a receber',
    sourceReceivableId: receivable.id
  });
}

function adjustInventoryStock(inventoryItemId, amount) {
  data.inventoryItems = data.inventoryItems.map(item => {
    if (item.id !== inventoryItemId) return item;
    return { ...item, quantity: Number(item.quantity || 0) + amount };
  });
}

function formatEstimatedProfit(product) {
  if (!product || product.cost === null || product.price === null || product.cost === undefined || product.price === undefined) {
    return '<span class="status warn">Variavel</span>';
  }

  const profit = Number(product.price) - Number(product.cost);
  const className = profit >= 0 ? 'ok' : 'bad';
  return `<span class="status ${className}">${money(profit)}</span>`;
}

function formatMoneyOrVariable(value) {
  if (value === null || value === undefined || value === '') {
    return '<span class="status warn">Variavel</span>';
  }

  return money(Number(value || 0));
}

function formatQuantity(item) {
  return `${Number(item.quantity || 0).toLocaleString('pt-BR')} ${escapeHtml(item.unit || '')}`.trim();
}

function formatSaleProfit(sale) {
  const profit = calculateSaleProfit(sale);
  if (profit === null) return '<span class="status warn">Variavel</span>';

  const className = profit >= 0 ? 'ok' : 'bad';
  return `<span class="status ${className}">${money(profit)}</span>`;
}

function formatInstallmentInfo(payable) {
  if (!payable || payable.frequency !== 'Parcelada') return '-';
  const current = Number(payable.installment || 0);
  const total = Number(payable.installmentsTotal || 0);
  if (!current || !total) return '-';
  return `${current}/${total}`;
}

function calculateSaleProfit(sale) {
  const productCost = calculateSaleProductCost(sale);
  if (productCost === null) {
    return null;
  }

  const total = Number(sale.value || 0);
  const commission = calculateSaleCommission(sale);
  return total - productCost - commission;
}

function calculateSaleProductCost(sale) {
  const product = productById(sale.productId);
  if (!product || product.cost === null || product.cost === undefined || product.cost === '') {
    return null;
  }

  return Number(product.cost || 0) * Number(sale.quantity || 0);
}

function calculateSaleCommission(sale) {
  return sale.biancaCommission ? Number(sale.value || 0) * 0.05 : 0;
}

function isSaleReceived(status) {
  return ['Recebido', 'Pago'].includes(status);
}

function isSaleReceivable(status) {
  return ['A receber', 'Pendente'].includes(status);
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function sumCash(type) {
  return data.cash
    .filter(item => item.type === type)
    .reduce((total, item) => total + Number(item.value || 0), 0);
}

function sumValues(items) {
  return items.reduce((total, item) => total + Number(item.value || 0), 0);
}

function isCurrentMonth(dateValue) {
  const date = new Date(`${dateValue}T00:00:00`);
  const now = new Date();
  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
}

function loadData() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return structuredClone(sampleData);
  try {
    return migrateData({ ...structuredClone(emptyData), ...JSON.parse(saved) });
  } catch {
    return structuredClone(sampleData);
  }
}

async function loadRemoteData() {
  const response = await apiRequest('/api/data');
  data = migrateData({ ...structuredClone(emptyData), ...response.data });
}

async function offerLocalMigration() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved || localStorage.getItem(LOCAL_MIGRATION_KEY)) return;
  const shouldMigrate = confirm('Foram encontrados dados antigos neste navegador. Deseja migrar esses dados para o banco do GF ERP?');
  localStorage.setItem(LOCAL_MIGRATION_KEY, '1');
  if (!shouldMigrate) return;

  try {
    data = migrateData({ ...structuredClone(emptyData), ...JSON.parse(saved) });
    await saveRemoteData();
    showToast('Dados locais migrados para o servidor.');
  } catch {
    alert('Nao foi possivel migrar os dados locais.');
  }
}

function migrateData(loadedData) {
  if (!Array.isArray(loadedData.production)) {
    loadedData.production = [];
  }

  if (!Array.isArray(loadedData.equipment)) {
    loadedData.equipment = [];
  }

  if (!Array.isArray(loadedData.quotes)) {
    loadedData.quotes = [];
  }

  loadedData.quotes = loadedData.quotes.map(quote => ({
    ...quote,
    date: quote.date || today(),
    totalValue: Number(quote.totalValue || (Number(quote.quantity || 0) * Number(quote.unitValue || 0))),
    status: quote.status || 'Enviado'
  }));

  if (!Array.isArray(loadedData.inventoryItems)) {
    loadedData.inventoryItems = [];
  }

  sampleData.inventoryItems.forEach(initialItem => {
    const alreadyExists = loadedData.inventoryItems.some(item => item.name === initialItem.name);
    if (alreadyExists) return;

    const itemToAdd = structuredClone(initialItem);
    if (loadedData.inventoryItems.some(item => item.id === itemToAdd.id)) {
      itemToAdd.id = makeId('inventoryItems');
    }
    loadedData.inventoryItems.push(itemToAdd);
  });

  sampleData.equipment.forEach(initialEquipment => {
    const alreadyExists = loadedData.equipment.some(equipment => equipment.name === initialEquipment.name);
    if (alreadyExists) return;
    loadedData.equipment.push(structuredClone(initialEquipment));
  });

  loadedData.equipment = loadedData.equipment.map(equipment => ({
    id: equipment.id || makeId('equipment'),
    name: equipment.name || 'Equipamento',
    status: equipment.status || 'Livre',
    currentJob: equipment.currentJob || '',
    remainingTime: equipment.remainingTime || '',
    material: equipment.material || '',
    notes: equipment.notes || ''
  }));

  loadedData.sales = loadedData.sales.map(sale => {
    const nextSale = { ...sale };
    if (!nextSale.paymentMethod) nextSale.paymentMethod = 'Pix';
    if (nextSale.status === 'Pago') nextSale.status = 'Recebido';
    if (nextSale.status === 'Pendente') nextSale.status = 'A receber';
    if (nextSale.biancaCommission === undefined) nextSale.biancaCommission = false;
    if (nextSale.createProductionOrder === undefined) nextSale.createProductionOrder = false;
    return nextSale;
  });

  loadedData.payables = loadedData.payables.map(payable => ({
    ...payable,
    expenseType: payable.expenseType || 'Variavel',
    frequency: payable.frequency || 'Unica',
    installment: payable.installment ?? null,
    installmentsTotal: payable.installmentsTotal ?? null,
    paymentDate: payable.status === 'Paga' ? (payable.paymentDate || today()) : (payable.paymentDate || '')
  }));

  loadedData.receivables = loadedData.receivables.map(receivable => ({
    ...receivable,
    receivedDate: receivable.status === 'Recebida' ? (receivable.receivedDate || today()) : (receivable.receivedDate || '')
  }));

  sampleData.payables.forEach(initialPayable => {
    const alreadyExists = loadedData.payables.some(payable => (
      payable.description === initialPayable.description
      && payable.supplier === initialPayable.supplier
      && payable.frequency === initialPayable.frequency
    ));
    if (alreadyExists) return;

    const payableToAdd = structuredClone(initialPayable);
    if (loadedData.payables.some(payable => payable.id === payableToAdd.id)) {
      payableToAdd.id = makeId('payables');
    }
    loadedData.payables.push(payableToAdd);
  });

  const productNames = loadedData.products.map(product => product.name);
  const hasNewInitialProducts = sampleData.products.some(product => productNames.includes(product.name));
  const hasOnlyOldSamples = loadedData.products.length === 2
    && productNames.includes('Suporte personalizado')
    && productNames.includes('Miniatura decorativa');

  if (hasOnlyOldSamples && !hasNewInitialProducts) {
    loadedData.products = structuredClone(sampleData.products);
  }

  sampleData.products.forEach(initialProduct => {
    const alreadyExists = loadedData.products.some(product => product.name === initialProduct.name);
    if (alreadyExists) return;

    const productToAdd = structuredClone(initialProduct);
    if (loadedData.products.some(product => product.id === productToAdd.id)) {
      productToAdd.id = makeId('products');
    }
    loadedData.products.push(productToAdd);
  });

  loadedData.products = loadedData.products.map(product => {
    const nextProduct = { ...product };
    nextProduct.photoUrl = nextProduct.photoUrl || '';
    nextProduct.supplier = nextProduct.supplier || '';
    nextProduct.internalCode = nextProduct.internalCode || '';
    nextProduct.idealStock = nextProduct.idealStock ?? 0;
    nextProduct.profitMargin = nextProduct.profitMargin ?? calculateProductMargin(nextProduct);
    nextProduct.avgProductionTime = nextProduct.avgProductionTime || '';
    nextProduct.active = nextProduct.active !== false;
    if (nextProduct.name === 'Caneca branca personalizada') {
      nextProduct.inventoryItemId = findInventoryItemIdByName(loadedData, 'Canecas brancas') || nextProduct.inventoryItemId;
      nextProduct.stockUsageQty = Number(nextProduct.stockUsageQty || 1);
    }
    if (nextProduct.name === 'Caneca magica personalizada') {
      nextProduct.inventoryItemId = findInventoryItemIdByName(loadedData, 'Canecas magicas') || nextProduct.inventoryItemId;
      nextProduct.stockUsageQty = Number(nextProduct.stockUsageQty || 1);
    }
    if (nextProduct.name === 'Peca impressa 3D sob encomenda') {
      nextProduct.inventoryItemId = findInventoryItemIdByName(loadedData, 'Filamento PLA') || nextProduct.inventoryItemId;
      nextProduct.stockUsageQty = Number(nextProduct.stockUsageQty || 1);
    }
    return nextProduct;
  });

  loadedData.inventoryItems = loadedData.inventoryItems.map(item => ({
    ...item,
    idealStock: item.idealStock ?? Math.max(Number(item.minStock || 0) * 2, Number(item.quantity || 0)),
    unitCost: item.unitCost ?? findInventoryUnitCost(loadedData, item.id)
  }));

  loadedData.production = loadedData.production.map((order, index) => ({
    ...order,
    orderNumber: order.orderNumber || `GF-${String(index + 1).padStart(4, '0')}`,
    productionType: order.productionType || inferProductionType(loadedData.products.find(product => product.id === order.productId)),
    status: order.status || 'Novo',
    entryDate: order.entryDate || today(),
    deadline: order.deadline || today(7),
    responsible: order.responsible || '',
    notes: order.notes || '',
    sourceSaleId: order.sourceSaleId || ''
  }));

  loadedData.stock = loadedData.stock.map(movement => {
    if (movement.inventoryItemId) return movement;
    const product = loadedData.products.find(item => item.id === movement.productId);
    return {
      ...movement,
      inventoryItemId: product ? product.inventoryItemId : findInventoryItemIdByName(loadedData, 'Canecas brancas')
    };
  }).filter(movement => movement.inventoryItemId);

  return loadedData;
}

function calculateProductMargin(product) {
  if (!product || !Number(product.cost) || product.price === null || product.price === undefined || product.price === '') return null;
  return ((Number(product.price || 0) - Number(product.cost || 0)) / Number(product.cost || 1)) * 100;
}

function findInventoryUnitCost(targetData, inventoryItemId) {
  const linkedProduct = targetData.products.find(product => product.inventoryItemId === inventoryItemId && product.cost !== null && product.cost !== undefined && product.cost !== '');
  return linkedProduct ? Number(linkedProduct.cost || 0) : 0;
}

function findInventoryItemIdByName(targetData, name) {
  const item = targetData.inventoryItems.find(entry => entry.name === name);
  return item ? item.id : '';
}

function persist() {
  saveRemoteData().catch(() => {
    setSyncStatus('Erro ao salvar', 'offline');
    showToast('Nao foi possivel salvar no servidor.');
  });
}

async function saveRemoteData() {
  await apiRequest('/api/data', {
    method: 'PUT',
    body: { data }
  });
  setSyncStatus('Online', 'online');
}

async function apiRequest(path, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (authToken && !options.skipAuth) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  if (response.status === 401) {
    logout(false);
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    throw new Error(`API error ${response.status}`);
  }

  return response.json();
}

function connectRealtime() {
  if (!authToken || !window.WebSocket) return;
  if (realtimeSocket) realtimeSocket.close();

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = API_BASE_URL
    ? API_BASE_URL.replace(/^https?:\/\//, '')
    : window.location.host;
  realtimeSocket = new WebSocket(`${protocol}//${host}/ws?token=${encodeURIComponent(authToken)}`);

  realtimeSocket.addEventListener('open', () => setSyncStatus('Online', 'online'));
  realtimeSocket.addEventListener('close', () => setSyncStatus('Reconectando...', 'offline'));
  realtimeSocket.addEventListener('message', event => {
    try {
      const message = JSON.parse(event.data);
      if (message.type !== 'data-updated') return;
      data = migrateData({ ...structuredClone(emptyData), ...message.data });
      renderAll();
      setSyncStatus('Atualizado em tempo real', 'online');
    } catch {
      setSyncStatus('Erro de sincronizacao', 'offline');
    }
  });
}

function setSyncStatus(message, state) {
  if (!syncStatus) return;
  syncStatus.textContent = message;
  syncStatus.classList.toggle('online', state === 'online');
  syncStatus.classList.toggle('offline', state === 'offline');
}

function exportBackup() {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `gf-erp-backup-${today()}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
  showToast('Backup exportado.');
}

function createSimplePdf(lines) {
  const maxLinesPerPage = 42;
  const normalizedLines = lines.flatMap(line => wrapPdfLine(line, 92));
  const pages = [];
  for (let index = 0; index < normalizedLines.length; index += maxLinesPerPage) {
    pages.push(normalizedLines.slice(index, index + maxLinesPerPage));
  }
  if (!pages.length) pages.push(['GF ERP - Relatorio mensal']);

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
  ];
  const pageRefs = [];

  pages.forEach((pageLines, pageIndex) => {
    const pageObjectRef = objects.length + 1;
    const contentObjectRef = objects.length + 2;
    pageRefs.push(`${pageObjectRef} 0 R`);

    const textCommands = pageLines.map((line, lineIndex) => {
      const y = 790 - (lineIndex * 16);
      const fontSize = pageIndex === 0 && lineIndex === 0 ? 16 : isPdfSectionTitle(line) ? 12 : 10;
      return `BT /F1 ${fontSize} Tf 50 ${y} Td (${escapePdfText(line)}) Tj ET`;
    });
    textCommands.push(`BT /F1 9 Tf 50 34 Td (${escapePdfText(`Pagina ${pageIndex + 1} de ${pages.length}`)}) Tj ET`);
    const stream = `${textCommands.join('\n')}\n`;

    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObjectRef} 0 R >>`);
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}endstream`);
  });

  objects[1] = `<< /Type /Pages /Kids [${pageRefs.join(' ')}] /Count ${pages.length} >>`;

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach(offset => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return new Blob([pdf], { type: 'application/pdf' });
}

function wrapPdfLine(line, maxLength) {
  const cleanLine = normalizePdfText(line);
  if (cleanLine.length <= maxLength) return [cleanLine];

  const words = cleanLine.split(' ');
  const wrapped = [];
  let current = '';
  words.forEach(word => {
    if (`${current} ${word}`.trim().length > maxLength) {
      wrapped.push(current);
      current = word;
    } else {
      current = `${current} ${word}`.trim();
    }
  });
  if (current) wrapped.push(current);
  return wrapped;
}

function isPdfSectionTitle(line) {
  return ['Resumo financeiro', 'Produtos mais vendidos', 'Clientes que mais compraram'].includes(line);
}

function normalizePdfText(value) {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '');
}

function escapePdfText(value) {
  return normalizePdfText(value)
    .replaceAll('\\', '\\\\')
    .replaceAll('(', '\\(')
    .replaceAll(')', '\\)');
}

function importBackup(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      data = migrateData({ ...structuredClone(emptyData), ...JSON.parse(reader.result) });
      persist();
      renderAll();
      showToast('Backup importado.');
    } catch {
      alert('Arquivo de backup invalido.');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2200);
}

function showUpdateBanner(worker) {
  waitingServiceWorker = worker || waitingServiceWorker;
  if (!updateBanner) return;
  updateBanner.classList.remove('hidden');
}

function activateWaitingServiceWorker() {
  if (!waitingServiceWorker) {
    window.location.reload();
    return;
  }
  waitingServiceWorker.postMessage({ type: 'SKIP_WAITING' });
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function today(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function currentMonthInputValue() {
  return today().slice(0, 7);
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('/service-worker.js').then(registration => {
    if (registration.waiting && navigator.serviceWorker.controller) {
      showUpdateBanner(registration.waiting);
    }

    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          showUpdateBanner(newWorker);
        }
      });
    });

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshingForUpdate) return;
      refreshingForUpdate = true;
      window.location.reload();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') registration.update();
    });

    setInterval(() => registration.update(), 15 * 60 * 1000);
  }).catch(() => {
    setSyncStatus('PWA indisponivel', 'offline');
  });
}

function setupInstallPrompt() {
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredInstallPrompt = event;
    document.querySelector('#installApp').classList.remove('hidden');
  });
}

async function installPwa() {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  document.querySelector('#installApp').classList.add('hidden');
}

function money(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(value) {
  if (!value) return '';
  return new Date(`${value}T00:00:00`).toLocaleDateString('pt-BR');
}

function setText(id, value) {
  document.querySelector(`#${id}`).textContent = value;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
