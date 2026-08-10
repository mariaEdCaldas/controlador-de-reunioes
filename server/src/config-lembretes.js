/**
 * Configuração dos lembretes.
 *
 * O que NÃO é segredo (destinatários, horário) fica aqui e pode ser editado à
 * vontade. O que É segredo (a senha de app do Gmail) vem do arquivo .env, que
 * não é versionado. Assim a senha nunca entra no Git.
 *
 * Para ligar o envio de e-mail, crie server/.env a partir de server/.env.example
 * e preencha SMTP_USER e SMTP_PASS. Enquanto isso não existir, o sistema segue
 * funcionando normalmente — só não envia e-mail (mostra "não configurado").
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Carrega server/.env, se existir. Node 21+ tem loadEnvFile nativo (sem lib).
try {
  process.loadEnvFile(path.resolve(__dirname, '..', '.env'));
} catch {
  // Sem .env ainda: tudo bem, o envio fica desligado até ser configurado.
}

export const config = {
  // Para quem os lembretes são enviados.
  destinatarios: [
    'mariaeduardacaldas1@gmail.com',
    'wanessacaldass@hotmail.com',
  ],

  // Horário (0-23) em que o disparo diário roda, olhando as reuniões de amanhã.
  horaDisparo: Number(process.env.HORA_DISPARO ?? 8),

  // Duração prevista de uma reunião, em horas. Passado esse tempo do horário
  // marcado, o sistema avisa que a reunião pode ser fechada na agenda.
  duracaoHoras: Number(process.env.DURACAO_HORAS ?? 2),

  // Conta que envia. Por padrão usa o Gmail informado no .env como remetente.
  remetente: process.env.SMTP_FROM || process.env.SMTP_USER || '',

  // WhatsApp: números informados pelo gabinete. Hoje só usados para montar um
  // link wa.me manual (clicar e enviar) — não há disparo automático (veja o
  // README: exigiria a API oficial paga ou um robô fora dos termos do WhatsApp).
  whatsapp: {
    numeroDestino: '5567992424062',
    numeroDisparo: '5567992384414',
  },

  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT ?? 465),
    secure: (process.env.SMTP_SECURE ?? 'true') === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
};

/** Só dá para enviar e-mail se usuário e senha do SMTP estiverem preenchidos. */
export const emailConfigurado = () =>
  Boolean(config.smtp.user && config.smtp.pass);
