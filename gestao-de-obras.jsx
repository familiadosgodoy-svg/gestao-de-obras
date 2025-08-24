import { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    signInWithCustomToken, 
    onAuthStateChanged, 
    signInAnonymously,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut
} from 'firebase/auth';
import { 
    getFirestore, 
    doc, 
    setDoc, 
    onSnapshot, 
    collection, 
    query, 
    addDoc, 
    deleteDoc,
    getDocs,
    where
} from 'firebase/firestore';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

// The main App component
const App = () => {
    // --- Authentication and Project State ---
    const [user, setUser] = useState(null);
    const [userId, setUserId] = useState(null);
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentProject, setCurrentProject] = useState(null);
    const [projects, setProjects] = useState([]);

    // --- Data and UI State ---
    const [expenses, setExpenses] = useState([]);
    const [budget, setBudget] = useState({ value: 0, startDate: null });
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [showBudgetModal, setShowBudgetModal] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showInfoModal, setShowInfoModal] = useState(false);
    const [infoModalContent, setInfoModalContent] = useState({ title: '', message: '' });
    const [confirmModalAction, setConfirmModalAction] = useState(null);
    const [editingExpense, setEditingExpense] = useState(null);
    
    // --- Forms State ---
    const [expenseForm, setExpenseForm] = useState({
        date: '',
        category: '',
        value: '',
        description: '',
        paymentMethod: ''
    });
    const [budgetForm, setBudgetForm] = useState({
        value: 0,
        startDate: ''
    });
    const [filter, setFilter] = useState({
        search: '',
        category: 'all'
    });
    const [loginForm, setLoginForm] = useState({ email: '', password: '' });
    const [registerForm, setRegisterForm] = useState({ email: '', password: '' });
    const [isRegisterMode, setIsRegisterMode] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');

    // --- Firebase Initialization & Authentication ---
    useEffect(() => {
        const initializeFirebase = async () => {
            try {
                const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
                const app = initializeApp(firebaseConfig);
                const firestoreDb = getFirestore(app);
                const firebaseAuth = getAuth(app);
                
                setDb(firestoreDb);
                setAuth(firebaseAuth);

                // This is the primary authentication listener. It runs when the auth state changes.
                onAuthStateChanged(firebaseAuth, async (currentUser) => {
                    if (currentUser) {
                        setUser(currentUser);
                        setUserId(currentUser.uid);
                    } else {
                        // Sign in anonymously if no user is authenticated
                        const anonymousUser = await signInAnonymously(firebaseAuth);
                        setUser(anonymousUser.user);
                        setUserId(anonymousUser.user.uid);
                    }
                    setLoading(false);
                });

                // Sign in with the custom token if available (for Canvas environment)
                if (typeof __initial_auth_token !== 'undefined') {
                    await signInWithCustomToken(firebaseAuth, __initial_auth_token);
                }
            } catch (error) {
                console.error("Erro ao inicializar Firebase:", error);
                showInfo('Erro', `Não foi possível conectar ao banco de dados: ${error.message}`);
                setLoading(false);
            }
        };
        initializeFirebase();
    }, []);

    // Effect to fetch user's projects when the user object changes
    useEffect(() => {
        if (user && db) {
            const projectsRef = collection(db, "artifacts", typeof __app_id !== 'undefined' ? __app_id : 'default-app-id', "users", user.uid, "projects");
            const unsubscribe = onSnapshot(projectsRef, (snapshot) => {
                const fetchedProjects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setProjects(fetchedProjects);
                // If a project is currently selected, find its updated data
                if (currentProject) {
                    const updatedProject = fetchedProjects.find(p => p.id === currentProject.id);
                    if (updatedProject) {
                        setCurrentProject(updatedProject);
                    } else {
                        // Project was deleted, go back to project selection
                        setCurrentProject(null);
                    }
                }
            }, (error) => {
                console.error("Erro ao ler projetos:", error);
                showInfo('Erro', 'Não foi possível carregar a lista de projetos.');
            });

            return () => unsubscribe();
        }
    }, [user, db, currentProject]);

    // Effect to listen for real-time updates for the current project
    useEffect(() => {
        if (currentProject && db && userId) {
            setLoading(true);
            const projectPath = `artifacts/${typeof __app_id !== 'undefined' ? __app_id : 'default-app-id'}/users/${userId}/projects/${currentProject.id}`;

            // Listen for budget changes
            const budgetRef = doc(db, `${projectPath}/budget/budgetId`);
            const unsubscribeBudget = onSnapshot(budgetRef, (docSnap) => {
                if (docSnap.exists()) {
                    setBudget(docSnap.data());
                } else {
                    setBudget({ value: 0, startDate: null });
                }
            }, (error) => {
                console.error("Erro ao ler o orçamento:", error);
                showInfo('Erro', 'Não foi possível carregar o orçamento.');
            });
            
            // Listen for expenses changes
            const expensesRef = collection(db, `${projectPath}/expenses`);
            const unsubscribeExpenses = onSnapshot(expensesRef, (snapshot) => {
                const fetchedExpenses = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setExpenses(fetchedExpenses);
                setLoading(false);
            }, (error) => {
                console.error("Erro ao ler as despesas:", error);
                showInfo('Erro', 'Não foi possível carregar as despesas.');
                setLoading(false);
            });
            
            return () => {
                unsubscribeBudget();
                unsubscribeExpenses();
            };
        }
    }, [currentProject, db, userId]);

    // --- Helper & Utility Functions ---
    const showInfo = (title, message) => {
        setInfoModalContent({ title, message });
        setShowInfoModal(true);
    };

    const showConfirm = (message, onConfirm) => {
        setInfoModalContent({ title: 'Confirmação', message });
        setConfirmModalAction(() => onConfirm);
        setShowConfirmModal(true);
    };
    
    const mapCategory = (category) => {
        const mappedLabel = {
            'material': 'Materiais',
            'mao-de-obra': 'Mão de Obra',
            'equipamento': 'Equipamentos',
            'servico': 'Serviços',
            'outros': 'Outros'
        };
        return mappedLabel[category] || category;
    };
    
    // --- Data Calculation ---
    const totalActual = expenses.reduce((sum, expense) => sum + expense.value, 0);
    const balance = budget.value - totalActual;
    const progressPercentage = budget.value > 0 ? (totalActual / budget.value) * 100 : 0;
    
    const getCategoryData = () => {
        const categoryTotals = expenses.reduce((totals, expense) => {
            const category = expense.category;
            totals[category] = (totals[category] || 0) + expense.value;
            return totals;
        }, {});
        
        const labels = Object.keys(categoryTotals).map(mapCategory);
        const data = Object.values(categoryTotals);
        const backgroundColors = {
            'material': '#f59e0b',
            'mao-de-obra': '#10b981',
            'equipamento': '#f97316',
            'servico': '#3b82f6',
            'outros': '#6b7280',
        };
        const colors = Object.keys(categoryTotals).map(label => backgroundColors[label]);
        
        return {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderColor: '#ffffff',
                borderWidth: 2,
            }]
        };
    };

    // --- Handlers for Authentication & Project Management ---
    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await signInWithEmailAndPassword(auth, loginForm.email, loginForm.password);
            showInfo('Sucesso', 'Login realizado com sucesso!');
        } catch (error) {
            console.error("Erro no login:", error);
            showInfo('Erro de Login', 'Email ou senha incorretos.');
        } finally {
            setLoading(false);
        }
    };
    
    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await createUserWithEmailAndPassword(auth, registerForm.email, registerForm.password);
            showInfo('Sucesso', 'Usuário criado com sucesso! Faça login para continuar.');
            setIsRegisterMode(false);
        } catch (error) {
            console.error("Erro no registro:", error);
            showInfo('Erro de Registro', 'Ocorreu um erro ao criar a conta. Por favor, tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await signOut(auth);
        setCurrentProject(null);
        setExpenses([]);
        setBudget({ value: 0, startDate: null });
        showInfo('Desconectado', 'Você saiu da sua conta.');
    };
    
    const handleCreateProject = async (e) => {
        e.preventDefault();
        if (!newProjectName.trim()) {
            showInfo('Erro', 'O nome do projeto não pode ser vazio.');
            return;
        }
        setLoading(true);
        try {
            const projectsRef = collection(db, "artifacts", typeof __app_id !== 'undefined' ? __app_id : 'default-app-id', "users", user.uid, "projects");
            const newProjectDoc = await addDoc(projectsRef, {
                name: newProjectName,
                createdAt: new Date().toISOString()
            });
            setCurrentProject({ id: newProjectDoc.id, name: newProjectName });
            setNewProjectName('');
            showInfo('Sucesso', `Projeto "${newProjectName}" criado com sucesso!`);
        } catch (error) {
            console.error("Erro ao criar projeto:", error);
            showInfo('Erro', 'Não foi possível criar o projeto.');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteProject = (projectId, projectName) => {
        showConfirm(`Tem certeza que deseja excluir o projeto "${projectName}" e todos os seus dados?`, async () => {
            setLoading(true);
            try {
                const projectDocRef = doc(db, "artifacts", typeof __app_id !== 'undefined' ? __app_id : 'default-app-id', "users", user.uid, "projects", projectId);
                
                // Delete subcollections (expenses and budget)
                const expensesRef = collection(projectDocRef, "expenses");
                const existingExpenses = await getDocs(expensesRef);
                const deleteExpensesPromises = existingExpenses.docs.map(d => deleteDoc(d.ref));
                await Promise.all(deleteExpensesPromises);
                
                const budgetRef = doc(projectDocRef, "budget", "budgetId");
                await deleteDoc(budgetRef);
                
                // Finally, delete the project document itself
                await deleteDoc(projectDocRef);
                
                setCurrentProject(null); // Go back to project selection
                showInfo('Sucesso', `Projeto "${projectName}" e todos os seus dados foram excluídos permanentemente.`);
            } catch (error) {
                console.error("Erro ao excluir projeto:", error);
                showInfo('Erro', `Não foi possível excluir o projeto. Detalhes: ${error.message}`);
            } finally {
                setLoading(false);
            }
        });
    };

    // --- Handlers for Forms and Actions (Updated to use currentProject.id) ---
    const handleExpenseSubmit = async (e) => {
        e.preventDefault();
        
        let description = '';
        if (expenseForm.category === 'material') {
            const materialName = document.getElementById('materialName').value;
            const materialUnit = document.getElementById('materialUnit').value;
            const materialQuantity = document.getElementById('materialQuantity').value;
            description = `${materialQuantity} ${materialUnit} de ${materialName}`;
        } else if (expenseForm.category === 'mao-de-obra') {
            description = document.getElementById('manpowerName').value;
        } else if (expenseForm.category === 'equipamento') {
            const equipmentChoice = document.getElementById('equipmentSelect').value;
            if (equipmentChoice === 'outros') {
                description = document.getElementById('otherEquipmentName').value;
            } else {
                description = equipmentChoice;
            }
        } else if (expenseForm.category === 'servico' || expenseForm.category === 'outros') {
            description = document.getElementById('otherDescription').value;
        }
        
        const newExpenseData = {
            date: expenseForm.date,
            category: expenseForm.category,
            description: description,
            value: parseFloat(expenseForm.value),
            paymentMethod: expenseForm.paymentMethod
        };
        
        try {
            const expensesRef = collection(db, "artifacts", typeof __app_id !== 'undefined' ? __app_id : 'default-app-id', "users", userId, "projects", currentProject.id, "expenses");
            if (editingExpense) {
                await setDoc(doc(expensesRef, editingExpense.id), newExpenseData);
                setEditingExpense(null);
            } else {
                await addDoc(expensesRef, newExpenseData);
            }
            setShowExpenseModal(false);
            setExpenseForm({ date: '', category: '', value: '', description: '', paymentMethod: '' });
            showInfo('Sucesso', 'Despesa salva com sucesso!');
        } catch (error) {
            console.error("Erro ao salvar despesa:", error);
            showInfo('Erro', 'Não foi possível salvar a despesa.');
        }
    };
    
    const handleBudgetSubmit = async (e) => {
        e.preventDefault();
        
        try {
            const newBudgetValue = parseFloat(budgetForm.value);
            const newStartDate = budgetForm.startDate;
            
            if (isNaN(newBudgetValue) || newBudgetValue <= 0) {
                showInfo('Erro de Orçamento', 'Por favor, insira um valor de orçamento válido e positivo.');
                return;
            }
            
            const budgetRef = doc(db, "artifacts", typeof __app_id !== 'undefined' ? __app_id : 'default-app-id', "users", userId, "projects", currentProject.id, "budget", "budgetId");
            await setDoc(budgetRef, { value: newBudgetValue, startDate: newStartDate });
            setShowBudgetModal(false);
            showInfo('Sucesso', 'Orçamento e data de início definidos com sucesso!');
        } catch (error) {
            console.error("Erro ao salvar orçamento:", error);
            showInfo('Erro', 'Não foi possível salvar o orçamento.');
        }
    };
    
    const handleEditExpense = (expense) => {
        setEditingExpense(expense);
        setExpenseForm({
            date: expense.date,
            category: expense.category,
            value: expense.value,
            paymentMethod: expense.paymentMethod
        });
        setShowExpenseModal(true);
    };
    
    const handleDeleteExpense = (id) => {
        showConfirm('Tem certeza que deseja excluir esta despesa?', async () => {
            try {
                const expensesRef = collection(db, "artifacts", typeof __app_id !== 'undefined' ? __app_id : 'default-app-id', "users", userId, "projects", currentProject.id, "expenses");
                await deleteDoc(doc(expensesRef, id));
                showInfo('Sucesso', 'Despesa excluída com sucesso!');
            } catch (error) {
                console.error("Erro ao excluir despesa:", error);
                showInfo('Erro', 'Não foi possível excluir a despesa.');
            }
        });
    };
    
    // --- Filtered and Sorted Expenses ---
    const filteredExpenses = expenses
        .filter(exp => {
            const matchesSearch = exp.description.toLowerCase().includes(filter.search.toLowerCase());
            const matchesCategory = filter.category === 'all' || exp.category === filter.category;
            return matchesSearch && matchesCategory;
        })
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    // --- Components & Modals ---
    const LoadingOverlay = () => (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white bg-opacity-80">
            <p className="text-xl font-semibold text-indigo-600">Carregando...</p>
        </div>
    );
    
    const InfoModal = ({ title, message, onClose }) => (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900 bg-opacity-50">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
                <h3 className="text-2xl font-bold text-gray-800 mb-4">{title}</h3>
                <p className="text-gray-600 mb-6">{message}</p>
                <button
                    onClick={onClose}
                    className="w-full py-2 font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-full transition-colors"
                >
                    OK
                </button>
            </div>
        </div>
    );

    const ConfirmModal = ({ message, onConfirm, onCancel }) => (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900 bg-opacity-50">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
                <h3 className="text-2xl font-bold text-gray-800 mb-4">Confirmação</h3>
                <p className="text-gray-600 mb-6">{message}</p>
                <div className="flex justify-around space-x-4">
                    <button
                        onClick={onConfirm}
                        className="w-1/2 py-2 font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-full transition-colors"
                    >
                        Sim
                    </button>
                    <button
                        onClick={onCancel}
                        className="w-1/2 py-2 font-semibold bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-full transition-colors"
                    >
                        Não
                    </button>
                </div>
            </div>
        </div>
    );
    
    const BudgetModal = ({ onClose }) => (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900 bg-opacity-50">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Definir Orçamento</h2>
                <form onSubmit={handleBudgetSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="budgetValue" className="block text-sm font-medium text-gray-700 mb-1">Valor do Orçamento (R$)</label>
                        <input
                            type="number"
                            id="budgetValue"
                            step="0.01"
                            min="0"
                            placeholder="Ex: 50000.00"
                            required
                            className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
                            value={budgetForm.value}
                            onChange={(e) => setBudgetForm({ ...budgetForm, value: e.target.value })}
                        />
                    </div>
                    <div>
                        <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">Data de Início da Obra</label>
                        <input
                            type="date"
                            id="startDate"
                            className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
                            value={budgetForm.startDate || ''}
                            onChange={(e) => setBudgetForm({ ...budgetForm, startDate: e.target.value })}
                        />
                    </div>
                    <div className="pt-4">
                        <button
                            type="submit"
                            className="w-full py-3 text-lg font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-full transition-colors"
                        >
                            Salvar Orçamento
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );

    const ExpenseModal = ({ onClose }) => {
        const [materialFields, setMaterialFields] = useState(false);
        const [manpowerFields, setManpowerFields] = useState(false);
        const [equipmentFields, setEquipmentFields] = useState(false);
        const [otherServicesFields, setOtherServicesFields] = useState(false);
        const [otherEquipmentName, setOtherEquipmentName] = useState('');
        
        const handleCategoryChange = (e) => {
            const category = e.target.value;
            setExpenseForm(prev => ({ ...prev, category: category }));
            
            setMaterialFields(category === 'material');
            setManpowerFields(category === 'mao-de-obra');
            setEquipmentFields(category === 'equipamento');
            setOtherServicesFields(category === 'servico' || category === 'outros');
        };

        const updateMaterialTotal = () => {
             const quantity = parseFloat(document.getElementById('materialQuantity').value) || 0;
             const price = parseFloat(document.getElementById('materialPrice').value) || 0;
             const total = quantity * price;
             setExpenseForm(prev => ({ ...prev, value: total.toFixed(2) }));
        };

        useEffect(() => {
            if (editingExpense) {
                setExpenseForm({
                    date: editingExpense.date,
                    category: editingExpense.category,
                    value: editingExpense.value,
                    paymentMethod: editingExpense.paymentMethod,
                });
                handleCategoryChange({ target: { value: editingExpense.category } });
            }
        }, [editingExpense]);

        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900 bg-opacity-50">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-gray-800">{editingExpense ? 'Editar Despesa' : 'Registrar Despesa'}</h2>
                        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    <form onSubmit={handleExpenseSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="expenseDate" className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                            <input
                                type="date"
                                id="expenseDate"
                                required
                                className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
                                value={expenseForm.date}
                                onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                            />
                        </div>
                        <div>
                            <label htmlFor="expenseCategory" className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                            <select
                                id="expenseCategory"
                                required
                                className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
                                value={expenseForm.category}
                                onChange={handleCategoryChange}
                            >
                                <option value="">Selecione a categoria</option>
                                <option value="material">Material</option>
                                <option value="mao-de-obra">Mão de Obra</option>
                                <option value="equipamento">Equipamento</option>
                                <option value="servico">Serviço</option>
                                <option value="outros">Outros</option>
                            </select>
                        </div>
                        
                        {materialFields && (
                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="materialName" className="block text-sm font-medium text-gray-700 mb-1">Descrição do Material</label>
                                    <input type="text" id="materialName" placeholder="Ex: Saco de Cimento" required className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:ring-indigo-500 focus:border-indigo-500" />
                                </div>
                                <div>
                                    <label htmlFor="materialUnit" className="block text-sm font-medium text-gray-700 mb-1">Unidade de Medida</label>
                                    <select id="materialUnit" required className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:ring-indigo-500 focus:border-indigo-500">
                                        <option value="">Selecione a unidade</option>
                                        <option value="metro">Metro (m)</option>
                                        <option value="m2">Metro Quadrado (m²)</option>
                                        <option value="m3">Metro Cúbico (m³)</option>
                                        <option value="saco-50kg">Saco 50kg</option>
                                        <option value="saco-20kg">Saco 20Kg</option>
                                        <option value="lata-18l">Lata 18 litros</option>
                                        <option value="lata-3.6l">Lata 3,6 litros</option>
                                        <option value="lata-900ml">Lata 900ml</option>
                                        <option value="caminhao">Caminhão</option>
                                        <option value="milheiro">Milheiro</option>
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="materialQuantity" className="block text-sm font-medium text-gray-700 mb-1">Quantidade</label>
                                    <input type="number" id="materialQuantity" step="0.01" min="0" placeholder="0.00" required className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:ring-indigo-500 focus:border-indigo-500" onChange={updateMaterialTotal} />
                                </div>
                                <div>
                                    <label htmlFor="materialPrice" className="block text-sm font-medium text-gray-700 mb-1">Preço Unitário (R$)</label>
                                    <input type="number" id="materialPrice" step="0.01" min="0" placeholder="0.00" required className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:ring-indigo-500 focus:border-indigo-500" onChange={updateMaterialTotal} />
                                </div>
                            </div>
                        )}

                        {manpowerFields && (
                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="manpowerName" className="block text-sm font-medium text-gray-700 mb-1">Nome do Profissional</label>
                                    <input type="text" id="manpowerName" placeholder="Ex: Pedreiro João" required className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:ring-indigo-500 focus:border-indigo-500" />
                                </div>
                            </div>
                        )}

                        {equipmentFields && (
                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="equipmentSelect" className="block text-sm font-medium text-gray-700 mb-1">Selecione o Equipamento</label>
                                    <select id="equipmentSelect" required className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:ring-indigo-500 focus:border-indigo-500">
                                        <option value="">Selecione o equipamento</option>
                                        <option value="andaime">Andaime</option>
                                        <option value="betoneira">Betoneira</option>
                                        <option value="furadeira">Furadeira</option>
                                        <option value="britadeira">Britadeira</option>
                                        <option value="outros">Outros</option>
                                    </select>
                                </div>
                                {document.getElementById('equipmentSelect')?.value === 'outros' && (
                                    <div className="space-y-4">
                                        <label htmlFor="otherEquipmentName" className="block text-sm font-medium text-gray-700 mb-1">Nome do Outro Equipamento</label>
                                        <input type="text" id="otherEquipmentName" placeholder="Digite o nome do equipamento" required className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:ring-indigo-500 focus:border-indigo-500" />
                                    </div>
                                )}
                            </div>
                        )}

                        {otherServicesFields && (
                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="otherDescription" className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                                    <input type="text" id="otherDescription" placeholder="Descreva o gasto" required className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:ring-indigo-500 focus:border-indigo-500" />
                                </div>
                            </div>
                        )}

                        <div>
                            <label htmlFor="expenseValue" className="block text-sm font-medium text-gray-700 mb-1">Valor Total (R$)</label>
                            <input
                                type="number"
                                id="expenseValue"
                                step="0.01"
                                min="0"
                                required
                                readOnly={expenseForm.category === 'material'}
                                className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
                                value={expenseForm.value}
                                onChange={(e) => setExpenseForm({ ...expenseForm, value: e.target.value })}
                            />
                        </div>
                        <div>
                            <label htmlFor="expensePaymentMethod" className="block text-sm font-medium text-gray-700 mb-1">Forma de Pagamento</label>
                            <select
                                id="expensePaymentMethod"
                                required
                                className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
                                value={expenseForm.paymentMethod}
                                onChange={(e) => setExpenseForm({ ...expenseForm, paymentMethod: e.target.value })}
                            >
                                <option value="">Selecione a forma de pagamento</option>
                                <option value="dinheiro">Dinheiro</option>
                                <option value="pix">PIX</option>
                                <option value="cartao">Cartão</option>
                                <option value="transferencia">Transferência</option>
                            </select>
                        </div>
                        <div className="pt-4">
                            <button
                                type="submit"
                                className="w-full py-3 text-lg font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-full transition-colors"
                            >
                                {editingExpense ? 'Salvar Alterações' : 'Registrar Gasto'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    };

    // --- Main App Render ---
    const renderContent = () => {
        if (loading) {
            return <LoadingOverlay />;
        }

        // Render Login/Register screen if not logged in
        if (!user || user.isAnonymous) {
            return (
                <div className="p-4 md:p-8 font-['Inter'] min-h-screen bg-gray-100 flex flex-col items-center justify-center">
                    <div className="bg-white p-8 rounded-3xl shadow-lg w-full max-w-sm text-center">
                        <h1 className="text-3xl font-bold text-gray-800 mb-6">
                            Gestão de Obra
                        </h1>
                        <p className="text-sm text-gray-500 mb-6">
                            {isRegisterMode ? 'Crie uma conta para começar a gerenciar seus projetos.' : 'Faça login para continuar.'}
                        </p>
                        <form onSubmit={isRegisterMode ? handleRegister : handleLogin} className="space-y-4">
                            <div>
                                <input
                                    type="email"
                                    placeholder="Email"
                                    required
                                    className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
                                    value={isRegisterMode ? registerForm.email : loginForm.email}
                                    onChange={(e) => isRegisterMode ? setRegisterForm({ ...registerForm, email: e.target.value }) : setLoginForm({ ...loginForm, email: e.target.value })}
                                />
                            </div>
                            <div>
                                <input
                                    type="password"
                                    placeholder="Senha"
                                    required
                                    className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
                                    value={isRegisterMode ? registerForm.password : loginForm.password}
                                    onChange={(e) => isRegisterMode ? setRegisterForm({ ...registerForm, password: e.target.value }) : setLoginForm({ ...loginForm, password: e.target.value })}
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full py-3 text-lg font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-full transition-colors"
                            >
                                {isRegisterMode ? 'Registrar' : 'Entrar'}
                            </button>
                        </form>
                        <div className="mt-4">
                            <button
                                onClick={() => setIsRegisterMode(!isRegisterMode)}
                                className="text-sm text-indigo-600 hover:underline"
                            >
                                {isRegisterMode ? 'Já tem uma conta? Entrar' : 'Não tem uma conta? Registrar'}
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        // Render Project selection screen if logged in but no project selected
        if (!currentProject) {
            return (
                <div className="p-4 md:p-8 font-['Inter'] min-h-screen bg-gray-100 flex flex-col items-center">
                    <div className="container mx-auto">
                        <header className="flex justify-between items-center mb-8">
                            <h1 className="text-4xl md:text-5xl font-bold text-gray-800">
                                Meus Projetos
                            </h1>
                            <button onClick={handleLogout} className="py-2 px-4 font-semibold text-sm text-white bg-red-500 hover:bg-red-600 rounded-full transition-colors">
                                Sair
                            </button>
                        </header>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                            <div className="bg-white p-6 rounded-3xl shadow-lg flex flex-col items-center text-center">
                                <h3 className="text-xl font-semibold text-gray-700 mb-2">Criar Novo Projeto</h3>
                                <form onSubmit={handleCreateProject} className="w-full space-y-4">
                                    <input
                                        type="text"
                                        placeholder="Nome do novo projeto"
                                        required
                                        className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
                                        value={newProjectName}
                                        onChange={(e) => setNewProjectName(e.target.value)}
                                    />
                                    <button
                                        type="submit"
                                        className="w-full py-3 text-lg font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-full transition-colors"
                                    >
                                        Criar Projeto
                                    </button>
                                </form>
                            </div>
                            {projects.map(project => (
                                <div key={project.id} className="bg-white p-6 rounded-3xl shadow-lg flex flex-col justify-between transition-transform hover:scale-105">
                                    <div>
                                        <h3 className="text-xl font-semibold text-gray-800 mb-2">{project.name}</h3>
                                        <p className="text-gray-500 text-sm">Criado em: {new Date(project.createdAt).toLocaleDateString()}</p>
                                    </div>
                                    <div className="flex justify-end space-x-2 mt-4">
                                        <button onClick={() => setCurrentProject(project)} className="text-indigo-600 hover:text-indigo-800 font-semibold">
                                            Entrar
                                        </button>
                                        <button onClick={() => handleDeleteProject(project.id, project.name)} className="text-red-600 hover:text-red-800 font-semibold">
                                            Excluir
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            );
        }

        // Render main app screen
        return (
            <div className="p-4 md:p-8 font-['Inter'] min-h-screen bg-gray-100 flex flex-col items-center">
                {showInfoModal && (
                    <InfoModal
                        title={infoModalContent.title}
                        message={infoModalContent.message}
                        onClose={() => setShowInfoModal(false)}
                    />
                )}
                {showConfirmModal && (
                    <ConfirmModal
                        message={infoModalContent.message}
                        onConfirm={() => {
                            confirmModalAction();
                            setShowConfirmModal(false);
                        }}
                        onCancel={() => setShowConfirmModal(false)}
                    />
                )}
                {showExpenseModal && <ExpenseModal onClose={() => setShowExpenseModal(false)} />}
                {showBudgetModal && <BudgetModal onClose={() => setShowBudgetModal(false)} />}
                
                <div className="container mx-auto">
                    <header className="text-center mb-6">
                        <div className="flex justify-between items-center mb-4">
                            <button onClick={() => setCurrentProject(null)} className="py-2 px-4 font-semibold text-sm text-gray-700 bg-white hover:bg-gray-200 rounded-full shadow-md transition-colors">
                                {'< Voltar para Projetos'}
                            </button>
                            <button onClick={handleLogout} className="py-2 px-4 font-semibold text-sm text-white bg-red-500 hover:bg-red-600 rounded-full transition-colors">
                                Sair
                            </button>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-2">
                            {currentProject.name}
                        </h1>
                        <p className="text-lg text-gray-600">Gestão de Obra Simplificada</p>
                    </header>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6 mb-8">
                        <div
                            id="newExpenseCard"
                            className="bg-white p-6 rounded-3xl shadow-lg flex flex-col items-center text-center cursor-pointer transition-transform hover:scale-105"
                            onClick={() => { setEditingExpense(null); setExpenseForm({ date: '', category: '', value: '', description: '', paymentMethod: '' }); setShowExpenseModal(true); }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16 text-indigo-500 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                            <h3 className="text-xl font-semibold text-gray-700">Nova Despesa</h3>
                            <p className="text-gray-500 text-sm mt-1">Registrar um novo gasto.</p>
                        </div>
                        
                        <div
                            id="budgetDisplayCard"
                            className="bg-white p-6 rounded-3xl shadow-lg flex flex-col justify-center cursor-pointer transition-transform hover:scale-105"
                            onClick={() => { setBudgetForm(budget); setShowBudgetModal(true); }}
                        >
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                                <div>
                                    <p className="text-gray-500 text-sm">Previsto</p>
                                    <p className="text-2xl font-bold text-green-600 mt-1">
                                        R$ {budget.value.toFixed(2).replace('.', ',')}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-gray-500 text-sm">Realizado</p>
                                    <p className="text-2xl font-bold text-red-600 mt-1">
                                        R$ {totalActual.toFixed(2).replace('.', ',')}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-gray-500 text-sm">Saldo</p>
                                    <p className={`text-2xl font-bold mt-1 ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        R$ {balance.toFixed(2).replace('.', ',')}
                                    </p>
                                </div>
                            </div>
                            <div className="mt-6 w-full bg-gray-200 rounded-full h-2.5">
                                <div
                                    className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500 ease-in-out"
                                    style={{ width: `${Math.min(100, progressPercentage)}%` }}
                                ></div>
                            </div>
                            <p className="text-sm text-center text-gray-500 mt-2">
                                {progressPercentage.toFixed(0)}% do orçamento usado
                            </p>
                        </div>
                    </div>

                    <div className="card bg-white p-6 rounded-3xl shadow-lg mb-8">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">Relatórios e Resumo</h2>
                        <h3 className="text-xl font-semibold mb-4 text-gray-700">Custos por Categoria</h3>
                        <div className="mb-4 flex justify-center">
                            <div className="w-[300px] h-[300px]">
                                {expenses.length > 0 ? (
                                    <Doughnut
                                        data={getCategoryData()}
                                        options={{
                                            responsive: true,
                                            plugins: {
                                                legend: { position: 'top' },
                                                tooltip: {
                                                    callbacks: {
                                                        label: (tooltipItem) => {
                                                            const value = tooltipItem.raw;
                                                            const label = tooltipItem.label;
                                                            return `${label}: R$ ${value.toFixed(2).replace('.', ',')}`;
                                                        }
                                                    }
                                                }
                                            }
                                        }}
                                    />
                                ) : (
                                    <p className="text-center text-gray-500 mt-20">Nenhuma despesa para exibir o gráfico.</p>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    <div className="card bg-white p-6 rounded-3xl shadow-lg">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">Últimas Despesas</h2>
                        <div className="flex flex-col md:flex-row gap-4 mb-4">
                            <div className="relative w-full md:w-2/3">
                                <input
                                    type="text"
                                    placeholder="Buscar por descrição..."
                                    className="w-full pl-10 px-4 py-2 rounded-xl border border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
                                    value={filter.search}
                                    onChange={(e) => setFilter({ ...filter, search: e.target.value })}
                                />
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5 text-gray-400">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                                    </svg>
                                </div>
                            </div>
                            <select
                                className="w-full md:w-1/3 px-4 py-2 rounded-xl border border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
                                value={filter.category}
                                onChange={(e) => setFilter({ ...filter, category: e.target.value })}
                            >
                                <option value="all">Filtrar por Categoria (Todos)</option>
                                <option value="material">Materiais</option>
                                <option value="mao-de-obra">Mão de Obra</option>
                                <option value="equipamento">Equipamentos</option>
                                <option value="servico">Serviços</option>
                                <option value="outros">Outros</option>
                            </select>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead>
                                    <tr className="bg-gray-50">
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descrição</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredExpenses.length > 0 ? (
                                        filteredExpenses.map(expense => (
                                            <tr key={expense.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {new Date(expense.date).toLocaleDateString('pt-BR')}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {expense.description}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {mapCategory(expense.category)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    R$ {expense.value.toFixed(2).replace('.', ',')}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                                    <button onClick={() => handleEditExpense(expense)} className="text-blue-600 hover:text-blue-900">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                        </svg>
                                                    </button>
                                                    <button onClick={() => handleDeleteExpense(expense.id)} className="text-red-600 hover:text-red-900">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.013 21H7.987a2 2 0 01-1.92-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500">
                                                {expenses.length === 0 ? 'Nenhuma despesa registrada ainda.' : 'Nenhum resultado encontrado.'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        
                        <footer className="mt-8 pt-4 border-t border-gray-200 text-center">
                            <p className="text-gray-500 text-xs">
                                ID do Usuário: <span className="font-mono break-all">{userId}</span>
                            </p>
                        </footer>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <>
            {renderContent()}
            {showInfoModal && (
                <InfoModal
                    title={infoModalContent.title}
                    message={infoModalContent.message}
                    onClose={() => setShowInfoModal(false)}
                />
            )}
        </>
    );
};

export default App;
