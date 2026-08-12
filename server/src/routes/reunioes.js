import { Router } from 'express';
import { db } from '../db.js';

export const reunioesRouter = Router();

const SELECT_BASE = `
  SELECT r.id, r.local, r.endereco, r.data, r.hora, r.status,
         r.nome, r.candidato, r.qtd_cadeiras, r.tem_som,
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

function validarNova(corpo) {
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
  } else if (!db.prepare('SELECT 1 FROM regioes WHERE id = ?').get(regiaoId)) {
    erros.regiao_id = 'Bairro/região não existe.';
  }

  // O banco tambem checa o formato; aqui a mensagem sai legivel na tela.
  const data = String(corpo.data ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) erros.data = 'Informe a data.';

  const hora = String(corpo.hora ?? '').trim();
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(hora)) erros.hora = 'Informe a hora.';

  // Opcionais: candidato co-responsável, coordenador de contato, cadeiras, som.
  const candidato = String(corpo.candidato ?? '').trim();

  let coordenadorId = null;
  if (corpo.coordenador_id !== null && corpo.coordenador_id !== undefined && corpo.coordenador_id !== '') {
    coordenadorId = Number(corpo.coordenador_id);
    if (!Number.isInteger(coordenadorId) || !db.prepare('SELECT 1 FROM coordenadores WHERE id = ?').get(coordenadorId)) {
      erros.coordenador_id = 'Coordenador não encontrado.';
    }
  }

  let qtdCadeiras = null;
  if (corpo.qtd_cadeiras !== null && corpo.qtd_cadeiras !== undefined && corpo.qtd_cadeiras !== '') {
    qtdCadeiras = Number(corpo.qtd_cadeiras);
    if (!Number.isInteger(qtdCadeiras) || qtdCadeiras < 0) erros.qtd_cadeiras = 'Quantidade de cadeiras inválida.';
  }

  const temSom = corpo.tem_som ? 1 : 0;

  if (Object.keys(erros).length > 0) return { ok: false, erros };
  return {
    ok: true,
    dados: {
      nome, local, endereco, regiao_id: regiaoId, data, hora,
      candidato, coordenador_id: coordenadorId, qtd_cadeiras: qtdCadeiras, tem_som: temSom,
    },
  };
}

/** POST /api/reunioes - nasce sempre como "a_confirmar" (RN-04). */
reunioesRouter.post('/', (req, res) => {
  const v = validarNova(req.body);
  if (!v.ok) return res.status(400).json({ erro: 'Dados inválidos.', campos: v.erros });

  const { lastInsertRowid } = db
    .prepare(
      `INSERT INTO reunioes (nome, local, endereco, regiao_id, data, hora, status,
                             candidato, coordenador_id, qtd_cadeiras, tem_som)
       VALUES (@nome, @local, @endereco, @regiao_id, @data, @hora, 'a_confirmar',
               @candidato, @coordenador_id, @qtd_cadeiras, @tem_som)`
    )
    .run(v.dados);

  res.status(201).json(buscar(lastInsertRowid));
});

/**
 * PATCH /api/reunioes/:id  - editar as informações da reunião (a "canetinha"
 * da Agenda). Mexe só nos dados da agenda/folha; não altera titular, reserva,
 * checklist nem presença (esses têm regras próprias).
 */
reunioesRouter.patch('/:id', (req, res) => {
  const reuniao = buscar(req.params.id);
  if (!reuniao) return res.status(404).json({ erro: 'Reunião não encontrada.' });

  const v = validarNova(req.body);
  if (!v.ok) return res.status(400).json({ erro: 'Dados inválidos.', campos: v.erros });

  // `local` saiu do formulário; não entra no UPDATE (só os campos editáveis).
  const { local, ...campos } = v.dados;
  db.prepare(
    `UPDATE reunioes
        SET nome = @nome, endereco = @endereco, regiao_id = @regiao_id,
            data = @data, hora = @hora, candidato = @candidato,
            coordenador_id = @coordenador_id, qtd_cadeiras = @qtd_cadeiras, tem_som = @tem_som
      WHERE id = @id`
  ).run({ ...campos, id: reuniao.id });

  res.json(buscar(reuniao.id));
});

/** DELETE /api/reunioes/:id - remove a reunião da agenda. */
reunioesRouter.delete('/:id', (req, res) => {
  const reuniao = buscar(req.params.id);
  if (!reuniao) return res.status(404).json({ erro: 'Reunião não encontrada.' });

  db.prepare('DELETE FROM reunioes WHERE id = ?').run(reuniao.id);
  res.json({ ok: true });
});

/**
 * GET /api/reunioes - mais recentes primeiro.
 * Filtro opcional: ?status=realizada (usado pela tela de Histórico).
 */
reunioesRouter.get('/', (req, res) => {
  const { status } = req.query;
  const where = status ? 'WHERE r.status = @status' : '';

  res.json(
    db
      .prepare(`${SELECT_BASE} ${where} ORDER BY r.data DESC, r.hora DESC, r.id DESC`)
      .all(status ? { status } : {})
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

// Reuniao realizada e historico (RN-10): trocar o titular depois do fato faria
// a prestacao de contas mentir sobre quem foi. O checklist tambem congela - o
// som ou nao foi providenciado, e isso ja aconteceu.
const ERRO_REALIZADA =
  'Esta reunião já foi marcada como realizada e faz parte do histórico. ' +
  'Não é possível alterá-la.';

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
  if (reuniao.status === 'realizada') return res.status(400).json({ erro: ERRO_REALIZADA });

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
  if (reuniao.status === 'realizada') return res.status(400).json({ erro: ERRO_REALIZADA });

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

/**
 * PATCH /api/reunioes/:id/checklist  - body: { som: bool, cadeiras: bool }
 *
 * RN-05: som e cadeiras são os itens fixos de toda reunião. Os dois campos são
 * enviados juntos e sempre refletem o estado das caixinhas na tela.
 */
reunioesRouter.patch('/:id/checklist', (req, res) => {
  const reuniao = buscar(req.params.id);
  if (!reuniao) return res.status(404).json({ erro: 'Reunião não encontrada.' });
  if (reuniao.status === 'realizada') return res.status(400).json({ erro: ERRO_REALIZADA });

  const { som, cadeiras } = req.body;
  if (typeof som !== 'boolean' || typeof cadeiras !== 'boolean') {
    return res.status(400).json({ erro: 'Informe "som" e "cadeiras" como true ou false.' });
  }

  db.prepare(
    'UPDATE reunioes SET checklist_som = ?, checklist_cadeiras = ? WHERE id = ?'
  ).run(som ? 1 : 0, cadeiras ? 1 : 0, reuniao.id);

  res.json({ reuniao: buscar(reuniao.id) });
});

/**
 * PATCH /api/reunioes/:id/realizada  - body: { presentes: number }
 *
 * Finaliza a reunião: registra quantas pessoas foram (contagem na mão) e ela
 * entra no histórico. Não exige palestrante — a agenda usa coordenador, e um
 * evento que aconteceu pode ser fechado mesmo sem palestrante alocado.
 */
reunioesRouter.patch('/:id/realizada', (req, res) => {
  const reuniao = buscar(req.params.id);
  if (!reuniao) return res.status(404).json({ erro: 'Reunião não encontrada.' });

  const presentes = Number(req.body.presentes);
  if (!Number.isInteger(presentes) || presentes < 0) {
    return res.status(400).json({
      erro: 'Informe o número de presentes (um número inteiro, 0 ou mais).',
    });
  }

  db.prepare(
    `UPDATE reunioes SET status = 'realizada', presentes = ? WHERE id = ?`
  ).run(presentes, reuniao.id);

  res.json({ reuniao: buscar(reuniao.id) });
});
