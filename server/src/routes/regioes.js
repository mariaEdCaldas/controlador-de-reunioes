import { Router } from 'express';
import { db } from '../db.js';

export const regioesRouter = Router();

/**
 * GET /api/regioes
 * Alimenta os selects de bairro no frontend. A lista vem do banco (migrations),
 * então cadastro de palestrante e de reunião usam o mesmo vocabulário — condição
 * para a sugestão por proximidade (RN-03).
 */
regioesRouter.get('/', async (req, res) => {
  res.json(await db.prepare('SELECT id, nome FROM regioes ORDER BY nome COLLATE NOCASE').all());
});

/**
 * POST /api/regioes  - body: { nome }
 * Cria um bairro/região novo — usado quando a pessoa digita um bairro que ainda
 * não existe. Se já existir (sem diferenciar acento/caixa), devolve o que já
 * está lá, sem duplicar.
 */
regioesRouter.post('/', async (req, res) => {
  const nome = String(req.body.nome ?? '').trim();
  if (!nome) return res.status(400).json({ erro: 'Informe o nome do bairro/região.' });

  const existente = await db
    .prepare('SELECT id, nome FROM regioes WHERE nome = ? COLLATE NOCASE')
    .get(nome);
  if (existente) return res.json(existente);

  const { lastInsertRowid } = await db.prepare('INSERT INTO regioes (nome) VALUES (?)').run(nome);
  res.status(201).json(await db.prepare('SELECT id, nome FROM regioes WHERE id = ?').get(lastInsertRowid));
});
