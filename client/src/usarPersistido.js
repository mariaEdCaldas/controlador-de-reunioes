import { useState, useEffect } from 'react';

/**
 * Como o useState, mas guarda o valor no localStorage e o restaura ao recarregar
 * a página — assim a pessoa continua na mesma tela/aba depois de atualizar.
 * Só para valores simples de navegação (string).
 */
export function usarPersistido(chave, inicial) {
  const [valor, setValor] = useState(() => {
    try {
      return localStorage.getItem(chave) ?? inicial;
    } catch {
      return inicial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(chave, valor);
    } catch {
      /* localStorage indisponível (ex.: modo privado): sem persistência, tudo bem. */
    }
  }, [chave, valor]);

  return [valor, setValor];
}
