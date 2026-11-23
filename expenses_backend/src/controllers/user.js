const UserModel = require('../models/user.js');
const jwt = require('jsonwebtoken');
const authConfig = require('../config/auth');
const crypto = require('crypto');
const { promisify } = require('util');

const scrypt = promisify(crypto.scrypt);

async function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const key = await scrypt(password, salt, 64);
    return `scrypt$${salt}$${key.toString('hex')}`;
}

async function verifyPassword(password, storedPassword) {
    if (typeof password !== 'string' || typeof storedPassword !== 'string' || !storedPassword.startsWith('scrypt$')) {
        return false;
    }

    const [, salt, storedKey] = storedPassword.split('$');
    if (!/^[a-f0-9]{32}$/i.test(salt) || !/^[a-f0-9]{128}$/i.test(storedKey)) {
        return false;
    }
    const key = await scrypt(password, salt, 64);
    return crypto.timingSafeEqual(key, Buffer.from(storedKey, 'hex'));
}

class User {
    constructor(){
    }

    async login(email, password){
        if (typeof email !== 'string' || typeof password !== 'string' || !password) {
            throw new Error('Credenciais inválidas');
        }

        email = email.trim().toLowerCase();
        const user = await UserModel.getUserByEmail(email);

        if (!user || !await verifyPassword(password, user.password)) {
            throw new Error('Credenciais inválidas');
        }

        const token = jwt.sign(
            { id: user.id, email: user.email },
            authConfig.jwt.secret,
            {
                algorithm: 'HS256',
                expiresIn: authConfig.jwt.expiresIn,
                issuer: authConfig.jwt.issuer,
                audience: authConfig.jwt.audience
            }
        );

        return {
            token,
            user: this.mapPublicUser(user)
        };
    }

    mapPublicUser(user) {
        const userData = user.dataValues || user;

        return {
            id: userData.id,
            name: userData.name,
            email: userData.email,
            role: userData.role,
            parentId: userData.parentId
        };
    }

    getAll(){
        return UserModel.getAll();
    }

    getById(id){
        if(!id) {
            throw new Error("Missing required fields: id");
        }

        return UserModel.getById(id);
    }

    async create(name, email, password, role = 'parent', parentId = null){
        if(typeof name !== 'string' || !name.trim() || name.trim().length > 100) {
            throw new Error("Missing required fields: name");
        }
        if(typeof email !== 'string' || email.trim().length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            throw new Error("Missing required fields: email");
        }
        if(typeof password !== 'string' || password.length < 8 || password.length > 128) {
            throw new Error("A senha deve ter entre 8 e 128 caracteres");
        }

        email = email.trim().toLowerCase();
        name = name.trim();
        const existingUser = await UserModel.getUserByEmail(email);
        if (existingUser) {
            throw new Error('Já existe um usuário com este e-mail');
        }

        return UserModel.create(name, email, await hashPassword(password), role, parentId);
    }

    async migrateLegacyPasswords() {
        const users = await UserModel.getPasswordRecords();
        for (const user of users) {
            if (typeof user.password !== 'string' || user.password.startsWith('scrypt$')) {
                continue;
            }
            await UserModel.updatePassword(user.id, await hashPassword(user.password));
        }
    }

    async getDependents(parentId) {
        return UserModel.getDependents(parentId);
    }

    async createDependent(parentId, name, email, password) {
        const parent = await UserModel.getById(parentId);
        if (!parent || parent.role !== 'parent') {
            throw new Error('Apenas responsáveis podem cadastrar dependentes');
        }

        return this.create(name, email, password, 'child', parent.id);
    }

    async getAccessibleUserIds(id) {
        return UserModel.getAccessibleUserIds(id);
    }
}

module.exports = new User()