require('dotenv').config();

const secret = process.env.JWT_SECRET;
if (!secret || Buffer.byteLength(secret, 'utf8') < 32) {
    throw new Error('JWT_SECRET é obrigatório e deve ter pelo menos 32 bytes aleatórios');
}

module.exports = {
    jwt: {
        secret,
        expiresIn: process.env.JWT_EXPIRES_IN || '8h',
        issuer: 'secure-expenses-api',
        audience: 'secure-expenses-client'
    },
    session: {
        cookieName: 'secure_expenses_session',
        cookieOptions: {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/api',
            maxAge: 8 * 60 * 60 * 1000
        }
    }
};