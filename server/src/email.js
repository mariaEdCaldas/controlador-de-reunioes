import nodemailer from 'nodemailer';
import { config, emailConfigurado } from './config-lembretes.js';

const meses = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

function dataPorExtenso(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso ?? ''));
  if (!m) return iso;
  return `${Number(m[3])} de ${meses[Number(m[2]) - 1]} de ${m[1]}`;
}

/**
 * Monta o lembrete de uma reunião: assunto + texto + html.
 *
 * Sempre lembra do som e das cadeiras (o "aluguel de mesa e cadeiras"),
 * destacando o que ainda está pendente no checklist.
 */
export function montarLembrete(reuniao) {
  const r = reuniao;
  const assunto = `Lembrete: reunião amanhã (${dataPorExtenso(r.data)}) em ${r.local}`;

  const pendencias = [];
  if (!r.checklist_som) pendencias.push('som');
  if (!r.checklist_cadeiras) pendencias.push('mesa e cadeiras');

  const linhaChecklist = pendencias.length
    ? `⚠️ Ainda falta providenciar: ${pendencias.join(' e ')}.`
    : '✅ Som e cadeiras já constam como providenciados.';

  const titular = r.titular_nome
    ? `${r.titular_nome}${r.titular_telefone ? ` (${r.titular_telefone})` : ''}`
    : 'ainda não definido';

  const texto = [
    'Lembrete de reunião — amanhã.',
    '',
    `Local:     ${r.local}`,
    `Endereço:  ${r.endereco}`,
    `Bairro:    ${r.regiao ?? '—'}`,
    `Data:      ${dataPorExtenso(r.data)}`,
    `Horário:   ${r.hora}`,
    `Palestrante: ${titular}`,
    r.reserva_nome ? `Reserva:   ${r.reserva_nome}` : null,
    '',
    'Não esquecer do aluguel da mesa e das cadeiras (e do som).',
    linhaChecklist,
    '',
    '— Agenda de Palestrantes · Gabinete Dep. Paulo Corrêa',
  ]
    .filter((l) => l !== null)
    .join('\n');

  const esc = (s) => String(s ?? '').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
  const html = `
    <div style="font-family:system-ui,Segoe UI,sans-serif;color:#1c2b22;max-width:520px">
      <h2 style="color:#0f3b25;margin:0 0 4px">Lembrete de reunião — amanhã</h2>
      <table style="border-collapse:collapse;font-size:14px;margin:12px 0">
        <tr><td style="padding:3px 12px 3px 0;color:#6b7280">Local</td><td><strong>${esc(r.local)}</strong></td></tr>
        <tr><td style="padding:3px 12px 3px 0;color:#6b7280">Endereço</td><td>${esc(r.endereco)}</td></tr>
        <tr><td style="padding:3px 12px 3px 0;color:#6b7280">Bairro</td><td>${esc(r.regiao ?? '—')}</td></tr>
        <tr><td style="padding:3px 12px 3px 0;color:#6b7280">Data</td><td>${dataPorExtenso(r.data)}</td></tr>
        <tr><td style="padding:3px 12px 3px 0;color:#6b7280">Horário</td><td>${esc(r.hora)}</td></tr>
        <tr><td style="padding:3px 12px 3px 0;color:#6b7280">Palestrante</td><td>${esc(titular)}</td></tr>
        ${r.reserva_nome ? `<tr><td style="padding:3px 12px 3px 0;color:#6b7280">Reserva</td><td>${esc(r.reserva_nome)}</td></tr>` : ''}
      </table>
      <p style="background:#fbf4e6;border:1px solid #ecd9a8;border-radius:6px;padding:10px 14px;font-size:14px">
        <strong>Não esquecer do aluguel da mesa e das cadeiras</strong> (e do som).<br>${linhaChecklist}
      </p>
      <p style="color:#6b7280;font-size:12px">Agenda de Palestrantes · Gabinete Dep. Paulo Corrêa</p>
    </div>`;

  return { assunto, texto, html };
}

