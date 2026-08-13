-- Migration 009 - Coordenador responsável e hora pretendida nas propostas.
--
-- A ficha de proposta passa a ter um coordenador responsável (vínculo com a
-- tabela coordenadores, para trazer o contato) e a HORA pretendida, além da data.
-- O nome do responsável continua em `proponente` (texto), então o coordenador é
-- opcional caso a proposta venha de alguém ainda não cadastrado.

ALTER TABLE propostas ADD COLUMN coordenador_id INTEGER REFERENCES coordenadores(id);
ALTER TABLE propostas ADD COLUMN hora TEXT;
