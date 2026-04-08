# The Barber Hub

Projeto reorganizado em duas camadas:

- `frontend`: aplicação React + Vite (interface web)
- `backend`: API Node.js + Express (base para regras de negócio e integração com banco)

## Estrutura

```txt
.
├── frontend/
├── backend/
└── README.md
```

## Como rodar

1. Instale as dependências do frontend:

```bash
npm install --prefix frontend
```

2. Instale as dependências do backend:

```bash
npm install --prefix backend
```

3. Rode o frontend:

```bash
npm run dev:frontend
```

4. Em outro terminal, rode o backend:

```bash
npm run dev:backend
```

## Conexao Frontend <-> Backend

O frontend usa a variavel `VITE_API_URL` para apontar para a API.

- Localmente: `VITE_API_URL=http://localhost:3001`
- Em producao (Vercel): `VITE_API_URL=https://seu-backend.onrender.com`

No backend, configure CORS para aceitar o dominio da Vercel:

- `FRONTEND_ORIGIN=https://seu-frontend.vercel.app`
- `CORS_ORIGINS=https://seu-frontend.vercel.app,http://localhost:8080`

Existe um health check em `GET /api/health`, e o frontend valida essa conexao ao iniciar.

## Deploy separado (seu cenario)

1. Copie a pasta `backend` para um novo repositorio.
2. No novo repositorio do backend, rode `npm install`.
3. Faça deploy do backend no Render com:
	- Build command: `npm install`
	- Start command: `npm start`
	- Environment variables: `FRONTEND_ORIGIN`, `CORS_ORIGINS`
4. Faça deploy do frontend na Vercel.
5. Na Vercel, configure `VITE_API_URL` com a URL publica do Render.
6. Redeploy do frontend.

## Scripts úteis na raiz

- `npm run dev` -> inicia frontend
- `npm run dev:frontend` -> inicia frontend
- `npm run dev:backend` -> inicia backend
- `npm run build` -> build do frontend
- `npm run test` -> testes do frontend

## Backend inicial

O backend foi criado com uma rota de saúde:

- `GET /api/health`

Arquivo principal: `backend/src/server.js`

Use `backend/.env.example` como base para variáveis de ambiente.
