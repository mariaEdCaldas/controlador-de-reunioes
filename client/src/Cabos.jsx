import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  listarCabos, criarCabo, editarCabo, vincularCabo, excluirCabo,
  importarPreviaCabos, importarConfirmarCabos, listarCoordenadores, listarTimes,
} from './api.js';
import { formatarTelefone } from './regioes.js';
import Busca, { contemBusca } from './Busca.jsx';
import './times.css';

const VAZIO = { nome: '', telefone: '', bairro: '', endereco: '', rede_social: '', coordenador_id: '' };

/**
 * Cabos: o maior volume de pessoas. Hierarquia Time -> Coordenador -> Cabo.
 * A lista vem agrupada por coordenador (com o time ao lado), com filtro por time,
 * busca e importação de planilha.
 */
export default function Cabos() {
  const [cabos, setCabos] = useState([]);
  const [coordenadores, setCoordenadores] = useState([]);
  const [times, setTimes] = useState([]);
  const [form, setForm] = useState(VAZIO);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [busca, setBusca] = useState('');
  const [filtroTime, setFiltroTime] = useState('');
  const [editando, setEditando] = useState(null);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [previa, setPrevia] = useState(null);
  const [importando, setImportando] = useState(false);
  const [aviso, setAviso] = useState('');
  const inputArquivo = useRef(null);

  function carregar() {
    return Promise.all([listarCabos(), listarCoordenadores(), listarTimes()])
      .then(([k, c, t]) => { setCabos(k); setCoordenadores(c); setTimes(t); setErro(''); })
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  }

  useEffect(() => { carregar(); }, []);

  async function adicionar(e) {
    e.preventDefault();
    if (!form.nome.trim()) return setErro('Nome é obrigatório.');
    try {
      await criarCabo({ ...form, coordenador_id: form.coordenador_id || null });
      setForm(VAZIO);
      setMostrarForm(false);
      await carregar();
    } catch (err) { setErro(err.message); }
  }

  async function relink(caboId, coordId) {
    try { await vincularCabo(caboId, coordId || null); await carregar(); }
    catch (err) { setErro(err.message); }
  }

  async function excluir(k) {
    if (!window.confirm(`Excluir o cabo "${k.nome}"?`)) return;
    try { await excluirCabo(k.id); setCabos((l) => l.filter((x) => x.id !== k.id)); }
    catch (err) { setErro(err.message); }
  }

  async function aoEscolherArquivo(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setErro(''); setAviso(''); setPrevia(null); setImportando(true);
    try {
      const p = await importarPreviaCabos(file);
      setPrevia({ ...p, arquivo: file.name });
    } catch (err) { setErro(err.message); }
    finally { setImportando(false); }
  }

  async function confirmarImportacao() {
    setImportando(true); setErro('');
    try {
      const r = await importarConfirmarCabos(previa.linhas);
      setAviso(`Importado: ${r.cabos} cabo(s).` + (r.pulados ? ` ${r.pulados} já existia(m) e foi(ram) ignorado(s).` : ''));
      setPrevia(null);
      await carregar();
    } catch (err) { setErro(err.message); }
    finally { setImportando(false); }
  }

  const visiveis = cabos.filter((k) => {
    if (filtroTime === 'sem' && k.coordenador_id) return false;
    if (filtroTime && filtroTime !== 'sem' && String(k.time_id) !== filtroTime) return false;
    return contemBusca(`${k.nome} ${k.bairro ?? ''} ${k.coordenador_nome ?? ''} ${k.time_nome ?? ''} ${k.telefone ?? ''}`, busca);
  });

  // Agrupa por coordenador (Sem coordenador no fim).
  const grupos = agruparPorCoordenador(visiveis);

  return (
    <section>
      <header className="cabecalho-secao">
        <div>
          <h1>Cabos</h1>
          <p className="sub">
            {cabos.length} cabo{cabos.length === 1 ? '' : 's'} — organizados por coordenador (Time → Coordenador → Cabo)
          </p>
        </div>
        <div className="cabecalho-acoes">
          <input ref={inputArquivo} type="file" accept=".xlsx,.csv" style={{ display: 'none' }} onChange={aoEscolherArquivo} />
          <button className="botao" onClick={() => inputArquivo.current?.click()} disabled={importando}>
            {importando && !previa ? 'Lendo planilha…' : '📄 Importar planilha'}
          </button>
          {!mostrarForm && (
            <button className="botao primario" onClick={() => setMostrarForm(true)}>+ Novo cabo</button>
          )}
        </div>
      </header>

      {aviso && <p className="aviso info">{aviso}</p>}

      {previa && (
        <PreviaImportacao
          previa={previa}
          importando={importando}
          aoConfirmar={confirmarImportacao}
          aoCancelar={() => setPrevia(null)}
        />
      )}

      {mostrarForm && (
        <form className="cartao form" onSubmit={adicionar}>
          <div className="linha">
            <label className="campo">
              <span>Nome <b aria-hidden="true">*</b></span>
              <input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} autoFocus />
            </label>
            <label className="campo">
              <span>Telefone (WhatsApp)</span>
              <input value={form.telefone} onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))} placeholder="(67) 99999-8888" inputMode="tel" />
            </label>
            <label className="campo">
              <span>Coordenador</span>
              <select value={form.coordenador_id} onChange={(e) => setForm((f) => ({ ...f, coordenador_id: e.target.value }))}>
                <option value="">— (sem coordenador)</option>
                {coordenadores.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}{c.time_nome ? ` · ${c.time_nome}` : ''}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="linha">
            <label className="campo">
              <span>Bairro / região</span>
              <input value={form.bairro} onChange={(e) => setForm((f) => ({ ...f, bairro: e.target.value }))} placeholder="Ex.: Moreninha" />
            </label>
            <label className="campo">
              <span>Endereço</span>
              <input value={form.endereco} onChange={(e) => setForm((f) => ({ ...f, endereco: e.target.value }))} placeholder="Rua, número" />
            </label>
            <label className="campo">
              <span>Rede social</span>
              <input value={form.rede_social} onChange={(e) => setForm((f) => ({ ...f, rede_social: e.target.value }))} placeholder="@perfil" />
            </label>
          </div>
          <div className="acoes-form">
            <button type="submit" className="botao primario">Cadastrar cabo</button>
            <button type="button" className="botao" onClick={() => setMostrarForm(false)}>Cancelar</button>
          </div>
        </form>
      )}

      <div className="barra-filtros">
        <Busca valor={busca} aoMudar={setBusca} placeholder="Pesquisar por nome, bairro, coordenador…" />
        <label className="filtro">
          Time:{' '}
          <select value={filtroTime} onChange={(e) => setFiltroTime(e.target.value)}>
            <option value="">Todos</option>
            {times.map((t) => (<option key={t.id} value={t.id}>{t.nome}</option>))}
            <option value="sem">Sem coordenador</option>
          </select>
        </label>
      </div>

      {erro && <p className="aviso erro">{erro}</p>}

      {carregando ? (
        <p className="vazio">Carregando…</p>
      ) : cabos.length === 0 ? (
        <p className="vazio">Nenhum cabo ainda. Cadastre um ou importe uma planilha.</p>
      ) : visiveis.length === 0 ? (
        <p className="vazio">Nenhum cabo para esse filtro/busca.</p>
      ) : (
        <ul className="lista">
          {grupos.map((g) => (
            <GrupoCoordenador
              key={g.chave}
              grupo={g}
              coordenadores={coordenadores}
              aoRelink={relink}
              aoEditar={setEditando}
              aoExcluir={excluir}
            />
          ))}
        </ul>
      )}

      {editando && (
        <EdicaoCabo
          cabo={editando}
          aoFechar={() => setEditando(null)}
          aoSalvar={async () => { setEditando(null); await carregar(); }}
          aoErro={setErro}
        />
      )}
    </section>
  );
}

