/**
 * Rotas que exibem a barra de abas principal no mobile
 * (FILMES / SÉRIES / CRÍTICAS / LISTAS).
 *
 * Fonte única da verdade: usada pelo Header (que desenha a faixa de abas) e
 * pelo App (que escolhe a animação de entrada do conteúdo da aba), para que os
 * dois nunca saiam de sincronia.
 */
const MAIN_TAB_ROUTE = /^\/(films|series|tv|lists?|reviews)?\/?$/;

export function isMainTabRoute(pathname: string): boolean {
  return MAIN_TAB_ROUTE.test(pathname);
}

/**
 * Ordem canônica das abas na ESTEIRA horizontal (ViewPager) do app mobile.
 * O índice é a posição do painel no trilho: translateX(-índice * 100%).
 * Precisa estar na MESMA ordem da faixa de abas do Header
 * (FILMES → SÉRIES → CRÍTICAS → LISTAS), senão o conteúdo desliza para o lado
 * errado em relação ao dedo/clique.
 */
export const TAB_PANEL_PATHS = ['/', '/series', '/reviews', '/lists'] as const;

/** Índice da aba na esteira (-1 = a rota atual não é uma aba do ViewPager). */
export function tabPanelIndex(pathname: string): number {
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return TAB_PANEL_PATHS.indexOf(normalized as (typeof TAB_PANEL_PATHS)[number]);
}
