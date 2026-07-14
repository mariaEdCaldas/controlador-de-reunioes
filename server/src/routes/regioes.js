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
