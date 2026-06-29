function today(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function createInitialData() {
  return {
    sales: [
      { id: 's1', date: today(), clientId: 'c1', productId: 'p1', quantity: 2, value: 50, paymentMethod: 'Pix', status: 'Recebido', biancaCommission: true, notes: 'Canecas brancas personalizadas' }
    ],
    quotes: [
      { id: 'q1', date: today(), clientName: 'Loja Maker', phone: '(11) 3333-2211', productId: 'p2', quantity: 3, unitValue: 40, totalValue: 120, deadline: today(7), status: 'Enviado', notes: 'Orcamento inicial de exemplo.' }
    ],
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
}

module.exports = { createInitialData };
