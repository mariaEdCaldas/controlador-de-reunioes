import { db } from './db.js';
import { config, emailConfigurado } from './config-lembretes.js';
import { montarLembrete, montarLembreteFechamento, enviarEmail } from './email.js';
import { hojeNaTz, amanhaNaTz, ontemNaTz, epochLocal, msAteHoraLocal } from './fuso.js';

const SELECT_REUNIAO = `
  SELECT r.id, r.local, r.endereco, r.data, r.hora, r.status,
         reg.nome AS regiao,
         r.titular_id, t.nome AS titular_nome, t.telefone AS titular_telefone,
         r.reserva_id, s.nome AS reserva_nome,
         r.checklist_som, r.checklist_cadeiras
    FROM reunioes r
    JOIN regioes reg     ON reg.id = r.regiao_id
    LEFT JOIN palestrantes t ON t.id = r.titular_id
    LEFT JOIN palestrantes s ON s.id = r.reserva_id
`;

/** Data de amanhã (YYYY-MM-DD) no fuso de Campo Grande. */
export function dataDeAmanha(base = new Date()) {
  return amanhaNaTz(base);
}

/**
 * Reuniões marcadas para amanhã que ainda não aconteceram.
 * Reunião já "realizada" não gera lembrete.
 */
export async function reunioesDeAmanha(base = new Date()) {
  return db
    .prepare(`${SELECT_REUNIAO} WHERE r.data = ? AND r.status <> 'realizada' ORDER BY r.hora`)
    .all(dataDeAmanha(base));
}

const jaEnviadoTipo = db.prepare(
  `SELECT 1 FROM lembretes_enviados WHERE reuniao_id = ? AND tipo = ?`
);
const registrarTipo = db.prepare(
  `INSERT OR IGNORE INTO lembretes_enviados (reuniao_id, tipo) VALUES (?, ?)`
);

const jaEnviado = async (id) => Boolean(await jaEnviadoTipo.get(id, 'vespera_email'));
const registrar = (id) => registrarTipo.run(id, 'vespera_email');

/**
 * Envia os lembretes de véspera das reuniões de amanhã.
 *
 * - Pula reuniões que já receberam o lembrete (a menos de `forcar`).
 * - `dryRun`: monta tudo e diz o que faria, mas NÃO envia nem registra —
 *   usado pela prévia da tela e para testar sem gastar envio.
 *
 * @returns {{ configurado, data, resultados: Array }}
 */
export async function enviarLembretesDeVespera({ base = new Date(), forcar = false, dryRun = false } = {}) {
  const reunioes = await reunioesDeAmanha(base);
  const resultados = [];

  for (const r of reunioes) {
    const enviado = await jaEnviado(r.id);
    const lembrete = montarLembrete(r);

    if (enviado && !forcar) {
      resultados.push({ reuniao: r.id, local: r.local, status: 'ja_enviado', assunto: lembrete.assunto });
      continue;
    }

    if (dryRun) {
      resultados.push({ reuniao: r.id, local: r.local, status: 'previa', ...lembrete });
      continue;
    }

    if (!emailConfigurado()) {
      resultados.push({ reuniao: r.id, local: r.local, status: 'nao_configurado', assunto: lembrete.assunto });
      continue;
    }

    try {
      await enviarEmail(lembrete);
      await registrar(r.id);
      resultados.push({ reuniao: r.id, local: r.local, status: 'enviado', assunto: lembrete.assunto });
    } catch (erro) {
      resultados.push({ reuniao: r.id, local: r.local, status: 'erro', erro: erro.message });
    }
  }

  return {
    configurado: emailConfigurado(),
    destinatarios: config.destinatarios,
    data: dataDeAmanha(base),
    reunioes: reunioes.length,
    resultados,
  };
}

// ---------------------------------------------------------------------------
// Fechamento: depois que a reunião já deve ter terminado (horário + duração),
// avisa se dá para fechá-la na agenda.
// ---------------------------------------------------------------------------

/**
 * Reuniões cujo fim previsto (horário + duração) já passou e que ainda não
 * foram fechadas (status <> realizada).
 *
 * Só olha uma janela recente (de ontem para cá, no fuso de Campo Grande) para
 * não disparar de uma vez por reuniões antigas que ficaram sem fechar lá atrás.
 */
