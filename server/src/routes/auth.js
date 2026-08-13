import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import { gerarToken, exigirLogin } from '../auth.js';

export const authRouter = Router();

const publico = (u) => ({ id: u.id, nome: u.nome, email: u.email, papel: u.papel });

function validarNovo(corpo) {
  const nome = String(corpo.nome ?? '').trim();
  const email = String(corpo.email ?? '').trim().toLowerCase();
  const senha = String(corpo.senha ?? '');
  if (!nome) return { ok: false, erro: 'Informe o nome.' };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, erro: 'E-mail inválido.' };
  if (senha.length < 6) return { ok: false, erro: 'A senha precisa de pelo menos 6 caracteres.' };
  return { ok: true, nome, email, senha };
}

const contarUsuarios = () => db.prepare('SELECT COUNT(*) AS n FROM usuarios').get().n;

/** GET /api/auth/estado — o frontend usa para saber se já existe algum usuário. */
authRouter.get('/estado', (req, res) => {
  res.json({ temUsuarios: contarUsuarios() > 0 });
});

/** POST /api/auth/bootstrap — cria o PRIMEIRO admin (só quando não há usuários). */
authRouter.post('/bootstrap', (req, res) => {
  if (contarUsuarios() > 0) {
    return res.status(403).json({ erro: 'Já existe usuário. Peça a um administrador para criar sua conta.' });
  }
  const r = validarNovo(req.body);
  if (!r.ok) return res.status(400).json({ erro: r.erro });

  const hash = bcrypt.hashSync(r.senha, 10);
  const { lastInsertRowid } = db
    .prepare('INSERT INTO usuarios (nome, email, senha_hash, papel) VALUES (?, ?, ?, ?)')
    .run(r.nome, r.email, hash, 'admin');
  const u = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(lastInsertRowid);
  res.status(201).json({ token: gerarToken(u), usuario: publico(u) });
});

/** POST /api/auth/login — body: { email, senha } */
authRouter.post('/login', (req, res) => {
  const email = String(req.body.email ?? '').trim().toLowerCase();
  const senha = String(req.body.senha ?? '');
  const u = db.prepare('SELECT * FROM usuarios WHERE email = ? COLLATE NOCASE').get(email);
  if (!u || !bcrypt.compareSync(senha, u.senha_hash)) {
    return res.status(401).json({ erro: 'E-mail ou senha incorretos.' });
  }
  res.json({ token: gerarToken(u), usuario: publico(u) });
});

/** GET /api/auth/eu — devolve o usuário do token (valida a sessão). */
authRouter.get('/eu', exigirLogin, (req, res) => {
  const u = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(req.usuario.id);
  if (!u) return res.status(401).json({ erro: 'Usuário não existe mais.' });
  res.json({ usuario: publico(u) });
});
