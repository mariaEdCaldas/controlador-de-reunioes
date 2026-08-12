import { useState } from 'react';

const CHAVE = 'agenda-rodrigo-calendario'; // guardado no navegador (localStorage)

/**
 * Monta a URL do quadro do Google Agenda a partir do que a pessoa colar:
 *  - o código <iframe ... src="..."> inteiro (extrai o src);
 *  - uma URL de incorporar/pública direta;
 *  - ou só o e-mail/ID do calendário.
 */
function montarEmbed(valor) {
  const v = String(valor || '').trim();
  if (!v) return '';
  const m = /src="([^"]+)"/i.exec(v);
  if (m) return m[1];
  if (/^https?:\/\//i.test(v)) return v;
  return `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(v)}&ctz=America/Campo_Grande&mode=WEEK`;
}

/**
 * "Agenda Dr Rodrigo": um quadro que incorpora o Google Agenda dele. A ideia é
 * ela entrar na conta Google dele no navegador e gerenciar os compromissos pelo
 * próprio Google — este quadro mostra tudo em tempo real. A configuração (qual
 * calendário) fica salva neste navegador.
 */
export default function AgendaRodrigo() {
  const [config, setConfig] = useState(() => localStorage.getItem(CHAVE) || '');
  const [editando, setEditando] = useState(() => !localStorage.getItem(CHAVE));
  const [rascunho, setRascunho] = useState(config);

  const embedUrl = montarEmbed(config);

  function salvar(e) {
    e.preventDefault();
    const v = rascunho.trim();
    localStorage.setItem(CHAVE, v);
    setConfig(v);
    setEditando(false);
  }

  return (
    <section>
      <header className="cabecalho-secao">
        <div>
          <h1>Agenda Dr Rodrigo</h1>
          <p className="sub">Quadro sincronizado com o Google Agenda dele.</p>
        </div>
        <div className="cabecalho-acoes">
          <a
            className="botao primario"
            href="https://calendar.google.com/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Abrir no Google Agenda
          </a>
          {config && !editando && (
            <button className="botao" onClick={() => { setRascunho(config); setEditando(true); }}>
              Trocar calendário
            </button>
          )}
        </div>
      </header>

      {editando || !embedUrl ? (
        <div className="cartao form" style={{ borderLeft: '3px solid var(--dourado)' }}>
          <h2>Conectar o Google Agenda do Dr Rodrigo</h2>
          <ol className="rodrigo-passos">
            <li>
              Neste navegador, entre na conta Google dele (o botão
              <strong> Abrir no Google Agenda</strong> leva até lá).
            </li>
            <li>
              No Google Agenda: <strong>Configurações → </strong> o calendário dele
              <strong> → Integrar agenda</strong>, e copie o <strong>ID do calendário</strong>
              (parece um e-mail) ou o <strong>código de incorporar</strong>.
            </li>
            <li>Cole abaixo e clique em Conectar.</li>
          </ol>
          <form onSubmit={salvar}>
            <label className="campo">
              <span>Calendário do Dr Rodrigo</span>
              <input
                value={rascunho}
                onChange={(e) => setRascunho(e.target.value)}
                placeholder="e-mail do Google dele, ID do calendário ou código de incorporar"
                autoFocus
              />
              <small className="dica">
                Aceita o e-mail/ID do calendário ou o código <code>&lt;iframe…&gt;</code> inteiro.
              </small>
            </label>
            <div className="acoes-form">
              <button type="submit" className="botao primario" disabled={!rascunho.trim()}>
                Conectar
              </button>
              {config && (
                <button type="button" className="botao" onClick={() => setEditando(false)}>
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>
      ) : (
        <div className="cartao rodrigo-quadro">
          <iframe
            title="Agenda do Dr Rodrigo (Google Agenda)"
            src={embedUrl}
            frameBorder="0"
            scrolling="no"
          />
        </div>
      )}

      <p className="rodape-nota">
        O quadro mostra a agenda dele <strong>em tempo real, só para ver</strong>. Para
        adicionar ou mudar compromissos, use o <strong>Abrir no Google Agenda</strong> (logada
        na conta dele) — as mudanças aparecem aqui sozinhas. Se a agenda for privada, ela só
        aparece com a conta dele logada neste navegador, ou se ele compartilhar o calendário.
        Um controle total por dentro do sistema (sem passar pelo Google) exigiria a API oficial
        do Google — dá para fazer depois, se fizer sentido.
      </p>
    </section>
  );
}
