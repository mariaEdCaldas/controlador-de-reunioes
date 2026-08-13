import { Router } from 'express';
import { db } from '../db.js';

export const timesRouter = Router();

// Lista com a contagem de coordenadores vinculados a cada time.
const LISTA = `
  SELECT t.id, t.nome, COUNT(c.id) AS coordenadores
    FROM times t
    LEFT JOIN coordenadores c ON c.time_id = t.id
   GROUP BY t.id
   ORDER BY t.nome COLLATE NOCASE
`;

const umTime = (id) =>
  db.prepare(`${LISTA.replace('GROUP BY t.id', 'WHERE t.id = @id GROUP BY t.id')}`).get({ id });

function validarNome(corpo) {
  const nome = String(corpo.nome ?? '').trim();
  if (!nome) return { ok: false, erro: 'Informe o nome do time.' };
  return { ok: true, nome };
}

/** GET /api/times */
timesRouter.get('/', async (req, res) => {
  res.json(await db.prepare(LISTA).all());
});

/** GET /api/times/:id  - o time com seus coordenadores (para a tela de vínculo). */
timesRouter.get('/:id', async (req, res) => {
  const time = await umTime(req.params.id);
  if (!time) return res.status(404).json({ erro: 'Time não encontrado.' });

  const coordenadores = await db
    .prepare(
      `SELECT id, nome, telefone, time_id
         FROM coordenadores
        WHERE time_id = ?
        ORDER BY nome COLLATE NOCASE`
    )
    .all(time.id);

  res.json({ ...time, coordenadores });
});

/** POST /api/times  - cadastro tem só o nome. */
timesRouter.post('/', async (req, res) => {
  const v = validarNome(req.body);
  if (!v.ok) return res.status(400).json({ erro: v.erro });

  const existe = await db.prepare('SELECT 1 FROM times WHERE nome = ? COLLATE NOCASE').get(v.nome);
  if (existe) return res.status(400).json({ erro: `Já existe um time chamado "${v.nome}".` });

  const { lastInsertRowid } = await db.prepare('INSERT INTO times (nome) VALUES (?)').run(v.nome);
  res.status(201).json(await umTime(lastInsertRowid));
});

/** PATCH /api/times/:id  - renomear (os códigos importados são pouco claros). */
timesRouter.patch('/:id', async (req, res) => {
  const time = await umTime(req.params.id);
  if (!time) return res.status(404).json({ erro: 'Time não encontrado.' });

  const v = validarNome(req.body);
  if (!v.ok) return res.status(400).json({ erro: v.erro });

  const conflito = await db
    .prepare('SELECT 1 FROM times WHERE nome = ? COLLATE NOCASE AND id <> ?')
    .get(v.nome, time.id);
  if (conflito) return res.status(400).json({ erro: `Já existe um time chamado "${v.nome}".` });

  await db.prepare('UPDATE times SET nome = ? WHERE id = ?').run(v.nome, time.id);
  res.json(await umTime(time.id));
});

/**
 * DELETE /api/times/:id
 * O time some, mas os coordenadores ficam (só perdem o vínculo — ON DELETE SET
 * NULL na migration). Ninguém é apagado por tabela.
 */
timesRouter.delete('/:id', async (req, res) => {
  const time = await umTime(req.params.id);
  if (!time) return res.status(404).json({ erro: 'Time não encontrado.' });

  await db.prepare('DELETE FROM times WHERE id = ?').run(time.id);
  res.json({ ok: true, coordenadoresSoltos: time.coordenadores });
});
