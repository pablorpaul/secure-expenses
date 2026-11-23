import { useCallback, useContext, useEffect, useState } from 'react';
import { AuthContext } from '../../contexts/auth-context';
import { categoriesService, expensesService, usersService } from '../../services/resourcesService';
import MainLayout from '../../layouts/MainLayout';
import '../../styles/Expenses/Expenses.css';

const emptyForm = {
    title: '',
    amount: '',
    categoryId: '',
    type: 'expense',
    date: '',
    description: ''
};

function formatMoney(value) {
    return Number(value || 0).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}

function errorMessage(error, fallback) {
    return error.response?.data?.error || fallback;
}

async function fetchExpensesData(filterUserId, role) {
    const requests = [
        expensesService.list(filterUserId || undefined),
        categoriesService.list()
    ];
    if (role === 'parent') requests.push(usersService.dependents());
    const [expenses, categories, dependents = []] = await Promise.all(requests);
    return { expenses, categories, dependents };
}

export default function Expenses() {
    const { user } = useContext(AuthContext);
    const [expenses, setExpenses] = useState([]);
    const [categories, setCategories] = useState([]);
    const [dependents, setDependents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [filterUserId, setFilterUserId] = useState(() => user?.role === 'parent' ? '' : String(user?.id || ''));
    const [targetUserId, setTargetUserId] = useState(() => String(user?.id || ''));
    const [form, setForm] = useState(emptyForm);
    const [attachmentFile, setAttachmentFile] = useState(null);
    const [editingExpense, setEditingExpense] = useState(null);
    const [detailExpense, setDetailExpense] = useState(null);
    const [message, setMessage] = useState('');

    const loadData = useCallback(async () => {
        try {
            const data = await fetchExpensesData(filterUserId, user.role);
            setExpenses(data.expenses);
            setCategories(data.categories);
            setDependents(data.dependents);
        } catch (error) {
            setMessage(errorMessage(error, 'Erro ao carregar os dados financeiros.'));
        } finally {
            setLoading(false);
        }
    }, [filterUserId, user.role]);

    useEffect(() => {
        let active = true;
        fetchExpensesData(filterUserId, user.role)
            .then((data) => {
                if (!active) return;
                setExpenses(data.expenses);
                setCategories(data.categories);
                setDependents(data.dependents);
            })
            .catch((error) => {
                if (active) setMessage(errorMessage(error, 'Erro ao carregar os dados financeiros.'));
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => {
            active = false;
        };
    }, [filterUserId, user.role]);

    function handleChange(event) {
        const { name, value } = event.target;
        setForm((current) => ({ ...current, [name]: value }));
    }

    function clearForm() {
        setForm(emptyForm);
        setAttachmentFile(null);
        setEditingExpense(null);
        setTargetUserId(String(user.id));
    }

    async function handleSubmit(event) {
        event.preventDefault();
        if (!form.title.trim() || !form.amount || !form.categoryId || !form.date) {
            setMessage('Preencha título, valor, categoria e data.');
            return;
        }

        const payload = new FormData();
        payload.append('title', form.title.trim());
        payload.append('amount', String(Number(form.amount)));
        payload.append('categoryId', form.categoryId);
        payload.append('type', form.type);
        payload.append('date', form.date);
        payload.append('description', form.description);
        payload.append('userId', targetUserId);
        if (attachmentFile) payload.append('attachment', attachmentFile);

        try {
            if (editingExpense) {
                await expensesService.update(editingExpense.id, payload);
                setMessage('Lançamento atualizado com sucesso.');
            } else {
                await expensesService.create(payload);
                setMessage('Lançamento cadastrado com sucesso.');
            }
            clearForm();
            await loadData();
        } catch (error) {
            setMessage(errorMessage(error, 'Erro ao salvar o lançamento.'));
        }
    }

    function handleEdit(expense) {
        setEditingExpense(expense);
        setTargetUserId(String(expense.userId));
        setForm({
            title: expense.title || '',
            amount: String(expense.amount || ''),
            categoryId: String(expense.categoryId || ''),
            type: expense.type || 'expense',
            date: expense.date || '',
            description: expense.description || ''
        });
        setAttachmentFile(null);
    }

    async function handleDetails(expense) {
        try {
            setDetailExpense(await expensesService.getById(expense.id));
        } catch (error) {
            setMessage(errorMessage(error, 'Erro ao carregar detalhes do lançamento.'));
        }
    }

    async function handleDownloadAttachment(expense) {
        try {
            const response = await expensesService.downloadAttachment(expense.id);
            const url = URL.createObjectURL(response.data);
            const link = document.createElement('a');
            link.href = url;
            link.download = expense.attachmentName || 'comprovante';
            link.click();
            window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (error) {
            setMessage(errorMessage(error, 'Erro ao baixar o comprovante.'));
        }
    }

    async function handleDelete(expense) {
        if (!window.confirm(`Deseja excluir o lançamento "${expense.title}"?`)) return;
        try {
            await expensesService.remove(expense.id);
            setMessage('Lançamento excluído com sucesso.');
            await loadData();
        } catch (error) {
            setMessage(errorMessage(error, 'Erro ao excluir lançamento.'));
        }
    }

    const filteredExpenses = expenses.filter((expense) => {
        const term = search.trim().toLocaleLowerCase('pt-BR');
        const matchesText = !term || [
            expense.title,
            expense.description,
            categories.find((category) => category.id === expense.categoryId)?.name,
            expense.amount?.toString()
        ].some((value) => value?.toLocaleLowerCase('pt-BR').includes(term));
        const matchesType = !typeFilter || expense.type === typeFilter;
        const matchesStart = !startDate || expense.date >= startDate;
        const matchesEnd = !endDate || expense.date <= endDate;
        return matchesText && matchesType && matchesStart && matchesEnd;
    });

    const accounts = [user, ...dependents];

    return (
        <MainLayout>
            <div className="expenses-container">
                <div className="page-header">
                    <h1>Lançamentos financeiros</h1>
                    <p className="page-subtitle">Registre receitas e despesas e consulte seu histórico.</p>
                </div>

                {message && (
                    <div className="alert-message" role="status">
                        <span>{message}</span>
                        <button className="btn-close-alert" onClick={() => setMessage('')} aria-label="Fechar mensagem">×</button>
                    </div>
                )}

                <section className="expenses-card">
                    <h2>{editingExpense ? 'Editar lançamento' : 'Novo lançamento'}</h2>
                    <form onSubmit={handleSubmit}>
                        <div className="form-grid">
                            <div className="input-field">
                                <label htmlFor="transaction-title">Título</label>
                                <input id="transaction-title" name="title" value={form.title} onChange={handleChange} placeholder="Ex.: Salário, mercado" required />
                            </div>
                            <div className="input-field">
                                <label htmlFor="transaction-amount">Valor (R$)</label>
                                <input id="transaction-amount" name="amount" type="number" min="0.01" step="0.01" value={form.amount} onChange={handleChange} placeholder="0,00" required />
                            </div>
                            <div className="input-field">
                                <label htmlFor="transaction-type">Tipo</label>
                                <select id="transaction-type" name="type" value={form.type} onChange={handleChange}>
                                    <option value="expense">Despesa</option>
                                    <option value="income">Receita</option>
                                </select>
                            </div>
                            <div className="input-field">
                                <label htmlFor="transaction-category">Categoria</label>
                                <select id="transaction-category" name="categoryId" value={form.categoryId} onChange={handleChange} required>
                                    <option value="">Selecione uma categoria</option>
                                    {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                                </select>
                            </div>
                            <div className="input-field">
                                <label htmlFor="transaction-date">Data</label>
                                <input id="transaction-date" type="date" name="date" max={new Date().toISOString().slice(0, 10)} value={form.date} onChange={handleChange} required />
                            </div>
                            {user.role === 'parent' && (
                                <div className="input-field">
                                    <label htmlFor="transaction-owner">Responsável pelo lançamento</label>
                                    <select id="transaction-owner" value={targetUserId} onChange={(event) => setTargetUserId(event.target.value)}>
                                        {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
                                    </select>
                                </div>
                            )}
                            <div className="input-field">
                                <label htmlFor="transaction-description">Descrição (opcional)</label>
                                <input id="transaction-description" name="description" value={form.description} onChange={handleChange} placeholder="Informações adicionais" />
                            </div>
                            <div className="input-field">
                                <label htmlFor="transaction-attachment">Comprovante (PDF ou imagem, até 5 MB)</label>
                                <input id="transaction-attachment" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(event) => setAttachmentFile(event.target.files?.[0] || null)} />
                                {editingExpense?.attachmentName && <small>Comprovante atual: {editingExpense.attachmentName}. Selecione outro para substituir.</small>}
                            </div>
                        </div>
                        <div className="form-actions">
                            <button type="submit" className="btn-primary">{editingExpense ? 'Salvar alterações' : 'Cadastrar lançamento'}</button>
                            {editingExpense && <button type="button" onClick={clearForm} className="btn-secondary">Cancelar</button>}
                        </div>
                    </form>
                </section>

                <section className="expenses-card">
                    <div className="list-header">
                        <h2>Histórico financeiro</h2>
                        <span className="badge-count">{filteredExpenses.length} {filteredExpenses.length === 1 ? 'lançamento' : 'lançamentos'}</span>
                    </div>

                    <div className="history-filters">
                        {user.role === 'parent' && (
                            <div className="input-field">
                                <label htmlFor="history-owner">Conta</label>
                                <select id="history-owner" value={filterUserId} onChange={(event) => {
                                    setLoading(true);
                                    setFilterUserId(event.target.value);
                                }}>
                                    <option value="">Toda a família</option>
                                    {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
                                </select>
                            </div>
                        )}
                        <div className="input-field">
                            <label htmlFor="history-search">Buscar</label>
                            <input id="history-search" placeholder="Título, descrição ou categoria" value={search} onChange={(event) => setSearch(event.target.value)} />
                        </div>
                        <div className="input-field">
                            <label htmlFor="history-type">Tipo</label>
                            <select id="history-type" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
                                <option value="">Receitas e despesas</option>
                                <option value="income">Receitas</option>
                                <option value="expense">Despesas</option>
                            </select>
                        </div>
                        <div className="input-field">
                            <label htmlFor="history-start">De</label>
                            <input id="history-start" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
                        </div>
                        <div className="input-field">
                            <label htmlFor="history-end">Até</label>
                            <input id="history-end" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
                        </div>
                    </div>

                    {loading ? <div className="loading-container">Carregando lançamentos...</div> : filteredExpenses.length === 0 ? (
                        <div className="no-data">Nenhum lançamento encontrado para os filtros selecionados.</div>
                    ) : (
                        <div className="table-wrapper">
                            <table className="expenses-table">
                                <thead>
                                    <tr>
                                        <th>Data</th>
                                        <th>Título</th>
                                        <th>Tipo</th>
                                        {user.role === 'parent' && <th>Conta</th>}
                                        <th>Categoria</th>
                                        <th>Valor</th>
                                        <th>Comprovante</th>
                                        <th>Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredExpenses.map((expense) => (
                                        <tr key={expense.id}>
                                            <td>{expense.date}</td>
                                            <td>{expense.title}</td>
                                            <td><span className={`transaction-type ${expense.type}`}>{expense.type === 'income' ? 'Receita' : 'Despesa'}</span></td>
                                            {user.role === 'parent' && <td>{accounts.find((account) => account.id === expense.userId)?.name || 'Conta'}</td>}
                                            <td>{categories.find((category) => category.id === expense.categoryId)?.name || '-'}</td>
                                            <td className={expense.type === 'income' ? 'amount-income' : 'amount-expense'}>{expense.type === 'income' ? '+' : '-'}{formatMoney(expense.amount)}</td>
                                            <td>{expense.attachmentName ? <button className="link-button" onClick={() => handleDownloadAttachment(expense)}>Baixar</button> : '-'}</td>
                                            <td>
                                                <div className="table-actions">
                                                    <button onClick={() => handleDetails(expense)} className="btn-action btn-info" title="Ver detalhes" aria-label="Ver detalhes">👁️</button>
                                                    <button onClick={() => handleEdit(expense)} className="btn-action btn-edit" title="Editar" aria-label="Editar">✏️</button>
                                                    <button onClick={() => handleDelete(expense)} className="btn-action btn-danger" title="Excluir" aria-label="Excluir">🗑️</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

                {detailExpense && (
                    <div className="details-overlay" onClick={() => setDetailExpense(null)}>
                        <div className="details-modal" onClick={(event) => event.stopPropagation()}>
                            <div className="list-header">
                                <h2>{detailExpense.title}</h2>
                                <button className="btn-close-alert" onClick={() => setDetailExpense(null)} aria-label="Fechar detalhes">×</button>
                            </div>
                            <p><strong>Tipo:</strong> {detailExpense.type === 'income' ? 'Receita' : 'Despesa'}</p>
                            <p><strong>Valor:</strong> {formatMoney(detailExpense.amount)}</p>
                            <p><strong>Categoria:</strong> {categories.find((category) => category.id === detailExpense.categoryId)?.name || '-'}</p>
                            <p><strong>Data:</strong> {detailExpense.date}</p>
                            <p><strong>Descrição:</strong> {detailExpense.description || '-'}</p>
                            {detailExpense.attachmentName && <p><strong>Comprovante:</strong> <button className="link-button" onClick={() => handleDownloadAttachment(detailExpense)}>{detailExpense.attachmentName}</button></p>}
                            <button onClick={() => setDetailExpense(null)} className="btn-secondary full-width">Fechar</button>
                        </div>
                    </div>
                )}
            </div>
        </MainLayout>
    );
}
