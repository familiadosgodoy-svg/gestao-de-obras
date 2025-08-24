// Este arquivo contém o código da aplicação JavaScript (antigo JSX).
// Ele foi modificado para ser um arquivo .js padrão e ser compatível com servidores web simples.

// Variáveis globais para o IndexedDB
let db;
const DB_NAME = 'gestaoObraDB';
const DB_VERSION = 1;
const EXPENSES_STORE = 'expenses';
const BUDGET_STORE = 'budget';
let isDbReady = false;

// Variáveis globais para o modal de mensagem
const messageModal = document.getElementById('messageModal');
const modalMessage = document.getElementById('modalMessage');
const modalTitle = document.getElementById('modalTitle');
const closeModalBtn = document.getElementById('closeModalBtn');

// Variáveis para o overlay de carregamento
const loadingOverlay = document.getElementById('loadingOverlay');
const loadingMessage = document.getElementById('loadingMessage');
const mainContainer = document.getElementById('mainContainer');

// Gráfico
let budgetChart;

// Referências aos elementos do DOM
const newExpenseBtn = document.getElementById('new-expense-btn');
const newExpenseModal = document.getElementById('new-expense-modal');
const closeExpenseModal = document.getElementById('close-expense-modal');
const expenseForm = document.getElementById('expense-form');
const totalExpensesEl = document.getElementById('total-expenses');
const remainingBudgetEl = document.getElementById('remaining-budget');
const expenseList = document.getElementById('expense-list');
const categoryFilter = document.getElementById('category-filter');
const exportPdfBtn = document.getElementById('export-pdf-btn');
const totalBudgetEl = document.getElementById('total-budget');
const totalExpensesTextEl = document.getElementById('total-expenses-text');
const remainingBudgetTextEl = document.getElementById('remaining-budget-text');
const budgetTimelineEl = document.getElementById('budget-timeline');
const addBudgetBtn = document.getElementById('add-budget-btn');
const budgetModal = document.getElementById('budget-modal');
const closeBudgetModal = document.getElementById('close-budget-modal');
const budgetForm = document.getElementById('budget-form');
const budgetAmountInput = document.getElementById('budget-amount');
const budgetStartDateInput = document.getElementById('budget-start-date');
const budgetEndDateInput = document.getElementById('budget-end-date');
const budgetStatus = document.getElementById('budget-status');

// --- Funções do IndexedDB ---
function openDb() {
    return new Promise((resolve, reject) => {
        if (isDbReady) {
            resolve(db);
            return;
        }
        showLoading("Abrindo banco de dados...");
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(EXPENSES_STORE)) {
                db.createObjectStore(EXPENSES_STORE, { keyPath: 'id', autoIncrement: true });
            }
            if (!db.objectStoreNames.contains(BUDGET_STORE)) {
                db.createObjectStore(BUDGET_STORE, { keyPath: 'id', autoIncrement: true });
            }
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            isDbReady = true;
            console.log("Banco de dados aberto com sucesso.");
            hideLoading();
            resolve(db);
        };

        request.onerror = (event) => {
            const error = event.target.error;
            console.error("Erro ao abrir o banco de dados:", error);
            hideLoading();
            reject(error);
        };
    });
}

function addData(storeName, data) {
    return new Promise((resolve, reject) => {
        showLoading("Salvando dados...");
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.add(data);

        request.onsuccess = () => {
            hideLoading();
            resolve(request.result);
        };

        request.onerror = (event) => {
            hideLoading();
            reject(event.target.error);
        };
    });
}

function updateData(storeName, data) {
    return new Promise((resolve, reject) => {
        showLoading("Atualizando dados...");
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.put(data);

        request.onsuccess = () => {
            hideLoading();
            resolve(request.result);
        };

        request.onerror = (event) => {
            hideLoading();
            reject(event.target.error);
        };
    });
}

function getData(storeName) {
    return new Promise((resolve, reject) => {
        showLoading("Buscando dados...");
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();

        request.onsuccess = () => {
            hideLoading();
            resolve(request.result);
        };

        request.onerror = (event) => {
            hideLoading();
            reject(event.target.error);
        };
    });
}

