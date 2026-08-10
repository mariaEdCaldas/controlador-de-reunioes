import { useEffect, useState } from 'react';
import { previaLembretes, enviarLembretes } from './api.js';
import { formatarData } from './regioes.js';
import './times.css';

/**
 * Lembretes de véspera: mostra as reuniões de amanhã e o e-mail que seria
 * enviado, com um botão para enviar na hora. O envio automático diário roda no
 * servidor (config.horaDisparo) — desde que o computador esteja ligado.
 */
export default function Lembretes() {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');
  const [resultado, setResultado] = useState(null);
  const [enviando, setEnviando] = useState(false);

  function carregar() {
    return previaLembretes().then(setDados).catch((e) => setErro(e.message));
  }

  useEffect(() => {
    carregar();
  }, []);

  async function enviarAgora() {
    setEnviando(true);
    setErro('');
    setResultado(null);
    try {
      const r = await enviarLembretes();
      const conta = (bloco) => bloco.resultados.filter((x) => x.status === 'enviado').length;
      const total = conta(r.vespera) + conta(r.fechamento);
      setResultado(`E-mail disparado: ${total} envio(s) — ${conta(r.vespera)} de véspera, ${conta(r.fechamento)} de fechamento.`);
      await carregar();
    } catch (e) {
      setErro(e.message);
    } finally {
      setEnviando(false);
    }
  }

  if (erro && !dados) return <p className="aviso erro">{erro}</p>;
  if (!dados) return <p className="vazio">Carregando…</p>;

  const linkWhats = (r) => {
    const texto =
      `Lembrete: reunião amanhã (${formatarData(r.data)}) às ${r.hora}, em ${r.local} — ` +
      `${r.endereco}. Não esquecer do aluguel da mesa e das cadeiras (e do som).`;
    return `https://wa.me/${dados.whatsapp.numeroDestino}?text=${encodeURIComponent(texto)}`;
  };

  return (
    <section>
      <header className="cabecalho-secao">
        <div>
          <h1>Lembretes</h1>
          <p className="sub">
            Aviso da véspera das reuniões de amanhã ({formatarData(dados.dataAlvo)})
          </p>
        </div>
      </header>

      {/* Status da configuração de e-mail. */}
      {dados.configurado ? (
        <div className="cartao lembrete-status ok">
          <strong>E-mail configurado.</strong> Os lembretes são enviados
          automaticamente às {dados.horaDisparo}h para:{' '}
          {dados.destinatarios.join(', ')}.
        </div>
      ) : (
        <div className="cartao lembrete-status pendente">
          <strong>E-mail ainda não configurado.</strong>
          <p>
            Para ligar o envio, crie o arquivo <code>server/.env</code> a partir de{' '}
            <code>server/.env.example</code> e preencha a senha de app do Gmail.
            O passo a passo está nesse arquivo e no README.
          </p>
          <p className="lembrete-dest">
            Quando ligado, os e-mails vão para: {dados.destinatarios.join(', ')}.
          </p>
        </div>
      )}

      {resultado && <p className="aviso info">{resultado}</p>}
      {erro && <p className="aviso erro">{erro}</p>}

      <div className="lembrete-barra">
        <h2>Reuniões de amanhã ({dados.reunioes.length})</h2>
        <button
          className="botao primario"
          onClick={enviarAgora}
          disabled={enviando || !dados.configurado || dados.reunioes.length === 0}
        >
          {enviando ? 'Enviando…' : 'Enviar e-mail agora'}
        </button>
      </div>

      {dados.reunioes.length === 0 ? (
        <p className="vazio">Nenhuma reunião marcada para amanhã.</p>
      ) : (
        <ul className="lista">
          {dados.reunioes.map((r) => {
            const previa = dados.previa.find((p) => p.reuniao === r.id);
            const pendencias = [];
            if (!r.checklist_som) pendencias.push('som');
            if (!r.checklist_cadeiras) pendencias.push('mesa e cadeiras');
            return (
              <li key={r.id} className="cartao lembrete-item">
                <div className="lembrete-topo">
                  <div>
                    <strong>{r.local}</strong> — {formatarData(r.data)} às {r.hora}
                    <div className="item-temas">{r.endereco} · {r.regiao}</div>
                  </div>
                  {previa?.status === 'ja_enviado' && (
                    <span className="etiqueta">e-mail já enviado</span>
                  )}
                </div>

                <div className="lembrete-detalhe">
                  <span>Palestrante: <strong>{r.titular_nome ?? 'a definir'}</strong></span>
                  <span className={pendencias.length ? 'pend' : 'ok'}>
                    {pendencias.length
                      ? `Falta providenciar: ${pendencias.join(' e ')}`
                      : 'Som e cadeiras ok'}
                  </span>
                </div>

                {/* Caminho gratuito de WhatsApp: abre a conversa com o texto
                    pronto para o número do gabinete — clicar e enviar. */}
                <a
                  className="botao pequeno secundario"
                  href={linkWhats(r)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Enviar no WhatsApp (manual)
                </a>
              </li>
            );
          })}
        </ul>
      )}

      {/* Fechamento: reuniões que já terminaram e ainda não foram fechadas. */}
      <div className="lembrete-barra" style={{ marginTop: 28 }}>
        <h2>Reuniões para fechar ({dados.fechamentoReunioes.length})</h2>
        <span className="sub" style={{ margin: 0 }}>
          já passaram do horário previsto ({dados.duracaoHoras}h) e não foram encerradas
        </span>
      </div>

      {dados.fechamentoReunioes.length === 0 ? (
        <p className="vazio">Nenhuma reunião aguardando fechamento.</p>
      ) : (
        <ul className="lista">
          {dados.fechamentoReunioes.map((r) => {
            const previa = dados.fechamentoPrevia.find((p) => p.reuniao === r.id);
            const podeFechar = previa?.podeFechar ?? Boolean(r.titular_id);
            return (
              <li key={r.id} className="cartao lembrete-item">
                <div className="lembrete-topo">
                  <div>
                    <strong>{r.local}</strong> — {formatarData(r.data)} às {r.hora}
                    <div className="item-temas">{r.endereco} · {r.regiao}</div>
                  </div>
                  <span className={`status ${podeFechar ? 'confirmada' : 'a_confirmar'}`}>
                    {podeFechar ? 'pode fechar' : 'falta titular'}
                  </span>
                </div>
                <div className="lembrete-detalhe">
                  {podeFechar ? (
                    <span className="ok">
                      Palestrante: {r.titular_nome}. Vá à Agenda e marque como realizada.
                    </span>
                  ) : (
                    <span className="pend">
                      Defina o palestrante titular na Agenda antes de fechar.
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="rodape-nota">
        <strong>Sobre o WhatsApp automático:</strong> disparar sozinho de um número
        exige a API oficial paga do WhatsApp Business ou um robô fora dos termos de
        uso (risco de bloquear o número). Por isso o WhatsApp aqui é o botão acima:
        abre a conversa com a mensagem pronta, faltando só apertar enviar. O envio
        <strong> automático</strong> por ora é só o e-mail.
      </p>
    </section>
  );
}
