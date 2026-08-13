-- Migration 010 - Cabos eleitorais.
--
-- Hierarquia: Time -> Coordenador -> Cabo. Cada cabo é uma pessoa vinculada a um
-- coordenador (e, por ele, a um time). É o maior volume do sistema (centenas de
-- cadastros), então o vínculo é indexado.
--
-- coordenador_id é opcional no banco (para a importação conseguir trazer cabos
-- mesmo quando o coordenador da planilha ainda não bate com um cadastrado), mas
-- o cadastro manual pede o coordenador.

CREATE TABLE cabos (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  nome           TEXT NOT NULL,
  telefone       TEXT,
  bairro         TEXT,
  endereco       TEXT,
  rede_social    TEXT,
  coordenador_id INTEGER REFERENCES coordenadores(id),
  criado_em      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_cabos_coordenador ON cabos (coordenador_id);
CREATE INDEX idx_cabos_nome ON cabos (nome COLLATE NOCASE);
