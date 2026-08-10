-- Migration 004 - Registro de lembretes enviados.
--
-- Guarda quais reunioes ja receberam qual tipo de lembrete, para o disparo
-- diario nao mandar o mesmo e-mail duas vezes se rodar mais de uma vez no dia.

CREATE TABLE lembretes_enviados (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  reuniao_id  INTEGER NOT NULL REFERENCES reunioes(id) ON DELETE CASCADE,
  -- Tipo do lembrete. Hoje so existe 'vespera_email' (vespera = dia anterior).
  tipo        TEXT NOT NULL DEFAULT 'vespera_email',
  enviado_em  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (reuniao_id, tipo)
);
