/**
 * Uma cor fixa por bairro/região — a mesma bolinha aparece na listagem de
 * palestrantes e, depois, nas reuniões, para bater o olho e ver que a região
 * combina (RN-03).
 *
 * Ancorado no NOME do bairro, não no id: o id depende da ordem em que a
 * migration inseriu as regiões, e a cor do Centro não pode mudar porque alguém
 * cadastrou um bairro novo antes dele.
 */
// Tons terrosos, puxados para o verde e o dourado do gabinete: distinguem um
// bairro do outro sem competir com a interface (a paleta do sistema é fechada —
// verde, dourado, papel). Os dois primeiros são as cores da própria marca.
const CORES_POR_BAIRRO = {
  Centro: '#1E7A3D',
  Coophavila: '#D6A419',
  'Jardim Noroeste': '#4A6D8C',
  Tiradentes: '#B4653A',
  Universitário: '#6B5B8E',
  'Vila Progresso': '#2F7A72',
};

// Para bairros incluídos depois: cor estável derivada do nome (sempre a mesma
// para o mesmo bairro), em vez de cinza genérico para todos.
const RESERVA = ['#8B5A2B', '#4F6B2A', '#8C4A5E', '#3F6E75', '#5D5A87', '#96603C'];

export function corDaRegiao(nome) {
  if (CORES_POR_BAIRRO[nome]) return CORES_POR_BAIRRO[nome];

  let soma = 0;
  for (const c of String(nome ?? '')) soma += c.codePointAt(0);
  return RESERVA[soma % RESERVA.length];
}

/** Exibe 5567999998888 como (67) 99999-8888. */
export function formatarTelefone(telefone) {
  const m = /^55(\d{2})(\d{4,5})(\d{4})$/.exec(String(telefone ?? ''));
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : telefone;
}

/** Exibe 2026-08-05 como 05/08/2026 (sem passar por Date: o texto já basta,
 *  e Date interpretaria a data como UTC, podendo mostrar o dia anterior). */
export function formatarData(data) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(data ?? ''));
  return m ? `${m[3]}/${m[2]}/${m[1]}` : data;
}

export const ROTULO_STATUS = {
  a_confirmar: 'A confirmar',
  confirmada: 'Confirmada',
  realizada: 'Realizada',
};
