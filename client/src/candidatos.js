/**
 * Candidatos co-responsáveis. O Paulo Corrêa é sempre fixo; aqui vai o "outro"
 * que aparece na dupla do cabeçalho da folha de impressão.
 *
 * A arte de cada um é uma imagem em client/public/artes/<slug>.<ext>. Quando o
 * arquivo existir, o cabeçalho usa a imagem (com as fotos); enquanto não, cai
 * num cabeçalho no mesmo estilo, só com os nomes (ver FolhaImpressao.jsx).
 * A extensão varia por arquivo (rose-modesto é .png; os demais, .jpeg).
 */
export const CANDIDATOS = [
  { nome: 'Giroto', slug: 'giroto', ext: 'jpeg' },
  { nome: 'Luana Ruiz', slug: 'luana-ruiz', ext: 'jpeg' },
  { nome: 'Rose Modesto', slug: 'rose-modesto', ext: 'png' },
  { nome: 'Jaime Verruck', slug: 'jaime-verruck', ext: 'jpeg' },
  { nome: 'Beto Pereira', slug: 'beto-pereira', ext: 'jpeg' },
  { nome: 'Viviane Luiza', slug: 'viviane-luiza', ext: 'jpeg' },
  { nome: 'Carlos Bernardo', slug: 'carlos-bernardo', ext: 'jpeg' },
  { nome: 'Mara Caseiro', slug: 'mara-caseiro', ext: 'jpeg' },
];

export function slugDoCandidato(nome) {
  return CANDIDATOS.find((c) => c.nome === nome)?.slug ?? null;
}

export function arteDoCandidato(nome) {
  const c = CANDIDATOS.find((c) => c.nome === nome);
  return c ? `/artes/${c.slug}.${c.ext}` : null;
}

const DIAS = [
  'DOMINGO', 'SEGUNDA-FEIRA', 'TERÇA-FEIRA', 'QUARTA-FEIRA',
  'QUINTA-FEIRA', 'SEXTA-FEIRA', 'SÁBADO',
];

/** Dia da semana (em maiúsculas) de uma data YYYY-MM-DD, sem tropeço de fuso. */
export function diaDaSemana(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso ?? ''));
  if (!m) return '';
  // Meio-dia UTC evita a data "voltar um dia" por causa do fuso.
  const d = new Date(`${iso}T12:00:00Z`);
  return DIAS[d.getUTCDay()];
}

/** "19:00" -> "19h"; "19:30" -> "19h30". */
export function horaCurta(hora) {
  const m = /^(\d{2}):(\d{2})$/.exec(String(hora ?? ''));
  if (!m) return hora;
  return m[2] === '00' ? `${m[1]}h` : `${m[1]}h${m[2]}`;
}
