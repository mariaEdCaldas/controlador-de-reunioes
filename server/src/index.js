import express from 'express';
import cors from 'cors';
import { db, dbFile } from './db.js';

const PORT = process.env.PORT || 3001;

const app = express();

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// Usado pelo frontend para confirmar que a API e o banco estao no ar.
app.get('/api/health', (req, res) => {
  const { valor: versaoSchema } = db
    .prepare(`SELECT valor FROM schema_info WHERE chave = 'versao'`)
    .get();

  res.json({
    status: 'ok',
    api: 'controlador-de-reunioes',
    banco: dbFile,
    versaoSchema,
    hora: new Date().toISOString(),
  });
});

app.use((req, res) => {
  res.status(404).json({ erro: 'Rota nao encontrada' });
});

app.listen(PORT, () => {
  console.log(`[server] API rodando em http://localhost:${PORT}`);
  console.log(`[server] Banco SQLite em ${dbFile}`);
});
