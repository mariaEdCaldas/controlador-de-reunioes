-- Migration 008 - Propostas de reunião.
--
-- Fichas que as pessoas preenchem sugerindo uma reunião: "posso reunir X pessoas
-- em tal endereço, no bairro Y, com o candidato Z, no dia W". O gabinete depois
-- avalia por REGIÃO e vê onde dá para juntar propostas do mesmo bairro (às vezes
-- com candidatos diferentes) numa reunião só.
--
-- Usa regiao_id -> regioes (o mesmo vocabulário das reuniões), então a listagem
-- por região reaproveita a mesma lógica de bairro -> região.

CREATE TABLE propostas (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  proponente    TEXT NOT NULL,                       -- quem propôs / dono da ficha
  telefone      TEXT,
  regiao_id     INTEGER NOT NULL REFERENCES regioes(id),
  endereco      TEXT,
  publico       INTEGER,                             -- quantas pessoas cabem/viriam
  candidato     TEXT,                                -- candidato desejado na proposta
  data_sugerida TEXT,                                -- YYYY-MM-DD (opcional)
  observacoes   TEXT,
  status        TEXT NOT NULL DEFAULT 'pendente',    -- pendente | aprovada | recusada
  criado_em     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_propostas_regiao ON propostas (regiao_id);
