import { Router } from 'express';
import { db } from '../db.js';

export const reunioesRouter = Router();

const SELECT_BASE = `
  SELECT r.id, r.local, r.endereco, r.data, r.hora, r.status,
         r.regiao_id, reg.nome AS regiao,
         r.titular_id, t.nome AS titular_nome, t.telefone AS titular_telefone,
         r.reserva_id, s.nome AS reserva_nome, s.telefone AS reserva_telefone,
         r.checklist_som, r.checklist_cadeiras, r.presentes
    FROM reunioes r
    JOIN regioes reg     ON reg.id = r.regiao_id
    LEFT JOIN palestrantes t ON t.id = r.titular_id
    LEFT JOIN palestrantes s ON s.id = r.reserva_id
`;

const buscar = (id) => db.prepare(`${SELECT_BASE} WHERE r.id = ?`).get(id);

function validarNova(corpo) {
  const erros = {};

  const local = String(corpo.local ?? '').trim();
  if (!local) erros.local = 'Local é obrigatório.';

  const endereco = String(corpo.endereco ?? '').trim();
  if (!endereco) erros.endereco = 'Endereço é obrigatório.';

  const regiaoId = Number(corpo.regiao_id);
  if (!Number.isInteger(regiaoId)) {
    erros.regiao_id = 'Selecione o bairro.';
  } else if (!db.prepare('SELECT 1 FROM regioes WHERE id = ?').get(regiaoId)) {
    erros.regiao_id = 'Bairro/região não existe.';
  }

  // O banco tambem checa o formato; aqui a mensagem sai legivel na tela.
  const data = String(corpo.data ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) erros.data = 'Informe a data.';

  const hora = String(corpo.hora ?? '').trim();
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(hora)) erros.hora = 'Informe a hora.';

  if (Object.keys(erros).length > 0) return { ok: false, erros };
  return { ok: true, dados: { local, endereco, regiao_id: regiaoId, data, hora } };
}

/** POST /api/reunioes - nasce sempre como "a_confirmar" (RN-04). */
reunioesRouter.post('/', (req, res) => {
  const v = validarNova(req.body);
  if (!v.ok) return res.status(400).json({ erro: 'Dados inválidos.', campos: v.erros });

  const { lastInsertRowid } = db
    .prepare(
      `INSERT INTO reunioes (local, endereco, regiao_id, data, hora, status)
       VALUES (@local, @endereco, @regiao_id, @data, @hora, 'a_confirmar')`
    )
    .run(v.dados);

  res.status(201).json(buscar(lastInsertRowid));
});

/** GET /api/reunioes - mais recentes primeiro. */
reunioesRouter.get('/', (req, res) => {
  res.json(
    db.prepare(`${SELECT_BASE} ORDER BY r.data DESC, r.hora DESC, r.id DESC`).all()
  );
});

/** GET /api/reunioes/:id */
reunioesRouter.get('/:id', (req, res) => {
  const r = buscar(req.params.id);
  if (!r) return res.status(404).json({ erro: 'Reunião não encontrada.' });
  res.json(r);
});

/**
 * GET /api/reunioes/:id/sugestoes
 *
 * RN-03: proximidade e MESMO BAIRRO, nao distancia em km. Os do bairro da
 * reuniao vem primeiro (mesma_regiao = 1); os demais continuam na lista, porque
 * "ninguem do bairro disponivel" nao pode virar um beco sem saida.
 *
 * Cada sugerido traz `ocupado`: ele ja e titular de OUTRA reuniao na mesma
 * data e hora (RN-02). O banco recusaria a alocacao de qualquer jeito - marcar
 * aqui deixa a tela avisar antes do clique, em vez de depois do erro.
 */
reunioesRouter.get('/:id/sugestoes', (req, res) => {
  const reuniao = buscar(req.params.id);
  if (!reuniao) return res.status(404).json({ erro: 'Reunião não encontrada.' });

  const sugestoes = db
    .prepare(
      `SELECT p.id, p.nome, p.telefone, p.temas,
              p.regiao_id, reg.nome AS regiao,
              CASE WHEN p.regiao_id = @regiao_id THEN 1 ELSE 0 END AS mesma_regiao,
              EXISTS (
                SELECT 1 FROM reunioes o
                 WHERE o.titular_id = p.id
                   AND o.data = @data
                   AND o.hora = @hora
                   AND o.id <> @reuniao_id
              ) AS ocupado
         FROM palestrantes p
         JOIN regioes reg ON reg.id = p.regiao_id
        WHERE p.ativo = 1
        ORDER BY mesma_regiao DESC, ocupado ASC, p.nome COLLATE NOCASE`
    )
    .all({
      regiao_id: reuniao.regiao_id,
      data: reuniao.data,
      hora: reuniao.hora,
      reuniao_id: reuniao.id,
    });

  res.json({ reuniao, sugestoes });
});

