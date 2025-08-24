// Importações de bibliotecas e hooks do React
import { useState, useEffect } from 'react';
// Importações do Firebase SDK
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

// Importações de componentes Chart.js e React-Chartjs-2
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
// Importa o `html2canvas` para capturar a tela para o PDF
import html2canvas from 'html2canvas';
// Importa `jsPDF` e `jspdf-autotable` para a geração de PDF
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Registra os componentes necessários do Chart.js
ChartJS.register(ArcElement, Tooltip, Legend);

// Componente para um Modal de Mensagem
const InfoModal = ({ title, message, onClose }) => {
    return (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50 z-50 p-4">
            <div className="bg-white rounded-lg p-6 shadow-xl w-full max-w-sm text-center">
                <h4 className="text-lg font-bold mb-2">{title}</h4>
                <p className="text-gray-700 mb-4">{message}</p>
                <button onClick={onClose} className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition">OK</button>
            </div>
        </div>
    );
};

// Componente para um Modal de Confirmação
const ConfirmationModal = ({ message, onConfirm, onCancel }) => {
    return (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50 z-50 p-4">
            <div className="bg-white rounded-lg p-6 shadow-xl w-full max-w-sm text-center">
                <h4 className="text-lg font-bold mb-2">Confirmação</h4>
                <p className="text-gray-700 mb-4">{message}</p>
                <div className="flex justify-center space-x-4">
                    <button onClick={onConfirm} className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition">Excluir</button>
                    <button onClick={onCancel} className="bg-gray-300 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-400 transition">Cancelar</button>
                </div>
            </div>
        </div>
    );
};

