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

/** Converte "11/08/2026" (dd/mm/aaaa) para "2026-08-11" (ISO). '' se inválida. */
export function brParaIso(br) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(br ?? '').trim());
  if (!m) return '';
  const [, d, mo, y] = m;
  const iso = `${y}-${mo}-${d}`;
  const dt = new Date(`${iso}T12:00:00Z`);
  // Recusa datas impossíveis (ex.: 31/02): o Date "corrige" e não bate mais.
  if (dt.getUTCDate() !== Number(d) || dt.getUTCMonth() + 1 !== Number(mo)) return '';
  return iso;
}

/** Vai formatando o que o usuário digita como dd/mm/aaaa (só dígitos + barras). */
export function mascaraData(valor) {
  const dig = String(valor ?? '').replace(/\D/g, '').slice(0, 8);
  const partes = [];
  if (dig.length > 0) partes.push(dig.slice(0, 2));
  if (dig.length >= 3) partes.push(dig.slice(2, 4));
  if (dig.length >= 5) partes.push(dig.slice(4, 8));
  return partes.join('/');
}

export const ROTULO_STATUS = {
  a_confirmar: 'A confirmar',
  confirmada: 'Confirmada',
  realizada: 'Realizada',
};
