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
    if (!storedPassword.startsWith('scrypt$')) {
        return storedPassword === password;
    }

    const [, salt, storedKey] = storedPassword.split('$');
    if (!salt || !storedKey || !/^[a-f0-9]{128}$/i.test(storedKey)) {
        return false;
    }
    const key = await scrypt(password, salt, 64);
    return crypto.timingSafeEqual(key, Buffer.from(storedKey, 'hex'));
}

class User {
    constructor(){
    }

    async login(email, password){
        const user = await UserModel.getUserByEmail(email);

        if (!user || !await verifyPassword(password, user.password)) {
            throw new Error('Credenciais inválidas');
        }
        if (!user.password.startsWith('scrypt$')) {
            await UserModel.updatePassword(user.id, await hashPassword(password));
        }

        const token = jwt.sign(
            { id: user.id, email: user.email },
            authConfig.jwt.secret,
            { expiresIn: authConfig.jwt.expiresIn }
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
        if(!name?.trim()) {
            throw new Error("Missing required fields: name");
        }
        if(!email?.trim()) {
            throw new Error("Missing required fields: email");
        }
        if(!password || password.length < 6) {
            throw new Error("A senha deve ter pelo menos 6 caracteres");
        }

        email = email.trim().toLowerCase();
        const existingUser = await UserModel.getUserByEmail(email);
        if (existingUser) {
            throw new Error('Já existe um usuário com este e-mail');
        }

        return UserModel.create(name, email, await hashPassword(password), role, parentId);
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