// Componente Principal da Aplicação
const App = () => {
    // --- State: Autenticação e Projeto ---
    const [user, setUser] = useState(null);
    const [userId, setUserId] = useState(null);
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [loading, setLoading] = useState(true);
    
    const [currentProject, setCurrentProject] = useState(null);
    const [projects, setProjects] = useState([]);
    
    // --- State: Dados e UI ---
    const [expenses, setExpenses] = useState([]);
    const [budget, setBudget] = useState(null);
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [showBudgetModal, setShowBudgetModal] = useState(false);
    const [showInfoModal, setShowInfoModal] = useState(false);
    const [infoModalContent, setInfoModalContent] = useState({ title: '', message: '' });
    const [showConfirmationModal, setShowConfirmationModal] = useState(false);
    const [confirmationAction, setConfirmationAction] = useState(() => () => {});
    const [filter, setFilter] = useState('all');

    // Estado para controlar se a tela de registro deve ser mostrada
    const [showRegister, setShowRegister] = useState(false);

    // --- Efeitos e Inicialização do Firebase ---
    useEffect(() => {
        // Inicializa o Firebase e o listener de autenticação
        try {
            const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
            const app = initializeApp(firebaseConfig);
            const authInstance = getAuth(app);
            const dbInstance = getFirestore(app);
            setAuth(authInstance);
            setDb(dbInstance);

            // Listener de autenticação para gerenciar o estado do usuário
            const unsubscribe = onAuthStateChanged(authInstance, async (user) => {
                // Se o usuário existir, define o estado de usuário e ID
                if (user) {
                    setUser(user);
                    setUserId(user.uid);
                } else {
                    // Se não houver usuário, limpa o estado
                    setUser(null);
                    setUserId(null);
                }
                // Importante: Apenas desativa o carregamento após a verificação inicial do estado de autenticação
                setLoading(false);
            });

            // Clean-up do listener
            return () => unsubscribe();
        } catch (error) {
            console.error("Firebase initialization failed", error);
            setInfoModalContent({ title: "Erro de Inicialização", message: "Falha ao inicializar o Firebase. Tente recarregar a página." });
            setShowInfoModal(true);
            setLoading(false);
        }
    }, []);

    // Efeito para carregar os projetos do usuário
    useEffect(() => {
        if (!userId || !db) return;

        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        const projectsRef = collection(db, `artifacts/${appId}/users/${userId}/projects`);
        const projectsQuery = query(projectsRef);

        const unsubscribe = onSnapshot(projectsQuery, (snapshot) => {
            const projectsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setProjects(projectsList);
        }, (error) => {
            console.error("Error fetching projects:", error);
            setInfoModalContent({ title: "Erro de Dados", message: "Não foi possível carregar a lista de projetos." });
            setShowInfoModal(true);
        });

        return () => unsubscribe();
    }, [userId, db]);

    // Efeito para carregar despesas e orçamento de um projeto específico
    useEffect(() => {
        if (!currentProject || !userId || !db) {
            setExpenses([]);
            setBudget(null);
            return;
        }

        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        const expensesRef = collection(db, `artifacts/${appId}/users/${userId}/projects/${currentProject.id}/expenses`);
        const budgetRef = doc(db, `artifacts/${appId}/users/${userId}/projects/${currentProject.id}/budget/current`);
        
        // Listener para despesas
        const unsubscribeExpenses = onSnapshot(expensesRef, (snapshot) => {
            const expensesList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setExpenses(expensesList);
        }, (error) => {
            console.error("Error fetching expenses:", error);
            setInfoModalContent({ title: "Erro de Dados", message: "Não foi possível carregar as despesas deste projeto." });
            setShowInfoModal(true);
        });

        // Listener para orçamento
        const unsubscribeBudget = onSnapshot(budgetRef, (doc) => {
            if (doc.exists()) {
                setBudget(doc.data());
            } else {
                setBudget(null);
            }
        }, (error) => {
            console.error("Error fetching budget:", error);
            setInfoModalContent({ title: "Erro de Dados", message: "Não foi possível carregar o orçamento deste projeto." });
            setShowInfoModal(true);
        });

        return () => {
            unsubscribeExpenses();
            unsubscribeBudget();
        };
    }, [currentProject, userId, db]);

    // --- Funções de Autenticação ---
    const handleLogin = async (event) => {
        event.preventDefault();
        const email = event.target.email.value;
        const password = event.target.password.value;
        setLoading(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
            setInfoModalContent({ title: "Sucesso!", message: "Login realizado com sucesso." });
            setShowInfoModal(true);
        } catch (error) {
            console.error("Login failed:", error);
            setInfoModalContent({ title: "Erro de Login", message: "Credenciais inválidas. Por favor, verifique seu e-mail e senha." });
            setShowInfoModal(true);
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (event) => {
        event.preventDefault();
        const email = event.target.email.value;
        const password = event.target.password.value;
        setLoading(true);
        try {
            await createUserWithEmailAndPassword(auth, email, password);
            setInfoModalContent({ title: "Sucesso!", message: "Cadastro realizado com sucesso. Você será logado automaticamente." });
            setShowInfoModal(true);
        } catch (error) {
            console.error("Registration failed:", error);
            setInfoModalContent({ title: "Erro de Cadastro", message: "Não foi possível criar a conta. A senha deve ter no mínimo 6 caracteres e o e-mail deve ser válido." });
            setShowInfoModal(true);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await signOut(auth);
        setCurrentProject(null); // Limpa o projeto atual
    };

    // --- Funções de Gerenciamento de Projetos ---
    const handleAddProject = async (event) => {
        event.preventDefault();
        const projectName = event.target.projectName.value;
        if (!projectName || !userId || !db) {
            setInfoModalContent({ title: "Erro", message: "Nome do projeto ou usuário não encontrado." });
            setShowInfoModal(true);
            return;
        }
        
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        const projectsRef = collection(db, `artifacts/${appId}/users/${userId}/projects`);
        try {
            setLoading(true);
            await addDoc(projectsRef, {
                name: projectName,
                createdAt: new Date().toISOString()
            });
            event.target.reset();
        } catch (error) {
            console.error("Error adding project:", error);
            setInfoModalContent({ title: "Erro", message: "Não foi possível adicionar o projeto." });
            setShowInfoModal(true);
        } finally {
            setLoading(false);
        }
    };
    
    // Define o projeto atual para navegação
    const handleSelectProject = (project) => {
        setCurrentProject(project);
    };
    
    // Volta para a lista de projetos
    const handleBackToProjects = () => {
        setCurrentProject(null);
    };

    // --- Funções de Gerenciamento de Despesas e Orçamento ---
    const handleAddExpense = async (event) => {
        event.preventDefault();
        if (!currentProject || !userId || !db) return;
        
        const newExpense = {
            description: event.target.description.value,
            amount: parseFloat(event.target.amount.value),
            category: event.target.category.value,
            date: event.target.date.value
        };

        if (isNaN(newExpense.amount) || newExpense.amount <= 0) {
            setInfoModalContent({ title: "Erro de Entrada", message: "Por favor, insira um valor de despesa válido." });
            setShowInfoModal(true);
            return;
        }

        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        const expensesRef = collection(db, `artifacts/${appId}/users/${userId}/projects/${currentProject.id}/expenses`);
        setLoading(true);
        try {
            await addDoc(expensesRef, newExpense);
            setShowExpenseModal(false);
            event.target.reset();
        } catch (error) {
            console.error("Error adding expense:", error);
            setInfoModalContent({ title: "Erro ao Adicionar", message: "Ocorreu um erro ao adicionar a despesa." });
            setShowInfoModal(true);
        } finally {
            setLoading(false);
        }
    };
    
    // Excluir despesa
    const handleDeleteExpense = async (id) => {
        if (!currentProject || !userId || !db) return;
        
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        const expenseDocRef = doc(db, `artifacts/${appId}/users/${userId}/projects/${currentProject.id}/expenses/${id}`);
        setLoading(true);
        try {
            await deleteDoc(expenseDocRef);
        } catch (error) {
            console.error("Error deleting expense:", error);
            setInfoModalContent({ title: "Erro ao Excluir", message: "Não foi possível excluir a despesa." });
            setShowInfoModal(true);
        } finally {
            setLoading(false);
        }
    };

    // Adicionar/Atualizar orçamento
    const handleAddBudget = async (event) => {
        event.preventDefault();
        if (!currentProject || !userId || !db) return;
        
        const newBudget = {
            amount: parseFloat(event.target.amount.value),
            startDate: event.target.startDate.value,
            endDate: event.target.endDate.value
        };
    
        if (isNaN(newBudget.amount) || newBudget.amount <= 0) {
            setInfoModalContent({ title: "Erro de Entrada", message: "Por favor, insira um valor de orçamento válido." });
            setShowInfoModal(true);
            return;
        }
        
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        const budgetDocRef = doc(db, `artifacts/${appId}/users/${userId}/projects/${currentProject.id}/budget/current`);
        setLoading(true);
        try {
            await setDoc(budgetDocRef, newBudget);
            setShowBudgetModal(false);
        } catch (error) {
            console.error("Error setting budget:", error);
            setInfoModalContent({ title: "Erro ao Salvar", message: "Não foi possível salvar o orçamento." });
            setShowInfoModal(true);
        } finally {
            setLoading(false);
        }
    };
    
    // Exportar para PDF
    const exportToPdf = async () => {
        if (!currentProject) {
            setInfoModalContent({ title: "Atenção", message: "Selecione um projeto para exportar." });
            setShowInfoModal(true);
            return;
        }

        setLoading(true);
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
    
            // Título do projeto
            doc.setFontSize(22);
            doc.text(`Relatório da Obra: ${currentProject.name}`, 14, 20);
    
            // Dados de resumo
            doc.setFontSize(14);
            const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
            const remainingBudget = budget ? budget.amount - totalExpenses : 0;
            
            doc.text(`Orçamento Total: R$ ${budget ? budget.amount.toFixed(2) : '0.00'}`, 14, 30);
            doc.text(`Total de Despesas: R$ ${totalExpenses.toFixed(2)}`, 14, 38);
            doc.text(`Orçamento Restante: R$ ${remainingBudget.toFixed(2)}`, 14, 46);

            // Tabela de despesas
            const tableData = expenses.map(exp => [
                new Date(exp.date).toLocaleDateString(),
                exp.description,
                exp.category,
                `R$ ${parseFloat(exp.amount).toFixed(2)}`
            ]);
            doc.autoTable({
                startY: 60,
                head: [['Data', 'Descrição', 'Categoria', 'Valor']],
                body: tableData,
                theme: 'striped',
                headStyles: { fillColor: '#10b981' }
            });

            doc.save(`relatorio_${currentProject.name.replace(/\s/g, '_')}.pdf`);
        } catch (error) {
            console.error("Erro ao gerar PDF:", error);
            setInfoModalContent({ title: "Erro ao Gerar PDF", message: "Ocorreu um erro ao gerar o PDF. Detalhes: " + error.message });
            setShowInfoModal(true);
        } finally {
            setLoading(false);
        }
    };
    
    // Calcula o total de despesas para o gráfico e o resumo
    const totalExpenses = expenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
    const remainingBudget = budget ? budget.amount - totalExpenses : 0;
    
    // Dados para o Gráfico de Rosca
    const chartData = {
        labels: ['Despesas', 'Restante'],
        datasets: [{
            data: [totalExpenses, Math.max(0, remainingBudget)],
            backgroundColor: ['#ef4444', '#10b981'],
            hoverOffset: 4
        }]
    };
    
    // Filtra as despesas com base na categoria
    const filteredExpenses = filter === 'all'
        ? expenses
        : expenses.filter(exp => exp.category === filter);

    // --- Renderização da UI (Lógica de Navegação) ---
    const renderContent = () => {
        // Passo 1: Verifica o estado de carregamento inicial
        if (loading) {
            return (
                <div className="flex items-center justify-center min-h-screen">
                    <div className="text-center">
                        <svg className="animate-spin h-8 w-8 text-green-500 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <p className="mt-4 text-gray-700 font-semibold">Carregando...</p>
                    </div>
                </div>
            );
        }
        
        // Passo 2: Se o carregamento terminou, verifica se o usuário está autenticado
        if (!user) {
            // Se o usuário não estiver logado, mostra a tela de login ou de cadastro
            return showRegister ? (
                <div className="flex items-center justify-center min-h-screen bg-gray-100">
                    <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-sm">
                        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">Cadastro</h2>
                        <form onSubmit={handleRegister} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700">E-mail</label>
                                <input type="email" name="email" required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700">Senha</label>
                                <input type="password" name="password" required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500" />
                            </div>
                            <button type="submit" className="w-full bg-green-600 text-white font-bold py-2 px-4 rounded-full hover:bg-green-700 transition">Cadastrar</button>
                        </form>
                        <p className="mt-4 text-center text-gray-600">
                            Já tem uma conta? <a href="#" onClick={() => setShowRegister(false)} className="text-green-600 font-semibold hover:underline">Login</a>
                        </p>
                    </div>
                </div>
            ) : (
                <div className="flex items-center justify-center min-h-screen bg-gray-100">
                    <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-sm">
                        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">Login</h2>
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700">E-mail</label>
                                <input type="email" name="email" required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700">Senha</label>
                                <input type="password" name="password" required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500" />
                            </div>
                            <button type="submit" className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-full hover:bg-blue-700 transition">Entrar</button>
                        </form>
                        <p className="mt-4 text-center text-gray-600">
                            Não tem uma conta? <a href="#" onClick={() => setShowRegister(true)} className="text-blue-600 font-semibold hover:underline">Cadastre-se</a>
                        </p>
                    </div>
                </div>
            );
        } else if (!currentProject) {
            // Passo 3: Se o usuário está logado mas não selecionou um projeto, mostra a lista de projetos
            return (
                <div className="w-full max-w-2xl mx-auto p-4 md:p-8 bg-white shadow-xl rounded-2xl my-8">
                    <header className="flex justify-between items-center mb-6">
                        <h1 className="text-3xl font-bold text-gray-800">Minhas Obras</h1>
                        <button onClick={handleLogout} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-full font-semibold hover:bg-gray-300 transition">
                            Sair
                        </button>
                    </header>
                    <div className="mb-8">
                        <form onSubmit={handleAddProject} className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2">
                            <input 
                                type="text" 
                                name="projectName" 
                                placeholder="Nome da nova obra" 
                                required 
                                className="flex-1 border border-gray-300 rounded-full px-4 py-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-full font-semibold hover:bg-blue-700 transition">
                                Adicionar Obra
                            </button>
                        </form>
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 mb-4">Lista de Obras</h2>
                    <ul className="space-y-4">
                        {projects.length > 0 ? (
                            projects.map(project => (
                                <li key={project.id} className="bg-gray-50 p-6 rounded-xl shadow-md cursor-pointer hover:bg-gray-100 transition" onClick={() => handleSelectProject(project)}>
                                    <h3 className="text-lg font-semibold text-gray-800">{project.name}</h3>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Criado em: {new Date(project.createdAt).toLocaleDateString()}
                                    </p>
                                </li>
                            ))
                        ) : (
                            <p className="text-center text-gray-500">Nenhuma obra encontrada. Adicione uma para começar!</p>
                        )}
                    </ul>
                </div>
            );
        } else {
            // Passo 4: Se o usuário está logado e um projeto foi selecionado, mostra o dashboard
            return (
                <div className="w-full max-w-5xl mx-auto p-4 md:p-8 bg-white shadow-xl rounded-2xl my-8">
                    <header className="flex flex-col md:flex-row justify-between items-center mb-6">
                        <h1 className="text-3xl font-bold text-gray-800 mb-4 md:mb-0">{currentProject.name}</h1>
                        <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2 w-full md:w-auto">
                            <button onClick={handleBackToProjects} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-full font-semibold hover:bg-gray-300 transition w-full md:w-auto">
                                Voltar para Obras
                            </button>
                            <button onClick={handleLogout} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-full font-semibold hover:bg-gray-300 transition w-full md:w-auto">
                                Sair
                            </button>
                        </div>
                    </header>
                    
                    <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-gray-50 p-6 rounded-xl shadow-md flex flex-col items-center">
                            <span className="text-sm font-semibold text-gray-500">Orçamento Total</span>
                            <span id="total-budget" className="text-2xl font-bold text-gray-800 mt-2">R$ {budget ? budget.amount.toFixed(2) : '0.00'}</span>
                            <p className="text-xs text-gray-400 mt-1">{budget ? `${new Date(budget.startDate).toLocaleDateString()} - ${new Date(budget.endDate).toLocaleDateString()}` : 'Não configurado'}</p>
                            <button onClick={() => setShowBudgetModal(true)} className="mt-3 text-blue-500 text-sm hover:underline">Configurar Orçamento</button>
                        </div>
                        <div className="bg-gray-50 p-6 rounded-xl shadow-md flex flex-col items-center">
                            <span className="text-sm font-semibold text-gray-500">Total de Despesas</span>
                            <span id="total-expenses" className="text-2xl font-bold text-red-600 mt-2">R$ {totalExpenses.toFixed(2)}</span>
                        </div>
                        <div className={`bg-gray-50 p-6 rounded-xl shadow-md flex flex-col items-center ${budget ? '' : 'hidden'}`}>
                            <span className="text-sm font-semibold text-gray-500">Orçamento Restante</span>
                            <span id="remaining-budget" className={`text-2xl font-bold mt-2 ${remainingBudget >= 0 ? 'text-green-600' : 'text-red-600'}`}>R$ {remainingBudget.toFixed(2)}</span>
                        </div>
                    </section>
            
                    <section className="bg-gray-50 p-6 rounded-xl shadow-md mb-8">
                        <h2 className="text-xl font-bold text-gray-800 mb-4">Análise de Orçamento</h2>
                        <div className="w-full h-64 flex justify-center items-center">
                            <Doughnut data={chartData} options={{ maintainAspectRatio: false }} />
                        </div>
                    </section>
            
                    <section className="bg-gray-50 p-6 rounded-xl shadow-md">
                        <div className="flex flex-col md:flex-row justify-between items-center mb-4 space-y-2 md:space-y-0">
                            <h2 className="text-xl font-bold text-gray-800 mb-2 md:mb-0">Histórico de Despesas</h2>
                            <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-4 w-full md:w-auto">
                                <select value={filter} onChange={(e) => setFilter(e.target.value)} className="form-select border border-gray-300 rounded-lg p-2 text-sm font-medium focus:ring-blue-500 focus:border-blue-500 w-full md:w-auto">
                                    <option value="all">Todas as Categorias</option>
                                    <option value="Material">Material</option>
                                    <option value="Mão de Obra">Mão de Obra</option>
                                    <option value="Equipamento">Equipamento</option>
                                    <option value="Serviços">Serviços</option>
                                    <option value="Outros">Outros</option>
                                </select>
                                <button onClick={() => setShowExpenseModal(true)} className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-full font-semibold shadow hover:bg-green-700 transition w-full md:w-auto">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                                    </svg>
                                    <span>Nova Despesa</span>
                                </button>
                                <button onClick={exportToPdf} className="flex items-center space-x-2 bg-red-500 text-white px-4 py-2 rounded-full font-semibold shadow hover:bg-red-600 transition w-full md:w-auto">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L6.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                    </svg>
                                    <span>Exportar PDF</span>
                                </button>
                            </div>
                        </div>
                        <ul id="expense-list" className="space-y-4">
                            {filteredExpenses.length > 0 ? (
                                filteredExpenses.map(expense => (
                                    <li key={expense.id} className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 bg-gray-50 rounded-lg shadow-sm">
                                        <div className="flex-1 w-full md:w-auto">
                                            <span className="font-semibold text-gray-800">{expense.description}</span>
                                            <span className="block text-sm text-gray-500">{new Date(expense.date).toLocaleDateString()}</span>
                                            <span className="block text-xs font-medium text-gray-600 rounded-full px-2 py-1 mt-1 bg-gray-200 inline-block">{expense.category}</span>
                                        </div>
                                        <div className="flex items-center space-x-2 mt-2 md:mt-0">
                                            <span className="text-lg font-bold text-red-600">R$ {parseFloat(expense.amount).toFixed(2)}</span>
                                            <button onClick={() => {
                                                setConfirmationAction(() => () => handleDeleteExpense(expense.id));
                                                setShowConfirmationModal(true);
                                            }} className="text-red-500 hover:text-red-700 p-2">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                                </svg>
                                            </button>
                                        </div>
                                    </li>
                                ))
                            ) : (
                                <li className="px-6 py-4 text-center text-sm text-gray-500">
                                    Nenhuma despesa registrada ainda.
                                </li>
                            )}
                        </ul>
                    </section>
                </div>
            );
        }
    };

    return (
        <>
            {/* Renderiza o conteúdo da página com base no estado atual */}
            {renderContent()}

            {/* Modal para Adicionar Despesa */}
            {showExpenseModal && (
                <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-40 p-4">
                    <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-md">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold">Adicionar Nova Despesa</h3>
                            <button onClick={() => setShowExpenseModal(false)} className="text-gray-500 hover:text-gray-700">
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <form onSubmit={handleAddExpense}>
                            <div className="mb-4">
                                <label className="block text-sm font-semibold text-gray-700">Descrição</label>
                                <input type="text" name="description" required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500" />
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-semibold text-gray-700">Valor (R$)</label>
                                <input type="number" name="amount" step="0.01" required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500" />
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-semibold text-gray-700">Categoria</label>
                                <select name="category" required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500">
                                    <option value="Material">Material</option>
                                    <option value="Mão de Obra">Mão de Obra</option>
                                    <option value="Equipamento">Equipamento</option>
                                    <option value="Serviços">Serviços</option>
                                    <option value="Outros">Outros</option>
                                </select>
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-semibold text-gray-700">Data</label>
                                <input type="date" name="date" required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500" />
                            </div>
                            <button type="submit" className="w-full bg-green-600 text-white font-bold py-2 px-4 rounded-full hover:bg-green-700 transition">Adicionar Despesa</button>
                        </form>
                    </div>
                </div>
            )}
            
            {/* Modal para Configurar Orçamento */}
            {showBudgetModal && (
                <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-40 p-4">
                    <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-md">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold">Configurar Orçamento</h3>
                            <button onClick={() => setShowBudgetModal(false)} className="text-gray-500 hover:text-gray-700">
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <form onSubmit={handleAddBudget}>
                            <div className="mb-4">
                                <label className="block text-sm font-semibold text-gray-700">Valor do Orçamento (R$)</label>
                                <input type="number" name="amount" step="0.01" defaultValue={budget ? budget.amount : ''} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500" />
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-semibold text-gray-700">Início do Período</label>
                                <input type="date" name="startDate" defaultValue={budget ? budget.startDate : ''} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500" />
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-semibold text-gray-700">Fim do Período</label>
                                <input type="date" name="endDate" defaultValue={budget ? budget.endDate : ''} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500" />
                            </div>
                            <button type="submit" className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-full hover:bg-blue-700 transition">Salvar Orçamento</button>
                        </form>
                    </div>
                </div>
            )}
            
            {showInfoModal && (
                <InfoModal
                    title={infoModalContent.title}
                    message={infoModalContent.message}
                    onClose={() => setShowInfoModal(false)}
                />
            )}
            
            {showConfirmationModal && (
                <ConfirmationModal
                    message="Tem certeza que deseja excluir esta despesa?"
                    onConfirm={() => { confirmationAction(); setShowConfirmationModal(false); }}
                    onCancel={() => setShowConfirmationModal(false)}
                />
            )}
            
            <footer className="mt-8 pt-4 border-t border-gray-200 text-center">
                <p className="text-gray-500 text-xs">
                    ID do Usuário: <span className="font-mono break-all">{userId}</span>
                </p>
            </footer>
        </>
    );
};

export default App;
