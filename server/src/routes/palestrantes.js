import { Router } from 'express';
import { db } from '../db.js';
import { normalizarTelefone } from '../telefone.js';

export const palestrantesRouter = Router();

const SELECT_BASE = `
  SELECT p.id, p.nome, p.telefone, p.temas, p.ativo,
         p.regiao_id, r.nome AS regiao
    FROM palestrantes p
    JOIN regioes r ON r.id = p.regiao_id
`;

/**
 * Valida o corpo de criação/edição.
 * Regras: nome e telefone obrigatórios. A região também é obrigatória — o banco
 * exige, e sem ela o palestrante nunca apareceria na sugestão por proximidade.
 */
async function validar(corpo) {
  const erros = {};

  const nome = String(corpo.nome ?? '').trim();
  if (!nome) erros.nome = 'Nome é obrigatório.';

  const tel = normalizarTelefone(corpo.telefone);
  if (!tel.ok) erros.telefone = tel.erro;

  const regiaoId = Number(corpo.regiao_id);
  if (!Number.isInteger(regiaoId)) {
    erros.regiao_id = 'Selecione um bairro/região.';
  } else {
    const existe = await db.prepare('SELECT 1 FROM regioes WHERE id = ?').get(regiaoId);
    if (!existe) erros.regiao_id = 'Bairro/região não existe.';
  }

  if (Object.keys(erros).length > 0) return { ok: false, erros };

  return {
    ok: true,
    dados: {
      nome,
      telefone: tel.telefone,
      regiao_id: regiaoId,
      temas: String(corpo.temas ?? '').trim(),
    },
  };
}

/**
 * GET /api/palestrantes
 * Filtros opcionais: ?regiao_id=3  |  ?ativo=1  (ou ?ativo=0)
 */
palestrantesRouter.get('/', async (req, res) => {
  const condicoes = [];
  const params = {};

  if (req.query.regiao_id !== undefined && req.query.regiao_id !== '') {
    condicoes.push('p.regiao_id = @regiao_id');
    params.regiao_id = Number(req.query.regiao_id);
  }

  if (req.query.ativo !== undefined && req.query.ativo !== '') {
    condicoes.push('p.ativo = @ativo');
    params.ativo = req.query.ativo === '1' || req.query.ativo === 'true' ? 1 : 0;
  }

  const where = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : '';
  const lista = await db
    .prepare(`${SELECT_BASE} ${where} ORDER BY p.ativo DESC, p.nome COLLATE NOCASE`)
    .all(params);

  res.json(lista);
});

/** GET /api/palestrantes/:id */
palestrantesRouter.get('/:id', async (req, res) => {
  const p = await db.prepare(`${SELECT_BASE} WHERE p.id = ?`).get(req.params.id);
  if (!p) return res.status(404).json({ erro: 'Palestrante não encontrado.' });
  res.json(p);
});

/** POST /api/palestrantes */
palestrantesRouter.post('/', async (req, res) => {
  const v = await validar(req.body);
  if (!v.ok) return res.status(400).json({ erro: 'Dados inválidos.', campos: v.erros });

  const { lastInsertRowid } = await db
    .prepare(
      `INSERT INTO palestrantes (nome, telefone, regiao_id, temas)
       VALUES (@nome, @telefone, @regiao_id, @temas)`
    )
    .run(v.dados);

  const criado = await db.prepare(`${SELECT_BASE} WHERE p.id = ?`).get(lastInsertRowid);
  res.status(201).json(criado);
});

/** PUT /api/palestrantes/:id */
palestrantesRouter.put('/:id', async (req, res) => {
  const existe = await db.prepare('SELECT 1 FROM palestrantes WHERE id = ?').get(req.params.id);
  if (!existe) return res.status(404).json({ erro: 'Palestrante não encontrado.' });

  const v = await validar(req.body);
  if (!v.ok) return res.status(400).json({ erro: 'Dados inválidos.', campos: v.erros });

  await db.prepare(
    `UPDATE palestrantes
        SET nome = @nome, telefone = @telefone, regiao_id = @regiao_id, temas = @temas
      WHERE id = @id`
  ).run({ ...v.dados, id: Number(req.params.id) });

  res.json(await db.prepare(`${SELECT_BASE} WHERE p.id = ?`).get(req.params.id));
});

/**
 * PATCH /api/palestrantes/:id/status  - body: { ativo: true|false }
 * Ativa/inativa. Não existe DELETE de propósito (preserva o histórico).
 */
palestrantesRouter.patch('/:id/status', async (req, res) => {
  const existe = await db.prepare('SELECT 1 FROM palestrantes WHERE id = ?').get(req.params.id);
  if (!existe) return res.status(404).json({ erro: 'Palestrante não encontrado.' });

  if (typeof req.body.ativo !== 'boolean') {
    return res.status(400).json({ erro: 'Informe "ativo": true ou false.' });
  }

  await db.prepare('UPDATE palestrantes SET ativo = ? WHERE id = ?')
    .run(req.body.ativo ? 1 : 0, req.params.id);

  res.json(await db.prepare(`${SELECT_BASE} WHERE p.id = ?`).get(req.params.id));
});
