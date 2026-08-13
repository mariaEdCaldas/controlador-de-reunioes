import { Router } from 'express';
import { db } from '../db.js';

export const propostasRouter = Router();

const SELECT_BASE = `
  SELECT p.id, p.proponente, p.telefone, p.regiao_id, reg.nome AS regiao,
         p.coordenador_id, c.nome AS coordenador_nome, c.telefone AS coordenador_telefone,
         p.endereco, p.publico, p.candidato, p.data_sugerida, p.hora, p.observacoes,
         p.status, p.criado_em
    FROM propostas p
    JOIN regioes reg ON reg.id = p.regiao_id
    LEFT JOIN coordenadores c ON c.id = p.coordenador_id
`;

const buscar = (id) => db.prepare(`${SELECT_BASE} WHERE p.id = ?`).get(id);

const STATUS = new Set(['pendente', 'aprovada', 'recusada']);

/** Valida a proposta: só proponente e bairro/região são obrigatórios. */
async function validar(corpo) {
  const proponente = String(corpo.proponente ?? '').trim();
  if (!proponente) return { ok: false, erro: 'Informe quem está propondo.' };

  const regiaoId = Number(corpo.regiao_id);
  if (!Number.isInteger(regiaoId) || !(await db.prepare('SELECT 1 FROM regioes WHERE id = ?').get(regiaoId))) {
    return { ok: false, erro: 'Selecione o bairro/região.' };
  }

  let publico = null;
  if (corpo.publico !== null && corpo.publico !== undefined && corpo.publico !== '') {
    publico = Number(corpo.publico);
    if (!Number.isInteger(publico) || publico < 0) return { ok: false, erro: 'Público inválido.' };
  }

  const data = String(corpo.data_sugerida ?? '').trim();
  if (data && !/^\d{4}-\d{2}-\d{2}$/.test(data)) return { ok: false, erro: 'Data sugerida inválida.' };

  const hora = String(corpo.hora ?? '').trim();
  if (hora && !/^([01]\d|2[0-3]):[0-5]\d$/.test(hora)) return { ok: false, erro: 'Hora inválida.' };

  let coordenadorId = null;
  if (corpo.coordenador_id !== null && corpo.coordenador_id !== undefined && corpo.coordenador_id !== '') {
    coordenadorId = Number(corpo.coordenador_id);
    if (!Number.isInteger(coordenadorId) || !(await db.prepare('SELECT 1 FROM coordenadores WHERE id = ?').get(coordenadorId))) {
      return { ok: false, erro: 'Coordenador responsável não encontrado.' };
    }
  }

  return {
    ok: true,
    proponente,
    telefone: String(corpo.telefone ?? '').trim() || null,
    regiao_id: regiaoId,
    coordenador_id: coordenadorId,
    endereco: String(corpo.endereco ?? '').trim() || null,
    publico,
    candidato: String(corpo.candidato ?? '').trim() || null,
    data_sugerida: data || null,
    hora: hora || null,
    observacoes: String(corpo.observacoes ?? '').trim() || null,
  };
}

/** GET /api/propostas — todas, mais recentes primeiro. */
propostasRouter.get('/', async (req, res) => {
  res.json(await db.prepare(`${SELECT_BASE} ORDER BY p.criado_em DESC, p.id DESC`).all());
});

/** POST /api/propostas */
propostasRouter.post('/', async (req, res) => {
  const v = await validar(req.body);
  if (!v.ok) return res.status(400).json({ erro: v.erro });

  const { ok, ...campos } = v; // tira o 'ok' — o banco recusa chave extra
  const { lastInsertRowid } = await db
    .prepare(
      `INSERT INTO propostas
         (proponente, telefone, regiao_id, coordenador_id, endereco, publico,
          candidato, data_sugerida, hora, observacoes)
       VALUES
         (@proponente, @telefone, @regiao_id, @coordenador_id, @endereco, @publico,
          @candidato, @data_sugerida, @hora, @observacoes)`
    )
    .run(campos);

  res.status(201).json(await buscar(lastInsertRowid));
});

/** PATCH /api/propostas/:id/status — body: { status } */
propostasRouter.patch('/:id/status', async (req, res) => {
  const existe = await buscar(req.params.id);
  if (!existe) return res.status(404).json({ erro: 'Proposta não encontrada.' });

  const status = String(req.body.status ?? '');
  if (!STATUS.has(status)) return res.status(400).json({ erro: 'Status inválido.' });

  await db.prepare('UPDATE propostas SET status = ? WHERE id = ?').run(status, existe.id);
  res.json(await buscar(existe.id));
});

/** DELETE /api/propostas/:id */
propostasRouter.delete('/:id', async (req, res) => {
  const existe = await buscar(req.params.id);
  if (!existe) return res.status(404).json({ erro: 'Proposta não encontrada.' });

  await db.prepare('DELETE FROM propostas WHERE id = ?').run(existe.id);
  res.json({ ok: true });
});
