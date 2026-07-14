import express from 'express';
import cors from 'cors';
import { db, dbFile, versaoSchema } from './db.js';

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
    },
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