/** Soma horas a um "HH:MM" e devolve outro "HH:MM" (para o fim previsto). */
function somarHoras(hora, horas) {
  const [h, m] = String(hora ?? '').split(':').map(Number);
  if (Number.isNaN(h)) return hora;
  const total = (h + horas) % 24;
  return `${String(total).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Monta o e-mail de fechamento, enviado depois que a reunião já deve ter
 * terminado. Sinaliza se dá ou não para fechá-la na agenda:
 *  - COM titular  → pode fechar (marcar como realizada e informar presentes);
 *  - SEM titular  → ainda não dá: falta definir o palestrante titular.
 */
export function montarLembreteFechamento(reuniao, duracaoHoras = 2) {
  const r = reuniao;
  const podeFechar = Boolean(r.titular_id);
  const fim = somarHoras(r.hora, duracaoHoras);

  const assunto = podeFechar
    ? `Pode fechar na agenda: ${r.local} (${dataPorExtenso(r.data)})`
    : `Reunião sem titular: ${r.local} (${dataPorExtenso(r.data)})`;

  const veredito = podeFechar
    ? `✅ PODE FECHAR. Abra a Agenda, clique em "Marcar como realizada" e informe o número de presentes.`
    : `⛔ AINDA NÃO DÁ PARA FECHAR: falta definir o palestrante titular. Defina o titular na Agenda e então marque como realizada.`;

  const texto = [
    'Reunião encerrada (horário previsto já passou).',
    '',
    `Local:     ${r.local}`,
    `Endereço:  ${r.endereco}`,
    `Bairro:    ${r.regiao ?? '—'}`,
    `Data:      ${dataPorExtenso(r.data)}`,
    `Horário:   ${r.hora} às ${fim} (previsto, ${duracaoHoras}h)`,
    `Palestrante: ${r.titular_nome ?? 'NÃO definido'}`,
    '',
    veredito,
    '',
    '— Agenda de Palestrantes · Gabinete Dep. Paulo Corrêa',
  ].join('\n');

  const esc = (s) => String(s ?? '').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
  const cor = podeFechar ? '#1e7a3d' : '#b33a3a';
  const fundo = podeFechar ? '#eef6f0' : '#fdf0f0';
  const html = `
    <div style="font-family:system-ui,Segoe UI,sans-serif;color:#1c2b22;max-width:520px">
      <h2 style="color:#0f3b25;margin:0 0 4px">Reunião encerrada — fechar na agenda?</h2>
      <table style="border-collapse:collapse;font-size:14px;margin:12px 0">
        <tr><td style="padding:3px 12px 3px 0;color:#6b7280">Local</td><td><strong>${esc(r.local)}</strong></td></tr>
        <tr><td style="padding:3px 12px 3px 0;color:#6b7280">Endereço</td><td>${esc(r.endereco)}</td></tr>
        <tr><td style="padding:3px 12px 3px 0;color:#6b7280">Bairro</td><td>${esc(r.regiao ?? '—')}</td></tr>
        <tr><td style="padding:3px 12px 3px 0;color:#6b7280">Data</td><td>${dataPorExtenso(r.data)}</td></tr>
        <tr><td style="padding:3px 12px 3px 0;color:#6b7280">Horário</td><td>${esc(r.hora)} às ${esc(fim)} (previsto, ${duracaoHoras}h)</td></tr>
        <tr><td style="padding:3px 12px 3px 0;color:#6b7280">Palestrante</td><td>${esc(r.titular_nome ?? 'NÃO definido')}</td></tr>
      </table>
      <p style="background:${fundo};border:1px solid ${cor}33;border-left:3px solid ${cor};border-radius:6px;padding:10px 14px;font-size:14px;color:${cor}">
        <strong>${veredito}</strong>
      </p>
      <p style="color:#6b7280;font-size:12px">Agenda de Palestrantes · Gabinete Dep. Paulo Corrêa</p>
    </div>`;

  return { assunto, texto, html, podeFechar };
}

let transportador = null;
function obterTransportador() {
  if (!transportador) {
    transportador = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: { user: config.smtp.user, pass: config.smtp.pass },
    });
  }
  return transportador;
}

/**
 * Envia um lembrete por e-mail para todos os destinatários.
 * Lança erro se o e-mail não estiver configurado (sem SMTP_USER/SMTP_PASS).
 */
export async function enviarEmail({ assunto, texto, html }) {
  if (!emailConfigurado()) {
    throw new Error(
      'E-mail não configurado. Preencha SMTP_USER e SMTP_PASS em server/.env.'
    );
  }
  return obterTransportador().sendMail({
    from: config.remetente,
    to: config.destinatarios.join(', '),
    subject: assunto,
    text: texto,
    html,
  });
}
