import express from 'express';
import cors from 'cors';
import { db, dbFile, versaoSchema } from './db.js';
import { palestrantesRouter } from './routes/palestrantes.js';
import { regioesRouter } from './routes/regioes.js';
import { reunioesRouter } from './routes/reunioes.js';
import { timesRouter } from './routes/times.js';
import { coordenadoresRouter } from './routes/coordenadores.js';
import { lembretesRouter } from './routes/lembretes.js';
import { agendarDisparoDiario } from './lembretes.js';

const PORT = process.env.PORT || 3001;

const app = express();

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// Usado pelo frontend para confirmar que a API e o banco estao no ar.
app.get('/api/health', (req, res) => {
  const contar = (tabela) =>
    db.prepare(`SELECT COUNT(*) AS n FROM ${tabela}`).get().n;

  res.json({
    status: 'ok',
    api: 'controlador-de-reunioes',
    banco: dbFile,
    versaoSchema,
    registros: {
      regioes: contar('regioes'),
      palestrantes: contar('palestrantes'),
      reunioes: contar('reunioes'),
      times: contar('times'),
      coordenadores: contar('coordenadores'),
    },
    hora: new Date().toISOString(),
  });
});

app.use('/api/regioes', regioesRouter);
app.use('/api/palestrantes', palestrantesRouter);
app.use('/api/reunioes', reunioesRouter);
app.use('/api/times', timesRouter);
app.use('/api/coordenadores', coordenadoresRouter);
app.use('/api/lembretes', lembretesRouter);

app.use((req, res) => {
  res.status(404).json({ erro: 'Rota não encontrada.' });
});

// Rede de seguranca: as constraints do banco (telefone fora do formato, choque
// de agenda, FK) virariam um erro cru de SQLite. Aqui viram 400 com mensagem.
app.use((erro, req, res, next) => {
  if (String(erro.code ?? '').startsWith('SQLITE_CONSTRAINT')) {
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
