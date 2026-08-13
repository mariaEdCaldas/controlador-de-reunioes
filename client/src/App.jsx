import { useEffect, useState } from 'react';
import PainelAgenda from './PainelAgenda.jsx';
import NovaReuniao from './NovaReuniao.jsx';
import Pessoas from './Pessoas.jsx';
import Lembretes from './Lembretes.jsx';
import AgendaRodrigo from './AgendaRodrigo.jsx';
import Usuarios from './Usuarios.jsx';
import Login from './Login.jsx';
import { authEu } from './api.js';
import { getToken, registrarDeslogar, deslogar } from './auth.js';

const NAV = [
  { id: 'agenda', rotulo: 'Agenda' },
  { id: 'rodrigo', rotulo: 'Agenda Dr Rodrigo' },
  { id: 'pessoas', rotulo: 'Pessoas' },
  { id: 'lembretes', rotulo: 'Lembretes' },
];

export default function App() {
  const [aba, setAba] = useState('agenda');
  const [recarga, setRecarga] = useState(0);
  const [reuniaoInicial, setReuniaoInicial] = useState(null);
  const [semBanner, setSemBanner] = useState(false);
  // undefined = ainda checando a sessão; null = deslogado; objeto = logado.
  const [usuario, setUsuario] = useState(undefined);

  // Ao carregar: se há token guardado, valida com o servidor; senão, login.
  useEffect(() => {
    registrarDeslogar(() => setUsuario(null));
    if (!getToken()) { setUsuario(null); return; }
    authEu().then((r) => setUsuario(r.usuario)).catch(() => setUsuario(null));
  }, []);

  function abrirNovaReuniao(inicial = null) {
    setReuniaoInicial(inicial);
    setAba('nova');
  }

  function voltarParaAgenda() {
    setReuniaoInicial(null);
    setRecarga((n) => n + 1);
    setAba('agenda');
  }

  function sair() {
    deslogar();
    setAba('agenda');
  }

  if (usuario === undefined) {
    return <div className="login-tela"><p className="vazio">Carregando…</p></div>;
  }
  if (usuario === null) {
    return <Login aoEntrar={setUsuario} />;
  }

  const ehAdmin = usuario.papel === 'admin';
  const itens = ehAdmin ? [...NAV, { id: 'usuarios', rotulo: 'Usuários' }] : NAV;

  return (
    <div className="layout">
      <aside className="lateral">
        <div className="identidade">
          {semBanner ? (
            <div className="candidato">Dep. Paulo Corrêa</div>
          ) : (
            <img
              className="banner-candidato"
              src="/artes/paulo-correa-png.png"
              alt="Deputado Estadual Paulo Corrêa"
              onError={() => setSemBanner(true)}
            />
          )}
          <div className="numero">22.222</div>
        </div>

        <nav className="nav">
          {itens.map((n) => (
            <button
              key={n.id}
              className={`nav-item ${aba === n.id ? 'ativa' : ''}`}
              onClick={() => setAba(n.id)}
              aria-current={aba === n.id ? 'page' : undefined}
            >
              {n.rotulo}
            </button>
          ))}
        </nav>

        <div className="usuario-rodape">
          <div className="usuario-info">
            <span className="usuario-nome">{usuario.nome}</span>
            <span className="usuario-papel">{ehAdmin ? 'Administrador' : 'Comum'}</span>
          </div>
          <button className="botao-sair" onClick={sair}>Sair</button>
        </div>
      </aside>

      <main className="conteudo">
        {aba === 'agenda' && <PainelAgenda key={recarga} aoNovaReuniao={abrirNovaReuniao} />}
        {aba === 'nova' && <NovaReuniao aoConcluir={voltarParaAgenda} inicial={reuniaoInicial} />}
        {aba === 'rodrigo' && <AgendaRodrigo />}
        {aba === 'pessoas' && <Pessoas />}
        {aba === 'lembretes' && <Lembretes />}
        {aba === 'usuarios' && ehAdmin && <Usuarios usuarioAtual={usuario} />}
      </main>
    </div>
  );
}
