import express, { Router } from 'express';
import { db } from '../db.js';
import { norm } from '../importar-coordenadores.js';
import { lerPlanilhaCadastros } from '../importar-cadastros.js';

export const cadastrosRouter = Router();

const chaveCabo = (nome, telefone) => `${norm(nome)}|${telefone || ''}`;

/**
 * POST /api/cadastros/importar/previa — lê a planilha do gabinete (coord + cabos
 * juntos) e devolve o que seria gravado, SEM gravar. Marca cada linha como nova
 * ou já existente.
 */
cadastrosRouter.post(
  '/importar/previa',
  express.raw({ type: () => true, limit: '25mb' }),
  async (req, res) => {
    const buffer = req.body;
    if (!buffer || !buffer.length) return res.status(400).json({ erro: 'Nenhum arquivo recebido.' });

    const r = await lerPlanilhaCadastros(buffer, { nomeArquivo: req.query.arquivo || '' });
    if (!r.ok) return res.status(400).json({ erro: r.erro });

    const coordsExistentes = new Set(
      (await db.prepare('SELECT nome FROM coordenadores').all()).map((c) => norm(c.nome))
    );
    const cabosExistentes = new Set(
      (await db.prepare('SELECT nome, telefone FROM cabos').all()).map((k) => chaveCabo(k.nome, k.telefone))
    );

    let coordNovos = 0;
    let coordExiste = 0;
    let caboNovos = 0;
    let caboExiste = 0;
    const deputados = new Set();
    const timesExistentes = new Set(
      (await db.prepare('SELECT nome FROM times').all()).map((t) => norm(t.nome))
    );
    const novosNaPlanilha = new Set(); // coordenadores novos já vistos aqui

    const linhas = r.linhas.map((l) => {
      if (l.candidato) deputados.add(l.candidato);
      if (l.tipo === 'coordenador') {
        const existe = coordsExistentes.has(norm(l.nome)) || novosNaPlanilha.has(norm(l.nome));
        if (existe) coordExiste++;
        else { coordNovos++; novosNaPlanilha.add(norm(l.nome)); }
        return { ...l, status: existe ? 'existe' : 'novo' };
      }
      const existe = cabosExistentes.has(chaveCabo(l.nome, l.telefone));
      existe ? caboExiste++ : caboNovos++;
      return { ...l, status: existe ? 'existe' : 'novo' };
    });

    const timesNovos = [...deputados].filter((d) => !timesExistentes.has(norm(d)));

    res.json({
      total: r.linhas.length,
      coordNovos, coordExiste, caboNovos, caboExiste,
      deputados: [...deputados],
      timesNovos,
      linhas,
    });
  }
);

/** POST /api/cadastros/importar/confirmar — grava. Body: { linhas } */
cadastrosRouter.post('/importar/confirmar', async (req, res) => {
  const linhas = Array.isArray(req.body?.linhas) ? req.body.linhas : null;
  if (!linhas) return res.status(400).json({ erro: 'Nada para importar.' });

  const resultado = await db.transacao(async (tx) => {
    const timeIdPorNome = new Map(
      (await tx.prepare('SELECT id, nome FROM times').all()).map((t) => [norm(t.nome), t.id])
    );
    const coordIdPorNome = new Map(
      (await tx.prepare('SELECT id, nome FROM coordenadores').all()).map((c) => [norm(c.nome), c.id])
    );
    const cabosExistentes = new Set(
      (await tx.prepare('SELECT nome, telefone FROM cabos').all()).map((k) => chaveCabo(k.nome, k.telefone))
    );

    const inserirTime = tx.prepare('INSERT INTO times (nome) VALUES (?)');
    const inserirCoord = tx.prepare(
      `INSERT INTO coordenadores (nome, telefone, bairro, endereco, rede_social, candidato, time_id)
       VALUES (@nome, @telefone, @bairro, @endereco, @rede_social, @candidato, @time_id)`
    );
    const inserirCabo = tx.prepare(
      `INSERT INTO cabos (nome, telefone, bairro, endereco, rede_social, coordenador_id)
       VALUES (?, ?, ?, ?, ?, ?)`
    );

    async function timeId(nomeDeputado) {
      if (!nomeDeputado) return null;
      const chave = norm(nomeDeputado);
      if (!timeIdPorNome.has(chave)) {
        const { lastInsertRowid } = await inserirTime.run(nomeDeputado);
        timeIdPorNome.set(chave, lastInsertRowid);
      }
      return timeIdPorNome.get(chave);
    }

    let coordenadores = 0;
    let cabos = 0;
    let times = timeIdPorNome.size;
    let pulados = 0;

    for (const l of linhas) {
      const nome = String(l?.nome ?? '').trim();
      if (!nome) continue;

      if (l.tipo === 'coordenador') {
        if (coordIdPorNome.has(norm(nome))) { pulados++; continue; }
        const { lastInsertRowid } = await inserirCoord.run({
          nome,
          telefone: l?.telefone || null,
          bairro: l?.bairro || null,
          endereco: l?.endereco || null,
          rede_social: l?.rede_social || null,
          candidato: l?.candidato || null,
          time_id: await timeId(l?.candidato),
        });
        coordIdPorNome.set(norm(nome), lastInsertRowid);
        coordenadores++;
      } else {
        const telefone = l?.telefone ? String(l.telefone) : null;
        if (cabosExistentes.has(chaveCabo(nome, telefone))) { pulados++; continue; }
        const coordId = l?.coordenador ? coordIdPorNome.get(norm(l.coordenador)) ?? null : null;
        await inserirCabo.run(nome, telefone, l?.bairro || null, l?.endereco || null, l?.rede_social || null, coordId);
        cabosExistentes.add(chaveCabo(nome, telefone));
        cabos++;
      }
    }

    return { coordenadores, cabos, times: timeIdPorNome.size - times, pulados };
  });

  res.json(resultado);
});
