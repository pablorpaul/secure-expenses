const { sequelize } = require('./db');
const { DataTypes } = require('sequelize');

const User = sequelize.define('users', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    role: {
        type: DataTypes.ENUM('parent', 'child'),
        allowNull: false,
        defaultValue: 'parent'
    },
    parentId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    }
})

class UserModel {
    constructor() {}

    async getUserByEmail(email) {
        return await User.findOne({ where: { email }})
    }

    async getAll(){
        return await User.findAll();
    }

    async getById(id){
        return await User.findByPk(id);
    }

    async create(name, email, password, role = 'parent', parentId = null){
        return await User.create({ name, email, password, role, parentId })
    }

    async updatePassword(id, password) {
        await User.update({ password }, { where: { id } });
    }

    async getPasswordRecords() {
        return User.findAll({
            attributes: ['id', 'password']
        });
    }

    async getDependents(parentId) {
        return await User.findAll({
            where: { parentId },
            attributes: ['id', 'name', 'email', 'role', 'parentId'],
            order: [['name', 'ASC']]
        });
    }

    async getAccessibleUserIds(id) {
        const user = await this.getById(id);
        if (!user) {
            return [];
        }

        if (user.role !== 'parent') {
            return [user.id];
        }

        const dependents = await User.findAll({
            where: { parentId: user.id },
            attributes: ['id']
        });
        return [user.id, ...dependents.map((dependent) => dependent.id)];
    }
}

const userModel = new UserModel();
userModel.User = User;

module.exports = userModel;