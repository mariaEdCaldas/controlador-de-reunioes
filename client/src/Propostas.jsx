import { useEffect, useState } from 'react';
import {
  listarPropostas, criarProposta, mudarStatusProposta, excluirProposta,
  listarRegioes, criarRegiao,
} from './api.js';
import { formatarData, formatarTelefone, brParaIso, mascaraData } from './regioes.js';
import { CANDIDATOS } from './candidatos.js';
import { SUGESTOES_BAIRRO, agruparPorRegiao, contagemPorRegiao } from './regioesCampoGrande.js';
import Busca, { contemBusca } from './Busca.jsx';

const VAZIO = {
  proponente: '', telefone: '', candidato: '', regiao: '',
  endereco: '', publico: '', data: '', observacoes: '',
};

const ROTULO_STATUS = { pendente: 'Pendente', aprovada: 'Aprovada', recusada: 'Recusada' };

/** Bairro "cru" (antes da barra) e sua versão normalizada, para agrupar junções. */
const bairroBase = (regiao) => String(regiao || '').split('/')[0].trim();
const normBase = (regiao) =>
  bairroBase(regiao).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Dentro de uma região, junta as propostas por bairro (mais propostas primeiro). */
function subgruparPorBairro(itens) {
  const mapa = new Map();
  for (const p of itens) {
    const chave = normBase(p.regiao);
    if (!mapa.has(chave)) mapa.set(chave, { rotulo: bairroBase(p.regiao) || '—', itens: [] });
    mapa.get(chave).itens.push(p);
  }
  return [...mapa.values()].sort(
    (a, b) => b.itens.length - a.itens.length || a.rotulo.localeCompare(b.rotulo, 'pt')
  );
}

/**
 * Propostas de reunião: as fichas que o pessoal preenche sugerindo reuniões.
 * O foco é CONTROLAR POR REGIÃO — e enxergar onde dá para JUNTAR propostas do
 * mesmo bairro numa reunião só (mesmo quando os candidatos são diferentes).
 */
