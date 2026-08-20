import { Router } from 'express';
import { db } from '../db.js';

export const reunioesRouter = Router();

const SELECT_BASE = `
  SELECT r.id, r.local, r.endereco, r.data, r.hora, r.status,
         r.nome, r.candidato, r.qtd_cadeiras, r.tem_som, r.presenca_deputado,
         r.responsavel, r.responsavel_telefone, r.palestrante,
         r.regiao_id, reg.nome AS regiao,
         r.coordenador_id, c.nome AS coordenador_nome, c.telefone AS coordenador_telefone,
         r.titular_id, t.nome AS titular_nome, t.telefone AS titular_telefone,
         r.reserva_id, s.nome AS reserva_nome, s.telefone AS reserva_telefone,
         r.checklist_som, r.checklist_cadeiras, r.presentes
    FROM reunioes r
    JOIN regioes reg     ON reg.id = r.regiao_id
    LEFT JOIN coordenadores c ON c.id = r.coordenador_id
    LEFT JOIN palestrantes t ON t.id = r.titular_id
    LEFT JOIN palestrantes s ON s.id = r.reserva_id
`;

const buscar = (id) => db.prepare(`${SELECT_BASE} WHERE r.id = ?`).get(id);

async function validarNova(corpo) {
  const erros = {};

  const nome = String(corpo.nome ?? '').trim();
  if (!nome) erros.nome = 'Informe o nome da reunião.';

  // "Local" saiu do formulário — fica opcional (só o endereço importa agora).
  const local = String(corpo.local ?? '').trim();

  const endereco = String(corpo.endereco ?? '').trim();
  if (!endereco) erros.endereco = 'Endereço é obrigatório.';

  const regiaoId = Number(corpo.regiao_id);
  if (!Number.isInteger(regiaoId)) {
    erros.regiao_id = 'Selecione o bairro.';
  } else if (!(await db.prepare('SELECT 1 FROM regioes WHERE id = ?').get(regiaoId))) {
    erros.regiao_id = 'Bairro/região não existe.';
  }

  const data = String(corpo.data ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) erros.data = 'Informe a data.';

  const hora = String(corpo.hora ?? '').trim();
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(hora)) erros.hora = 'Informe a hora.';

  const candidato = String(corpo.candidato ?? '').trim();

  let coordenadorId = null;
  if (corpo.coordenador_id !== null && corpo.coordenador_id !== undefined && corpo.coordenador_id !== '') {
    coordenadorId = Number(corpo.coordenador_id);
    if (!Number.isInteger(coordenadorId) || !(await db.prepare('SELECT 1 FROM coordenadores WHERE id = ?').get(coordenadorId))) {
      erros.coordenador_id = 'Coordenador não encontrado.';
    }
  }

  let qtdCadeiras = null;
  if (corpo.qtd_cadeiras !== null && corpo.qtd_cadeiras !== undefined && corpo.qtd_cadeiras !== '') {
    qtdCadeiras = Number(corpo.qtd_cadeiras);
    if (!Number.isInteger(qtdCadeiras) || qtdCadeiras < 0) erros.qtd_cadeiras = 'Quantidade de cadeiras inválida.';
  }

  const temSom = corpo.tem_som ? 1 : 0;
  const presencaDeputado = corpo.presenca_deputado ? 1 : 0;

  if (Object.keys(erros).length > 0) return { ok: false, erros };
  return {
    ok: true,
    dados: {
      nome, local, endereco, regiao_id: regiaoId, data, hora,
      candidato, coordenador_id: coordenadorId, qtd_cadeiras: qtdCadeiras, tem_som: temSom,
      presenca_deputado: presencaDeputado,
      responsavel: String(corpo.responsavel ?? '').trim() || null,
      responsavel_telefone: String(corpo.responsavel_telefone ?? '').trim() || null,
      palestrante: String(corpo.palestrante ?? '').trim() || null,
    },
  };
}

