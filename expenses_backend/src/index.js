const express = require('express');
const cors = require('cors');
const multer = require('multer');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const { rateLimit } = require('express-rate-limit');
const Expense = require('../src/views/expense.js');
const Categories = require('../src/views/category.js');
const Users = require('../src/views/user.js');
const UserController = require('./controllers/user');
const { sequelize } = require('./models/db');
const authMiddleware = require('./middleware/auth');
const authConfig = require('./config/auth');
require('./models/associations');

const allowedOrigins = new Set(
    (process.env.FRONTEND_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean)
);

if (allowedOrigins.size === 0) {
    throw new Error('Configure ao menos uma origem confiável em FRONTEND_ORIGINS');
}

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Muitas tentativas de login. Tente novamente em alguns minutos.' }
});

const registrationLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Muitas tentativas de cadastro. Tente novamente mais tarde.' }
});

const uploadAttachment = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, callback) => {
        const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
        if (!allowedMimeTypes.includes(file.mimetype)) {
            return callback(new Error('Anexe um PDF ou uma imagem JPEG, PNG ou WEBP de até 5 MB'));
        }
        return callback(null, true);
    }
}).single('attachment');

function handleAttachmentUpload(req, res, next) {
    uploadAttachment(req, res, (error) => {
        if (error) {
            return res.status(400).json({ error: error.message });
        }
        return next();
    });
}

const app = express();
const PORT = 3000;

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, false);
        return callback(null, allowedOrigins.has(origin) ? origin : false);
    },
    credentials: true
}));
app.use(express.json({ limit: '16kb' }));
app.use(cookieParser());
app.use('/api', (req, res, next) => {
    const origin = req.get('origin');
    const safeMethod = ['GET', 'HEAD', 'OPTIONS'].includes(req.method);

    if (origin && !allowedOrigins.has(origin)) {
        return res.status(403).json({ error: 'Origem não autorizada' });
    }
    if (!safeMethod && req.cookies?.[authConfig.session.cookieName] && !origin) {
        return res.status(403).json({ error: 'Origem obrigatória para esta operação' });
    }
    return next();
});

app.get('/api/expenses', authMiddleware, Expense.getAll);
app.get('/api/expenses/:id', authMiddleware, Expense.getById);
app.post('/api/expenses', authMiddleware, handleAttachmentUpload, Expense.create);
app.put('/api/expenses/:id', authMiddleware, handleAttachmentUpload, Expense.update);
app.delete('/api/expenses/:id', authMiddleware, Expense.delete);
app.get('/api/expenses/:id/attachment', authMiddleware, Expense.getAttachment);
app.get('/api/expenses/summary/total', authMiddleware, Expense.getTotal);
app.get('/api/expenses/summary/category', authMiddleware, Expense.getSumByCategory);
app.get('/api/expenses/summary/count', authMiddleware, Expense.getCount);

app.get('/api/categories', authMiddleware, Categories.getAll);
app.get('/api/categories/:id', authMiddleware, Categories.getById);
app.post('/api/categories', authMiddleware, Categories.create);
app.put('/api/categories/:id', authMiddleware, Categories.update);
app.delete('/api/categories/:id', authMiddleware, Categories.delete);

app.post('/api/users/login', loginLimiter, Users.login)
app.post('/api/users/logout', Users.logout);
app.get('/api/users/me', authMiddleware, Users.getCurrent);
app.post('/api/users', registrationLimiter, Users.create);
app.get('/api/users/dependents', authMiddleware, Users.getDependents);
app.post('/api/users/dependents', authMiddleware, Users.createDependent);

async function main() {
    try {
        await sequelize.authenticate();
        await sequelize.sync({ alter: true });
        await UserController.migrateLegacyPasswords();
        console.log('Conexão com o banco de dados estabelecida e senhas legadas protegidas.');
        app.listen(PORT, () => {
            console.info(`Servidor rodando em http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('Nâo foi possível conectar ao banco de dados:', error);
    }
}

main();