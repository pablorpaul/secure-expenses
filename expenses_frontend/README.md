# Sistema de Controle de Despesas Pessoais

Aplicação web para registro de receitas e despesas, organização por categorias e acompanhamento das finanças pessoais. A interface React consome a API Express/Sequelize do diretório `expenses_backend`.

---

## Funcionalidades

- **Dashboard:** saldo (receitas menos despesas), totais e histórico recente com filtros de tipo, data e conta.
- **Cadastro de usuários:** criação de conta de responsável com nome, e-mail e senha; dependentes são cadastrados pelo responsável no controle parental.
- **Lançamentos:** cadastro de receitas e despesas, busca e filtros por tipo e período; permite anexar comprovantes PDF, JPEG, PNG ou WEBP de até 5 MB.
- **Controle parental:** responsáveis podem criar contas vinculadas para dependentes e visualizar, criar, editar e excluir os lançamentos da família.
- **Categorias:** cadastro e organização das categorias financeiras.

---

## Tecnologias Utilizadas

React, React Router.

