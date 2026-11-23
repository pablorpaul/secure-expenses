# Secure Expenses

Sistema familiar de controle financeiro com receitas, despesas, comprovantes e controle parental. O projeto tem uma interface React/Vite (`expenses_frontend`) e uma API Express/Sequelize (`expenses_backend`).

## Executar localmente

1. Instale as dependências em `expenses_backend` e `expenses_frontend`:

   ```powershell
   cd expenses_backend
   npm install
   ```

2. Crie `expenses_backend/.env` a partir de `.env.example` e preencha as credenciais do MySQL. Gere um segredo JWT aleatório com pelo menos 32 bytes:

   ```powershell
   node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
   ```

   Copie o resultado para `JWT_SECRET` no arquivo `.env`. O backend não inicia se o segredo estiver ausente ou tiver menos de 32 bytes. Nunca reutilize o exemplo como segredo.

3. Inicie o backend:

   ```powershell
   cd expenses_backend
   npm run dev
   ```

4. Em outro terminal, inicie o frontend:

   ```powershell
   cd expenses_frontend
   npm install
   npm run dev
   ```

   O frontend local usa `http://localhost:5173` e a API usa `http://localhost:3000/api`. Para outros endereços, configure `FRONTEND_ORIGINS` no backend e `VITE_API_URL` no ambiente de build do frontend. As origens devem conter protocolo e domínio, sem caminho.

## Proteções de segurança

### SQL injection e acesso ao banco

- O backend acessa o MySQL por modelos Sequelize e métodos ORM (`findByPk`, `findOne`, `create`, `update`), que enviam valores como parâmetros.

### XSS e conteúdo ativo

- A interface renderiza texto com React, que escapa valores por padrão.
- A política CSP no `index.html` restringe scripts a `'self'`, bloqueia objetos e limita conexões à origem da API. O Vite substitui o endereço da API com `VITE_API_URL` durante o desenvolvimento e o build.
- O Express usa Helmet para cabeçalhos de segurança da API; o servidor Vite também define `X-Content-Type-Options`, `X-Frame-Options` e `Referrer-Policy`.

### CSRF e origens confiáveis

- A sessão usa cookie `HttpOnly` com `SameSite=Strict`, não um token em cookie acessível por JavaScript nem um bearer token enviado automaticamente por `localStorage`.
- Operações que alteram dados validam o cabeçalho `Origin`; uma requisição autenticada por cookie sem origem é rejeitada. O CORS aceita apenas as origens configuradas em `FRONTEND_ORIGINS` e não habilita acesso de qualquer site.
- O cliente Axios envia cookies apenas nas chamadas à API (`withCredentials`). Não relaxe `SameSite`, CORS ou a validação de origem sem adotar uma proteção CSRF equivalente.

### Autenticação, senhas e sequestro de sessão

- Senhas novas são armazenadas com `scrypt`, salt aleatório e comparação em tempo constante. O cadastro exige senha de 8 a 128 caracteres.
- Na inicialização, o backend converte os registros legados em texto puro para hashes `scrypt` antes de aceitar requisições. O login não aceita senhas armazenadas sem hash.
- A mudança para cookies invalida sessões antigas armazenadas como bearer token no navegador; cada usuário precisa entrar novamente após atualizar o backend.
- `JWT_SECRET` é obrigatório e deve ter pelo menos 32 bytes aleatórios; não existe segredo padrão no código. Tokens são assinados e verificados com HS256, emissor, audiência e expiração.
- O JWT fica em cookie `HttpOnly`, `SameSite=Strict`, com validade padrão de 8 horas; em `NODE_ENV=production`, o cookie também exige HTTPS (`Secure`). O logout limpa o cookie. A interface consulta `/users/me` ao iniciar para validar a sessão.
- Login e cadastro têm limites de requisições para reduzir tentativas automatizadas. Se a API for executada em várias instâncias, configure um armazenamento compartilhado para o limitador, pois o padrão mantém contadores em memória por processo.
- Em produção, HTTPS é obrigatório: `Secure` e HSTS protegem o transporte, enquanto `HttpOnly` impede leitura direta do cookie por JavaScript. Código malicioso executado na origem ainda pode tentar realizar ações em nome do usuário; mantenha CSP e dependências atualizadas.
- A interface e a API devem ser servidas no mesmo site (por exemplo, `app.exemplo.com` e `api.exemplo.com`) para que o cookie `SameSite=Strict` seja enviado.

### Validação e atribuição de campos

- Os controllers validam os dados no servidor.
- O cadastro público aceita somente nome, e-mail e senha. Papel e vínculo parental são definidos pelo backend; o cliente não pode se promover a responsável nem vincular a conta a outro responsável.
- Receitas/despesas usam uma lista explícita de campos permitidos; valores, datas e tipo são validados antes da persistência. A autorização também confere se o responsável tem acesso ao dependente solicitado.
- O corpo JSON tem limite de 16 KB. Anexos aceitam apenas PDF/JPEG/PNG/WEBP, com limite de 5 MB e verificação de assinatura do arquivo; os arquivos ficam fora do diretório público e o download exige autorização.
