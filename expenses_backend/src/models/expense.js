/*const expenses = require('../data/expenses');

let idCounter = 0;

class Expense {
    constructor(title, amount, category, date, description, createdAt) {
        this.id = idCounter++;
        this.title = title;
        this.amount = amount;
        this.category = category;
        this.date = date;
        this.description = description;
        this.createdAt = createdAt;
    }

    getAll(){
        return expenses;
    }

    getById(id){
        const index = expenses.findIndex(exp => exp.id == id);

        if (index === -1) {
            throw new Error("Error: Expense not found");
        }

        return expenses.find(expense => expense.id === id);
    }

    create(title, amount, category, date, description){
        //Data atual
        const createdAt = new Date().toISOString();
        const newExpense = new Expense(title, amount, category, date, description, createdAt);
  
        expenses.push(newExpense);

        return newExpense;
    }

    update(id, title, amount, category, date, description){
        const index = expenses.findIndex(exp => exp.id == id);

        if (index === -1) {
            throw new Error("Error: Expense not found");
        }
        const expense = expenses.find(expense => expense.id === id);
        //Verifica os valores que precisam ser alterdados.
        if (title) expense.title = title;
        if (amount) expense.amount = amount;
        if (category) expense.category = category;
        if (date) expense.date = new Date(date).toISOString();
        if (description) expense.description = description;

        return expense;
    }

    delete(id){
        const index = expenses.findIndex(exp => exp.id == id);

        if (index === -1) {
            throw new Error("Error: Expense not found");
        }

        expenses.splice(index, 1);

        return null
    }

    getSummaryTotal(){
        let total = 0;
        expenses.forEach(exp => total += exp.amount)

        return total.toFixed(2);
    }

    getSummaryCategory(){
        const sumCategory = expenses.reduce((acumulador, expense) => {
            if(!acumulador[expense.category]){
                acumulador[expense.category] = 0;
            }

            acumulador[expense.category] += expense.amount;

            return acumulador
        }, {});

        return sumCategory;
    }
}

module.exports = new Expense();*/

const { sequelize } = require('./db');
const { DataTypes } = require('sequelize');
const { Op } = require('sequelize');

const Expense = sequelize.define('expenses', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    categoryId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'categories',
            key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    type: {
        type: DataTypes.ENUM('income', 'expense'),
        allowNull: false,
        defaultValue: 'expense'
    },
    date: {
        type: DataTypes.DATEONLY
    },
    description: {
        type: DataTypes.TEXT
    },
    attachmentPath: {
        type: DataTypes.STRING
    },
    attachmentName: {
        type: DataTypes.STRING
    },
    attachmentMimeType: {
        type: DataTypes.STRING
    },
    createdAt: {
        type: DataTypes.DATE
    }

})

class ExpenseModel {
    constructor() {}

    async getAll(userIds, selectedUserId){
        const where = {
            userId: selectedUserId || { [Op.in]: userIds }
        };
        return await Expense.findAll({
            where,
            order: [['date', 'DESC'], ['id', 'DESC']]
        });
    }

    async getById(id){
        return await Expense.findByPk(id);
    }

    async create(values){
        return await Expense.create(values)
    }

    async update(id, values) {
        const expense = await this.getById(id);

        if(!expense){
            return null;
        }

        Object.assign(expense, values);

        await expense.save();
        return expense;
    }

    async deleteExpense(id) {
        const expense = await this.getById(id);

        if (!expense) {
            return null
        }

        await expense.destroy();
        return null;
    }

    async getSummaryTotal(userIds) {
        const expenses = await Expense.findAll({
            where: { userId: { [Op.in]: userIds } },
            attributes: ['amount', 'type']
        });
        return expenses.reduce((total, expense) => {
            const amount = Number(expense.amount);
            return total + (expense.type === 'income' ? amount : -amount);
        }, 0).toFixed(2);
    }

    async getSumByCategory(userIds){
        const expenses = await Expense.findAll({
            where: { userId: { [Op.in]: userIds } }
        });

        const sumCategory = expenses.reduce((acumulador, expense) => {
                if(!acumulador[expense.categoryId]){
                    acumulador[expense.categoryId] = 0;
                }

                acumulador[expense.categoryId] += expense.amount;

                return acumulador
            }, {});

            return sumCategory;
    }

    async getCount(userIds) {
        return await Expense.count({
            where: { userId: { [Op.in]: userIds } }
        });
    }
}

const expenseModel = new ExpenseModel();
expenseModel.Expense = Expense;

module.exports = expenseModel;