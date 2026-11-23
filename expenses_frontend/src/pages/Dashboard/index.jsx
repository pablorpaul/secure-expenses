import { useContext, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../contexts/auth-context';
import { expensesService, usersService } from '../../services/resourcesService';
import MainLayout from '../../layouts/MainLayout';
import '../../styles/Dashboard/Dashboard.css';

function formatMoney(value) {
    return Number(value || 0).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}

async function fetchDashboardData(filterUserId, role) {
    const requests = [expensesService.list(filterUserId || undefined)];
    if (role === 'parent') requests.push(usersService.dependents());
    const [expenseData, dependentData = []] = await Promise.all(requests);
    return { expenses: expenseData, dependents: dependentData };
}

export default function Dashboard() {
    const { user } = useContext(AuthContext);
    const [expenses, setExpenses] = useState([]);
    const [dependents, setDependents] = useState([]);
    const [filterUserId, setFilterUserId] = useState(() => user?.role === 'parent' ? '' : String(user?.id || ''));
    const [typeFilter, setTypeFilter] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');

    useEffect(() => {
        let active = true;
        fetchDashboardData(filterUserId, user.role)
            .then(({ expenses: expenseData, dependents: dependentData }) => {
                if (!active) return;
                setExpenses(expenseData);
                setDependents(dependentData);
            })
            .catch((error) => {
                if (active) setMessage(error.response?.data?.error || 'Erro ao carregar o dashboard.');
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => {
            active = false;
        };
    }, [filterUserId, user.role]);

    const totals = useMemo(() => expenses.reduce((summary, expense) => {
        const amount = Number(expense.amount);
        if (expense.type === 'income') summary.income += amount;
        else summary.expenses += amount;
        return summary;
    }, { income: 0, expenses: 0 }), [expenses]);

    const filteredHistory = expenses.filter((expense) => (
        (!typeFilter || expense.type === typeFilter) &&
        (!startDate || expense.date >= startDate) &&
        (!endDate || expense.date <= endDate)
    )).slice(0, 8);

    const accounts = [user, ...dependents];

    return (
        <MainLayout>
            <div className="dashboard-page">
                <div className="page-header dashboard-header">
                    <div>
                        <h1>Dashboard</h1>
                        <p className="page-subtitle">Resumo financeiro e movimentações recentes.</p>
                    </div>
                    {user.role === 'parent' && (
                        <div className="dashboard-account-filter">
                            <label htmlFor="dashboard-account">Visualizar</label>
                            <select id="dashboard-account" value={filterUserId} onChange={(event) => {
                                setLoading(true);
                                setFilterUserId(event.target.value);
                            }}>
                                <option value="">Toda a família</option>
                                {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
                            </select>
                        </div>
                    )}
                </div>

                {message && <div className="alert-message" role="status">{message}</div>}

                <div className="dashboard-cards">
                    <div className="dashboard-card balance-card">
                        <h2>Saldo</h2>
                        <p className={totals.income - totals.expenses < 0 ? 'amount-expense' : 'amount-income'}>{formatMoney(totals.income - totals.expenses)}</p>
                        <span>Receitas menos despesas</span>
                    </div>
                    <div className="dashboard-card">
                        <h2>Total de receitas</h2>
                        <p className="amount-income">{formatMoney(totals.income)}</p>
                    </div>
                    <div className="dashboard-card">
                        <h2>Total de despesas</h2>
                        <p className="amount-expense">{formatMoney(totals.expenses)}</p>
                    </div>
                    <div className="dashboard-card">
                        <h2>Lançamentos</h2>
                        <p>{expenses.length}</p>
                    </div>
                </div>

                <section className="dashboard-history">
                    <div className="dashboard-history-header">
                        <div>
                            <h2>Histórico financeiro</h2>
                            <p>Movimentações recentes da conta selecionada.</p>
                        </div>
                        <Link to="/expenses">Ver todos</Link>
                    </div>
                    <div className="dashboard-history-filters">
                        <label>
                            Tipo
                            <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
                                <option value="">Todos os tipos</option>
                                <option value="income">Receitas</option>
                                <option value="expense">Despesas</option>
                            </select>
                        </label>
                        <label>
                            De
                            <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
                        </label>
                        <label>
                            Até
                            <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
                        </label>
                    </div>
                    {loading ? <div className="loading-text">Carregando dados...</div> : filteredHistory.length === 0 ? (
                        <div className="no-data">Nenhuma movimentação encontrada.</div>
                    ) : (
                        <div className="table-wrapper">
                            <table className="expenses-table">
                                <thead>
                                    <tr>
                                        <th>Data</th>
                                        <th>Descrição</th>
                                        {user.role === 'parent' && !filterUserId && <th>Conta</th>}
                                        <th>Tipo</th>
                                        <th>Valor</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredHistory.map((expense) => (
                                        <tr key={expense.id}>
                                            <td>{expense.date}</td>
                                            <td>{expense.title}</td>
                                            {user.role === 'parent' && !filterUserId && <td>{accounts.find((account) => account.id === expense.userId)?.name || 'Conta'}</td>}
                                            <td>{expense.type === 'income' ? 'Receita' : 'Despesa'}</td>
                                            <td className={expense.type === 'income' ? 'amount-income' : 'amount-expense'}>{expense.type === 'income' ? '+' : '-'}{formatMoney(expense.amount)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </div>
        </MainLayout>
    );
}
