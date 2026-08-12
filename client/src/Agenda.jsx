import { useEffect, useState } from 'react';
import { listarReunioes, salvarChecklist, excluirReuniao } from './api.js';
import { corDaRegiao, formatarData, formatarTelefone, ROTULO_STATUS } from './regioes.js';
import Sugestoes from './Sugestoes.jsx';
import FolhaImpressao from './FolhaImpressao.jsx';
import EditarReuniao from './EditarReuniao.jsx';
import FinalizarReuniao from './FinalizarReuniao.jsx';
import Busca, { contemBusca } from './Busca.jsx';
import { agruparPorRegiao, contagemPorRegiao } from './regioesCampoGrande.js';

/** Ícone do WhatsApp por imagem (/icones/whatsapp.png); cai no emoji se faltar. */
function IconeWhatsapp() {
  const [erro, setErro] = useState(false);
  return erro ? (
    <span aria-hidden="true">🟢</span>
  ) : (
    <img className="ico-wpp" src="/artes/whatsapp.png" alt="" onError={() => setErro(true)} />
  );
}

/** Painel de relance: barras por região (mapa de calor), da maior para a menor. */
function PainelRegioes({ reunioes }) {
  const { linhas, total, maximo } = contagemPorRegiao(reunioes, (r) => r.regiao);
  return (
    <div className="cartao painel-bi">
      <div className="bi-cabeca">
        <h2>Reuniões por região</h2>
        <span className="bi-total">
          <b>{total}</b> reuni{total === 1 ? 'ão' : 'ões'} no total
        </span>
      </div>
      <ul className="bi-barras">
        {linhas.map((l, i) => {
          const pct = maximo ? Math.round((l.n / maximo) * 100) : 0;
          // Mais reuniões → azul mais forte (mapa de calor). 0 → cinza claro.
          const cor = l.n === 0 ? '#d7dccf' : `hsl(212 82% ${58 - (l.n / maximo) * 30}%)`;
          return (
            <li
              key={l.regiao}
              className={`bi-linha ${l.n === 0 ? 'zerada' : ''} ${i === 0 && l.n > 0 ? 'lider' : ''}`}
            >
              <span className="bi-rotulo">{l.rotulo}</span>
              <span className="bi-trilha">
                <span className="bi-preenche" style={{ width: `${pct}%`, background: cor }} />
              </span>
              <span className="bi-valor">{l.n}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Data de hoje em ISO (yyyy-mm-dd), fuso local — para saber se a reunião passou. */
function hojeISO() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Monta o link do WhatsApp com o convite da reunião pronto para compartilhar. */
function linkConvite(r) {
  const texto = [
    `*${(r.nome || 'Reunião').toUpperCase()}*`,
    r.candidato ? `Com Paulo Corrêa e ${r.candidato}` : null,
    `Dia ${formatarData(r.data)} às ${r.hora}`,
    `Local: ${r.endereco}${r.regiao ? ` - ${r.regiao}` : ''}, Campo Grande - MS`,
    r.coordenador_nome ? `Contato: ${r.coordenador_nome}` : null,
  ]
    .filter(Boolean)
    .join('\n');
  return `https://wa.me/?text=${encodeURIComponent(texto)}`;
}

export default function Agenda({ aoNovaReuniao, porRegiao = false }) {
  const [reunioes, setReunioes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [alocando, setAlocando] = useState(null);
  const [imprimir, setImprimir] = useState(null); // reunião cuja folha está aberta
  const [editar, setEditar] = useState(null); // reunião sendo editada
  const [finalizar, setFinalizar] = useState(null); // reunião sendo finalizada
  const [busca, setBusca] = useState('');

  const carregar = () =>
    listarReunioes()
      .then((lista) => {
        setReunioes(lista);
        setErro('');
      })
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));

  useEffect(() => {
    carregar();
  }, []);

  const substituir = (atualizada) =>
    setReunioes((lista) => lista.map((r) => (r.id === atualizada.id ? atualizada : r)));

  async function excluir(reuniao) {
    const rotulo = reuniao.nome?.trim() || reuniao.local || reuniao.endereco;
    if (!window.confirm(`Excluir a reunião "${rotulo}"? Isso não pode ser desfeito.`)) return;
    try {
      await excluirReuniao(reuniao.id);
      setReunioes((lista) => lista.filter((r) => r.id !== reuniao.id));
    } catch (e) {
      setErro(e.message);
    }
  }

  /**
   * RN-05: clicar na caixinha já grava. Os dois itens vão juntos no PATCH,
   * então a tela manda o estado que o usuário está vendo — o que ele acabou de
   * clicar mais o outro como está.
   */
  async function alternarItem(reuniao, item) {
    const novo = {
      som: Boolean(reuniao.checklist_som),
      cadeiras: Boolean(reuniao.checklist_cadeiras),
      [item]: !reuniao[item === 'som' ? 'checklist_som' : 'checklist_cadeiras'],
    };
    // Otimista: a caixinha responde na hora; se o servidor recusar, volta atrás.
    substituir({
      ...reuniao,
      checklist_som: novo.som ? 1 : 0,
      checklist_cadeiras: novo.cadeiras ? 1 : 0,
    });
    try {
      const r = await salvarChecklist(reuniao.id, novo);
      substituir(r.reuniao);
    } catch (e) {
      setErro(e.message);
      substituir(reuniao);
    }
  }

  const visiveis = reunioes.filter((r) =>
    contemBusca(
      `${r.nome ?? ''} ${r.local ?? ''} ${r.endereco ?? ''} ${r.candidato ?? ''} ${r.coordenador_nome ?? ''} ${r.regiao ?? ''}`,
      busca
    )
  );

  // Um só jeito de montar o card, usado tanto na lista corrida quanto agrupada.
  const renderItem = (r) => (
    <ItemReuniao
      key={r.id}
      reuniao={r}
      aberto={alocando === r.id}
      aoAbrir={() => setAlocando(alocando === r.id ? null : r.id)}
      aoAlternarItem={(item) => alternarItem(r, item)}
      aoImprimir={() => setImprimir(r)}
      aoEditar={() => setEditar(r)}
      aoExcluir={() => excluir(r)}
      aoFinalizar={() => setFinalizar(r)}
      aoAtualizar={(atualizada) => {
        substituir(atualizada);
        setAlocando(null);
      }}
      aoRecarregar={carregar}
      aoErro={setErro}
    />
  );

  const grupos = porRegiao ? agruparPorRegiao(visiveis) : null;

  return (
    <section>
      <header className="cabecalho-secao">
        <div>
          <h1>{porRegiao ? 'Agenda por região' : 'Agenda'}</h1>
          <p className="sub">
            {porRegiao
              ? 'reuniões agrupadas pela região do bairro'
              : `${reunioes.length} reuni${reunioes.length === 1 ? 'ão' : 'ões'} — mais recentes primeiro`}
          </p>
        </div>
        <button className="botao primario" onClick={aoNovaReuniao}>
          + Nova reunião
        </button>
      </header>

      <Busca valor={busca} aoMudar={setBusca} placeholder="Pesquisar por nome, endereço, candidato…" />

      {erro && <p className="aviso erro">{erro}</p>}

      {carregando ? (
        <p className="vazio">Carregando…</p>
      ) : reunioes.length === 0 ? (
        <p className="vazio">Nenhuma reunião cadastrada ainda.</p>
      ) : visiveis.length === 0 ? (
        <p className="vazio">Nenhuma reunião encontrada para essa busca.</p>
      ) : porRegiao ? (
        <>
        <PainelRegioes reunioes={visiveis} />
        {grupos.map((g) => (
          <div className="grupo-regiao" key={g.regiao}>
            <h2 className="regiao-titulo">
              <span className="regiao-nome">{g.rotulo}</span>
              <span className="regiao-contagem">
                {g.itens.length} reuni{g.itens.length === 1 ? 'ão' : 'ões'}
              </span>
            </h2>
            <ul className="lista lista-cartoes">{g.itens.map(renderItem)}</ul>
          </div>
        ))}
        </>
      ) : (
        <ul className="lista lista-cartoes">{visiveis.map(renderItem)}</ul>
      )}

      {imprimir && (
        <FolhaImpressao reuniao={imprimir} aoFechar={() => setImprimir(null)} />
      )}

      {editar && (
        <EditarReuniao
          reuniao={editar}
          aoFechar={() => setEditar(null)}
          aoSalvar={(atualizada) => {
            substituir(atualizada);
            setEditar(null);
          }}
        />
      )}

      {finalizar && (
        <FinalizarReuniao
          reuniao={finalizar}
          aoFechar={() => setFinalizar(null)}
          aoSalvar={(atualizada) => {
            substituir(atualizada);
            setFinalizar(null);
          }}
        />
      )}
    </section>
  );
}

function ItemReuniao({ reuniao: r, aberto, aoAbrir, aoAlternarItem, aoImprimir, aoEditar, aoExcluir, aoFinalizar, aoRecarregar }) {
  const realizada = r.status === 'realizada';
  // Passou da data e ainda não foi finalizada: precisa de atenção.
  const atrasada = !realizada && r.data < hojeISO();

  return (
    <li className={`cartao reuniao ${realizada ? 'concluida' : ''}`}>
      {/* Topo: quando, título + candidatos, status */}
      <div className="reuniao-topo">
        <div className="reuniao-data">
          <strong>{formatarData(r.data)}</strong>
          <span>{r.hora}</span>
        </div>
        <div className="reuniao-titulo">
          <div className="item-nome">{r.nome?.trim() || r.local || r.endereco}</div>
          {r.candidato && (
            <div className="reuniao-candidatos">Paulo Corrêa e {r.candidato}</div>
          )}
        </div>
        <span className={`status ${r.status} ${atrasada ? 'atrasada' : ''}`}>
          {ROTULO_STATUS[r.status]}
        </span>
      </div>

      {/* Detalhes: local/bairro, coordenador, palestrante */}
      <div className="reuniao-detalhes">
        <div className="det">
          <span className="det-rot">Local</span>
          <span>
            {r.endereco}
            <span className="det-bairro">
              <span className="bolinha" style={{ background: corDaRegiao(r.regiao) }} aria-hidden="true" />
              {r.regiao}
            </span>
          </span>
        </div>
        {r.coordenador_nome && (
          <div className="det">
            <span className="det-rot">Coordenador</span>
            <span>
              {r.coordenador_nome}
              {r.coordenador_telefone && (
                <span className="coord-tel"> · {formatarTelefone(r.coordenador_telefone)}</span>
              )}
            </span>
          </div>
        )}
        {(r.titular_nome || r.reserva_nome) && (
          <div className="det">
            <span className="det-rot">Palestrante</span>
            <span>
              {r.titular_nome ?? <em className="pendente">a definir</em>}
              {r.reserva_nome && <span className="det-reserva"> · reserva: {r.reserva_nome}</span>}
            </span>
          </div>
        )}
      </div>

      {/* Recursos + confirmação (ou nº de presentes, se já realizada) */}
      <div className="reuniao-recursos-linha">
        <div className="reuniao-recursos">
          <span>{r.qtd_cadeiras != null ? `${r.qtd_cadeiras} cadeiras` : 'cadeiras a definir'}</span>
          <span className={r.tem_som ? 'com-som' : 'sem-som'}>
            {r.tem_som ? 'com som' : 'sem som'}
          </span>
        </div>
        {realizada ? (
          <span className="presentes-registrados">{r.presentes} presentes</span>
        ) : (
          <div className="checklist-bloco">
            <span className="checklist-titulo">Providenciado?</span>
            <div className="checklist">
              <label className={r.checklist_som ? 'feito' : ''} title={!r.tem_som ? 'Esta reunião não terá som' : ''}>
                <input
                  type="checkbox"
                  checked={Boolean(r.checklist_som)}
                  disabled={realizada || !r.tem_som}
                  onChange={() => aoAlternarItem('som')}
                />
                Som
              </label>
              <label className={r.checklist_cadeiras ? 'feito' : ''}>
                <input
                  type="checkbox"
                  checked={Boolean(r.checklist_cadeiras)}
                  disabled={realizada}
                  onChange={() => aoAlternarItem('cadeiras')}
                />
                Cadeiras
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Rodapé: ícones (editar/imprimir/whatsapp/excluir) e ações principais */}
      <div className="reuniao-rodape">
        <div className="reuniao-icones">
          <button className="botao icone" onClick={aoEditar} title="Editar informações" aria-label="Editar">✏️</button>
          <button className="botao icone" onClick={aoImprimir} title="Imprimir folha" aria-label="Imprimir">🖨️</button>
          <a
            className="botao icone whatsapp-icone"
            href={linkConvite(r)}
            target="_blank"
            rel="noopener noreferrer"
            title="Compartilhar convite no WhatsApp"
            aria-label="Compartilhar no WhatsApp"
          >
            <IconeWhatsapp />
          </a>
          <button className="botao icone" onClick={aoExcluir} title="Excluir reunião" aria-label="Excluir">🗑️</button>
        </div>

        {!realizada && (
          <div className="reuniao-acoes-primarias">
            <button className="botao pequeno" onClick={aoAbrir}>
              {aberto ? 'Fechar sugestões' : 'Alocar palestrante'}
            </button>
            <button className="botao pequeno primario" onClick={aoFinalizar}>
              Finalizar
            </button>
          </div>
        )}
      </div>

      {aberto && !realizada && (
        <div className="reuniao-painel">
          <Sugestoes reuniaoId={r.id} aoAtualizar={aoRecarregar} />
        </div>
      )}
    </li>
  );
}
