const jwt = require('jsonwebtoken');
const authConfig = require('../config/auth');

module.exports = function authMiddleware(req, res, next) {
    const token = req.cookies?.[authConfig.session.cookieName];
    if (!token) {
        return res.status(401).json({ error: 'Token não informado' });
    }

    try {
        const decoded = jwt.verify(token, authConfig.jwt.secret, {
            algorithms: ['HS256'],
            issuer: authConfig.jwt.issuer,
            audience: authConfig.jwt.audience
        });
        if (!Number.isSafeInteger(decoded.id) || !decoded.email || !decoded.exp) {
            return res.status(401).json({ error: 'Sessão inválida' });
        }
        req.user = {
            id: decoded.id,
            email: decoded.email
        };
        return next();
    } catch (error) {
        return res.status(401).json({ error: 'Token inválido ou expirado' });
    }
};