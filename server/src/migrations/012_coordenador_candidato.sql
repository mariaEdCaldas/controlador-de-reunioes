-- Migration 012 - Deputado vinculado ao coordenador.
--
-- Cada coordenador pode ter um deputado federal parceiro vinculado (ex.: o time
-- "JVE" é do Jaime Verruck). Ao escolher o coordenador na Nova Reunião, esse
-- deputado já entra no campo "Candidatos" — mas continua editável (a pessoa pode
-- trocar). Texto livre: guarda o nome do candidato como aparece na lista.

ALTER TABLE coordenadores ADD COLUMN candidato TEXT;