/** POST /api/reunioes - nasce sempre como "a_confirmar" (RN-04). */
reunioesRouter.post('/', async (req, res) => {
  const v = await validarNova(req.body);
  if (!v.ok) return res.status(400).json({ erro: 'Dados inválidos.', campos: v.erros });

  const { lastInsertRowid } = await db
    .prepare(
      `INSERT INTO reunioes (nome, local, endereco, regiao_id, data, hora, status,
                             candidato, coordenador_id, qtd_cadeiras, tem_som, presenca_deputado,
                             responsavel, responsavel_telefone, palestrante)
       VALUES (@nome, @local, @endereco, @regiao_id, @data, @hora, 'a_confirmar',
               @candidato, @coordenador_id, @qtd_cadeiras, @tem_som, @presenca_deputado,
               @responsavel, @responsavel_telefone, @palestrante)`
    )
    .run(v.dados);

  res.status(201).json(await buscar(lastInsertRowid));
});

/**
 * PATCH /api/reunioes/:id  - editar as informações da reunião (a "canetinha").
 * Mexe só nos dados da agenda/folha; não altera titular/reserva/checklist.
 */
reunioesRouter.patch('/:id', async (req, res) => {
  const reuniao = await buscar(req.params.id);
  if (!reuniao) return res.status(404).json({ erro: 'Reunião não encontrada.' });

  const v = await validarNova(req.body);
  if (!v.ok) return res.status(400).json({ erro: 'Dados inválidos.', campos: v.erros });

  const { local, ...campos } = v.dados; // `local` saiu do formulário
  await db.prepare(
    `UPDATE reunioes
        SET nome = @nome, endereco = @endereco, regiao_id = @regiao_id,
            data = @data, hora = @hora, candidato = @candidato,
            coordenador_id = @coordenador_id, qtd_cadeiras = @qtd_cadeiras, tem_som = @tem_som,
            presenca_deputado = @presenca_deputado,
            responsavel = @responsavel, responsavel_telefone = @responsavel_telefone,
            palestrante = @palestrante
      WHERE id = @id`
  ).run({ ...campos, id: reuniao.id });

  res.json(await buscar(reuniao.id));
});

/** DELETE /api/reunioes/:id - remove a reunião da agenda. */
reunioesRouter.delete('/:id', async (req, res) => {
  const reuniao = await buscar(req.params.id);
  if (!reuniao) return res.status(404).json({ erro: 'Reunião não encontrada.' });

  await db.prepare('DELETE FROM reunioes WHERE id = ?').run(reuniao.id);
  res.json({ ok: true });
});

/**
 * GET /api/reunioes - mais recentes primeiro.
 * Filtro opcional: ?status=realizada (usado pela tela de Histórico).
 */
reunioesRouter.get('/', async (req, res) => {
  const { status } = req.query;
  const where = status ? 'WHERE r.status = @status' : '';

  res.json(
    await db
      .prepare(`${SELECT_BASE} ${where} ORDER BY r.data DESC, r.hora DESC, r.id DESC`)
      .all(status ? { status } : {})
  );
});

/** GET /api/reunioes/:id */
reunioesRouter.get('/:id', async (req, res) => {
  const r = await buscar(req.params.id);
  if (!r) return res.status(404).json({ erro: 'Reunião não encontrada.' });
  res.json(r);
});

/**
 * GET /api/reunioes/:id/sugestoes  (RN-03: proximidade = MESMO BAIRRO).
 */
