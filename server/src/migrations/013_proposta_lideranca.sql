-- Migration 013 - Liderança da proposta.
--
-- O quadro de propostas do gabinete tem, além do coordenador responsável, uma
-- "Liderança" (a pessoa da comunidade que puxa a reunião). Vira campo próprio da
-- proposta, em vez de ficar espremida nas observações.

ALTER TABLE propostas ADD COLUMN lideranca TEXT;
