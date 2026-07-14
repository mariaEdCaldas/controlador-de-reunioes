-- Migration 002 - Lista fixa de bairros/regioes (RN-01 / RN-03).
--
-- Isto e dado de referencia, nao dado de exemplo: sem regiao cadastrada nao da
-- para cadastrar palestrante nem reuniao. Por isso vem em migration, e nao no
-- seed opcional. Para incluir um bairro novo depois, crie outra migration com
-- o INSERT - assim todo mundo que rodar o projeto recebe a mesma lista.
INSERT INTO regioes (nome) VALUES
  ('Centro'),
  ('Coophavila'),
  ('Jardim Noroeste'),
  ('Tiradentes'),
  ('Universitário'),
  ('Vila Progresso');
