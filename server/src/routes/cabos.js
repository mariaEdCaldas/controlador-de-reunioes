import express, { Router } from 'express';
import { db } from '../db.js';
import { normalizarTelefone } from '../telefone.js';
import { norm } from '../importar-coordenadores.js';
import { lerPlanilhaCabos } from '../importar-cabos.js';

export const cabosRouter = Router();

const SELECT_BASE = `
  SELECT k.id, k.nome, k.telefone, k.bairro, k.endereco, k.rede_social,
         k.coordenador_id, c.nome AS coordenador_nome,
         c.time_id, t.nome AS time_nome
    FROM cabos k
    LEFT JOIN coordenadores c ON c.id = k.coordenador_id
    LEFT JOIN times t         ON t.id = c.time_id
`;

const buscar = (id) => db.prepare(`${SELECT_BASE} WHERE k.id = ?`).get(id);

/** Valida nome (obrigatório) e telefone (opcional); bairro/endereço/rede livres. */
function validar(corpo) {
  const nome = String(corpo.nome ?? '').trim();
  if (!nome) return { ok: false, erro: 'Nome é obrigatório.' };

  let telefone = null;
  const bruto = String(corpo.telefone ?? '').trim();
  if (bruto) {
    const tel = normalizarTelefone(bruto);
    if (!tel.ok) return { ok: false, erro: tel.erro };
    telefone = tel.telefone;
  }
  return {
    ok: true,
    nome,
    telefone,
    bairro: String(corpo.bairro ?? '').trim() || null,
    endereco: String(corpo.endereco ?? '').trim() || null,
    rede_social: String(corpo.rede_social ?? '').trim() || null,
  };
}

async function validarCoordenador(coordId) {
  if (coordId === null || coordId === undefined || coordId === '') return { ok: true, coordId: null };
  const id = Number(coordId);
  if (!Number.isInteger(id) || !(await db.prepare('SELECT 1 FROM coordenadores WHERE id = ?').get(id))) {
    return { ok: false, erro: 'Coordenador não encontrado.' };
  }
  return { ok: true, coordId: id };
}

/**
 * GET /api/cabos
 * Filtros: ?coordenador_id=  |  ?time_id=  |  ?sem_coordenador=1
 */
cabosRouter.get('/', async (req, res) => {
  const cond = [];
  const params = {};
  if (req.query.sem_coordenador === '1') {
    cond.push('k.coordenador_id IS NULL');
  } else if (req.query.coordenador_id) {
    cond.push('k.coordenador_id = @coordenador_id');
    params.coordenador_id = Number(req.query.coordenador_id);
  } else if (req.query.time_id) {
    cond.push('c.time_id = @time_id');
    params.time_id = Number(req.query.time_id);
  }
  const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';
  res.json(await db.prepare(`${SELECT_BASE} ${where} ORDER BY k.nome COLLATE NOCASE`).all(params));
});

/** POST /api/cabos */
cabosRouter.post('/', async (req, res) => {
  const v = validar(req.body);
  if (!v.ok) return res.status(400).json({ erro: v.erro });
  const c = await validarCoordenador(req.body.coordenador_id);
  if (!c.ok) return res.status(400).json({ erro: c.erro });

  const { ok, ...campos } = v;
  const { lastInsertRowid } = await db
    .prepare(
      `INSERT INTO cabos (nome, telefone, bairro, endereco, rede_social, coordenador_id)
       VALUES (@nome, @telefone, @bairro, @endereco, @rede_social, @coordenador_id)`
    )
    .run({ ...campos, coordenador_id: c.coordId });

  res.status(201).json(await buscar(lastInsertRowid));
});

/** PATCH /api/cabos/:id — edita nome/telefone/bairro/endereço/rede. */
cabosRouter.patch('/:id', async (req, res) => {
  const existe = await buscar(req.params.id);
  if (!existe) return res.status(404).json({ erro: 'Cabo não encontrado.' });
  const v = validar(req.body);
  if (!v.ok) return res.status(400).json({ erro: v.erro });

  const { ok, ...campos } = v;
  await db.prepare(
    `UPDATE cabos SET nome=@nome, telefone=@telefone, bairro=@bairro,
                      endereco=@endereco, rede_social=@rede_social WHERE id=@id`
  ).run({ ...campos, id: existe.id });
  res.json(await buscar(existe.id));
});

