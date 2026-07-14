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
 * Valida o corpo de criacao/edicao.
 * Regras (as do pedido): nome e telefone obrigatorios. A regiao tambem e
 * obrigatoria - o banco exige, e sem ela o palestrante nunca apareceria na
 * sugestao por proximidade (RN-03), virando um cadastro inutil.
 */
function validar(corpo) {
  const erros = {};

  const nome = String(corpo.nome ?? '').trim();
  if (!nome) erros.nome = 'Nome é obrigatório.';

  const tel = normalizarTelefone(corpo.telefone);
  if (!tel.ok) erros.telefone = tel.erro;

  const regiaoId = Number(corpo.regiao_id);
  if (!Number.isInteger(regiaoId)) {
    erros.regiao_id = 'Selecione um bairro/região.';
  } else {
    const existe = db.prepare('SELECT 1 FROM regioes WHERE id = ?').get(regiaoId);
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
palestrantesRouter.get('/', (req, res) => {
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
  const lista = db
    .prepare(`${SELECT_BASE} ${where} ORDER BY p.ativo DESC, p.nome COLLATE NOCASE`)
    .all(params);

  res.json(lista);
});

/** GET /api/palestrantes/:id */
palestrantesRouter.get('/:id', (req, res) => {
  const p = db.prepare(`${SELECT_BASE} WHERE p.id = ?`).get(req.params.id);
  if (!p) return res.status(404).json({ erro: 'Palestrante não encontrado.' });
  res.json(p);
});

/** POST /api/palestrantes */
palestrantesRouter.post('/', (req, res) => {
  const v = validar(req.body);
  if (!v.ok) return res.status(400).json({ erro: 'Dados inválidos.', campos: v.erros });

  const { lastInsertRowid } = db
    .prepare(
      `INSERT INTO palestrantes (nome, telefone, regiao_id, temas)
       VALUES (@nome, @telefone, @regiao_id, @temas)`
    )
    .run(v.dados);

  const criado = db.prepare(`${SELECT_BASE} WHERE p.id = ?`).get(lastInsertRowid);
  res.status(201).json(criado);
});

/** PUT /api/palestrantes/:id */
palestrantesRouter.put('/:id', (req, res) => {
  const existe = db.prepare('SELECT 1 FROM palestrantes WHERE id = ?').get(req.params.id);
  if (!existe) return res.status(404).json({ erro: 'Palestrante não encontrado.' });

  const v = validar(req.body);
  if (!v.ok) return res.status(400).json({ erro: 'Dados inválidos.', campos: v.erros });

  db.prepare(
    `UPDATE palestrantes
        SET nome = @nome, telefone = @telefone, regiao_id = @regiao_id, temas = @temas
      WHERE id = @id`
  ).run({ ...v.dados, id: Number(req.params.id) });

  res.json(db.prepare(`${SELECT_BASE} WHERE p.id = ?`).get(req.params.id));
});

/**
 * PATCH /api/palestrantes/:id/status  - body: { ativo: true|false }
 * Ativa/inativa. Nao existe DELETE de proposito: o palestrante pode estar
 * ligado a reunioes ja realizadas, e apagar o cadastro apagaria essa memoria
 * do historico (RN-10). Inativar so o tira das novas sugestoes.
 */
palestrantesRouter.patch('/:id/status', (req, res) => {
  const existe = db.prepare('SELECT 1 FROM palestrantes WHERE id = ?').get(req.params.id);
  if (!existe) return res.status(404).json({ erro: 'Palestrante não encontrado.' });

  if (typeof req.body.ativo !== 'boolean') {
    return res.status(400).json({ erro: 'Informe "ativo": true ou false.' });
  }

  db.prepare('UPDATE palestrantes SET ativo = ? WHERE id = ?')
    .run(req.body.ativo ? 1 : 0, req.params.id);

  res.json(db.prepare(`${SELECT_BASE} WHERE p.id = ?`).get(req.params.id));
});
