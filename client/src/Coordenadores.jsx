import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  listarCoordenadores,
  listarTimes,
  criarCoordenador,
  editarCoordenador,
  vincularCoordenador,
  excluirCoordenador,
  importarPreviaPlanilha,
  importarConfirmarPlanilha,
} from './api.js';
import { formatarTelefone } from './regioes.js';
import Busca, { contemBusca } from './Busca.jsx';
import './times.css';

/** Link do WhatsApp com uma saudação genérica (sem contexto de reunião). */
function linkWhatsApp(c) {
  const texto = `Olá ${c.nome}! Aqui é do gabinete do Dep. Paulo Corrêa.`;
  return `https://wa.me/${c.telefone}?text=${encodeURIComponent(texto)}`;
}

/**
 * Listagem de coordenadores (a carga da planilha) com o time de cada um.
 * Filtro por time, cadastro, troca de time e contato por telefone/WhatsApp.
 */
export default function Coordenadores() {
  const [coordenadores, setCoordenadores] = useState([]);
  const [times, setTimes] = useState([]);
  const [filtro, setFiltro] = useState(''); // '' todos | id | 'sem'
  const [form, setForm] = useState({
    nome: '', telefone: '', bairro: '', endereco: '', rede_social: '', time_id: '',
  });
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [editando, setEditando] = useState(null); // coordenador em edição
  const [mostrarForm, setMostrarForm] = useState(false);
  const [busca, setBusca] = useState('');
  // Importação de planilha: prévia (o que seria importado, sem gravar).
  const [previa, setPrevia] = useState(null);
  const [importando, setImportando] = useState(false);
  const [aviso, setAviso] = useState('');
  const inputArquivo = useRef(null);

  function carregar() {
    const args =
      filtro === 'sem' ? { semTime: true } : filtro ? { timeId: filtro } : {};
    return Promise.all([listarCoordenadores(args), listarTimes()])
      .then(([c, t]) => {
        setCoordenadores(c);
        setTimes(t);
        setErro('');
      })
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtro]);

  async function adicionar(e) {
    e.preventDefault();
    if (!form.nome.trim()) {
      setErro('Nome é obrigatório.');
      return;
    }
    try {
      await criarCoordenador({
        nome: form.nome,
        telefone: form.telefone,
        bairro: form.bairro,
        endereco: form.endereco,
        rede_social: form.rede_social,
        time_id: form.time_id || null,
      });
      setForm({ nome: '', telefone: '', bairro: '', endereco: '', rede_social: '', time_id: '' });
      setMostrarForm(false);
      await carregar();
    } catch (err) {
      setErro(err.message);
    }
  }

  async function trocarTime(coordId, timeId) {
    try {
      await vincularCoordenador(coordId, timeId || null);
      await carregar();
    } catch (err) {
      setErro(err.message);
    }
  }

  async function excluir(c) {
    if (!window.confirm(`Excluir o coordenador "${c.nome}"?`)) return;
    try {
      await excluirCoordenador(c.id);
      await carregar();
    } catch (err) {
      setErro(err.message);
    }
  }

  async function aoEscolherArquivo(e) {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite subir o mesmo arquivo de novo depois
    if (!file) return;
    setErro('');
    setAviso('');
    setPrevia(null);
    setImportando(true);
    try {
      const p = await importarPreviaPlanilha(file);
      setPrevia({ ...p, arquivo: file.name });
    } catch (err) {
      setErro(err.message);
    } finally {
      setImportando(false);
    }
  }

  async function confirmarImportacao() {
    setImportando(true);
    setErro('');
    try {
      const r = await importarConfirmarPlanilha(previa.linhas);
      setAviso(
        `Importado: ${r.coordenadores} coordenador(es) e ${r.times} time(s) novo(s).` +
          (r.pulados ? ` ${r.pulados} já existia(m) e foi(ram) ignorado(s).` : '')
      );
      setPrevia(null);
      await carregar();
    } catch (err) {
      setErro(err.message);
    } finally {
      setImportando(false);
    }
  }

  const visiveis = coordenadores.filter((c) =>
    contemBusca(`${c.nome} ${c.bairro ?? ''} ${c.rede_social ?? ''} ${c.telefone ?? ''}`, busca)
  );

  return (
    <section>
      <header className="cabecalho-secao">
        <div>
          <h1>Coordenadores</h1>
          <p className="sub">
            {coordenadores.length} coordenador{coordenadores.length === 1 ? '' : 'es'}
            {filtro === 'sem' ? ' sem time' : filtro ? ' neste time' : ''}
          </p>
        </div>
        <div className="cabecalho-acoes">
          <input
            ref={inputArquivo}
            type="file"
            accept=".xlsx,.csv"
            style={{ display: 'none' }}
            onChange={aoEscolherArquivo}
          />
          <button
            className="botao"
            onClick={() => inputArquivo.current?.click()}
            disabled={importando}
          >
            {importando && !previa ? 'Lendo planilha…' : '📄 Importar planilha'}
          </button>
          {!mostrarForm && (
            <button className="botao primario" onClick={() => setMostrarForm(true)}>
              + Novo coordenador
            </button>
          )}
        </div>
      </header>

      {aviso && <p className="aviso info">{aviso}</p>}

      {/* Prévia da importação: o que seria gravado, com Confirmar/Cancelar. */}
      {previa && (
        <div className="cartao import-previa">
          <h2>Prévia da importação — {previa.arquivo}</h2>
          <p className="import-resumo">
            <strong>{previa.total}</strong> linha(s) lida(s): <strong>{previa.novos}</strong> novo(s),{' '}
            <strong>{previa.existentes}</strong> já existe(m) e será(ão) ignorado(s)
            {previa.semTelefone > 0 && <> · {previa.semTelefone} sem telefone</>}.
          </p>
          {previa.timesNovos.length > 0 && (
            <p className="import-times">
              Times novos que serão criados: <strong>{previa.timesNovos.join(', ')}</strong>
            </p>
          )}

          <div className="import-tabela-caixa">
            <table className="tabela">
              <thead>
                <tr><th>Situação</th><th>Nome</th><th>Telefone</th><th>Time</th></tr>
              </thead>
              <tbody>
                {previa.linhas.map((l, i) => (
                  <tr key={i} className={l.status === 'existe' ? 'linha-ignorada' : ''}>
                    <td className="nowrap">
                      <span className={`status ${l.status === 'novo' ? 'confirmada' : 'realizada'}`}>
                        {l.status === 'novo' ? 'novo' : 'já existe'}
                      </span>
                    </td>
                    <td>{l.nome}</td>
                    <td className="nowrap">
                      {l.telefone ? formatarTelefone(l.telefone)
                        : <em style={{ color: '#9ca3af' }}>{l.telefoneOriginal || 'sem telefone'}</em>}
                    </td>
                    <td className="nowrap">{l.time ?? <em style={{ color: '#9ca3af' }}>—</em>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="acoes-form">
            <button className="botao primario" onClick={confirmarImportacao} disabled={importando || previa.novos === 0}>
              {importando ? 'Importando…' : `Confirmar (${previa.novos} novo${previa.novos === 1 ? '' : 's'})`}
            </button>
            <button className="botao" onClick={() => setPrevia(null)} disabled={importando}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {mostrarForm && (
      <form className="cartao form" onSubmit={adicionar}>
        <div className="linha">
          <label className="campo">
            <span>Nome <b aria-hidden="true">*</b></span>
            <input
              value={form.nome}
              onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
              autoFocus
            />
          </label>
          <label className="campo">
            <span>Telefone (WhatsApp)</span>
            <input
              value={form.telefone}
              onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))}
              placeholder="(67) 99999-8888"
              inputMode="tel"
            />
          </label>
          <label className="campo">
            <span>Bairro / região</span>
            <input
              value={form.bairro}
              onChange={(e) => setForm((f) => ({ ...f, bairro: e.target.value }))}
              placeholder="Ex.: Tarumã"
            />
          </label>
        </div>
        <div className="linha">
          <label className="campo">
            <span>Endereço</span>
            <input
              value={form.endereco}
              onChange={(e) => setForm((f) => ({ ...f, endereco: e.target.value }))}
              placeholder="Rua, número"
            />
          </label>
          <label className="campo">
            <span>Rede social</span>
            <input
              value={form.rede_social}
              onChange={(e) => setForm((f) => ({ ...f, rede_social: e.target.value }))}
              placeholder="@perfil ou e-mail"
            />
          </label>
          <label className="campo">
            <span>Time</span>
            <select
              value={form.time_id}
              onChange={(e) => setForm((f) => ({ ...f, time_id: e.target.value }))}
            >
              <option value="">Sem time</option>
              {times.map((t) => (
                <option key={t.id} value={t.id}>{t.nome}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="acoes-form">
          <button type="submit" className="botao primario">Cadastrar coordenador</button>
          <button type="button" className="botao" onClick={() => setMostrarForm(false)}>Cancelar</button>
        </div>
      </form>
      )}

      <Busca valor={busca} aoMudar={setBusca} placeholder="Pesquisar por nome, bairro ou rede…" />

      <div className="filtro">
        <label>
          Time:{' '}
          <select value={filtro} onChange={(e) => setFiltro(e.target.value)}>
            <option value="">Todos</option>
            {times.map((t) => (
              <option key={t.id} value={t.id}>{t.nome}</option>
            ))}
            <option value="sem">Sem time</option>
          </select>
        </label>
      </div>

      {erro && <p className="aviso erro">{erro}</p>}

      {carregando ? (
        <p className="vazio">Carregando…</p>
      ) : visiveis.length === 0 ? (
        <p className="vazio">
          {busca ? 'Nenhum coordenador encontrado.' : 'Nenhum coordenador nesta seleção.'}
        </p>
      ) : (
        <ul className="lista lista-cartoes">
          {visiveis.map((c) => (
            <li key={c.id} className="cartao item coord-item">
              <div className="item-principal">
                <div className="item-nome">{c.nome}</div>
                <div className="item-telefone">
                  {c.telefone ? formatarTelefone(c.telefone) : <em>sem telefone</em>}
                </div>
                <div className="coord-extra">
                  {c.bairro && <span>{c.bairro}</span>}
                  {c.rede_social && <span className="coord-rede">{c.rede_social}</span>}
                </div>
              </div>

              <label className="coord-time-select">
                <select
                  value={c.time_id ?? ''}
                  onChange={(e) => trocarTime(c.id, e.target.value)}
                >
                  <option value="">Sem time</option>
                  {times.map((t) => (
                    <option key={t.id} value={t.id}>{t.nome}</option>
                  ))}
                </select>
              </label>

              <div className="item-acoes">
                {c.telefone && (
                  <>
                    <a className="botao pequeno" href={`tel:+${c.telefone}`}>Ligar</a>
                    <a
                      className="botao pequeno secundario"
                      href={linkWhatsApp(c)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      WhatsApp
                    </a>
                  </>
                )}
                <button className="botao pequeno" onClick={() => setEditando(c)}>Editar</button>
                <button className="botao pequeno" onClick={() => excluir(c)}>Excluir</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editando && (
        <EdicaoCoordenador
          coordenador={editando}
          aoFechar={() => setEditando(null)}
          aoSalvar={async () => {
            setEditando(null);
            await carregar();
          }}
          aoErro={setErro}
        />
      )}
    </section>
  );
}

/** Modal de edição de um coordenador (nome, telefone, bairro, endereço, rede). */
function EdicaoCoordenador({ coordenador, aoFechar, aoSalvar, aoErro }) {
  const [f, setF] = useState({
    nome: coordenador.nome ?? '',
    telefone: coordenador.telefone ?? '',
    bairro: coordenador.bairro ?? '',
    endereco: coordenador.endereco ?? '',
    rede_social: coordenador.rede_social ?? '',
  });
  const [salvando, setSalvando] = useState(false);
  const set = (campo) => (e) => setF((x) => ({ ...x, [campo]: e.target.value }));

  async function salvar(e) {
    e.preventDefault();
    if (!f.nome.trim()) return aoErro('Nome é obrigatório.');
    setSalvando(true);
    try {
      await editarCoordenador(coordenador.id, f);
      await aoSalvar();
    } catch (err) {
      aoErro(err.message);
    } finally {
      setSalvando(false);
    }
  }

  return createPortal(
    <div className="impressao-overlay" onClick={aoFechar}>
      <div className="editar-caixa" onClick={(e) => e.stopPropagation()}>
        <h2>Editar coordenador</h2>
        <form onSubmit={salvar}>
          <div className="linha">
            <label className="campo">
              <span>Nome <b aria-hidden="true">*</b></span>
              <input value={f.nome} onChange={set('nome')} />
            </label>
            <label className="campo">
              <span>Telefone (WhatsApp)</span>
              <input value={f.telefone} onChange={set('telefone')} inputMode="tel" />
            </label>
          </div>
          <div className="linha">
            <label className="campo">
              <span>Bairro / região</span>
              <input value={f.bairro} onChange={set('bairro')} />
            </label>
            <label className="campo">
              <span>Endereço</span>
              <input value={f.endereco} onChange={set('endereco')} />
            </label>
            <label className="campo">
              <span>Rede social</span>
              <input value={f.rede_social} onChange={set('rede_social')} />
            </label>
          </div>
          <div className="acoes-form">
            <button type="submit" className="botao primario" disabled={salvando}>
              {salvando ? 'Salvando…' : 'Salvar alterações'}
            </button>
            <button type="button" className="botao" onClick={aoFechar} disabled={salvando}>Cancelar</button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
