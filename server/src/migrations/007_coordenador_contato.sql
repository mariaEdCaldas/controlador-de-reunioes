-- Migration 007 - Mais dados de contato do coordenador.
--
-- O coordenador passa a ter bairro, endereço e rede social. O bairro é usado
-- na Nova Reunião: ao escolher o coordenador, o bairro dele já entra no campo.
-- Texto livre (o bairro do coordenador não é o mesmo cadastro de regiões das
-- reuniões — é só a referência de onde ele mora/atua).

ALTER TABLE coordenadores ADD COLUMN bairro TEXT;
ALTER TABLE coordenadores ADD COLUMN endereco TEXT;
ALTER TABLE coordenadores ADD COLUMN rede_social TEXT;
