import { Router } from 'express';
import { config, emailConfigurado } from '../config-lembretes.js';
import {
  enviarLembretesDeVespera,
  enviarLembretesDeFechamento,
  reunioesDeAmanha,
  reunioesParaFechar,
  dataDeAmanha,
} from '../lembretes.js';

export const lembretesRouter = Router();

/**
 * GET /api/lembretes/previa
 * Mostra o que seria enviado (sem enviar): véspera (reuniões de amanhã) e
 * fechamento (reuniões que já terminaram e ainda não foram fechadas).
 */
lembretesRouter.get('/previa', async (req, res) => {
  const vespera = await enviarLembretesDeVespera({ dryRun: true });
  const fechamento = await enviarLembretesDeFechamento({ dryRun: true });
  res.json({
    configurado: emailConfigurado(),
    destinatarios: config.destinatarios,
    horaDisparo: config.horaDisparo,
    duracaoHoras: config.duracaoHoras,
    whatsapp: config.whatsapp,
    dataAlvo: dataDeAmanha(),
    reunioes: reunioesDeAmanha(),
    previa: vespera.resultados,
    fechamentoReunioes: reunioesParaFechar(),
    fechamentoPrevia: fechamento.resultados,
  });
});

/**
 * POST /api/lembretes/enviar
 * Dispara AGORA os dois tipos que estiverem pendentes.
 * Body opcional: { forcar: true } reenvia mesmo os já enviados.
 */
lembretesRouter.post('/enviar', async (req, res) => {
  if (!emailConfigurado()) {
    return res.status(400).json({
      erro: 'E-mail ainda não configurado. Preencha SMTP_USER e SMTP_PASS em server/.env (veja server/.env.example).',
    });
  }
  const forcar = Boolean(req.body?.forcar);
  const vespera = await enviarLembretesDeVespera({ forcar });
  const fechamento = await enviarLembretesDeFechamento({ forcar });
  res.json({ vespera, fechamento });
});
