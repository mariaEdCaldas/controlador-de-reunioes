import express, { Router } from 'express';
import { db } from '../db.js';
import { normalizarTelefone } from '../telefone.js';
import { lerPlanilha, norm } from '../importar-coordenadores.js';

export const coordenadoresRouter = Router();

const SELECT_BASE = `
  SELECT c.id, c.nome, c.telefone, c.bairro, c.endereco, c.rede_social, c.candidato,
         c.time_id, t.nome AS time_nome
    FROM coordenadores c
    LEFT JOIN times t ON t.id = c.time_id
`;

const buscar = (id) => db.prepare(`${SELECT_BASE} WHERE c.id = ?`).get(id);

/** Valida nome (obrigatório) e telefone (opcional); bairro/endereço/rede livres. */
function validar(corpo, { exigeNome = true } = {}) {
  const nome = String(corpo.nome ?? '').trim();
  if (exigeNome && !nome) return { ok: false, erro: 'Nome é obrigatório.' };

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
    candidato: String(corpo.candidato ?? '').trim() || null,
  };
}

/** Confere que o time existe, se um time_id foi informado. */
async function validarTime(timeId) {
  if (timeId === null || timeId === undefined || timeId === '') return { ok: true, timeId: null };
  const id = Number(timeId);
  if (!Number.isInteger(id) || !(await db.prepare('SELECT 1 FROM times WHERE id = ?').get(id))) {
    return { ok: false, erro: 'Time não encontrado.' };
  }
  return { ok: true, timeId: id };
}

/**
 * GET /api/coordenadores
 * Filtros: ?time_id=3  |  ?sem_time=1 (só os ainda não vinculados)
 */
coordenadoresRouter.get('/', async (req, res) => {
  const condicoes = [];
  const params = {};

  if (req.query.sem_time === '1' || req.query.sem_time === 'true') {
    condicoes.push('c.time_id IS NULL');
  } else if (req.query.time_id !== undefined && req.query.time_id !== '') {
    condicoes.push('c.time_id = @time_id');
    params.time_id = Number(req.query.time_id);
  }

  const where = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : '';
  res.json(await db.prepare(`${SELECT_BASE} ${where} ORDER BY c.nome COLLATE NOCASE`).all(params));
});

/** POST /api/coordenadores */
coordenadoresRouter.post('/', async (req, res) => {
  const v = validar(req.body);
  if (!v.ok) return res.status(400).json({ erro: v.erro });

  const t = await validarTime(req.body.time_id);
  if (!t.ok) return res.status(400).json({ erro: t.erro });

  const { ok, ...campos } = v;
  const { lastInsertRowid } = await db
    .prepare(
      `INSERT INTO coordenadores (nome, telefone, bairro, endereco, rede_social, candidato, time_id)
       VALUES (@nome, @telefone, @bairro, @endereco, @rede_social, @candidato, @time_id)`
    )
    .run({ ...campos, time_id: t.timeId });

  res.status(201).json(await buscar(lastInsertRowid));
});

/** PATCH /api/coordenadores/:id  - editar nome/telefone/bairro/endereço/rede. */
coordenadoresRouter.patch('/:id', async (req, res) => {
  const existe = await buscar(req.params.id);
  if (!existe) return res.status(404).json({ erro: 'Coordenador não encontrado.' });

  const v = validar(req.body);
  if (!v.ok) return res.status(400).json({ erro: v.erro });

  const { ok, ...campos } = v;
  await db.prepare(
    `UPDATE coordenadores
        SET nome = @nome, telefone = @telefone, bairro = @bairro,
            endereco = @endereco, rede_social = @rede_social, candidato = @candidato
      WHERE id = @id`
  ).run({ ...campos, id: existe.id });

  res.json(await buscar(existe.id));
});

/**
 * PATCH /api/coordenadores/:id/time  - body: { time_id }  (null desvincula)
 */
coordenadoresRouter.patch('/:id/time', async (req, res) => {
  const existe = await buscar(req.params.id);
  if (!existe) return res.status(404).json({ erro: 'Coordenador não encontrado.' });

  const t = await validarTime(req.body.time_id);
  if (!t.ok) return res.status(400).json({ erro: t.erro });

  await db.prepare('UPDATE coordenadores SET time_id = ? WHERE id = ?').run(t.timeId, existe.id);
  res.json(await buscar(existe.id));
});

