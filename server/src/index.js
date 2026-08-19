import express from 'express';
import 'express-async-errors'; // faz erros de handlers async caírem no tratador
import cors from 'cors';
import { db, dbFile, versaoSchema } from './db.js';
import { palestrantesRouter } from './routes/palestrantes.js';
import { regioesRouter } from './routes/regioes.js';
import { reunioesRouter } from './routes/reunioes.js';
import { timesRouter } from './routes/times.js';
import { coordenadoresRouter } from './routes/coordenadores.js';
import { lembretesRouter } from './routes/lembretes.js';
import { propostasRouter } from './routes/propostas.js';
import { cabosRouter } from './routes/cabos.js';
import { cadastrosRouter } from './routes/cadastros.js';
import { authRouter } from './routes/auth.js';
import { usuariosRouter } from './routes/usuarios.js';
import { exigirLogin } from './auth.js';
import { agendarDisparoDiario } from './lembretes.js';

const PORT = process.env.PORT || 3001;

const app = express();

// Origens permitidas: em produção, o endereço da tela (Vercel), via CORS_ORIGIN
// (aceita vários separados por vírgula). Local, o Vite em 5173.
const origensPermitidas = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
app.use(cors({ origin: origensPermitidas }));
app.use(express.json());

// Usado pelo frontend para confirmar que a API e o banco estao no ar.
app.get('/api/health', async (req, res) => {
  const contar = async (tabela) =>
    (await db.prepare(`SELECT COUNT(*) AS n FROM ${tabela}`).get()).n;

  res.json({
    status: 'ok',
    api: 'controlador-de-reunioes',
    banco: dbFile,
    versaoSchema,
    registros: {
      regioes: await contar('regioes'),
      palestrantes: await contar('palestrantes'),
      reunioes: await contar('reunioes'),
      times: await contar('times'),
      coordenadores: await contar('coordenadores'),
    },
    hora: new Date().toISOString(),
  });
});

// Público: login/bootstrap (sem token).
app.use('/api/auth', authRouter);

// Daqui para baixo, tudo exige estar logado.
app.use('/api', exigirLogin);

app.use('/api/usuarios', usuariosRouter);
app.use('/api/regioes', regioesRouter);
app.use('/api/palestrantes', palestrantesRouter);
app.use('/api/reunioes', reunioesRouter);
app.use('/api/times', timesRouter);
app.use('/api/coordenadores', coordenadoresRouter);
app.use('/api/lembretes', lembretesRouter);
app.use('/api/propostas', propostasRouter);
app.use('/api/cabos', cabosRouter);
app.use('/api/cadastros', cadastrosRouter);

app.use((req, res) => {
  res.status(404).json({ erro: 'Rota não encontrada.' });
});

// Rede de seguranca: as constraints do banco (telefone fora do formato, choque
// de agenda, FK) virariam um erro cru de SQLite. Aqui viram 400 com mensagem.
app.use((erro, req, res, next) => {
  // Erros de constraint do SQLite/libsql (UNIQUE, FK, CHECK) viram 400 amigável.
  const texto = `${erro.code ?? ''} ${erro.message ?? ''}`;
  if (/SQLITE_CONSTRAINT|constraint failed|UNIQUE|FOREIGN KEY/i.test(texto)) {
    console.error('[server] constraint do banco:', erro.message);
    return res.status(400).json({ erro: 'Dados inválidos.', detalhe: erro.message });
  }
  console.error('[server] erro inesperado:', erro);
  res.status(500).json({ erro: 'Erro interno no servidor.' });
});

app.listen(PORT, () => {
  console.log(`[server] API rodando em http://localhost:${PORT}`);
  console.log(`[server] Banco SQLite em ${dbFile}`);
  // Confere as reuniões de amanhã uma vez por dia e envia os lembretes.
  agendarDisparoDiario();
});