function deleteData(storeName, id) {
    return new Promise((resolve, reject) => {
        showLoading("Excluindo dados...");
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(id);

        request.onsuccess = () => {
            hideLoading();
            resolve();
        };

        request.onerror = (event) => {
            hideLoading();
            reject(event.target.error);
        };
    });
}

// --- Funções de Manipulação de Dados e UI ---
let allExpenses = [];
let currentBudget = null;

async function loadExpenses() {
    try {
        allExpenses = await getData(EXPENSES_STORE);
        console.log("Despesas carregadas:", allExpenses);
    } catch (error) {
        console.error("Erro ao carregar despesas:", error);
        showMessageModal("Erro", "Não foi possível carregar as despesas. Tente novamente.");
    }
}

async function loadBudget() {
    try {
        const budgets = await getData(BUDGET_STORE);
        currentBudget = budgets.length > 0 ? budgets[0] : null;
        console.log("Orçamento carregado:", currentBudget);
        renderBudget();
    } catch (error) {
        console.error("Erro ao carregar orçamento:", error);
        showMessageModal("Erro", "Não foi possível carregar o orçamento. Tente novamente.");
    }
}

function renderExpenses(expenses) {
    expenseList.innerHTML = '';
    expenses.forEach(expense => {
        const li = document.createElement('li');
        li.className = 'flex items-center justify-between p-4 bg-gray-50 rounded-lg shadow-sm mb-2';
        li.innerHTML = `
            <div class="flex-1">
                <span class="font-semibold text-gray-800">${expense.description}</span>
                <span class="block text-sm text-gray-500">${new Date(expense.date).toLocaleDateString()}</span>
                <span class="block text-xs font-medium text-gray-600 rounded-full px-2 py-1 mt-1 bg-gray-200 inline-block">${expense.category}</span>
            </div>
            <div class="flex items-center space-x-2">
                <span class="text-lg font-bold text-red-600">R$ ${parseFloat(expense.amount).toFixed(2)}</span>
                <button onclick="editExpense(${expense.id})" class="text-blue-500 hover:text-blue-700 p-2">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zm-5.042 5.042l-2.828 2.828-.793-.793 2.828-2.828.793.793zm-.793.793l-.793.793 4.243 4.243 2.828-2.828-4.243-4.243z" />
                    </svg>
                </button>
                <button onclick="deleteExpense(${expense.id})" class="text-red-500 hover:text-red-700 p-2">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                    </svg>
                </button>
            </div>
        `;
        expenseList.appendChild(li);
    });
}

function updateSummary() {
    const totalExpenses = allExpenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
    totalExpensesEl.textContent = `R$ ${totalExpenses.toFixed(2)}`;

    if (currentBudget) {
        const remaining = currentBudget.amount - totalExpenses;
        remainingBudgetEl.textContent = `R$ ${remaining.toFixed(2)}`;
        remainingBudgetEl.className = `font-bold ${remaining >= 0 ? 'text-green-600' : 'text-red-600'}`;
        remainingBudgetTextEl.textContent = `Orçamento Restante`;
        updateBudgetChart(totalExpenses, remaining);
    } else {
        remainingBudgetEl.textContent = `R$ 0.00`;
        remainingBudgetEl.className = 'font-bold text-gray-500';
        remainingBudgetTextEl.textContent = `(Sem Orçamento)`;
        updateBudgetChart(totalExpenses, 0);
    }
}

function renderBudget() {
    if (currentBudget) {
        totalBudgetEl.textContent = `R$ ${currentBudget.amount.toFixed(2)}`;
        totalExpensesTextEl.textContent = `Total de Despesas`;
        budgetStatus.classList.remove('hidden');
        budgetTimelineEl.textContent = `${new Date(currentBudget.startDate).toLocaleDateString()} - ${new Date(currentBudget.endDate).toLocaleDateString()}`;
    } else {
        totalBudgetEl.textContent = 'R$ 0.00';
        totalExpensesTextEl.textContent = 'Total de Despesas';
        budgetStatus.classList.add('hidden');
        budgetTimelineEl.textContent = '';
    }
}