function agruparPorCoordenador(cabos) {
  const mapa = new Map();
  for (const k of cabos) {
    const chave = k.coordenador_id ?? 'sem';
    if (!mapa.has(chave)) {
      mapa.set(chave, {
        chave,
        coordenador_id: k.coordenador_id ?? null,
        coordenador: k.coordenador_nome ?? 'Sem coordenador',
        time: k.time_nome ?? null,
        itens: [],
      });
    }
    mapa.get(chave).itens.push(k);
  }
  return [...mapa.values()].sort((a, b) => {
    if (a.coordenador_id === null) return 1;
    if (b.coordenador_id === null) return -1;
    return a.coordenador.localeCompare(b.coordenador, 'pt');
  });
}

function GrupoCoordenador({ grupo: g, coordenadores, aoRelink, aoEditar, aoExcluir }) {
  const [aberto, setAberto] = useState(false);
  return (
    <li className="cartao coord-grupo">
      <div className="coord-grupo-cabeca" onClick={() => setAberto((v) => !v)}>
        <div className="coord-grupo-ident">
          <span className="coord-grupo-nome">{g.coordenador}</span>
          {g.time && <span className="time-tag">{g.time}</span>}
        </div>
        <div className="coord-grupo-dir">
          <span className="coord-grupo-contagem">{g.itens.length} cabo{g.itens.length === 1 ? '' : 's'}</span>
          <button className="botao pequeno">{aberto ? 'Fechar' : 'Ver cabos'}</button>
        </div>
      </div>

      {aberto && (
        <ul className="lista-coord">
          {g.itens.map((k) => (
            <li key={k.id} className="cabo-linha">
              <div className="cabo-info">
                <span className="coord-nome">{k.nome}</span>
                <span className="cabo-detalhe">
                  {k.telefone ? formatarTelefone(k.telefone) : 'sem telefone'}
                  {k.bairro ? ` · ${k.bairro}` : ''}
                  {k.rede_social ? ` · ${k.rede_social}` : ''}
                </span>
              </div>
              <div className="cabo-acoes">
                {k.telefone && (
                  <a className="botao pequeno secundario" href={`https://wa.me/${k.telefone}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
                )}
                <label className="cabo-relink">
                  <select value={k.coordenador_id ?? ''} onChange={(e) => aoRelink(k.id, e.target.value)}>
                    <option value="">Sem coordenador</option>
                    {coordenadores.map((c) => (<option key={c.id} value={c.id}>{c.nome}</option>))}
                  </select>
                </label>
                <button className="botao pequeno" onClick={() => aoEditar(k)}>Editar</button>
                <button className="botao pequeno" onClick={() => aoExcluir(k)}>Excluir</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function PreviaImportacao({ previa, importando, aoConfirmar, aoCancelar }) {
  return (
    <div className="cartao import-previa">
      <h2>Prévia da importação — {previa.arquivo}</h2>
      <p className="import-resumo">
        <strong>{previa.total}</strong> linha(s): <strong>{previa.novos}</strong> novo(s),{' '}
        <strong>{previa.existentes}</strong> já existe(m).
        {previa.semCoordenador > 0 && <> · {previa.semCoordenador} sem coordenador vinculado.</>}
      </p>
      {previa.coordNaoEncontrados?.length > 0 && (
        <p className="import-times">
          Coordenadores da planilha que não bateram com um cadastrado (o cabo entra sem vínculo):{' '}
          <strong>{previa.coordNaoEncontrados.join(', ')}</strong>
        </p>
      )}
      <div className="import-tabela-caixa">
        <table className="tabela">
          <thead>
            <tr><th>Situação</th><th>Nome</th><th>Telefone</th><th>Bairro</th><th>Coordenador</th></tr>
          </thead>
          <tbody>
            {previa.linhas.slice(0, 200).map((l, i) => (
              <tr key={i} className={l.status === 'existe' ? 'linha-ignorada' : ''}>
                <td className="nowrap"><span className={`status ${l.status === 'novo' ? 'confirmada' : 'realizada'}`}>{l.status === 'novo' ? 'novo' : 'já existe'}</span></td>
                <td>{l.nome}</td>
                <td className="nowrap">{l.telefone ? formatarTelefone(l.telefone) : <em style={{ color: '#9ca3af' }}>{l.telefoneOriginal || '—'}</em>}</td>
                <td className="nowrap">{l.bairro ?? '—'}</td>
                <td className="nowrap">{l.coordenador ? <span style={{ color: l.coordVinculado ? 'inherit' : '#b33a3a' }}>{l.coordenador}</span> : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {previa.linhas.length > 200 && <p className="dica" style={{ padding: '8px 12px' }}>Mostrando as 200 primeiras linhas (serão importadas todas).</p>}
      </div>
      <div className="acoes-form">
        <button className="botao primario" onClick={aoConfirmar} disabled={importando || previa.novos === 0}>
          {importando ? 'Importando…' : `Confirmar (${previa.novos} novo${previa.novos === 1 ? '' : 's'})`}
        </button>
        <button className="botao" onClick={aoCancelar} disabled={importando}>Cancelar</button>
      </div>
    </div>
  );
}

function EdicaoCabo({ cabo, aoFechar, aoSalvar, aoErro }) {
  const [f, setF] = useState({
    nome: cabo.nome ?? '', telefone: cabo.telefone ?? '', bairro: cabo.bairro ?? '',
    endereco: cabo.endereco ?? '', rede_social: cabo.rede_social ?? '',
  });
  const [salvando, setSalvando] = useState(false);
  const set = (campo) => (e) => setF((x) => ({ ...x, [campo]: e.target.value }));

  async function salvar(e) {
    e.preventDefault();
    if (!f.nome.trim()) return aoErro('Nome é obrigatório.');
    setSalvando(true);
    try { await editarCabo(cabo.id, f); await aoSalvar(); }
    catch (err) { aoErro(err.message); }
    finally { setSalvando(false); }
  }

  return createPortal(
    <div className="impressao-overlay" onClick={aoFechar}>
      <div className="editar-caixa" onClick={(e) => e.stopPropagation()}>
        <h2>Editar cabo</h2>
        <form onSubmit={salvar}>
          <div className="linha">
            <label className="campo"><span>Nome <b aria-hidden="true">*</b></span><input value={f.nome} onChange={set('nome')} /></label>
            <label className="campo"><span>Telefone</span><input value={f.telefone} onChange={set('telefone')} inputMode="tel" /></label>
          </div>
          <div className="linha">
            <label className="campo"><span>Bairro / região</span><input value={f.bairro} onChange={set('bairro')} /></label>
            <label className="campo"><span>Endereço</span><input value={f.endereco} onChange={set('endereco')} /></label>
            <label className="campo"><span>Rede social</span><input value={f.rede_social} onChange={set('rede_social')} /></label>
          </div>
          <div className="acoes-form">
            <button type="submit" className="botao primario" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar alterações'}</button>
            <button type="button" className="botao" onClick={aoFechar} disabled={salvando}>Cancelar</button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
