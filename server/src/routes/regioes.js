import { Router } from 'express';
import { db } from '../db.js';

export const regioesRouter = Router();

/**
 * GET /api/regioes
 * Alimenta os selects de bairro no frontend. A lista e fixa e vem do banco
 * (migration 002), entao cadastro de palestrante e de reuniao usam exatamente
 * o mesmo vocabulario - condicao para a sugestao por proximidade (RN-03).
 */
regioesRouter.get('/', (req, res) => {
  res.json(db.prepare('SELECT id, nome FROM regioes ORDER BY nome COLLATE NOCASE').all());
});

/**
 * POST /api/regioes  - body: { nome }
 * Cria um bairro/região novo — usado quando a pessoa digita um bairro que ainda
 * não existe na hora de cadastrar a reunião. Se já existir (sem diferenciar
 * maiúsculas/acentos de caixa), devolve o que já está lá, sem duplicar.
 */
regioesRouter.post('/', (req, res) => {
  const nome = String(req.body.nome ?? '').trim();
  if (!nome) return res.status(400).json({ erro: 'Informe o nome do bairro/região.' });

  const existente = db
    .prepare('SELECT id, nome FROM regioes WHERE nome = ? COLLATE NOCASE')
    .get(nome);
  if (existente) return res.json(existente);

  const { lastInsertRowid } = db.prepare('INSERT INTO regioes (nome) VALUES (?)').run(nome);
  res.status(201).json(db.prepare('SELECT id, nome FROM regioes WHERE id = ?').get(lastInsertRowid));
});