function updateBudgetChart(totalExpenses, remaining) {
    if (budgetChart) {
        budgetChart.destroy();
    }

    const ctx = document.getElementById('budget-chart').getContext('2d');
    budgetChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Despesas', 'Restante'],
            datasets: [{
                data: [totalExpenses, Math.max(0, remaining)],
                backgroundColor: ['#ef4444', '#10b981'],
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        font: {
                            family: 'Inter',
                            size: 14
                        }
                    }
                }
            }
        }
    });
}

function filterAndRenderExpenses() {
    const selectedCategory = categoryFilter.value;
    const filteredExpenses = selectedCategory === 'all'
        ? allExpenses
        : allExpenses.filter(expense => expense.category === selectedCategory);
    renderExpenses(filteredExpenses);
}

// --- Funções de Evento e Lógica de UI ---
function showMessageModal(title, message) {
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    messageModal.classList.remove('hidden');
}

function hideMessageModal() {
    messageModal.classList.add('hidden');
}

function showLoading(message) {
    loadingMessage.textContent = message;
    loadingOverlay.classList.remove('hidden');
}

function hideLoading() {
    loadingOverlay.classList.add('hidden');
}

async function addExpense(event) {
    event.preventDefault();
    const newExpense = {
        description: document.getElementById('expense-description').value,
        amount: parseFloat(document.getElementById('expense-amount').value),
        category: document.getElementById('expense-category').value,
        date: document.getElementById('expense-date').value
    };

    if (isNaN(newExpense.amount) || newExpense.amount <= 0) {
        showMessageModal("Erro de Entrada", "Por favor, insira um valor de despesa válido.");
        return;
    }

    try {
        await addData(EXPENSES_STORE, newExpense);
        await loadExpenses();
        filterAndRenderExpenses();
        updateSummary();
        newExpenseModal.classList.add('hidden');
        expenseForm.reset();
    } catch (error) {
        showMessageModal("Erro ao Adicionar", "Ocorreu um erro ao adicionar a despesa.");
        console.error("Erro ao adicionar despesa:", error);
    }
}

async function deleteExpense(id) {
    if (!confirm("Tem certeza que deseja excluir esta despesa?")) {
        return;
    }
    try {
        await deleteData(EXPENSES_STORE, id);
        await loadExpenses();
        filterAndRenderExpenses();
        updateSummary();
    } catch (error) {
        showMessageModal("Erro ao Excluir", "Não foi possível excluir a despesa.");
        console.error("Erro ao excluir despesa:", error);
    }
}

async function editExpense(id) {
    const expenseToEdit = allExpenses.find(e => e.id === id);
    if (!expenseToEdit) {
        showMessageModal("Erro", "Despesa não encontrada.");
        return;
    }
    const newDescription = prompt("Editar descrição:", expenseToEdit.description);
    const newAmount = prompt("Editar valor:", expenseToEdit.amount);

    if (newDescription !== null && newAmount !== null) {
        const updatedExpense = {
            ...expenseToEdit,
            description: newDescription,
            amount: parseFloat(newAmount)
        };
        try {
            await updateData(EXPENSES_STORE, updatedExpense);
            await loadExpenses();
            filterAndRenderExpenses();
            updateSummary();
        } catch (error) {
            showMessageModal("Erro ao Atualizar", "Não foi possível atualizar a despesa.");
            console.error("Erro ao atualizar despesa:", error);
        }
    }
}

