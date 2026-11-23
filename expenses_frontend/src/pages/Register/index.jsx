import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usersService } from '../../services/resourcesService';
import '../../styles/Login/Login.css';

export default function Register() {
    const navigate = useNavigate();
    const [form, setForm] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    function handleChange(event) {
        const { name, value } = event.target;
        setForm((current) => ({ ...current, [name]: value }));
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setError('');

        if (form.password !== form.confirmPassword) {
            setError('As senhas não conferem.');
            return;
        }

        setLoading(true);
        try {
            await usersService.register({
                name: form.name.trim(),
                email: form.email.trim(),
                password: form.password
            });
            navigate('/', {
                replace: true,
                state: { message: 'Cadastro realizado! Entre com seu e-mail e senha.' }
            });
        } catch (requestError) {
            setError(requestError.response?.data?.error || 'Não foi possível concluir o cadastro. Tente novamente.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="login-page">
            <section className="login-card">
                <form onSubmit={handleSubmit} className="login-form">
                    <h1>Criar conta</h1>
                    <p className="login-subtitle">Cadastre-se para começar a organizar suas finanças.</p>

                    <div className="input-group">
                        <label htmlFor="register-name">Nome completo</label>
                        <input
                            id="register-name"
                            name="name"
                            type="text"
                            autoComplete="name"
                            maxLength="100"
                            placeholder="Seu nome"
                            value={form.name}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="input-group">
                        <label htmlFor="register-email">E-mail</label>
                        <input
                            id="register-email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            maxLength="254"
                            placeholder="voce@exemplo.com"
                            value={form.email}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="input-group">
                        <label htmlFor="register-password">Senha</label>
                        <input
                            id="register-password"
                            name="password"
                            type="password"
                            autoComplete="new-password"
                            minLength="6"
                            placeholder="Pelo menos 6 caracteres"
                            value={form.password}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="input-group">
                        <label htmlFor="register-confirm-password">Confirmar senha</label>
                        <input
                            id="register-confirm-password"
                            name="confirmPassword"
                            type="password"
                            autoComplete="new-password"
                            minLength="6"
                            placeholder="Digite a senha novamente"
                            value={form.confirmPassword}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    {error && <div className="error-message" role="alert">{error}</div>}

                    <button className="btn-submit" type="submit" disabled={loading}>
                        {loading ? 'Cadastrando...' : 'Criar conta'}
                    </button>

                    <p className="auth-switch">
                        Já tem uma conta? <Link to="/">Entrar</Link>
                    </p>
                </form>
            </section>
        </main>
    );
}
