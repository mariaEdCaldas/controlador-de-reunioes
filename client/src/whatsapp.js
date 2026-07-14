import { formatarData } from './regioes.js';

/**
 * Monta o link wa.me que abre o WhatsApp (app ou Web) já na conversa com o
 * palestrante e com a mensagem escrita — só falta apertar "enviar" (RN-07).
 *
 * É o clique de wa.me e nada mais: link público, gratuito, sem cadastro, sem
 * chave de API, sem limite de envios. Funciona porque o telefone é guardado em
 * formato internacional só-dígitos (5567999998888), que é o que o wa.me exige.
 *
 * ---------------------------------------------------------------------------
 * ATÉ ONDE ISSO AUTOMATIZA — e onde começa a parte paga
 *
 * O que este link FAZ: abre a conversa com o texto pronto (data, hora, local,
 * bairro). O trabalho manual cai para um clique em "enviar".
 *
 * O que este link NÃO FAZ: saber a resposta. Se o palestrante responder "posso
 * sim", isso acontece dentro do WhatsApp — o sistema não fica sabendo. Alguém
 * do gabinete precisa vir aqui e marcar o titular na mão.
 *
 * Para o sistema se atualizar sozinho quando o palestrante responde (ele clica
 * em "confirmo" e a reunião muda para "confirmada" sem ninguém digitar nada),
 * seria preciso a API oficial do WhatsApp Business (Cloud API), que:
 *   - exige conta comercial verificada e um número dedicado;
 *   - COBRA por conversa acima da cota gratuita mensal;
 *   - precisa de um servidor exposto na internet para receber os webhooks de
 *     resposta — este sistema hoje roda só na máquina local.
 *
 * Ou seja: automatizar de ponta a ponta não é só "programar mais um pouco", é
 * mudar de patamar (custo por mensagem + servidor na nuvem). Está FORA DO
 * ESCOPO por decisão do gabinete. Se um dia fizer sentido, o caminho é a Cloud
 * API — e este arquivo é o ponto de partida da troca.
 * ---------------------------------------------------------------------------
 */
export function linkWhatsApp(palestrante, reuniao) {
  const mensagem =
    `Oi ${palestrante.nome}! Aqui é do gabinete do Dep. Paulo Corrêa. ` +
    `Temos uma reunião em "${reuniao.local}" (${reuniao.regiao}) ` +
    `no dia ${formatarData(reuniao.data)} às ${reuniao.hora}. ` +
    `Você teria disponibilidade?`;

  // encodeURIComponent cuida dos acentos, aspas e espaços — sem isso o texto
  // chega cortado no primeiro caractere especial.
  return `https://wa.me/${palestrante.telefone}?text=${encodeURIComponent(mensagem)}`;
}
