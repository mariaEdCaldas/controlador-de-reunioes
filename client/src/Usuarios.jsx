import { useEffect, useState } from 'react';
import { listarUsuarios, criarUsuario, editarUsuario, excluirUsuario } from './api.js';
import Busca, { contemBusca } from './Busca.jsx';

const VAZIO = { nome: '', email: '', senha: '', papel: 'comum' };
const ROTULO_PAPEL = { admin: 'Administrador', comum: 'Comum' };

/**
 * Gestão de usuários do sistema (só administradores acessam). Cria contas,
 * muda o papel, redefine senha e remove usuários.
 */
export default function Usuarios({ usuarioAtual }) {
  const [usuarios, setUsuarios] = useState([]);
  const [form, setForm] = useState(VAZIO);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [busca, setBusca] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);

  function carregar() {
    return listarUsuarios()
      .then(setUsuarios)
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  }

  useEffect(() => { carregar(); }, []);

  async function adicionar(e) {
    e.preventDefault();
    try {
      await criarUsuario(form);
      setForm(VAZIO);
      setMostrarForm(false);
      await carregar();
    } catch (err) { setErro(err.message); }
  }

  async function mudarPapel(u, papel) {
    try { await editarUsuario(u.id, { papel }); await carregar(); }
    catch (err) { setErro(err.message); }
  }

  async function redefinirSenha(u) {
    const senha = window.prompt(`Nova senha para ${u.nome} (mín. 6 caracteres):`);
    if (!senha) return;
    try { await editarUsuario(u.id, { senha }); setErro(''); alert('Senha atualizada.'); }
    catch (err) { setErro(err.message); }
  }

  async function excluir(u) {
    if (!window.confirm(`Excluir o usuário "${u.nome}"?`)) return;
    try { await excluirUsuario(u.id); await carregar(); }
    catch (err) { setErro(err.message); }
  }

  const visiveis = usuarios.filter((u) => contemBusca(`${u.nome} ${u.email}`, busca));

  return (
    <section>
      <header className="cabecalho-secao">
        <div>
          <h1>Usuários</h1>
          <p className="sub">{usuarios.length} usuário{usuarios.length === 1 ? '' : 's'} com acesso ao sistema</p>
        </div>
        {!mostrarForm && (
          <button className="botao primario" onClick={() => setMostrarForm(true)}>+ Novo usuário</button>
        )}
      </header>

      {mostrarForm && (
        <form className="cartao form" onSubmit={adicionar}>
          <div className="linha">
            <label className="campo"><span>Nome</span><input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} autoFocus /></label>
            <label className="campo"><span>E-mail</span><input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} /></label>
          </div>
          <div className="linha">
            <label className="campo"><span>Senha (mín. 6)</span><input type="password" value={form.senha} onChange={(e) => setForm((f) => ({ ...f, senha: e.target.value }))} /></label>
            <label className="campo">
              <span>Perfil</span>
              <select value={form.papel} onChange={(e) => setForm((f) => ({ ...f, papel: e.target.value }))}>
                <option value="comum">Comum</option>
                <option value="admin">Administrador</option>
              </select>
            </label>
          </div>
          <div className="acoes-form">
            <button type="submit" className="botao primario">Cadastrar usuário</button>
            <button type="button" className="botao" onClick={() => { setMostrarForm(false); setForm(VAZIO); }}>Cancelar</button>
          </div>
        </form>
      )}

      <Busca valor={busca} aoMudar={setBusca} placeholder="Pesquisar por nome ou e-mail…" />

      {erro && <p className="aviso erro">{erro}</p>}

      {carregando ? (
        <p className="vazio">Carregando…</p>
      ) : visiveis.length === 0 ? (
        <p className="vazio">Nenhum usuário encontrado.</p>
      ) : (
        <ul className="lista">
          {visiveis.map((u) => (
            <li key={u.id} className="cartao item coord-item">
              <div className="item-principal">
                <div className="item-nome">
                  {u.nome}
                  {u.id === usuarioAtual?.id && <span className="time-tag">você</span>}
                </div>
                <div className="coord-extra"><span>{u.email}</span></div>
              </div>
              <label className="coord-time-select">
                <select value={u.papel} onChange={(e) => mudarPapel(u, e.target.value)}>
                  <option value="comum">Comum</option>
                  <option value="admin">Administrador</option>
                </select>
              </label>
              <div className="item-acoes">
                <button className="botao pequeno" onClick={() => redefinirSenha(u)}>Redefinir senha</button>
                <button className="botao pequeno" onClick={() => excluir(u)} disabled={u.id === usuarioAtual?.id}>Excluir</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
