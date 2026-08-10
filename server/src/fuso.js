/**
 * Fuso horário do gabinete: Campo Grande / MS (America/Campo_Grande, UTC−4).
 *
 * Fixamos o fuso aqui para os cálculos de "amanhã", "fim previsto da reunião" e
 * "horário do disparo diário" não dependerem do fuso configurado no Windows —
 * o sistema pode rodar em qualquer máquina e continua raciocinando no relógio
 * de Campo Grande. Ajustável pela variável FUSO no .env, se um dia mudar.
 */
const TZ = process.env.FUSO || 'America/Campo_Grande';

/** Data de hoje (YYYY-MM-DD) no fuso de Campo Grande. */
export function hojeNaTz(base = new Date()) {
  // en-CA formata como YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(base);
}

/** Soma (ou subtrai) dias a uma data YYYY-MM-DD, sem sofrer com fuso/DST. */
function somaDias(iso, dias) {
  const d = new Date(`${iso}T12:00:00Z`); // meio-dia UTC: longe das viradas
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

export const amanhaNaTz = (base = new Date()) => somaDias(hojeNaTz(base), 1);
export const ontemNaTz = (base = new Date()) => somaDias(hojeNaTz(base), -1);

/** Offset do fuso, em minutos, para um instante (Campo Grande = −240). */
function offsetMin(date) {
  const nome = new Intl.DateTimeFormat('en-US', { timeZone: TZ, timeZoneName: 'shortOffset' })
    .formatToParts(date)
    .find((p) => p.type === 'timeZoneName').value; // ex.: "GMT-4"
  const m = /GMT([+-])(\d{1,2})(?::(\d{2}))?/.exec(nome);
  if (!m) return 0;
  const sinal = m[1] === '-' ? -1 : 1;
  return sinal * (Number(m[2]) * 60 + Number(m[3] ?? 0));
}

/**
 * Epoch (ms) do relógio de parede `YYYY-MM-DD` + `HH:MM` interpretado no fuso
 * de Campo Grande. Ex.: 08:00 em Campo Grande vira 12:00 UTC.
 */
export function epochLocal(dataStr, horaStr) {
  const comoUtc = Date.parse(`${dataStr}T${horaStr}:00Z`);
  const off = offsetMin(new Date(comoUtc));
  return comoUtc - off * 60000;
}

/** Milissegundos até a próxima ocorrência de `horaAlvo`:00 no fuso (disparo diário). */
export function msAteHoraLocal(horaAlvo, base = new Date()) {
  const agora = base.getTime();
  const hh = String(horaAlvo).padStart(2, '0');
  let alvo = epochLocal(hojeNaTz(base), `${hh}:00`);
  if (alvo <= agora) alvo = epochLocal(amanhaNaTz(base), `${hh}:00`);
  return alvo - agora;
}
