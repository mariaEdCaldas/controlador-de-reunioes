import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  listarPropostas, criarProposta, mudarStatusProposta, excluirProposta,
  listarRegioes, criarRegiao, listarCoordenadores, criarReuniao,
} from './api.js';
import { formatarData, formatarTelefone, brParaIso, mascaraData } from './regioes.js';
import { CANDIDATOS } from './candidatos.js';
import { SUGESTOES_BAIRRO, agruparPorRegiao, contagemPorRegiao } from './regioesCampoGrande.js';
import Busca, { contemBusca } from './Busca.jsx';

const HORAS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTOS = ['00', '15', '30', '45'];

const VAZIO = {
  coordenador: '', telefone: '', candidato: '', regiao: '',
  endereco: '', publico: '', data: '', hora: '', observacoes: '',
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
export default function Propostas({ aoCriarReuniao, aoConcluir }) {
  const [propostas, setPropostas] = useState([]);
  const [regioes, setRegioes] = useState([]);
  const [coordenadores, setCoordenadores] = useState([]);
  const [form, setForm] = useState(VAZIO);
  const [coordSelecionado, setCoordSelecionado] = useState(null);
  const [aprovando, setAprovando] = useState(null); // proposta em aprovação (modal)
  const [erros, setErros] = useState({});
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('ativas'); // ativas | todas | pendente | aprovada | recusada

  function carregar() {
    return Promise.all([listarPropostas(), listarRegioes(), listarCoordenadores()])
      .then(([p, r, c]) => { setPropostas(p); setRegioes(r); setCoordenadores(c); setErro(''); })
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  }

  useEffect(() => { carregar(); }, []);

  const setCampo = (campo, valor) => {
    setForm((f) => ({ ...f, [campo]: valor }));
    setErros((x) => ({ ...x, [campo]: undefined }));
  };

  // Ao escolher o coordenador responsável, traz o telefone dele (editável).
  function mudarCoordenador(valor) {
    const match = coordenadores.find(
      (c) => c.nome.toLowerCase() === valor.trim().toLowerCase()
    );
    setForm((f) => ({
      ...f,
      coordenador: valor,
      ...(match && match.telefone ? { telefone: formatarTelefone(match.telefone) } : {}),
    }));
    setCoordSelecionado(match ?? null);
    setErros((x) => ({ ...x, coordenador: undefined }));
  }

  async function adicionar(e) {
    e.preventDefault();
    const err = {};
    if (!form.coordenador.trim()) err.coordenador = 'Informe o coordenador responsável.';
    if (!form.regiao.trim()) err.regiao = 'Selecione o bairro/região.';
    const dataIso = form.data.trim() ? brParaIso(form.data) : '';
    if (form.data.trim() && !dataIso) err.data = 'Data inválida (use dd/mm/aaaa).';
    if (Object.keys(err).length) return setErros(err);

    try {
      const nomeRegiao = form.regiao.trim();
      const existente = regioes.find((r) => r.nome.toLowerCase() === nomeRegiao.toLowerCase());
      const regiao = existente ?? (await criarRegiao(nomeRegiao));
      const coord = coordenadores.find(
        (c) => c.nome.toLowerCase() === form.coordenador.trim().toLowerCase()
      );
      await criarProposta({
        proponente: form.coordenador,
        coordenador_id: coord ? coord.id : null,
        telefone: form.telefone,
        candidato: form.candidato,
        regiao_id: regiao.id,
        endereco: form.endereco,
        publico: form.publico === '' ? null : Number(form.publico),
        data_sugerida: dataIso || null,
        hora: form.hora || null,
        observacoes: form.observacoes,
      });
      setForm(VAZIO);
      setCoordSelecionado(null);
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

  // Aprovar = criar a reunião automaticamente (só perguntando do som) e marcar a
  // proposta como aprovada; depois volta para a agenda para ela já aparecer lá.
  async function confirmarAprovacao(p, som) {
    setErro('');
    try {
      await criarReuniao({
        nome: `Reunião - ${bairroBase(p.regiao) || p.proponente}`,
        candidato: p.candidato || '',
        endereco: p.endereco,
        data: p.data_sugerida,
        hora: p.hora,
        regiao_id: p.regiao_id,
        coordenador_id: p.coordenador_id ?? null,
        qtd_cadeiras: p.publico != null ? p.publico : null,
        tem_som: som,
      });
      await mudarStatusProposta(p.id, 'aprovada');
      setAprovando(null);
      aoConcluir?.(); // vai para a agenda
    } catch (e) {
      setErro(e.message);
      setAprovando(null);
    }
  }

  function criarReuniaoDe(p) {
    aoCriarReuniao?.({
      nome: `Reunião - ${bairroBase(p.regiao) || p.proponente}`,
      candidato: p.candidato || '',
      regiao: p.regiao || '',
      endereco: p.endereco || '',
      data: p.data_sugerida ? formatarData(p.data_sugerida) : '',
      hora: p.hora || '',
      coordenador: p.coordenador_nome || p.proponente || '',
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
              <span>Coordenador responsável <b aria-hidden="true">*</b></span>
              <input
                list="lista-coord-proposta"
                value={form.coordenador}
                onChange={(e) => mudarCoordenador(e.target.value)}
                placeholder="Busque um coordenador cadastrado"
                aria-invalid={Boolean(erros.coordenador)}
                autoFocus
              />
              <datalist id="lista-coord-proposta">
                {coordenadores.map((c) => (
                  <option key={c.id} value={c.nome} />
                ))}
              </datalist>
              {erros.coordenador && <small className="erro-campo">{erros.coordenador}</small>}
              {coordSelecionado && (
                <small className="dica">Traz o telefone do coordenador (dá para editar).</small>
              )}
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
              <span>Deputado federal parceiro</span>
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
            <label className="campo">
              <span>Data pretendida</span>
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
              <span>Hora pretendida</span>
              <div className="campo-hora">
                <select
                  value={(form.hora || '').split(':')[0] || ''}
                  onChange={(e) => setCampo('hora', e.target.value ? `${e.target.value}:${(form.hora || '').split(':')[1] || '00'}` : '')}
                >
                  <option value="">Hora</option>
                  {HORAS.map((h) => (<option key={h} value={h}>{h}h</option>))}
                </select>
                <select
                  value={(form.hora || '').split(':')[1] || ''}
                  onChange={(e) => setCampo('hora', `${(form.hora || '').split(':')[0] || '00'}:${e.target.value}`)}
                  disabled={!(form.hora || '').split(':')[0]}
                >
                  {MINUTOS.map((m) => (<option key={m} value={m}>{m}</option>))}
                </select>
              </div>
            </label>
            <label className="campo campo-estreito">
              <span>Previsão de pessoas</span>
              <input
                type="number"
                min="0"
                value={form.publico}
                onChange={(e) => setCampo('publico', e.target.value)}
                placeholder="ex.: 80"
              />
            </label>
          </div>

          <div className="linha">
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
                          aoAprovar={() => setAprovando(p)}
                          aoStatus={(s) => trocarStatus(p, s)}
                          aoExcluir={() => excluir(p)}
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

      {aprovando && (
        <AprovarProposta
          proposta={aprovando}
          aoFechar={() => setAprovando(null)}
          aoConfirmar={(som) => confirmarAprovacao(aprovando, som)}
          aoCompletar={() => { const p = aprovando; setAprovando(null); criarReuniaoDe(p); }}
        />
      )}
    </section>
  );
}

/** Modal de aprovação: cria a reunião a partir da proposta, perguntando só o som. */
function AprovarProposta({ proposta: p, aoFechar, aoConfirmar, aoCompletar }) {
  const [som, setSom] = useState(true);
  const completa = Boolean(p.data_sugerida && p.hora && p.endereco);
  const faltando = [
    !p.data_sugerida && 'data',
    !p.hora && 'hora',
    !p.endereco && 'endereço',
  ].filter(Boolean);

  return createPortal(
    <div className="impressao-overlay" onClick={aoFechar}>
      <div className="editar-caixa" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
        <h2>Aprovar e criar reunião</h2>
        <p className="sub" style={{ margin: '0 0 16px' }}>
          {bairroBase(p.regiao)}
          {p.data_sugerida ? ` · ${formatarData(p.data_sugerida)}` : ''}
          {p.hora ? ` às ${p.hora}` : ''}
          {p.candidato ? ` · ${p.candidato}` : ''}
        </p>

        {completa ? (
          <>
            <label className="check-som" style={{ marginBottom: 18 }}>
              <input type="checkbox" checked={som} onChange={(e) => setSom(e.target.checked)} />
              Vai precisar de som?
            </label>
            <div className="acoes-form">
              <button className="botao primario" onClick={() => aoConfirmar(som)}>Criar reunião</button>
              <button className="botao" onClick={aoFechar}>Cancelar</button>
            </div>
          </>
        ) : (
          <>
            <p className="aviso info">
              Falta {faltando.join(', ')} nesta proposta — complete no cadastro da reunião.
            </p>
            <div className="acoes-form">
              <button className="botao primario" onClick={aoCompletar}>Abrir cadastro completo</button>
              <button className="botao" onClick={aoFechar}>Cancelar</button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}

function PropostaCard({ proposta: p, aoAprovar, aoStatus, aoExcluir }) {
  return (
    <li className={`cartao proposta-card status-${p.status}`}>
      <div className="proposta-topo">
        <div className="proposta-ident">
          <div className="item-nome">{p.proponente}</div>
          <div className="proposta-meta">
            {p.candidato && <span className="candidato-tag">{p.candidato}</span>}
            {p.publico != null && <span className="proposta-publico">{p.publico} pessoas</span>}
            {(p.data_sugerida || p.hora) && (
              <span className="proposta-data">
                📅 {p.data_sugerida ? formatarData(p.data_sugerida) : 'dia a definir'}
                {p.hora ? ` às ${p.hora}` : ''}
              </span>
            )}
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
              <button className="botao pequeno primario" onClick={aoAprovar}>Aprovar</button>
              <button className="botao pequeno" onClick={() => aoStatus('recusada')}>Recusar</button>
            </>
          ) : (
            <button className="botao pequeno" onClick={() => aoStatus('pendente')}>Reabrir</button>
          )}
          <button className="botao pequeno" onClick={aoExcluir} title="Excluir proposta" aria-label="Excluir">🗑️</button>
        </div>
      </div>
    </li>
  );
}
