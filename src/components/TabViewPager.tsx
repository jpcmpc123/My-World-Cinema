import React, { Suspense, lazy, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { TAB_PANEL_PATHS, tabPanelIndex } from '../utils/tabRoutes';

// ---------------------------------------------------------------------------
// TabViewPager — ESTEIRA HORIZONTAL (ViewPager / Horizontal Slide) do conteúdo
// das abas principais no mobile, igual ao app do Letterboxd: ao trocar de aba o
// painel sai para um lado e o novo entra pelo outro, em vez de piscar com fade.
//
//   .tab-viewport       → esconde o que está fora da tela (overflow: hidden)
//   .tab-slider-track   → trilho flexível que translada (-índice * 100%)
//   .tab-panel          → cada aba, com min-width: 100%
//
// Regras que mantêm o app saudável:
//   • Cada painel é montado na PRIMEIRA visita e nunca é desmontado: voltar para
//     uma aba é instantâneo e não refaz chamadas de API.
//   • Painel fora da tela fica com max-height: 0 (a página tem exatamente a
//     altura da aba ativa, sem sobra de espaço em branco).
//   • O painel que está SAINDO fica expandido durante a animação (para deslizar
//     visível) e só colapsa no fim da transição.
//   • Os chunks das outras abas são pré-carregados ociosamente (só o código,
//     NUNCA as chamadas de API).
// ---------------------------------------------------------------------------

const PANELS: {
  key: string;
  Component: React.LazyExoticComponent<React.FC>;
  preload: () => void;
}[] = [
  {
    key: 'films',
    Component: lazy(() => import('../pages/HomePage').then((m) => ({ default: m.HomePage }))),
    preload: () => void import('../pages/HomePage'),
  },
  {
    key: 'series',
    Component: lazy(() => import('../pages/SeriesHubPage').then((m) => ({ default: m.SeriesHubPage }))),
    preload: () => void import('../pages/SeriesHubPage'),
  },
  {
    key: 'reviews',
    Component: lazy(() => import('../pages/DiaryPage').then((m) => ({ default: m.DiaryPage }))),
    preload: () => void import('../pages/DiaryPage'),
  },
  {
    key: 'lists',
    Component: lazy(() => import('../pages/ListsPage').then((m) => ({ default: m.ListsPage }))),
    preload: () => void import('../pages/ListsPage'),
  },
];

/** Enquanto o chunk da aba carrega (primeira visita) */
function PanelLoader() {
  return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="w-6 h-6 animate-spin text-lb-green" />
    </div>
  );
}

interface PagerState {
  /** Aba visível agora */
  active: number;
  /** Aba que está saindo de cena (durante a animação) */
  leaving: number | null;
  /** Painéis já visitados (continuam montados) */
  mounted: boolean[];
}

export const TabViewPager: React.FC = () => {
  const location = useLocation();
  const activeIndex = Math.max(0, tabPanelIndex(location.pathname));

  // Estado derivado da rota — padrão oficial do React ("ajustar estado quando a
  // prop muda"): o painel que está saindo e o recém-visitado entram no MESMO
  // commit da mudança de rota, então o trilho já translada com os dois painéis
  // visíveis.
  const [pager, setPager] = useState<PagerState>(() => ({
    active: activeIndex,
    leaving: null,
    mounted: PANELS.map((_, i) => i === activeIndex),
  }));

  if (pager.active !== activeIndex) {
    setPager((prev) => ({
      active: activeIndex,
      leaving: prev.active,
      mounted: prev.mounted.map((wasMounted, i) => wasMounted || i === activeIndex),
    }));
  }

  // Troca de aba volta ao topo (mesmo comportamento da barra de perfil de pessoa)
  useLayoutEffect(() => {
    window.scrollTo({ top: 0 });
  }, [activeIndex]);

  // Fim da animação: colapsa o painel que saiu (fallback por tempo, caso o
  // transitionend não venha — ex.: aba trocada por navegação direta).
  useLayoutEffect(() => {
    if (pager.leaving === null) return;
    const id = window.setTimeout(() => {
      setPager((prev) => (prev.leaving === null ? prev : { ...prev, leaving: null }));
    }, 600);
    return () => window.clearTimeout(id);
  }, [pager.leaving, pager.active]);

  // Pré-carrega os chunks das outras abas quando o navegador estiver ocioso
  // (só o código: as chamadas de API continuam acontecendo só ao montar a aba).
  const prefetchedRef = useRef(false);
  useEffect(() => {
    if (prefetchedRef.current) return;
    prefetchedRef.current = true;
    const run = () => PANELS.forEach((panel) => panel.preload());
    const idle = window.requestIdleCallback;
    if (typeof idle === 'function') {
      // { timeout } garante o pré-carregamento mesmo em página ocupada
      const id = idle(run, { timeout: 600 });
      return () => window.cancelIdleCallback?.(id);
    }
    const id = window.setTimeout(run, 1500);
    return () => window.clearTimeout(id);
  }, []);

  const endSlide = () =>
    setPager((prev) => (prev.leaving === null ? prev : { ...prev, leaving: null }));

  return (
    <div className="tab-viewport mw-page-in">
      <div
        className="tab-slider-track"
        style={{ transform: `translateX(-${pager.active * 100}%)` }}
        onTransitionEnd={(e) => {
          if (e.target === e.currentTarget && e.propertyName === 'transform') endSlide();
        }}
      >
        {PANELS.map((panel, i) => {
          const isActive = i === pager.active;
          // O painel que está saindo continua EXPANDIDO durante a animação
          const expanded = isActive || pager.leaving === i;
          return (
            <div
              key={panel.key}
              data-tab={TAB_PANEL_PATHS[i]}
              className={`tab-panel${expanded ? '' : ' tab-panel-collapsed'}`}
              aria-hidden={!isActive}
              inert={!isActive}
            >
              {pager.mounted[i] && (
                <Suspense fallback={<PanelLoader />}>
                  <panel.Component />
                </Suspense>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TabViewPager;
