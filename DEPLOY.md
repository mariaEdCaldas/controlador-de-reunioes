# Publicar o sistema (grátis)

O sistema tem 3 peças na nuvem, todas com plano gratuito:

| Peça | Serviço | O que é |
|------|---------|---------|
| 🗄️ Banco de dados | **Turso** | Guarda os dados (é o nosso SQLite, hospedado). |
| ⚙️ Servidor (API) | **Render** | Roda o `server/` (Node). |
| 🖥️ Tela | **Vercel** | Serve o `client/` (React). |

A ordem é: **Turso → Render → Vercel**. No fim, você abre o link da Vercel e cria o primeiro acesso.

> Você não precisa mexer em código. É só criar as contas e copiar/colar alguns valores.

---

## Passo 1 — Banco de dados (Turso)

1. Entre em **https://turso.tech** e crie uma conta (dá para entrar com GitHub).
2. Crie um banco (**Create Database**). Escolha a região mais perto (ex.: `São Paulo / gru`).
3. Na tela do banco, pegue **dois valores** (guarde-os):
   - **Database URL** — parece `libsql://seu-banco-xxxx.turso.io`
   - **Token** — clique em **Create Token** (ou "Generate token") e copie o texto gerado.

Pronto. O banco começa vazio; as tabelas são criadas sozinhas quando o servidor subir.

---

## Passo 2 — Servidor / API (Render)

1. Entre em **https://render.com** e crie uma conta (pode ser com GitHub).
2. **New +** → **Web Service** → conecte o repositório `controlador-de-reunioes`.
3. Configure:
   - **Root Directory:** `server`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** `Free`
4. Em **Environment** (variáveis de ambiente), adicione:

   | Nome | Valor |
   |------|-------|
   | `DATABASE_URL` | a *Database URL* do Turso (Passo 1) |
   | `DATABASE_TOKEN` | o *Token* do Turso (Passo 1) |
   | `JWT_SEGREDO` | invente uma frase longa e aleatória (ex.: 30+ letras) |
   | `CORS_ORIGIN` | deixe em branco por enquanto (preenche no Passo 4) |

   *(Opcional, se quiser os lembretes por e-mail: `SMTP_USER` e `SMTP_PASS` — ver `server/.env.example`.)*
5. **Create Web Service** e aguarde o build. No fim, o Render te dá um endereço tipo
   `https://controlador-de-reunioes.onrender.com` — **guarde**.
6. Teste: abra `SEU-ENDERECO-RENDER/api/health` no navegador. Deve responder um JSON com `"status":"ok"`.

> Nota do plano grátis: o servidor "dorme" após ~15 min sem uso e leva alguns segundos para acordar na primeira visita. Normal.

---

## Passo 3 — Tela (Vercel)

1. Entre em **https://vercel.com** e crie a conta (com GitHub).
2. **Add New… → Project** → importe o repositório.
3. Configure:
   - **Root Directory:** `client`
   - **Framework Preset:** `Vite` (deve detectar sozinho)
4. Em **Environment Variables**, adicione:

   | Nome | Valor |
   |------|-------|
   | `VITE_API_URL` | o endereço do Render (Passo 2), ex.: `https://controlador-de-reunioes.onrender.com` |

5. **Deploy**. No fim, a Vercel te dá um link tipo `https://seu-app.vercel.app` — **guarde**.

---

## Passo 4 — Amarrar tela ↔ servidor (CORS)

1. Volte ao **Render** → seu serviço → **Environment**.
2. Edite `CORS_ORIGIN` e coloque o link da **Vercel** (Passo 3), ex.:
   `https://seu-app.vercel.app`
3. Salve (o Render reinicia sozinho).

---

## Passo 5 — Primeiro acesso

1. Abra o link da **Vercel**.
2. Vai aparecer **"Criar primeiro acesso"** — crie a conta de administradora (nome, e-mail, senha).
3. Pronto! A partir daí é só usar. Novos usuários se criam dentro do sistema, na aba **Usuários**.

---

## Dúvidas comuns

- **"A tela abre mas dá erro de conexão."** Confira se `VITE_API_URL` (Vercel) está com o endereço certo do Render e se `CORS_ORIGIN` (Render) tem o endereço da Vercel.
- **"Demorou pra abrir na primeira vez."** É o servidor grátis acordando (Passo 2). Depois fica rápido.
- **Trocar de plano depois?** Se quiser tirar a espera do "servidor dormindo", o plano pago mais baixo do Render (~US$7/mês) deixa sempre ligado. Nada no código muda.

## Rodando localmente (sem nuvem)

Continua igual: `npm run dev` na raiz. Sem as variáveis `DATABASE_URL`/`DATABASE_TOKEN`, o sistema usa um arquivo SQLite local (`server/data/agenda.db`).