export async function reunioesParaFechar(base = new Date()) {
  const candidatas = await db
    .prepare(
      `${SELECT_REUNIAO}
        WHERE r.status <> 'realizada' AND r.data >= ? AND r.data <= ?
        ORDER BY r.data, r.hora`
    )
    .all(ontemNaTz(base), hojeNaTz(base));

  const agora = base.getTime();
  return candidatas.filter((r) => {
    // Início e fim são relógio de parede de Campo Grande.
    const fim = epochLocal(r.data, r.hora) + config.duracaoHoras * 3_600_000;
    return fim <= agora;
  });
}

/**
 * Envia o e-mail de fechamento das reuniões que já deveriam ter terminado.
 * Mesma mecânica da véspera (dedup por tipo 'fechamento_email', dryRun, forcar).
 */
export async function enviarLembretesDeFechamento({ base = new Date(), forcar = false, dryRun = false } = {}) {
  const reunioes = await reunioesParaFechar(base);
  const resultados = [];

  for (const r of reunioes) {
    const enviado = Boolean(await jaEnviadoTipo.get(r.id, 'fechamento_email'));
    const lembrete = montarLembreteFechamento(r, config.duracaoHoras);

    if (enviado && !forcar) {
      resultados.push({ reuniao: r.id, local: r.local, status: 'ja_enviado', podeFechar: lembrete.podeFechar, assunto: lembrete.assunto });
      continue;
    }
    if (dryRun) {
      resultados.push({ reuniao: r.id, local: r.local, status: 'previa', ...lembrete });
      continue;
    }
    if (!emailConfigurado()) {
      resultados.push({ reuniao: r.id, local: r.local, status: 'nao_configurado', podeFechar: lembrete.podeFechar, assunto: lembrete.assunto });
      continue;
    }
    try {
      await enviarEmail(lembrete);
      await registrarTipo.run(r.id, 'fechamento_email');
      resultados.push({ reuniao: r.id, local: r.local, status: 'enviado', podeFechar: lembrete.podeFechar, assunto: lembrete.assunto });
    } catch (erro) {
      resultados.push({ reuniao: r.id, local: r.local, status: 'erro', erro: erro.message });
    }
  }

  return { configurado: emailConfigurado(), destinatarios: config.destinatarios, reunioes: reunioes.length, resultados };
}

/**
 * Agenda o disparo diário no horário configurado (config.horaDisparo).
 * Enquanto o computador estiver ligado e o sistema rodando, ele confere sozinho
 * as reuniões de amanhã uma vez por dia. Se estiver desligado na hora, não
 * dispara — é o limite de um sistema local (ver README).
 */
export function agendarDisparoDiario() {
  function agendar() {
    const ms = msAteHoraLocal(config.horaDisparo); // próximo horaDisparo:00 em Campo Grande
    setTimeout(async () => {
      try {
        const r = await enviarLembretesDeVespera();
        const enviados = r.resultados.filter((x) => x.status === 'enviado').length;
        if (r.reunioes > 0) {
          console.log(`[lembretes] disparo diário: ${enviados}/${r.reunioes} enviado(s) para amanhã (${r.data}).`);
        }
      } catch (e) {
        console.error('[lembretes] falha no disparo diário:', e.message);
      }
      agendar(); // reprograma para o próximo dia
    }, ms);

    const horas = (ms / 3_600_000).toFixed(1);
    console.log(`[lembretes] próximo disparo da véspera em ~${horas}h (às ${config.horaDisparo}h). E-mail ${emailConfigurado() ? 'configurado' : 'NÃO configurado — ver server/.env.example'}.`);
  }

  agendar();

  // Fechamento depende do horário de cada reunião (2h depois), não de uma hora
  // fixa do dia. Por isso é uma checagem periódica, a cada 15 minutos.
  const INTERVALO_FECHAMENTO = 15 * 60 * 1000;
  setInterval(async () => {
    try {
      const r = await enviarLembretesDeFechamento();
      const enviados = r.resultados.filter((x) => x.status === 'enviado').length;
      if (enviados > 0) console.log(`[lembretes] fechamento: ${enviados} aviso(s) enviado(s).`);
    } catch (e) {
      console.error('[lembretes] falha na checagem de fechamento:', e.message);
    }
  }, INTERVALO_FECHAMENTO);
}
