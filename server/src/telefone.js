/**
 * Normaliza o telefone digitado para o formato internacional so-digitos
 * (5567999998888), que e o unico aceito pelo banco e o exigido pelo link
 * do WhatsApp (RN-07).
 *
 * A pessoa que cadastra digita do jeito que esta acostumada - "(67) 99999-8888",
 * "67 99999-8888", "+55 67 99999 8888" - e todos viram a mesma coisa.
 *
 * @returns {{ok: true, telefone: string} | {ok: false, erro: string}}
 */
export function normalizarTelefone(entrada) {
  const digitos = String(entrada ?? '').replace(/\D/g, '');

  if (digitos.length === 0) {
    return { ok: false, erro: 'Telefone é obrigatório.' };
  }

  // 10 digitos = fixo com DDD; 11 = celular com DDD. Falta o codigo do pais.
  const completo =
    digitos.length === 10 || digitos.length === 11 ? `55${digitos}` : digitos;

  if (completo.length < 12 || completo.length > 15) {
    return {
      ok: false,
      erro: 'Telefone inválido. Use DDD + número, ex.: (67) 99999-8888.',
    };
  }

  return { ok: true, telefone: completo };
}

/** Formata 5567999998888 como (67) 99999-8888, so para exibir na tela. */
export function formatarTelefone(telefone) {
  const m = /^55(\d{2})(\d{4,5})(\d{4})$/.exec(telefone);
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : telefone;
}
