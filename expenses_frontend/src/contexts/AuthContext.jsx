import { useState } from 'react';
import { AuthContext } from './auth-context';
import api from '../services/api'

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        const token = localStorage.getItem('token')
        const savedUser = localStorage.getItem('user')

        if (token && savedUser) {
            const parsedUser = JSON.parse(savedUser)
            return { ...parsedUser, role: parsedUser.role || 'parent' }
        }
        return null
    })
    const loading = false

    async function login(email, password){
        const response = await api.post('/users/login', { email, password})
        const { data } = response
        const { token, user } = data

        localStorage.setItem('token', token)
        localStorage.setItem('user', JSON.stringify(user))

        setUser(user)
    }

    async function logout(){
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        setUser(null)
    }

    return (
        <AuthContext.Provider value={{user, login, logout, loading, authenticated:!!user}}>
            {children}
        </AuthContext.Provider>
    )
}