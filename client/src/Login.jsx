import { useEffect, useState } from 'react';
import { authEstado, authBootstrap, authLogin } from './api.js';
import { setToken } from './auth.js';

/**
 * Tela de entrada. Se ainda não há nenhum usuário, mostra a criação do primeiro
 * administrador (bootstrap); caso contrário, o login por e-mail e senha.
 */
export default function Login({ aoEntrar }) {
  const [modo, setModo] = useState('carregando'); // 'carregando' | 'login' | 'bootstrap'
  const [form, setForm] = useState({ nome: '', email: '', senha: '' });
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    authEstado()
      .then((e) => setModo(e.temUsuarios ? 'login' : 'bootstrap'))
      .catch(() => setModo('login'));
  }, []);

  const set = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));

  async function enviar(e) {
    e.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      const r =
        modo === 'bootstrap'
          ? await authBootstrap({ nome: form.nome, email: form.email, senha: form.senha })
          : await authLogin({ email: form.email, senha: form.senha });
      setToken(r.token);
      aoEntrar(r.usuario);
    } catch (err) {
      setErro(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="login-tela">
      <div className="login-caixa">
        <div className="login-marca">
          <div className="login-numero">22.222</div>
          <div className="login-gabinete">Gabinete Dep. Paulo Corrêa</div>
        </div>

        {modo === 'carregando' ? (
          <p className="vazio">Carregando…</p>
        ) : (
          <form onSubmit={enviar}>
            <h2>{modo === 'bootstrap' ? 'Criar primeiro acesso' : 'Entrar'}</h2>
            {modo === 'bootstrap' && (
              <p className="sub" style={{ margin: '0 0 14px' }}>
                Ainda não há usuários. Crie a conta de administrador.
              </p>
            )}

            {erro && <p className="aviso erro">{erro}</p>}

            {modo === 'bootstrap' && (
              <label className="campo">
                <span>Nome</span>
                <input value={form.nome} onChange={set('nome')} autoFocus />
              </label>
            )}
            <label className="campo">
              <span>E-mail</span>
              <input type="email" value={form.email} onChange={set('email')} autoFocus={modo === 'login'} />
            </label>
            <label className="campo">
              <span>Senha</span>
              <input type="password" value={form.senha} onChange={set('senha')} />
            </label>

            <button type="submit" className="botao primario login-enviar" disabled={enviando}>
              {enviando ? 'Entrando…' : modo === 'bootstrap' ? 'Criar e entrar' : 'Entrar'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
