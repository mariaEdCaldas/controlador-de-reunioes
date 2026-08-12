-- Migration 006 - Campos da agenda para a folha de impressão.
--
-- A reunião passa a ter: nome (título), o candidato co-responsável (o Paulo
-- Corrêa é fixo), o coordenador de contato (traz o telefone dele), a quantidade
-- de cadeiras e se vai ter som. Tudo opcional para não quebrar reuniões antigas.

ALTER TABLE reunioes ADD COLUMN nome TEXT NOT NULL DEFAULT '';
ALTER TABLE reunioes ADD COLUMN candidato TEXT NOT NULL DEFAULT '';
ALTER TABLE reunioes ADD COLUMN coordenador_id INTEGER REFERENCES coordenadores(id) ON DELETE SET NULL;
ALTER TABLE reunioes ADD COLUMN qtd_cadeiras INTEGER CHECK (qtd_cadeiras IS NULL OR qtd_cadeiras >= 0);
ALTER TABLE reunioes ADD COLUMN tem_som INTEGER NOT NULL DEFAULT 0 CHECK (tem_som IN (0, 1));
