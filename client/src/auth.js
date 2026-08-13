/**
 * Guarda o token de login no navegador (localStorage) e avisa o App quando a
 * sessão cai (401), para voltar à tela de login.
 */
let token = localStorage.getItem('token') || null;
let aoDeslogar = () => {};

export const getToken = () => token;

export function setToken(novo) {
  token = novo || null;
  if (token) localStorage.setItem('token', token);
  else localStorage.removeItem('token');
}

/** O App registra aqui o que fazer quando a sessão cair (mostrar o login). */
export function registrarDeslogar(fn) {
  aoDeslogar = fn;
}

export function deslogar() {
  setToken(null);
  aoDeslogar();
}
