const ExpenseController = require('../controllers/expense.js');
const UserController = require('../controllers/user.js');
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

const attachmentDirectory = path.resolve(__dirname, '../../uploads/receipts');
const allowedMimeTypes = {
    'application/pdf': { extension: 'pdf', signature: (buffer) => buffer.subarray(0, 5).toString() === '%PDF-' },
    'image/jpeg': { extension: 'jpg', signature: (buffer) => buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff },
    'image/png': { extension: 'png', signature: (buffer) => buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
    'image/webp': { extension: 'webp', signature: (buffer) => buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP' }
};

function isValidAttachment(file) {
    const format = allowedMimeTypes[file.mimetype];
    return format && format.signature(file.buffer) ? format : null;
}

async function saveAttachment(file) {
    if (!file) return {};

    const format = isValidAttachment(file);
    if (!format) {
        throw new Error('O arquivo deve ser um PDF ou uma imagem JPEG, PNG ou WEBP válida');
    }

    await fs.mkdir(attachmentDirectory, { recursive: true });
    const filePath = path.join(attachmentDirectory, `${crypto.randomUUID()}.${format.extension}`);
    await fs.writeFile(filePath, file.buffer, { flag: 'wx' });

    return {
        attachmentPath: filePath,
        attachmentName: path.basename(file.originalname.replace(/\\/g, '/')).slice(0, 255),
        attachmentMimeType: file.mimetype
    };
}

async function removeAttachment(filePath) {
    if (!filePath) return;
    await fs.unlink(filePath).catch((error) => {
        if (error.code !== 'ENOENT') throw error;
    });
}

async function getAccessibleUserIds(userId) {
    return UserController.getAccessibleUserIds(userId);
}

async function canAccessExpense(userId, expense) {
    if (!expense) return false;
    const accessibleUserIds = await getAccessibleUserIds(userId);
    return accessibleUserIds.includes(expense.userId);
}

class Expense {
    async getAll(req, res) {
        try {
            const accessibleUserIds = await getAccessibleUserIds(req.user.id);
            const selectedUserId = req.query.userId ? Number(req.query.userId) : null;
            if (selectedUserId && !accessibleUserIds.includes(selectedUserId)) {
                return res.status(403).json({ error: 'Você não tem acesso aos lançamentos deste usuário' });
            }
            const expenses = await ExpenseController.getAll(accessibleUserIds, selectedUserId);
            return res.status(200).json(expenses);
        } catch (error) {
            return res.status(400).json({ error: error.message });
        }
    }

    async getById(req, res) {
        try {
            const expense = await ExpenseController.getById(Number(req.params.id));
            if (!expense) {
                return res.status(404).json({ error: 'Lançamento não encontrado' });
            }
            if (!await canAccessExpense(req.user.id, expense)) {
                return res.status(403).json({ error: 'Você não tem acesso a este lançamento' });
            }
            return res.status(200).json(expense);
        } catch (error) {
            return res.status(400).json({ error: error.message });
        }
    }

    async create(req, res) {
        let attachment;
        try {
            const accessibleUserIds = await getAccessibleUserIds(req.user.id);
            const userId = Number(req.body.userId || req.user.id);
            if (!accessibleUserIds.includes(userId)) {
                return res.status(403).json({ error: 'Você não pode criar lançamentos para este usuário' });
            }

            attachment = await saveAttachment(req.file);
            const newExpense = await ExpenseController.create({
                categoryId: Number(req.body.categoryId),
                userId,
                title: req.body.title,
                amount: Number(req.body.amount),
                type: req.body.type,
                date: req.body.date,
                description: req.body.description,
                ...attachment
            });
            return res.status(201).json({ newExpense });
        } catch (error) {
            await removeAttachment(attachment?.attachmentPath);
            return res.status(400).json({ error: error.message });
        }
    }

    async update(req, res) {
        let attachment;
        try {
            const id = Number(req.params.id);
            const currentExpense = await ExpenseController.getById(id);
            if (!currentExpense) {
                return res.status(404).json({ error: 'Lançamento não encontrado' });
            }
            if (!await canAccessExpense(req.user.id, currentExpense)) {
                return res.status(403).json({ error: 'Você não tem acesso a este lançamento' });
            }

            attachment = await saveAttachment(req.file);
            const values = {
                categoryId: Number(req.body.categoryId),
                title: req.body.title,
                amount: Number(req.body.amount),
                type: req.body.type,
                date: req.body.date,
                description: req.body.description,
                ...(req.file ? attachment : {})
            };
            const expense = await ExpenseController.update(id, values);
            if (req.file) await removeAttachment(currentExpense.attachmentPath);
            return res.status(200).json({ expense });
        } catch (error) {
            await removeAttachment(attachment?.attachmentPath);
            return res.status(400).json({ error: error.message });
        }
    }

    async delete(req, res) {
        try {
            const id = Number(req.params.id);
            const expense = await ExpenseController.getById(id);
            if (!expense) {
                return res.status(404).json({ error: 'Lançamento não encontrado' });
            }
            if (!await canAccessExpense(req.user.id, expense)) {
                return res.status(403).json({ error: 'Você não tem acesso a este lançamento' });
            }
            await ExpenseController.delete(id);
            await removeAttachment(expense.attachmentPath);
            return res.status(204).json();
        } catch (error) {
            return res.status(400).json({ error: error.message });
        }
    }

    async getAttachment(req, res) {
        try {
            const expense = await ExpenseController.getById(Number(req.params.id));
            if (!expense) {
                return res.status(404).json({ error: 'Lançamento não encontrado' });
            }
            if (!await canAccessExpense(req.user.id, expense)) {
                return res.status(403).json({ error: 'Você não tem acesso a este comprovante' });
            }
            if (!expense.attachmentPath) {
                return res.status(404).json({ error: 'Este lançamento não possui comprovante' });
            }

            return res.download(expense.attachmentPath, expense.attachmentName, {
                headers: { 'Content-Type': expense.attachmentMimeType }
            });
        } catch (error) {
            return res.status(400).json({ error: error.message });
        }
    }

    async getTotal(req, res) {
        try {
            const userIds = await getAccessibleUserIds(req.user.id);
            const total = await ExpenseController.getSummaryTotal(userIds);
            return res.status(200).json({ total });
        } catch (error) {
            return res.status(400).json({ error: error.message });
        }
    }

    async getSumByCategory(req, res) {
        try {
            const userIds = await getAccessibleUserIds(req.user.id);
            const sumByCategory = await ExpenseController.getSumByCategory(userIds);
            return res.status(200).json(sumByCategory);
        } catch (error) {
            return res.status(400).json({ error: error.message });
        }
    }

    async getCount(req, res) {
        try {
            const userIds = await getAccessibleUserIds(req.user.id);
            const count = await ExpenseController.getCount(userIds);
            return res.status(200).json({ count });
        } catch (error) {
            return res.status(400).json({ error: error.message });
        }
    }
}

module.exports = new Expense();