reunioesRouter.get('/:id/sugestoes', async (req, res) => {
  const reuniao = await buscar(req.params.id);
  if (!reuniao) return res.status(404).json({ erro: 'Reunião não encontrada.' });

  const sugestoes = await db
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

const ERRO_REALIZADA =
  'Esta reunião já foi marcada como realizada e faz parte do histórico. ' +
  'Não é possível alterá-la.';

/** Confere que o palestrante existe e está ativo. */
async function carregarPalestranteAtivo(id) {
  const p = await db.prepare('SELECT id, nome, ativo FROM palestrantes WHERE id = ?').get(id);
  if (!p) return { ok: false, status: 404, erro: 'Palestrante não encontrado.' };
  if (!p.ativo) {
    return { ok: false, status: 400, erro: `${p.nome} está inativo e não pode ser alocado.` };
  }
  return { ok: true, palestrante: p };
}

/** PATCH /api/reunioes/:id/titular  - body: { palestrante_id } */
reunioesRouter.patch('/:id/titular', async (req, res) => {
  const reuniao = await buscar(req.params.id);
  if (!reuniao) return res.status(404).json({ erro: 'Reunião não encontrada.' });
  if (reuniao.status === 'realizada') return res.status(400).json({ erro: ERRO_REALIZADA });

  const p = await carregarPalestranteAtivo(req.body.palestrante_id);
  if (!p.ok) return res.status(p.status).json({ erro: p.erro });

  // RN-02: o mesmo titular não pode estar em duas reuniões na mesma data/hora.
  const choque = await db
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

  const eraReserva = reuniao.reserva_id === p.palestrante.id;

  await db.prepare(
    `UPDATE reunioes
        SET titular_id = @titular_id,
            reserva_id = CASE WHEN reserva_id = @titular_id THEN NULL ELSE reserva_id END,
            status = 'confirmada'
      WHERE id = @id`
  ).run({ titular_id: p.palestrante.id, id: reuniao.id });

  res.json({
    reuniao: await buscar(reuniao.id),
    aviso: eraReserva
      ? `${p.palestrante.nome} era a reserva e passou a titular. A reserva ficou vazia.`
      : undefined,
  });
});

/** PATCH /api/reunioes/:id/reserva  - body: { palestrante_id }  (null remove) */
reunioesRouter.patch('/:id/reserva', async (req, res) => {
  const reuniao = await buscar(req.params.id);
  if (!reuniao) return res.status(404).json({ erro: 'Reunião não encontrada.' });
  if (reuniao.status === 'realizada') return res.status(400).json({ erro: ERRO_REALIZADA });

  const { palestrante_id: novo } = req.body;

  if (novo === null || novo === undefined || novo === '') {
    await db.prepare('UPDATE reunioes SET reserva_id = NULL WHERE id = ?').run(reuniao.id);
    return res.json({ reuniao: await buscar(reuniao.id) });
  }

  const p = await carregarPalestranteAtivo(novo);
  if (!p.ok) return res.status(p.status).json({ erro: p.erro });

  if (reuniao.titular_id === p.palestrante.id) {
    return res.status(400).json({
      erro: `${p.palestrante.nome} já é o titular desta reunião. A reserva precisa ser outra pessoa.`,
    });
  }

  await db.prepare('UPDATE reunioes SET reserva_id = ? WHERE id = ?')
    .run(p.palestrante.id, reuniao.id);

  res.json({ reuniao: await buscar(reuniao.id) });
});

/** PATCH /api/reunioes/:id/checklist  - body: { som: bool, cadeiras: bool } */
reunioesRouter.patch('/:id/checklist', async (req, res) => {
  const reuniao = await buscar(req.params.id);
  if (!reuniao) return res.status(404).json({ erro: 'Reunião não encontrada.' });
  if (reuniao.status === 'realizada') return res.status(400).json({ erro: ERRO_REALIZADA });

  const { som, cadeiras } = req.body;
  if (typeof som !== 'boolean' || typeof cadeiras !== 'boolean') {
    return res.status(400).json({ erro: 'Informe "som" e "cadeiras" como true ou false.' });
  }

  await db.prepare(
    'UPDATE reunioes SET checklist_som = ?, checklist_cadeiras = ? WHERE id = ?'
  ).run(som ? 1 : 0, cadeiras ? 1 : 0, reuniao.id);

  res.json({ reuniao: await buscar(reuniao.id) });
});

/** PATCH /api/reunioes/:id/realizada  - body: { presentes: number } */
reunioesRouter.patch('/:id/realizada', async (req, res) => {
  const reuniao = await buscar(req.params.id);
  if (!reuniao) return res.status(404).json({ erro: 'Reunião não encontrada.' });

  const presentes = Number(req.body.presentes);
  if (!Number.isInteger(presentes) || presentes < 0) {
    return res.status(400).json({
      erro: 'Informe o número de presentes (um número inteiro, 0 ou mais).',
    });
  }

  await db.prepare(
    `UPDATE reunioes SET status = 'realizada', presentes = ? WHERE id = ?`
  ).run(presentes, reuniao.id);

  res.json({ reuniao: await buscar(reuniao.id) });
});
