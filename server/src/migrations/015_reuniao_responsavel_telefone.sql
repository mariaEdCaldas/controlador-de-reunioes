-- Migration 015 - Telefone do responsável da reunião.
--
-- O responsável (que pode ser um coordenador OU um cabo) tem o seu próprio
-- contato na folha/agenda. Guardado junto da reunião (texto livre normalizado),
-- porque o responsável nem sempre é o coordenador.

ALTER TABLE reunioes ADD COLUMN responsavel_telefone TEXT;
