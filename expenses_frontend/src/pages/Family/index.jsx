import { useCallback, useContext, useEffect, useState } from 'react';
import { AuthContext } from '../../contexts/auth-context';
import { usersService } from '../../services/resourcesService';
import MainLayout from '../../layouts/MainLayout';
import '../../styles/Family/Family.css';

const emptyForm = { name: '', email: '', password: '' };

export default function Family() {
    const { user } = useContext(AuthContext);
    const [dependents, setDependents] = useState([]);
    const [form, setForm] = useState(emptyForm);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');

    const loadDependents = useCallback(async () => {
        try {
            setDependents(await usersService.dependents());
        } catch (error) {
            setMessage(error.response?.data?.error || 'Erro ao carregar os dependentes.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        let active = true;
        usersService.dependents()
            .then((data) => {
                if (active) setDependents(data);
            })
            .catch((error) => {
                if (active) setMessage(error.response?.data?.error || 'Erro ao carregar os dependentes.');
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => {
            active = false;
        };
    }, []);

    async function handleSubmit(event) {
        event.preventDefault();
        try {
            await usersService.createDependent(form);
            setForm(emptyForm);
            setMessage('Conta de dependente criada e vinculada com sucesso.');
            setLoading(true);
            await loadDependents();
        } catch (error) {
            setMessage(error.response?.data?.error || 'Erro ao cadastrar dependente.');
        }
    }

    function handleChange(event) {
        const { name, value } = event.target;
        setForm((current) => ({ ...current, [name]: value }));
    }

    if (user?.role !== 'parent') {
        return <MainLayout><p>Apenas responsáveis podem acessar o controle parental.</p></MainLayout>;
    }

    return (
        <MainLayout>
            <div className="family-page">
                <div className="page-header">
                    <h1>Controle parental</h1>
                    <p className="page-subtitle">Crie contas para os dependentes e acompanhe os lançamentos da família.</p>
                </div>

                {message && (
                    <div className="alert-message" role="status">
                        <span>{message}</span>
                        <button className="btn-close-alert" onClick={() => setMessage('')} aria-label="Fechar mensagem">×</button>
                    </div>
                )}

                <section className="family-card">
                    <h2>Cadastrar dependente</h2>
                    <form onSubmit={handleSubmit}>
                        <div className="family-form-grid">
                            <label>
                                Nome
                                <input name="name" value={form.name} onChange={handleChange} autoComplete="name" required />
                            </label>
                            <label>
                                E-mail de acesso
                                <input name="email" type="email" value={form.email} onChange={handleChange} autoComplete="email" required />
                            </label>
                            <label>
                                Senha inicial
                                <input name="password" type="password" minLength="6" value={form.password} onChange={handleChange} autoComplete="new-password" required />
                            </label>
                        </div>
                        <button className="btn-primary" type="submit">Criar conta vinculada</button>
                    </form>
                </section>

                <section className="family-card">
                    <div className="list-header">
                        <h2>Dependentes vinculados a {user.name}</h2>
                        <span className="badge-count">{dependents.length}</span>
                    </div>
                    {loading ? <p>Carregando dependentes...</p> : dependents.length === 0 ? (
                        <p className="no-data">Nenhum dependente cadastrado.</p>
                    ) : (
                        <div className="family-list">
                            {dependents.map((dependent) => (
                                <div className="family-member" key={dependent.id}>
                                    <div>
                                        <strong>{dependent.name}</strong>
                                        <span>{dependent.email}</span>
                                    </div>
                                    <span className="family-role">Dependente</span>
                                </div>
                            ))}
                        </div>
                    )}
                    <p className="family-note">Como responsável, você pode consultar, criar, editar e excluir os lançamentos dos dependentes na página de lançamentos.</p>
                </section>
            </div>
        </MainLayout>
    );
}
