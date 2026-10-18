/**
 * Barramento do ARRASTO entre abas (swipe lateral) no mobile.
 *
 * O conteúdo das abas é movido pelo TabViewPager (o dedo translada o trilho
 * direto no DOM, 60fps, sem re-render). A barra verde, porém, vive no Header —
 * outro componente, fora da árvore do pager.
 *
 * Sem este canal, o gesto ficava "quebrado ao meio": o conteúdo acompanhava o
 * dedo e a barrinha verde só se mexia DEPOIS de soltar (quando a rota mudava).
 * Aqui o pager publica o deslocamento do dedo a cada frame e o Header desenha a
 * barra na MESMA posição do conteúdo — os dois deslizam juntos, como no app do
 * Letterboxd. Ao soltar, o Header assume de novo e aplica o efeito elástico.
 */

/** Nome do CustomEvent trocado entre TabViewPager (emissor) e Header (ouvinte) */
export const TAB_SWIPE_EVENT = 'mw:tab-swipe';

export interface TabSwipeDetail {
  /** Deslocamento horizontal do dedo/trilho em px (negativo = esquerda) */
  shift: number;
  /**
   * Largura de UM painel de conteúdo (= largura do viewport). É a régua do
   * gesto: o conteúdo só troca de aba quando o trilho anda essa distância
   * inteira. O indicador usa a MESMA régua, senão ele chega na aba vizinha com
   * a tela ainda no meio do caminho (ver followTabIndicator).
   */
  width: number;
  /** true quando o dedo soltou (último evento do gesto) */
  end: boolean;
  /**
   * No evento final: true quando o arrasto vai TROCAR de aba. Nesse caso o
   * Header não devolve a barra para a aba antiga — deixa o efeito elástico da
   * troca de rota assumir a partir de onde o dedo parou.
   */
  committed: boolean;
}

/** Publica o estado do arrasto para quem desenha a barra (Header). */
export function emitTabSwipe(detail: TabSwipeDetail): void {
  window.dispatchEvent(new CustomEvent<TabSwipeDetail>(TAB_SWIPE_EVENT, { detail }));
}
