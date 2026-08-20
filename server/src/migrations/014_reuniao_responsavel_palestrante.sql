-- Migration 014 - Responsável e Palestrante na reunião.
--
-- O documento da Agenda Capital tem, além da Coordenação (o coordenador), um
-- "Responsável" (quem recebe/puxa a reunião) e a linha de "Presença de
-- palestrante". Viram campos de texto livre da reunião: o responsável é
-- pré-preenchido com o coordenador (mas pode ser trocado) e o palestrante é
-- digitado direto (independente da alocação por sugestão).

ALTER TABLE reunioes ADD COLUMN responsavel TEXT;
ALTER TABLE reunioes ADD COLUMN palestrante TEXT;