/** DELETE /api/coordenadores/:id */
coordenadoresRouter.delete('/:id', async (req, res) => {
  const existe = await buscar(req.params.id);
  if (!existe) return res.status(404).json({ erro: 'Coordenador não encontrado.' });

  await db.prepare('DELETE FROM coordenadores WHERE id = ?').run(existe.id);
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Importar planilha (.xlsx/.csv): prévia (não grava) e confirmação (grava).
// ---------------------------------------------------------------------------

coordenadoresRouter.post(
  '/importar/previa',
  express.raw({ type: () => true, limit: '15mb' }),
  async (req, res) => {
    const buffer = req.body;
    if (!buffer || !buffer.length) return res.status(400).json({ erro: 'Nenhum arquivo recebido.' });

    const r = await lerPlanilha(buffer, { nomeArquivo: req.query.arquivo || '' });
    if (!r.ok) return res.status(400).json({ erro: r.erro });

    const nomesExistentes = new Set(
      (await db.prepare('SELECT nome FROM coordenadores').all()).map((c) => norm(c.nome))
    );
    const timesExistentes = new Set(
      (await db.prepare('SELECT nome FROM times').all()).map((t) => norm(t.nome))
    );

    const timesNaPlanilha = new Set();
    let novos = 0;
    let existentes = 0;
    let semTelefone = 0;

    const linhas = r.linhas.map((l) => {
      const existe = nomesExistentes.has(norm(l.nome));
      existe ? existentes++ : novos++;
      if (!l.telefone) semTelefone++;
      if (l.time) timesNaPlanilha.add(l.time);
      return { ...l, status: existe ? 'existe' : 'novo' };
    });

    const timesNovos = [...timesNaPlanilha].filter((t) => !timesExistentes.has(norm(t)));

    res.json({ total: r.linhas.length, novos, existentes, semTelefone, timesNovos, linhas });
  }
);

coordenadoresRouter.post('/importar/confirmar', async (req, res) => {
  const linhas = Array.isArray(req.body?.linhas) ? req.body.linhas : null;
  if (!linhas) return res.status(400).json({ erro: 'Nada para importar.' });

  const resultado = await db.transacao(async (tx) => {
    const nomesExistentes = new Set(
      (await tx.prepare('SELECT nome FROM coordenadores').all()).map((c) => norm(c.nome))
    );
    const timeIdPorNome = new Map(
      (await tx.prepare('SELECT id, nome FROM times').all()).map((t) => [norm(t.nome), t.id])
    );
    const inserirTime = tx.prepare('INSERT INTO times (nome) VALUES (?)');
    const inserirCoord = tx.prepare(
      `INSERT INTO coordenadores (nome, telefone, bairro, endereco, rede_social, candidato, time_id)
       VALUES (@nome, @telefone, @bairro, @endereco, @rede_social, @candidato, @time_id)`
    );

    let coordenadores = 0;
    let times = 0;
    let pulados = 0;

    for (const l of linhas) {
      const nome = String(l?.nome ?? '').trim();
      if (!nome) continue;
      if (nomesExistentes.has(norm(nome))) {
        pulados++;
        continue;
      }

      let timeId = null;
      const timeNome = String(l?.time ?? '').trim();
      if (timeNome) {
        const chave = norm(timeNome);
        if (!timeIdPorNome.has(chave)) {
          const { lastInsertRowid } = await inserirTime.run(timeNome);
          timeIdPorNome.set(chave, lastInsertRowid);
          times++;
        }
        timeId = timeIdPorNome.get(chave);
      }

      const telefone = l?.telefone ? String(l.telefone) : null;
      await inserirCoord.run({
        nome,
        telefone,
        bairro: l?.bairro || null,
        endereco: l?.endereco || null,
        rede_social: l?.rede_social || null,
        candidato: l?.candidato || null,
        time_id: timeId,
      });
      nomesExistentes.add(norm(nome));
      coordenadores++;
    }

    return { coordenadores, times, pulados };
  });

  res.json(resultado);
});
