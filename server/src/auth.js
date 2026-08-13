import jwt from 'jsonwebtoken';

/**
 * Segredo para assinar os tokens de login. Em produção DEVE vir de variável de
 * ambiente (JWT_SEGREDO); o padrão só serve para o ambiente local.
 */
export const JWT_SEGREDO = process.env.JWT_SEGREDO || 'dev-segredo-troque-em-producao';

/** Gera o token JWT (válido por 30 dias) com os dados públicos do usuário. */
export function gerarToken(usuario) {
  return jwt.sign(
    { id: usuario.id, nome: usuario.nome, email: usuario.email, papel: usuario.papel },
    JWT_SEGREDO,
    { expiresIn: '30d' }
  );
}

/** Middleware: exige um token válido no cabeçalho Authorization: Bearer <token>. */
export function exigirLogin(req, res, next) {
  const cabecalho = req.headers.authorization || '';
  const token = cabecalho.startsWith('Bearer ') ? cabecalho.slice(7) : null;
  if (!token) return res.status(401).json({ erro: 'Faça login para continuar.' });
  try {
    req.usuario = jwt.verify(token, JWT_SEGREDO);
    next();
  } catch {
    return res.status(401).json({ erro: 'Sessão expirada. Entre novamente.' });
  }
}

/** Middleware: exige que o usuário logado seja administrador. */
export function exigirAdmin(req, res, next) {
  if (req.usuario?.papel !== 'admin') {
    return res.status(403).json({ erro: 'Só administradores podem fazer isso.' });
  }
  next();
}
