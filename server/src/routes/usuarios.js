import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import { exigirAdmin } from '../auth.js';

export const usuariosRouter = Router();

// Todas as rotas de usuários são só de administrador (o login já foi exigido
// globalmente no index.js).
usuariosRouter.use(exigirAdmin);

const publico = (u) => ({ id: u.id, nome: u.nome, email: u.email, papel: u.papel, criado_em: u.criado_em });
const emailValido = (e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);
const contarAdmins = () => db.prepare("SELECT COUNT(*) AS n FROM usuarios WHERE papel = 'admin'").get().n;

/** GET /api/usuarios */
usuariosRouter.get('/', (req, res) => {
  res.json(db.prepare('SELECT id, nome, email, papel, criado_em FROM usuarios ORDER BY nome COLLATE NOCASE').all());
});

/** POST /api/usuarios — cria um usuário (admin ou comum). */
usuariosRouter.post('/', (req, res) => {
  const nome = String(req.body.nome ?? '').trim();
  const email = String(req.body.email ?? '').trim().toLowerCase();
  const senha = String(req.body.senha ?? '');
  const papel = req.body.papel === 'admin' ? 'admin' : 'comum';

  if (!nome) return res.status(400).json({ erro: 'Informe o nome.' });
  if (!emailValido(email)) return res.status(400).json({ erro: 'E-mail inválido.' });
  if (senha.length < 6) return res.status(400).json({ erro: 'A senha precisa de pelo menos 6 caracteres.' });
  if (db.prepare('SELECT 1 FROM usuarios WHERE email = ? COLLATE NOCASE').get(email)) {
    return res.status(400).json({ erro: 'Já existe usuário com esse e-mail.' });
  }

  const hash = bcrypt.hashSync(senha, 10);
  const { lastInsertRowid } = db
    .prepare('INSERT INTO usuarios (nome, email, senha_hash, papel) VALUES (?, ?, ?, ?)')
    .run(nome, email, hash, papel);
  res.status(201).json(publico(db.prepare('SELECT * FROM usuarios WHERE id = ?').get(lastInsertRowid)));
});

/** PATCH /api/usuarios/:id — muda nome/papel e, opcionalmente, a senha. */
usuariosRouter.patch('/:id', (req, res) => {
  const u = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(req.params.id);
  if (!u) return res.status(404).json({ erro: 'Usuário não encontrado.' });

  const nome = req.body.nome !== undefined ? String(req.body.nome).trim() || u.nome : u.nome;
  const papel = req.body.papel !== undefined ? (req.body.papel === 'admin' ? 'admin' : 'comum') : u.papel;

  // Não deixa rebaixar o último administrador.
  if (u.papel === 'admin' && papel !== 'admin' && contarAdmins() <= 1) {
    return res.status(400).json({ erro: 'Não dá para rebaixar o único administrador.' });
  }

  let hash = u.senha_hash;
  if (req.body.senha) {
    if (String(req.body.senha).length < 6) {
      return res.status(400).json({ erro: 'A senha precisa de pelo menos 6 caracteres.' });
    }
    hash = bcrypt.hashSync(String(req.body.senha), 10);
  }

  db.prepare('UPDATE usuarios SET nome = ?, papel = ?, senha_hash = ? WHERE id = ?')
    .run(nome, papel, hash, u.id);
  res.json(publico(db.prepare('SELECT * FROM usuarios WHERE id = ?').get(u.id)));
});

/** DELETE /api/usuarios/:id */
usuariosRouter.delete('/:id', (req, res) => {
  const u = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(req.params.id);
  if (!u) return res.status(404).json({ erro: 'Usuário não encontrado.' });
  if (Number(req.params.id) === req.usuario.id) {
    return res.status(400).json({ erro: 'Você não pode excluir a si mesmo.' });
  }
  if (u.papel === 'admin' && contarAdmins() <= 1) {
    return res.status(400).json({ erro: 'Não dá para excluir o único administrador.' });
  }
  db.prepare('DELETE FROM usuarios WHERE id = ?').run(u.id);
  res.json({ ok: true });
});
