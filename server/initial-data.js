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
      { id: 'p1', name: 'Caneca branca personalizada', category: 'Canecas personalizadas', cost: 11, price: 25, stock: 0, minStock: 0, inventoryItemId: 'i1', stockUsageQty: 1, notes: '' },
      { id: 'p2', name: 'Caneca magica personalizada', category: 'Canecas personalizadas', cost: 20, price: 40, stock: 0, minStock: 0, inventoryItemId: 'i2', stockUsageQty: 1, notes: '' },
      { id: 'p3', name: 'Peca impressa 3D sob encomenda', category: 'Impressao 3D', cost: null, price: null, stock: 0, minStock: 0, inventoryItemId: 'i7', stockUsageQty: 1, notes: 'Custo variavel e preco variavel conforme projeto.' }
    ],
    inventoryItems: [
      { id: 'i1', name: 'Canecas brancas', category: 'Sublimacao', quantity: 8, minStock: 5, unit: 'un' },
      { id: 'i2', name: 'Canecas magicas', category: 'Sublimacao', quantity: 4, minStock: 3, unit: 'un' },
      { id: 'i3', name: 'Papel sublimatico', category: 'Sublimacao', quantity: 50, minStock: 20, unit: 'folhas' },
      { id: 'i4', name: 'Tinta sublimatica', category: 'Sublimacao', quantity: 2, minStock: 1, unit: 'kit' },
      { id: 'i5', name: 'Fita termica', category: 'Sublimacao', quantity: 3, minStock: 1, unit: 'rolo' },
      { id: 'i6', name: 'Caixas para entrega', category: 'Embalagem', quantity: 20, minStock: 10, unit: 'un' },
      { id: 'i7', name: 'Filamento PLA', category: 'Impressao 3D', quantity: 2, minStock: 1, unit: 'kg' },
      { id: 'i8', name: 'Filamento PETG', category: 'Impressao 3D', quantity: 1, minStock: 1, unit: 'kg' }
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
    receivables: [
      { id: 're1', dueDate: today(5), clientId: 'c2', description: 'Pedido de brindes 3D', value: 520, status: 'Aberta', receivedDate: '' }
    ]
  };
}

module.exports = { createInitialData };
