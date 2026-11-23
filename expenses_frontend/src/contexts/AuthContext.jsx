import { useEffect, useState } from 'react';
import { AuthContext } from './auth-context';
import api from '../services/api'

function getSavedUser() {
    try {
        const savedUser = localStorage.getItem('user');
        return savedUser ? JSON.parse(savedUser) : null;
    } catch {
        localStorage.removeItem('user');
        return null;
    }
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        const savedUser = getSavedUser();
        return savedUser ? { ...savedUser, role: savedUser.role || 'parent' } : null;
    })
    const [loading, setLoading] = useState(() => Boolean(getSavedUser()));
    const userId = user?.id;

    useEffect(() => {
        if (!userId) return undefined;

        let active = true;
        api.get('/users/me')
            .then(({ data }) => {
                if (!active) return;
                setUser(data);
                localStorage.setItem('user', JSON.stringify(data));
            })
            .catch(() => {
                if (!active) return;
                setUser(null);
                localStorage.removeItem('user');
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, [userId]);

    async function login(email, password){
        const response = await api.post('/users/login', { email, password})
        const { user: authenticatedUser } = response.data

        localStorage.setItem('user', JSON.stringify(authenticatedUser))

        setUser(authenticatedUser)
    }

    async function logout(){
        try {
            await api.post('/users/logout');
        } finally {
            localStorage.removeItem('user');
            setUser(null);
        }
    }

    return (
        <AuthContext.Provider value={{user, login, logout, loading, authenticated:!!user}}>
            {children}
        </AuthContext.Provider>
    )
}