import express, { Router } from 'express';
import { db } from '../db.js';
import { norm } from '../importar-coordenadores.js';
import { lerPlanilhaPropostas } from '../importar-propostas.js';

export const propostasRouter = Router();

const chaveProposta = (p) => `${norm(p.proponente)}|${p.data_sugerida || ''}|${norm(p.endereco)}`;

const SELECT_BASE = `
  SELECT p.id, p.proponente, p.telefone, p.regiao_id, reg.nome AS regiao,
         p.coordenador_id, c.nome AS coordenador_nome, c.telefone AS coordenador_telefone,
         p.endereco, p.publico, p.candidato, p.data_sugerida, p.hora,
         p.lideranca, p.observacoes, p.status, p.criado_em
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
    lideranca: String(corpo.lideranca ?? '').trim() || null,
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
          candidato, data_sugerida, hora, lideranca, observacoes)
       VALUES
         (@proponente, @telefone, @regiao_id, @coordenador_id, @endereco, @publico,
          @candidato, @data_sugerida, @hora, @lideranca, @observacoes)`
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

// ---------------------------------------------------------------------------
// Importar planilha de propostas (.xlsx/.csv): prévia (não grava) e confirmação.
// ---------------------------------------------------------------------------

propostasRouter.post(
  '/importar/previa',
  express.raw({ type: () => true, limit: '20mb' }),
  async (req, res) => {
    const buffer = req.body;
    if (!buffer || !buffer.length) return res.status(400).json({ erro: 'Nenhum arquivo recebido.' });

    const r = await lerPlanilhaPropostas(buffer, { nomeArquivo: req.query.arquivo || '' });
    if (!r.ok) return res.status(400).json({ erro: r.erro });

    const existentes = new Set(
      (await db.prepare(
        `SELECT p.proponente, p.data_sugerida, p.endereco FROM propostas p`
      ).all()).map((p) => chaveProposta(p))
    );

    let novos = 0;
    let repetidos = 0;
    const linhas = r.linhas.map((l) => {
      const existe = existentes.has(chaveProposta(l));
      existe ? repetidos++ : novos++;
      return { ...l, status: existe ? 'existe' : 'novo' };
    });

    res.json({ total: r.linhas.length, novos, repetidos, linhas });
  }
);

propostasRouter.post('/importar/confirmar', async (req, res) => {
  const linhas = Array.isArray(req.body?.linhas) ? req.body.linhas : null;
  if (!linhas) return res.status(400).json({ erro: 'Nada para importar.' });

  const resultado = await db.transacao(async (tx) => {
    const regiaoIdPorNome = new Map(
      (await tx.prepare('SELECT id, nome FROM regioes').all()).map((r) => [norm(r.nome), r.id])
    );
    const coordIdPorNome = new Map(
      (await tx.prepare('SELECT id, nome FROM coordenadores').all()).map((c) => [norm(c.nome), c.id])
    );
    const existentes = new Set(
      (await tx.prepare('SELECT proponente, data_sugerida, endereco FROM propostas').all())
        .map((p) => chaveProposta(p))
    );
    const inserirRegiao = tx.prepare('INSERT INTO regioes (nome) VALUES (?)');
    const inserirProposta = tx.prepare(
      `INSERT INTO propostas
         (proponente, telefone, regiao_id, coordenador_id, endereco, publico,
          candidato, data_sugerida, hora, lideranca, observacoes)
       VALUES
         (@proponente, @telefone, @regiao_id, @coordenador_id, @endereco, @publico,
          @candidato, @data_sugerida, @hora, @lideranca, @observacoes)`
    );

    async function regiaoId(bairro) {
      const nome = String(bairro || 'A definir').trim();
      const chave = norm(nome);
      if (!regiaoIdPorNome.has(chave)) {
        const { lastInsertRowid } = await inserirRegiao.run(nome);
        regiaoIdPorNome.set(chave, lastInsertRowid);
      }
      return regiaoIdPorNome.get(chave);
    }

    let propostas = 0;
    let pulados = 0;
    for (const l of linhas) {
      const proponente = String(l?.proponente ?? '').trim();
      if (!proponente) { pulados++; continue; }
      const chave = chaveProposta({ proponente, data_sugerida: l?.data_sugerida, endereco: l?.endereco });
      if (existentes.has(chave)) { pulados++; continue; }

      const pub = l?.publico === '' || l?.publico == null ? null : Number(l.publico);
      await inserirProposta.run({
        proponente,
        telefone: l?.telefone || null,
        regiao_id: await regiaoId(l?.bairro),
        coordenador_id: l?.coordenador ? (coordIdPorNome.get(norm(l.coordenador)) ?? null) : null,
        endereco: l?.endereco || null,
        publico: Number.isInteger(pub) && pub >= 0 ? pub : null,
        candidato: l?.candidato || null,
        data_sugerida: /^\d{4}-\d{2}-\d{2}$/.test(l?.data_sugerida || '') ? l.data_sugerida : null,
        hora: /^([01]\d|2[0-3]):[0-5]\d$/.test(l?.hora || '') ? l.hora : null,
        lideranca: l?.lideranca || null,
        observacoes: l?.observacoes || null,
      });
      existentes.add(chave);
      propostas++;
    }
    return { propostas, pulados };
  });

  res.json(resultado);
});
