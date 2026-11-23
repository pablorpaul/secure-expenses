const express = require('express');
const cors = require('cors');
const multer = require('multer');
const Expense = require('../src/views/expense.js');
const Categories = require('../src/views/category.js');
const Users = require('../src/views/user.js');
const { sequelize } = require('./models/db');
const authMiddleware = require('./middleware/auth');
require('./models/associations');

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

app.use(cors());
app.use(express.json());

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

app.post('/api/users/login', Users.login)
app.post('/api/users', Users.create);
app.get('/api/users/dependents', authMiddleware, Users.getDependents);
app.post('/api/users/dependents', authMiddleware, Users.createDependent);

async function main() {
    try {
        await sequelize.authenticate();
        await sequelize.sync({ alter: true });
        console.log('Conexâo com o banco de dados estabelecida com sucesso.');
        app.listen(PORT, () => {
            console.info(`Servidor rodando em http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('Nâo foi possível conectar ao banco de dados:', error);
    }
}

main();