/** Confere que o palestrante existe e esta ativo. */
function carregarPalestranteAtivo(id) {
  const p = db.prepare('SELECT id, nome, ativo FROM palestrantes WHERE id = ?').get(id);
  if (!p) return { ok: false, status: 404, erro: 'Palestrante não encontrado.' };
  if (!p.ativo) {
    return { ok: false, status: 400, erro: `${p.nome} está inativo e não pode ser alocado.` };
  }
  return { ok: true, palestrante: p };
}

/**
 * PATCH /api/reunioes/:id/titular  - body: { palestrante_id }
 *
 * Define o titular e confirma a reuniao. Como titular_id e UMA coluna, definir
 * um novo simplesmente substitui o anterior - nunca existem dois ao mesmo tempo
 * (RN-04). O anterior fica com o horario livre de novo.
 */
reunioesRouter.patch('/:id/titular', (req, res) => {
  const reuniao = buscar(req.params.id);
  if (!reuniao) return res.status(404).json({ erro: 'Reunião não encontrada.' });

  const p = carregarPalestranteAtivo(req.body.palestrante_id);
  if (!p.ok) return res.status(p.status).json({ erro: p.erro });

  // RN-02: o mesmo titular nao pode estar em duas reunioes na mesma data/hora.
  const choque = db
    .prepare(
      `SELECT id, local FROM reunioes
        WHERE titular_id = ? AND data = ? AND hora = ? AND id <> ?`
    )
    .get(p.palestrante.id, reuniao.data, reuniao.hora, reuniao.id);

  if (choque) {
    return res.status(409).json({
      erro: `${p.palestrante.nome} já é titular da reunião "${choque.local}" nesse mesmo dia e horário.`,
    });
  }

  // Se a pessoa era a reserva desta reuniao, ela sobe a titular e a vaga de
  // reserva fica vazia (ninguem e titular e reserva da mesma reuniao).
  const eraReserva = reuniao.reserva_id === p.palestrante.id;

  db.prepare(
    `UPDATE reunioes
        SET titular_id = @titular_id,
            reserva_id = CASE WHEN reserva_id = @titular_id THEN NULL ELSE reserva_id END,
            status = 'confirmada'
      WHERE id = @id`
  ).run({ titular_id: p.palestrante.id, id: reuniao.id });

  res.json({
    reuniao: buscar(reuniao.id),
    aviso: eraReserva
      ? `${p.palestrante.nome} era a reserva e passou a titular. A reserva ficou vazia.`
      : undefined,
  });
});

/**
 * PATCH /api/reunioes/:id/reserva  - body: { palestrante_id }  (null remove)
 *
 * A reserva e opcional e nao muda o status: quem confirma a reuniao e o titular
 * (RN-04). Nao ha checagem de choque de agenda aqui - a reserva so ocupa o
 * horario se for promovida a titular.
 */
reunioesRouter.patch('/:id/reserva', (req, res) => {
  const reuniao = buscar(req.params.id);
  if (!reuniao) return res.status(404).json({ erro: 'Reunião não encontrada.' });

  const { palestrante_id: novo } = req.body;

  if (novo === null || novo === undefined || novo === '') {
    db.prepare('UPDATE reunioes SET reserva_id = NULL WHERE id = ?').run(reuniao.id);
    return res.json({ reuniao: buscar(reuniao.id) });
  }

  const p = carregarPalestranteAtivo(novo);
  if (!p.ok) return res.status(p.status).json({ erro: p.erro });

  if (reuniao.titular_id === p.palestrante.id) {
    return res.status(400).json({
      erro: `${p.palestrante.nome} já é o titular desta reunião. A reserva precisa ser outra pessoa.`,
    });
  }

  db.prepare('UPDATE reunioes SET reserva_id = ? WHERE id = ?')
    .run(p.palestrante.id, reuniao.id);

  res.json({ reuniao: buscar(reuniao.id) });
});
