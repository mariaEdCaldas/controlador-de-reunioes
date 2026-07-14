-- Migration 001 - Schema inicial: regioes, palestrantes e reunioes.
-- Cobre as RN-01 a RN-05 e RN-10 do documento de requisitos.

-- Tabela placeholder do esqueleto inicial, sem uso.
DROP TABLE IF EXISTS schema_info;

-- ---------------------------------------------------------------------------
-- REGIOES (RN-01 / RN-03)
-- Lista fixa de bairros/regioes. E o vocabulario comum entre palestrante e
-- reuniao: a sugestao por proximidade compara regiao_id com regiao_id, entao
-- os dois cadastros precisam escolher da MESMA lista (nada de texto livre).
-- Tabela em vez de CHECK/enum porque incluir um bairro novo vira um INSERT,
-- e nao uma recriacao de tabela (SQLite nao altera CHECK depois de criado).
-- ---------------------------------------------------------------------------
CREATE TABLE regioes (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL UNIQUE COLLATE NOCASE
);

-- ---------------------------------------------------------------------------
-- PALESTRANTES (RN-01)
-- ---------------------------------------------------------------------------
CREATE TABLE palestrantes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  nome       TEXT NOT NULL,
  -- Formato internacional, so digitos: 55 + DDD + numero (ex.: 5567999998888).
  -- Guardado assim porque o link do WhatsApp (RN-07) exige exatamente isso.
  telefone   TEXT NOT NULL
             CHECK (telefone NOT GLOB '*[^0-9]*')
             CHECK (length(telefone) BETWEEN 12 AND 15),
  regiao_id  INTEGER NOT NULL REFERENCES regioes(id) ON DELETE RESTRICT,
  -- Temas que ministra, texto livre separado por virgula ("Saude, Educacao").
  -- Hoje e so informativo: a sugestao da RN-03 cruza regiao + disponibilidade,
  -- nao tema. Se um dia precisar filtrar por tema, vira tabela propria.
  temas      TEXT NOT NULL DEFAULT '',
  ativo      INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0, 1)),
  criado_em  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_palestrantes_regiao ON palestrantes (regiao_id, ativo);

-- ---------------------------------------------------------------------------
-- REUNIOES (RN-03, RN-04, RN-05, RN-10)
-- ---------------------------------------------------------------------------
CREATE TABLE reunioes (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  -- Nome do lugar ("Coopatrabalho"); endereco e a rua/numero completo.
  local          TEXT NOT NULL,
  endereco       TEXT NOT NULL,
  regiao_id      INTEGER NOT NULL REFERENCES regioes(id) ON DELETE RESTRICT,

  -- SQLite nao tem tipo data/hora: guardamos texto em formato fixo, que ordena
  -- e compara corretamente como string ('2026-07-20' > '2026-07-14').
  data           TEXT NOT NULL CHECK (data GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  hora           TEXT NOT NULL CHECK (hora GLOB '[0-2][0-9]:[0-5][0-9]'),

  status         TEXT NOT NULL DEFAULT 'a_confirmar'
                 CHECK (status IN ('a_confirmar', 'confirmada', 'realizada')),

  -- RN-04: um unico titular por reuniao, mais um reserva opcional.
  -- ON DELETE SET NULL: apagar um palestrante nao apaga a reuniao, so a
  -- desaloca (a reuniao volta a precisar de alguem).
  titular_id     INTEGER REFERENCES palestrantes(id) ON DELETE SET NULL,
  reserva_id     INTEGER REFERENCES palestrantes(id) ON DELETE SET NULL,

  -- RN-05: itens fixos, 0 = pendente, 1 = providenciado.
  checklist_som      INTEGER NOT NULL DEFAULT 0 CHECK (checklist_som IN (0, 1)),
  checklist_cadeiras INTEGER NOT NULL DEFAULT 0 CHECK (checklist_cadeiras IN (0, 1)),

  -- RN-10: preenchido a mao depois da reuniao; NULL enquanto nao aconteceu.
  presentes      INTEGER CHECK (presentes IS NULL OR presentes >= 0),

  criado_em      TEXT NOT NULL DEFAULT (datetime('now')),

  -- Constraint de tabela (vem depois de todas as colunas): a mesma pessoa nao
  -- pode ser titular e reserva da mesma reuniao.
  CHECK (reserva_id IS NULL OR reserva_id <> titular_id)
);

CREATE INDEX idx_reunioes_data ON reunioes (data, hora);
CREATE INDEX idx_reunioes_regiao ON reunioes (regiao_id);

-- RN-02: um palestrante alocado como titular fica com aquele horario bloqueado.
-- O indice unico parcial faz o proprio banco recusar um segundo agendamento do
-- mesmo titular na mesma data/hora - a agenda nao consegue "chocar" nem por bug
-- de codigo. NULL nao entra no indice, entao varias reunioes sem titular convivem.
CREATE UNIQUE INDEX idx_reunioes_titular_horario
  ON reunioes (titular_id, data, hora)
  WHERE titular_id IS NOT NULL;
