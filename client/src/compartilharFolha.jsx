import { createRoot } from 'react-dom/client';
import { toBlob } from 'html-to-image';
import FolhaConteudo from './FolhaConteudo.jsx';
import { formatarData } from './regioes.js';

/**
 * Gera a folha da reunião como IMAGEM (PNG) e a envia pelo compartilhamento do
 * aparelho (navigator.share com arquivo) — é assim que dá para mandar imagem
 * para o WhatsApp; o link wa.me só aceita texto. Onde o compartilhamento com
 * arquivo não existir (alguns desktops), baixa a imagem para anexar à mão.
 *
 * @returns {'compartilhado'|'cancelado'|'baixado'}
 */
export async function compartilharFolhaWhatsapp(reuniao) {
  const blob = await gerarImagemFolha(reuniao);
  const nomeArq = `reuniao-${formatarData(reuniao.data).replace(/\//g, '-')}.png`;
  const file = new File([blob], nomeArq, { type: 'image/png' });

  const texto = `${(reuniao.nome || 'Reunião').toUpperCase()} — ${formatarData(reuniao.data)} às ${reuniao.hora}`;

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: reuniao.nome || 'Reunião', text: texto });
      return 'compartilhado';
    } catch (e) {
      if (e?.name === 'AbortError') return 'cancelado';
      // qualquer outra falha do share: cai no download abaixo
    }
  }

  baixar(blob, nomeArq);
  return 'baixado';
}

/** Renderiza a folha num container fora da tela e a captura como PNG. */
async function gerarImagemFolha(reuniao) {
  const holder = document.createElement('div');
  holder.style.cssText =
    'position:fixed;left:-10000px;top:0;width:780px;background:#fff;z-index:-1;';
  document.body.appendChild(holder);

  const root = createRoot(holder);
  root.render(<FolhaConteudo reuniao={reuniao} />);

  try {
    // Espera o React montar e a arte (se houver) carregar antes de capturar.
    await esperar(60);
    const img = holder.querySelector('img.folha-arte');
    if (img && !img.complete) {
      await new Promise((res) => {
        img.onload = res;
        img.onerror = res;
      });
    }
    await esperar(30);

    const alvo = holder.querySelector('.folha');
    const blob = await toBlob(alvo, { pixelRatio: 2, backgroundColor: '#ffffff', cacheBust: true });
    if (!blob) throw new Error('Não consegui gerar a imagem da folha.');
    return blob;
  } finally {
    root.unmount();
    holder.remove();
  }
}

function baixar(blob, nome) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
