/**
 * Chamadas à API. Sempre em caminho relativo (/api/...): o Vite redireciona
 * para o backend na 3001 (ver vite.config.js), então o endereço do servidor
 * não fica espalhado pelo código.
 */

import { getToken, deslogar } from './auth.js';

class ErroApi extends Error {
  constructor(mensagem, { campos } = {}) {
    super(mensagem);
    // Erros de validação por campo, no formato { nome: "...", telefone: "..." }.
    this.campos = campos ?? {};
  }
}

async function pedir(url, opcoes = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opcoes.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let resposta;
  try {
    resposta = await fetch(url, { ...opcoes, headers });
  } catch {
    throw new ErroApi('Sem conexão com o servidor. Ele está rodando?');
  }

  const corpo = await resposta.json().catch(() => ({}));

  if (!resposta.ok) {
    // Sessão inválida/expirada: derruba para a tela de login (menos nas próprias
    // rotas de login, para não mascarar "e-mail ou senha incorretos").
    if (resposta.status === 401 && !url.includes('/api/auth/')) deslogar();
    throw new ErroApi(corpo.erro ?? `Erro ${resposta.status}.`, {
      campos: corpo.campos,
    });
  }

  return corpo;
}

// ---------- autenticação e usuários ----------

export const authEstado = () => pedir('/api/auth/estado');

export const authBootstrap = (dados) =>
  pedir('/api/auth/bootstrap', { method: 'POST', body: JSON.stringify(dados) });

export const authLogin = (dados) =>
  pedir('/api/auth/login', { method: 'POST', body: JSON.stringify(dados) });

export const authEu = () => pedir('/api/auth/eu');

export const listarUsuarios = () => pedir('/api/usuarios');

export const criarUsuario = (dados) =>
  pedir('/api/usuarios', { method: 'POST', body: JSON.stringify(dados) });

export const editarUsuario = (id, dados) =>
  pedir(`/api/usuarios/${id}`, { method: 'PATCH', body: JSON.stringify(dados) });

export const excluirUsuario = (id) =>
  pedir(`/api/usuarios/${id}`, { method: 'DELETE' });

export const listarRegioes = () => pedir('/api/regioes');

// Cria (ou reaproveita) um bairro/região pelo nome — usado quando se digita um
// bairro novo no cadastro da reunião.
export const criarRegiao = (nome) =>
  pedir('/api/regioes', { method: 'POST', body: JSON.stringify({ nome }) });

export const listarPalestrantes = ({ regiaoId } = {}) => {
  const params = new URLSearchParams();
  if (regiaoId) params.set('regiao_id', regiaoId);
  const qs = params.toString();
  return pedir(`/api/palestrantes${qs ? `?${qs}` : ''}`);
};

export const criarPalestrante = (dados) =>
  pedir('/api/palestrantes', { method: 'POST', body: JSON.stringify(dados) });

export const editarPalestrante = (id, dados) =>
  pedir(`/api/palestrantes/${id}`, { method: 'PUT', body: JSON.stringify(dados) });

