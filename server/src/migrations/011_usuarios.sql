-- Migration 011 - Usuários e login.
--
-- Acesso ao sistema por e-mail + senha, com dois papéis: 'admin' (gerencia
-- usuários e faz tudo) e 'comum' (usa o sistema). A senha é guardada só como
-- hash (bcrypt) — nunca em texto puro. O primeiro admin é criado no primeiro
-- acesso (bootstrap), quando a tabela está vazia.

CREATE TABLE usuarios (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  nome       TEXT NOT NULL,
  email      TEXT NOT NULL UNIQUE COLLATE NOCASE,
  senha_hash TEXT NOT NULL,
  papel      TEXT NOT NULL DEFAULT 'comum',   -- 'admin' | 'comum'
  criado_em  TEXT NOT NULL DEFAULT (datetime('now'))
);
