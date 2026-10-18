/**
 * CANAL DE COMANDO do arrasto entre abas principais (mobile).
 *
 * O `TabViewPager` é o dono do gesto: move o trilho do conteúdo, decide se o
 * arrasto troca de aba e publica o progresso em `mw:tab-swipe`
 * (ver src/utils/tabSwipe.ts), de onde o Header tira a posição da barra verde.
 *
 * O que faltava: o gesto só existia na ÁREA DE CONTEÚDO. Encostar o dedo na
 * própria faixa de abas do topo (FILMES / SÉRIES / CRÍTICAS / LISTAS) não movia
 * nada — e no Chrome Android o navegador ainda dispara `pointercancel` no
 * primeiro movimento horizontal ali, matando o arrasto. A barrinha verde ficava
 * "solta", sem acompanhar o dedo.
 *
 * Para não duplicar a lógica de commit/elástico em dois componentes, o Header
 * NÃO interpreta o gesto: só repassa para o pager.
 *   • `claim`  → o pager assume: faz setPointerCapture e passa a receber os
 *                pointermove mesmo quando o dedo sai do viewport.
 *   • `move`   → mesma matemática de arrasto do pager (peek + trilho + barra).
 *   • `finish` → solta/decide exatamente como se o dedo tivesse começado
 *                dentro do conteúdo.
 */

export const TAB_SWIPE_CLAIM_EVENT = 'mw:tab-swipe-claim';
export const TAB_SWIPE_MOVE_EVENT = 'mw:tab-swipe-move';
export const TAB_SWIPE_FINISH_EVENT = 'mw:tab-swipe-finish';

/** O que o pager precisa saber do dedo que encostou na faixa de abas */
export interface TabSwipeClaimDetail {
  pointerId: number;
  clientX: number;
  clientY: number;
  pointerType: string;
  /** Elemento que recebeu o pointerdown — o pager captura o ponteiro nele */
  target: Element | null;
}

/** Evento de movimento do dedo já capturado pelo pager */
export interface TabSwipeMoveDetail {
  pointerId: number;
  clientX: number;
  clientY: number;
  timeStamp: number;
  pointerType: string;
}

/** Fim do gesto capturado (dedo solto ou cancelado pelo navegador) */
export interface TabSwipeFinishDetail {
  cancelled: boolean;
}