export default function Propostas({ aoCriarReuniao }) {
  const [propostas, setPropostas] = useState([]);
  const [regioes, setRegioes] = useState([]);
  const [form, setForm] = useState(VAZIO);
  const [erros, setErros] = useState({});
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('ativas'); // ativas | todas | pendente | aprovada | recusada

  function carregar() {
    return Promise.all([listarPropostas(), listarRegioes()])
      .then(([p, r]) => { setPropostas(p); setRegioes(r); setErro(''); })
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  }

  useEffect(() => { carregar(); }, []);

  const setCampo = (campo, valor) => {
    setForm((f) => ({ ...f, [campo]: valor }));
    setErros((x) => ({ ...x, [campo]: undefined }));
  };

  async function adicionar(e) {
    e.preventDefault();
    const err = {};
    if (!form.proponente.trim()) err.proponente = 'Informe quem está propondo.';
    if (!form.regiao.trim()) err.regiao = 'Selecione o bairro/região.';
    const dataIso = form.data.trim() ? brParaIso(form.data) : '';
    if (form.data.trim() && !dataIso) err.data = 'Data inválida (use dd/mm/aaaa).';
    if (Object.keys(err).length) return setErros(err);

    try {
      const nomeRegiao = form.regiao.trim();
      const existente = regioes.find((r) => r.nome.toLowerCase() === nomeRegiao.toLowerCase());
      const regiao = existente ?? (await criarRegiao(nomeRegiao));
      await criarProposta({
        proponente: form.proponente,
        telefone: form.telefone,
        candidato: form.candidato,
        regiao_id: regiao.id,
        endereco: form.endereco,
        publico: form.publico === '' ? null : Number(form.publico),
        data_sugerida: dataIso || null,
        observacoes: form.observacoes,
      });
      setForm(VAZIO);
      setMostrarForm(false);
      await carregar();
    } catch (e2) {
      setErro(e2.message);
    }
  }

  async function trocarStatus(p, status) {
    try {
      await mudarStatusProposta(p.id, status);
      await carregar();
    } catch (e) { setErro(e.message); }
  }

  async function excluir(p) {
    if (!window.confirm(`Excluir a proposta de "${p.proponente}"?`)) return;
    try {
      await excluirProposta(p.id);
      setPropostas((lista) => lista.filter((x) => x.id !== p.id));
    } catch (e) { setErro(e.message); }
  }

  function criarReuniaoDe(p) {
    aoCriarReuniao?.({
      nome: `Reunião - ${bairroBase(p.regiao) || p.proponente}`,
      candidato: p.candidato || '',
      regiao: p.regiao || '',
      endereco: p.endereco || '',
      data: p.data_sugerida ? formatarData(p.data_sugerida) : '',
      hora: '',
      coordenador: '',
      qtd_cadeiras: p.publico != null ? String(p.publico) : '',
      tem_som: true,
    });
  }

  const porStatus = propostas.filter((p) => {
    if (filtroStatus === 'todas') return true;
    if (filtroStatus === 'ativas') return p.status !== 'recusada';
    return p.status === filtroStatus;
  });
  const visiveis = porStatus.filter((p) =>
    contemBusca(
      `${p.proponente} ${p.regiao ?? ''} ${p.endereco ?? ''} ${p.candidato ?? ''}`,
      busca
    )
  );
  const grupos = agruparPorRegiao(visiveis, (p) => p.regiao);
  const { linhas, total, maximo } = contagemPorRegiao(visiveis, (p) => p.regiao);

  return (
    <section>
      <header className="cabecalho-secao">
        <div>
          <h1>Propostas de reunião</h1>
          <p className="sub">
            fichas sugeridas pelo pessoal — organizadas por região para avaliar e juntar
          </p>
        </div>
        {!mostrarForm && (
          <button className="botao primario" onClick={() => setMostrarForm(true)}>
            + Nova proposta
          </button>
        )}
      </header>

      {mostrarForm && (
        <form className="cartao form" onSubmit={adicionar} noValidate>
          <div className="linha">
            <label className="campo">
              <span>Quem propôs <b aria-hidden="true">*</b></span>
              <input
                value={form.proponente}
                onChange={(e) => setCampo('proponente', e.target.value)}
                placeholder="Nome de quem preencheu a ficha"
                aria-invalid={Boolean(erros.proponente)}
                autoFocus
              />
              {erros.proponente && <small className="erro-campo">{erros.proponente}</small>}
            </label>
            <label className="campo">
              <span>Telefone (WhatsApp)</span>
              <input
                value={form.telefone}
                onChange={(e) => setCampo('telefone', e.target.value)}
                placeholder="(67) 99999-8888"
                inputMode="tel"
              />
            </label>
            <label className="campo">
              <span>Candidato</span>
              <select value={form.candidato} onChange={(e) => setCampo('candidato', e.target.value)}>
                <option value="">— (a definir)</option>
                {CANDIDATOS.map((c) => (
                  <option key={c.slug} value={c.nome}>{c.nome}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="linha">
            <label className="campo">
              <span>Bairro / região <b aria-hidden="true">*</b></span>
              <input
                list="lista-regioes-proposta"
                value={form.regiao}
                onChange={(e) => setCampo('regiao', e.target.value)}
                placeholder="Digite ou escolha (ex.: Moreninha/Bandeira)"
                aria-invalid={Boolean(erros.regiao)}
              />
              <datalist id="lista-regioes-proposta">
                {SUGESTOES_BAIRRO.map((nome) => (
                  <option key={nome} value={nome} />
                ))}
              </datalist>
              {erros.regiao && <small className="erro-campo">{erros.regiao}</small>}
            </label>
            <label className="campo">
              <span>Endereço</span>
              <input
                value={form.endereco}
                onChange={(e) => setCampo('endereco', e.target.value)}
                placeholder="Rua, número — referência"
              />
            </label>
          </div>

          <div className="linha">
            <label className="campo campo-estreito">
              <span>Público (pessoas)</span>
              <input
                type="number"
                min="0"
                value={form.publico}
                onChange={(e) => setCampo('publico', e.target.value)}
                placeholder="ex.: 80"
              />
            </label>
            <label className="campo campo-estreito">
              <span>Dia sugerido</span>
              <input
                value={form.data}
                onChange={(e) => setCampo('data', mascaraData(e.target.value))}
                placeholder="dd/mm/aaaa"
                inputMode="numeric"
                maxLength={10}
                aria-invalid={Boolean(erros.data)}
              />
              {erros.data && <small className="erro-campo">{erros.data}</small>}
            </label>
            <label className="campo">
              <span>Observações</span>
              <input
                value={form.observacoes}
                onChange={(e) => setCampo('observacoes', e.target.value)}
                placeholder="Detalhes da proposta"
              />
            </label>
          </div>

          <div className="acoes-form">
            <button type="submit" className="botao primario">Salvar proposta</button>
            <button type="button" className="botao" onClick={() => { setMostrarForm(false); setErros({}); }}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="barra-filtros">
        <Busca valor={busca} aoMudar={setBusca} placeholder="Pesquisar por nome, bairro, endereço, candidato…" />
        <label className="filtro">
          Mostrar:{' '}
          <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}>
            <option value="ativas">Ativas (menos recusadas)</option>
            <option value="pendente">Só pendentes</option>
            <option value="aprovada">Só aprovadas</option>
            <option value="recusada">Só recusadas</option>
            <option value="todas">Todas</option>
          </select>
        </label>
      </div>

      {erro && <p className="aviso erro">{erro}</p>}

      {carregando ? (
        <p className="vazio">Carregando…</p>
      ) : propostas.length === 0 ? (
        <p className="vazio">Nenhuma proposta cadastrada ainda. Clique em “+ Nova proposta”.</p>
      ) : visiveis.length === 0 ? (
        <p className="vazio">Nenhuma proposta para esse filtro/busca.</p>
      ) : (
        <>
          <div className="cartao painel-bi">
            <div className="bi-cabeca">
              <h2>Propostas por região</h2>
              <span className="bi-total"><b>{total}</b> proposta{total === 1 ? '' : 's'}</span>
            </div>
            <ul className="bi-barras">
              {linhas.map((l, i) => {
                const pct = maximo ? Math.round((l.n / maximo) * 100) : 0;
                const cor = l.n === 0 ? '#d7dccf' : `hsl(212 82% ${58 - (l.n / maximo) * 30}%)`;
                return (
                  <li key={l.regiao} className={`bi-linha ${l.n === 0 ? 'zerada' : ''} ${i === 0 && l.n > 0 ? 'lider' : ''}`}>
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

          {grupos.map((g) => (
            <div className="grupo-regiao" key={g.regiao}>
              <h2 className="regiao-titulo">
                <span className="regiao-nome">{g.rotulo}</span>
                <span className="regiao-contagem">
                  {g.itens.length} proposta{g.itens.length === 1 ? '' : 's'}
                </span>
              </h2>

              {subgruparPorBairro(g.itens).map((bairro) => {
                const juntar = bairro.itens.length >= 2;
                const candidatos = [...new Set(bairro.itens.map((p) => p.candidato).filter(Boolean))];
                return (
                  <div className={`bairro-bloco ${juntar ? 'juntar' : ''}`} key={bairro.rotulo}>
                    <div className="bairro-cabeca">
                      <span className="bairro-nome">📍 {bairro.rotulo}</span>
                      <span className="bairro-contagem">
                        {bairro.itens.length} proposta{bairro.itens.length === 1 ? '' : 's'}
                      </span>
                      {juntar && <span className="tag-juntar">dá pra juntar?</span>}
                      {juntar && candidatos.length > 1 && (
                        <span className="tag-candidatos" title="Candidatos diferentes no mesmo bairro">
                          candidatos: {candidatos.join(', ')}
                        </span>
                      )}
                    </div>
                    <ul className="lista lista-cartoes">
                      {bairro.itens.map((p) => (
                        <PropostaCard
                          key={p.id}
                          proposta={p}
                          aoStatus={(s) => trocarStatus(p, s)}
                          aoExcluir={() => excluir(p)}
                          aoCriarReuniao={aoCriarReuniao ? () => criarReuniaoDe(p) : null}
                        />
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          ))}
        </>
      )}
    </section>
  );
}

function PropostaCard({ proposta: p, aoStatus, aoExcluir, aoCriarReuniao }) {
  return (
    <li className={`cartao proposta-card status-${p.status}`}>
      <div className="proposta-topo">
        <div className="proposta-ident">
          <div className="item-nome">{p.proponente}</div>
          <div className="proposta-meta">
            {p.candidato && <span className="candidato-tag">{p.candidato}</span>}
            {p.publico != null && <span className="proposta-publico">{p.publico} pessoas</span>}
            {p.data_sugerida && <span className="proposta-data">📅 {formatarData(p.data_sugerida)}</span>}
          </div>
        </div>
        <span className={`status ${p.status}`}>{ROTULO_STATUS[p.status]}</span>
      </div>

      {p.endereco && <div className="proposta-linha">{p.endereco}</div>}
      {p.observacoes && <div className="proposta-obs">{p.observacoes}</div>}

      <div className="proposta-rodape">
        <div className="proposta-contato">
          {p.telefone ? (
            <>
              <a className="botao pequeno" href={`tel:+${p.telefone}`}>Ligar</a>
              <a
                className="botao pequeno secundario"
                href={`https://wa.me/${p.telefone}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                WhatsApp
              </a>
            </>
          ) : (
            <span className="proposta-sem-tel">sem telefone</span>
          )}
        </div>

        <div className="proposta-acoes">
          {p.status === 'pendente' ? (
            <>
              <button className="botao pequeno primario" onClick={() => aoStatus('aprovada')}>Aprovar</button>
              <button className="botao pequeno" onClick={() => aoStatus('recusada')}>Recusar</button>
            </>
          ) : (
            <button className="botao pequeno" onClick={() => aoStatus('pendente')}>Reabrir</button>
          )}
          {aoCriarReuniao && p.status !== 'recusada' && (
            <button className="botao pequeno secundario" onClick={aoCriarReuniao}>Virar reunião</button>
          )}
          <button className="botao pequeno" onClick={aoExcluir} title="Excluir proposta" aria-label="Excluir">🗑️</button>
        </div>
      </div>
    </li>
  );
}
