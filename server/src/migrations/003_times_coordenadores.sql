-- Migration 003 - Times e Coordenadores.
--
-- Conceito novo, independente de palestrantes/reunioes: o gabinete organiza
-- coordenadores de campo em times. Um time tem so um nome; cada coordenador
-- pertence a um time (ou a nenhum, enquanto nao vinculado).

CREATE TABLE times (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  nome      TEXT NOT NULL UNIQUE COLLATE NOCASE,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE coordenadores (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  nome      TEXT NOT NULL,
  -- Normalizado (55 + DDD + numero) quando da; NULL permitido porque a carga
  -- tem contatos sem numero utilizavel. Sem o CHECK rigido de palestrantes:
  -- e um cadastro importado, nao pode travar por um telefone fora do padrao.
  telefone  TEXT,
  -- O vinculo com o time. ON DELETE SET NULL: apagar um time solta os
  -- coordenadores dele (sao pessoas, nao somem), so ficam sem time.
  time_id   INTEGER REFERENCES times(id) ON DELETE SET NULL,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_coordenadores_time ON coordenadores (time_id);