export const mudarStatusPalestrante = (id, ativo) =>
  pedir(`/api/palestrantes/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ ativo }),
  });

// ---------- reuniões ----------

export const listarReunioes = ({ status } = {}) =>
  pedir(`/api/reunioes${status ? `?status=${status}` : ''}`);

export const criarReuniao = (dados) =>
  pedir('/api/reunioes', { method: 'POST', body: JSON.stringify(dados) });

export const editarReuniao = (id, dados) =>
  pedir(`/api/reunioes/${id}`, { method: 'PATCH', body: JSON.stringify(dados) });

export const excluirReuniao = (id) =>
  pedir(`/api/reunioes/${id}`, { method: 'DELETE' });

export const buscarSugestoes = (id) => pedir(`/api/reunioes/${id}/sugestoes`);

export const definirTitular = (id, palestranteId) =>
  pedir(`/api/reunioes/${id}/titular`, {
    method: 'PATCH',
    body: JSON.stringify({ palestrante_id: palestranteId }),
  });

export const definirReserva = (id, palestranteId) =>
  pedir(`/api/reunioes/${id}/reserva`, {
    method: 'PATCH',
    body: JSON.stringify({ palestrante_id: palestranteId }),
  });

export const salvarChecklist = (id, { som, cadeiras }) =>
  pedir(`/api/reunioes/${id}/checklist`, {
    method: 'PATCH',
    body: JSON.stringify({ som, cadeiras }),
  });

export const marcarRealizada = (id, presentes) =>
  pedir(`/api/reunioes/${id}/realizada`, {
    method: 'PATCH',
    body: JSON.stringify({ presentes }),
  });

// ---------- times ----------

export const listarTimes = () => pedir('/api/times');

export const buscarTime = (id) => pedir(`/api/times/${id}`);

export const criarTime = (nome) =>
  pedir('/api/times', { method: 'POST', body: JSON.stringify({ nome }) });

export const renomearTime = (id, nome) =>
  pedir(`/api/times/${id}`, { method: 'PATCH', body: JSON.stringify({ nome }) });

export const excluirTime = (id) =>
  pedir(`/api/times/${id}`, { method: 'DELETE' });

// ---------- coordenadores ----------

export const listarCoordenadores = ({ timeId, semTime } = {}) => {
  const params = new URLSearchParams();
  if (semTime) params.set('sem_time', '1');
  else if (timeId) params.set('time_id', timeId);
  const qs = params.toString();
  return pedir(`/api/coordenadores${qs ? `?${qs}` : ''}`);
};

export const criarCoordenador = (dados) =>
  pedir('/api/coordenadores', { method: 'POST', body: JSON.stringify(dados) });

export const editarCoordenador = (id, dados) =>
  pedir(`/api/coordenadores/${id}`, { method: 'PATCH', body: JSON.stringify(dados) });

export const vincularCoordenador = (id, timeId) =>
  pedir(`/api/coordenadores/${id}/time`, {
    method: 'PATCH',
    body: JSON.stringify({ time_id: timeId }),
  });

export const excluirCoordenador = (id) =>
  pedir(`/api/coordenadores/${id}`, { method: 'DELETE' });

// Importação de planilha: envia o arquivo cru; recebe a prévia (sem gravar).
export const importarPreviaPlanilha = async (file) => {
  const buffer = await file.arrayBuffer();
  return pedir(
    `/api/coordenadores/importar/previa?arquivo=${encodeURIComponent(file.name)}`,
    { method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: buffer }
  );
};

export const importarConfirmarPlanilha = (linhas) =>
  pedir('/api/coordenadores/importar/confirmar', {
    method: 'POST',
    body: JSON.stringify({ linhas }),
  });

// ---------- propostas de reunião ----------

export const listarPropostas = () => pedir('/api/propostas');

export const criarProposta = (dados) =>
  pedir('/api/propostas', { method: 'POST', body: JSON.stringify(dados) });

export const mudarStatusProposta = (id, status) =>
  pedir(`/api/propostas/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });

export const excluirProposta = (id) =>
  pedir(`/api/propostas/${id}`, { method: 'DELETE' });

// ---------- cabos ----------

export const listarCabos = ({ coordenadorId, timeId, semCoordenador } = {}) => {
  const params = new URLSearchParams();
  if (semCoordenador) params.set('sem_coordenador', '1');
  else if (coordenadorId) params.set('coordenador_id', coordenadorId);
  else if (timeId) params.set('time_id', timeId);
  const qs = params.toString();
  return pedir(`/api/cabos${qs ? `?${qs}` : ''}`);
};

export const criarCabo = (dados) =>
  pedir('/api/cabos', { method: 'POST', body: JSON.stringify(dados) });

export const editarCabo = (id, dados) =>
  pedir(`/api/cabos/${id}`, { method: 'PATCH', body: JSON.stringify(dados) });

export const vincularCabo = (id, coordenadorId) =>
  pedir(`/api/cabos/${id}/coordenador`, {
    method: 'PATCH',
    body: JSON.stringify({ coordenador_id: coordenadorId }),
  });

export const excluirCabo = (id) =>
  pedir(`/api/cabos/${id}`, { method: 'DELETE' });

export const importarPreviaCabos = async (file) => {
  const buffer = await file.arrayBuffer();
  return pedir(
    `/api/cabos/importar/previa?arquivo=${encodeURIComponent(file.name)}`,
    { method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: buffer }
  );
};

export const importarConfirmarCabos = (linhas) =>
  pedir('/api/cabos/importar/confirmar', {
    method: 'POST',
    body: JSON.stringify({ linhas }),
  });

// ---------- lembretes ----------

export const previaLembretes = () => pedir('/api/lembretes/previa');

export const enviarLembretes = ({ forcar = false } = {}) =>
  pedir('/api/lembretes/enviar', { method: 'POST', body: JSON.stringify({ forcar }) });

export { ErroApi };
