const ExpenseModel = require('../models/expense.js');

class Expense {
    constructor(){
    }

    async getAll(userIds, selectedUserId){
        return await ExpenseModel.getAll(userIds, selectedUserId);
    }

    async getById(id){
        if (!id) {
            throw new Error("Missing required fields: id");
        }

        return await ExpenseModel.getById(id);
    }

    async create(values){
        const { title, amount, date } = values;
        if (!title || !values.categoryId || !values.userId || !date) {
            throw new Error("Preencha os campos obrigatórios");
        }
        if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
            throw new Error("O valor deve ser maior que zero");
        }
        if (!['income', 'expense'].includes(values.type)) {
            throw new Error("Tipo de lançamento inválido");
        }
        if (Number.isNaN(Date.parse(date)) || Date.parse(date) > Date.now()) {
            throw new Error("A data informada é inválida ou futura");
        }
        return ExpenseModel.create(values);
    }

    async update(id, values){
        if (!id){
            throw new Error("Missing required fields: id");
        }
        if (!values.title) {
            throw new Error("Missing required fields: title");
        }
        if (!Number.isFinite(Number(values.amount)) || Number(values.amount) <= 0) {
            throw new Error("O valor deve ser maior que zero");
        }
        if (!['income', 'expense'].includes(values.type)) {
            throw new Error("Tipo de lançamento inválido");
        }
        if (!values.date || Number.isNaN(Date.parse(values.date)) || Date.parse(values.date) > Date.now()) {
            throw new Error("A data informada é inválida ou futura");
        }
        const expense = await ExpenseModel.update(id, values);
        if(!expense){
            throw new Error("Expense not found");
        }
        return expense;
    }

    async delete(id){
        if (!id){
            throw new Error("Missing required fields: id");
        }
        return await ExpenseModel.deleteExpense(id);
    }

    getSummaryTotal(userIds){
        return ExpenseModel.getSummaryTotal(userIds);
    }

    async getSumByCategory(userIds){
        return await ExpenseModel.getSumByCategory(userIds);
    }

    async getCount(userIds){
        return await ExpenseModel.getCount(userIds);
    }
}

module.exports = new Expense();