/** PATCH /api/cabos/:id/coordenador — body: { coordenador_id } (null desvincula) */
cabosRouter.patch('/:id/coordenador', async (req, res) => {
  const existe = await buscar(req.params.id);
  if (!existe) return res.status(404).json({ erro: 'Cabo não encontrado.' });
  const c = await validarCoordenador(req.body.coordenador_id);
  if (!c.ok) return res.status(400).json({ erro: c.erro });

  await db.prepare('UPDATE cabos SET coordenador_id = ? WHERE id = ?').run(c.coordId, existe.id);
  res.json(await buscar(existe.id));
});

/** DELETE /api/cabos/:id */
cabosRouter.delete('/:id', async (req, res) => {
  const existe = await buscar(req.params.id);
  if (!existe) return res.status(404).json({ erro: 'Cabo não encontrado.' });
  await db.prepare('DELETE FROM cabos WHERE id = ?').run(existe.id);
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Importar planilha de cabos: prévia (não grava) e confirmação (grava).
// ---------------------------------------------------------------------------

/** Chave de duplicidade: nome + telefone (evita reimportar a mesma pessoa). */
const chaveCabo = (nome, telefone) => `${norm(nome)}|${telefone || ''}`;

cabosRouter.post(
  '/importar/previa',
  express.raw({ type: () => true, limit: '20mb' }),
  async (req, res) => {
    const buffer = req.body;
    if (!buffer || !buffer.length) return res.status(400).json({ erro: 'Nenhum arquivo recebido.' });

    const r = await lerPlanilhaCabos(buffer, { nomeArquivo: req.query.arquivo || '' });
    if (!r.ok) return res.status(400).json({ erro: r.erro });

    const existentes = new Set(
      (await db.prepare('SELECT nome, telefone FROM cabos').all()).map((k) => chaveCabo(k.nome, k.telefone))
    );
    const coordPorNome = new Map(
      (await db.prepare('SELECT id, nome FROM coordenadores').all()).map((c) => [norm(c.nome), c.id])
    );

    let novos = 0;
    let existe = 0;
    let semCoord = 0;
    const coordNaoEncontrados = new Set();

    const linhas = r.linhas.map((l) => {
      const jaTem = existentes.has(chaveCabo(l.nome, l.telefone));
      jaTem ? existe++ : novos++;
      const coordId = l.coordenador ? coordPorNome.get(norm(l.coordenador)) : null;
      if (!coordId) {
        semCoord++;
        if (l.coordenador) coordNaoEncontrados.add(l.coordenador);
      }
      return { ...l, status: jaTem ? 'existe' : 'novo', coordVinculado: Boolean(coordId) };
    });

    res.json({
      total: r.linhas.length,
      novos,
      existentes: existe,
      semCoordenador: semCoord,
      coordNaoEncontrados: [...coordNaoEncontrados],
      linhas,
    });
  }
);

cabosRouter.post('/importar/confirmar', async (req, res) => {
  const linhas = Array.isArray(req.body?.linhas) ? req.body.linhas : null;
  if (!linhas) return res.status(400).json({ erro: 'Nada para importar.' });

  const resultado = await db.transacao(async (tx) => {
    const existentes = new Set(
      (await tx.prepare('SELECT nome, telefone FROM cabos').all()).map((k) => chaveCabo(k.nome, k.telefone))
    );
    const coordPorNome = new Map(
      (await tx.prepare('SELECT id, nome FROM coordenadores').all()).map((c) => [norm(c.nome), c.id])
    );
    const inserir = tx.prepare(
      `INSERT INTO cabos (nome, telefone, bairro, endereco, rede_social, coordenador_id)
       VALUES (?, ?, ?, ?, ?, ?)`
    );

    let cabos = 0;
    let pulados = 0;
    for (const l of linhas) {
      const nome = String(l?.nome ?? '').trim();
      if (!nome) continue;
      const telefone = l?.telefone ? String(l.telefone) : null;
      if (existentes.has(chaveCabo(nome, telefone))) {
        pulados++;
        continue;
      }
      const coordId = l?.coordenador ? coordPorNome.get(norm(l.coordenador)) ?? null : null;
      await inserir.run(nome, telefone, l?.bairro || null, l?.endereco || null, l?.rede_social || null, coordId);
      existentes.add(chaveCabo(nome, telefone));
      cabos++;
    }
    return { cabos, pulados };
  });

  res.json(resultado);
});
