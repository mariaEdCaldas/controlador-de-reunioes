-- Migration 016 - Presença do deputado na reunião.
--
-- Marca se o próprio Dep. Paulo Corrêa estará presente. Quando marcado, a agenda
-- exportada mostra "Presença Dep. Paulo Corrêa" e grifa o título; quando não,
-- valem os palestrantes. Substitui a antiga adivinhação pelo texto do palestrante.

ALTER TABLE reunioes ADD COLUMN presenca_deputado INTEGER NOT NULL DEFAULT 0;