async function addBudget(event) {
    event.preventDefault();
    const newBudget = {
        amount: parseFloat(budgetAmountInput.value),
        startDate: budgetStartDateInput.value,
        endDate: budgetEndDateInput.value
    };

    if (isNaN(newBudget.amount) || newBudget.amount <= 0) {
        showMessageModal("Erro de Entrada", "Por favor, insira um valor de orçamento válido.");
        return;
    }

    try {
        if (currentBudget) {
            await updateData(BUDGET_STORE, { ...currentBudget, ...newBudget });
        } else {
            await addData(BUDGET_STORE, newBudget);
        }
        await loadBudget();
        updateSummary();
        budgetModal.classList.add('hidden');
        budgetForm.reset();
    } catch (error) {
        showMessageModal("Erro ao Salvar", "Não foi possível salvar o orçamento.");
        console.error("Erro ao salvar orçamento:", error);
    }
}

// --- Funções para Exportação de PDF ---
async function exportToPdf() {
    showLoading("Gerando PDF...");
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Título e resumo
        doc.setFontSize(22);
        doc.text("Relatório de Gestão de Obra", 14, 20);

        doc.setFontSize(14);
        doc.text(`Orçamento Total: R$ ${currentBudget ? currentBudget.amount.toFixed(2) : '0.00'}`, 14, 30);
        doc.text(`Total de Despesas: R$ ${allExpenses.reduce((sum, e) => sum + e.amount, 0).toFixed(2)}`, 14, 38);
        doc.text(`Orçamento Restante: R$ ${currentBudget ? (currentBudget.amount - allExpenses.reduce((sum, e) => sum + e.amount, 0)).toFixed(2) : '0.00'}`, 14, 46);

        // Tabela de despesas
        const tableData = allExpenses.map(exp => [
            new Date(exp.date).toLocaleDateString(),
            exp.description,
            exp.category,
            `R$ ${exp.amount.toFixed(2)}`
        ]);
        doc.autoTable({
            startY: 60,
            head: [['Data', 'Descrição', 'Categoria', 'Valor']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: '#10b981' }
        });

        // Gráfico (como imagem)
        const canvas = document.getElementById('budget-chart');
        if (canvas) {
            const chartDataUrl = canvas.toDataURL('image/png', 1.0);
            const chartImageWidth = 100;
            const chartImageHeight = canvas.height * chartImageWidth / canvas.width;
            const chartX = (doc.internal.pageSize.width - chartImageWidth) / 2;
            doc.addImage(chartDataUrl, 'PNG', chartX, doc.autoTable.previous.finalY + 10, chartImageWidth, chartImageHeight);
        }

        // Salvar o PDF
        doc.save('relatorio_obra.pdf');
    } catch (error) {
        showMessageModal("Erro ao Gerar PDF", "Ocorreu um erro ao gerar o PDF. Detalhes: " + error.message);
        console.error("Erro ao gerar PDF:", error);
    } finally {
        hideLoading();
    }
}


// --- Event Listeners e Inicialização ---
document.addEventListener('DOMContentLoaded', () => {
    // Adiciona o event listener para o formulário de despesas
    expenseForm.addEventListener('submit', addExpense);

    // Adiciona o event listener para o formulário de orçamento
    budgetForm.addEventListener('submit', addBudget);

    // Botoes e modais
    newExpenseBtn.addEventListener('click', () => newExpenseModal.classList.remove('hidden'));
    closeExpenseModal.addEventListener('click', () => newExpenseModal.classList.add('hidden'));
    addBudgetBtn.addEventListener('click', () => budgetModal.classList.remove('hidden'));
    closeBudgetModal.addEventListener('click', () => budgetModal.classList.add('hidden'));
    closeModalBtn.addEventListener('click', hideMessageModal);

    // Filtro de categoria
    categoryFilter.addEventListener('change', filterAndRenderExpenses);

    // Exportar para PDF
    exportPdfBtn.addEventListener('click', exportToPdf);

    // Inicialização da aplicação
    async function initApp() {
        showLoading("Carregando dados...");
        try {
            await openDb();
            await loadExpenses();
            await loadBudget();
            filterAndRenderExpenses();
            updateSummary();
            mainContainer.classList.remove('hidden');
        } catch (error) {
            showMessageModal("Erro de Carregamento", "Ocorreu um erro ao carregar os dados. Tente recarregar a página. Detalhes: " + error.message);
        } finally {
            hideLoading();
        }
    }

    initApp();
});
