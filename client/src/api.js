/**
 * Chamadas à API. Sempre em caminho relativo (/api/...): o Vite redireciona
 * para o backend na 3001 (ver vite.config.js), então o endereço do servidor
 * não fica espalhado pelo código.
 */

class ErroApi extends Error {
  constructor(mensagem, { campos } = {}) {
    super(mensagem);
    // Erros de validação por campo, no formato { nome: "...", telefone: "..." }.
    this.campos = campos ?? {};
  }
}

async function pedir(url, opcoes = {}) {
  let resposta;
  try {
    resposta = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...opcoes,
    });
  } catch {
    throw new ErroApi('Sem conexão com o servidor. Ele está rodando?');
  }

  const corpo = await resposta.json().catch(() => ({}));

  if (!resposta.ok) {
    throw new ErroApi(corpo.erro ?? `Erro ${resposta.status}.`, {
      campos: corpo.campos,
    });
  }

  return corpo;
}

export const listarRegioes = () => pedir('/api/regioes');

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

export { ErroApi };
