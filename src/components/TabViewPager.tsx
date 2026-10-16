import React, { Suspense, lazy, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { TAB_PANEL_PATHS, tabPanelIndex } from '../utils/tabRoutes';

/** Distância (px) a partir da qual o gesto deixa de ser "toque" e vira arrasto */
const DRAG_LOCK_PX = 8;
/** Fração da largura que precisa ser arrastada para trocar de aba */
const COMMIT_RATIO = 0.25;
/** Velocidade (px/ms) que troca de aba mesmo com arrasto curto (fling) */
const FLING_VELOCITY = 0.45;

interface DragState {
  startX: number;
  startY: number;
  lastX: number;
  lastT: number;
  velocity: number;
  dx: number;
  axis: 'h' | 'v' | null;
  width: number;
}

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

  // ---- Gesto de arrasto (swipe) lateral ------------------------------------
  // O dedo move o trilho diretamente pelo DOM (sem re-render, 60fps). Ao soltar,
  // encaixa na aba vizinha se passou do limiar; senão volta para a atual.
  const navigate = useNavigate();
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  /** Após um arrasto, engole o "click" que o navegador dispara ao soltar */
  const suppressClickRef = useRef(false);

  const setTrackOffset = (px: number | null) => {
    const track = trackRef.current;
    if (!track) return;
    if (px === null) {
      track.style.transition = '';
      track.style.transform = `translateX(-${activeIndex * 100}%)`;
    } else {
      track.style.transition = 'none';
      track.style.transform = `translateX(calc(-${activeIndex * 100}% + ${px}px))`;
    }
  };

  /** Carrosséis horizontais internos (ex.: trilhos de pôsteres) têm prioridade:
      se o toque começou dentro de um deles, o swipe de abas não atua. */
  const insideHorizontalScroller = (start: EventTarget | null): boolean => {
    let el = start as HTMLElement | null;
    while (el && el !== viewportRef.current) {
      if (el.scrollWidth > el.clientWidth + 1) {
        const ox = getComputedStyle(el).overflowX;
        if (ox === 'auto' || ox === 'scroll') return true;
      }
      el = el.parentElement;
    }
    return false;
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.isPrimary) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    // Uma nova pressão não reinicia um arrasto em andamento nem começa durante
    // a animação de troca (evita saltos do trilho)
    if (dragRef.current || pager.leaving !== null) return;
    if (insideHorizontalScroller(e.target)) return;
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastT: e.timeStamp,
      velocity: 0,
      dx: 0,
      axis: null,
      width: viewportRef.current?.clientWidth ?? window.innerWidth,
    };
    suppressClickRef.current = false;
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d) return;
    // Mouse solto fora da tela: o pointerup não chegou aqui, encerra o arrasto
    if (e.pointerType === 'mouse' && e.buttons === 0) {
      finishDrag(true);
      return;
    }
    const totalX = e.clientX - d.startX;
    const totalY = e.clientY - d.startY;
    if (d.axis === null) {
      if (Math.max(Math.abs(totalX), Math.abs(totalY)) < DRAG_LOCK_PX) return;
      d.axis = Math.abs(totalX) > Math.abs(totalY) ? 'h' : 'v';
      if (d.axis === 'h') {
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          /* captura indisponível: segue sem ela */
        }
      }
    }
    // Movimento vertical: é scroll da página, o arrasto lateral é cancelado
    if (d.axis === 'v') {
      dragRef.current = null;
      return;
    }
    suppressClickRef.current = true;
    const dt = Math.max(1, e.timeStamp - d.lastT);
    d.velocity = (e.clientX - d.lastX) / dt;
    d.lastX = e.clientX;
    d.lastT = e.timeStamp;

    // Resistência nas bordas (primeira/última aba): o trilho "puxa" e volta
    const atStart = activeIndex === 0 && totalX > 0;
    const atEnd = activeIndex === PANELS.length - 1 && totalX < 0;
    const dx = atStart || atEnd ? totalX * 0.3 : totalX;
    d.dx = dx;
    setTrackOffset(dx);
  };

  const finishDrag = (cancelled: boolean) => {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d || d.axis !== 'h' || cancelled) {
      if (d?.axis === 'h') {
        setTrackOffset(null);
        // Sem click depois de cancelamento: não deixa a flag engolir o próximo
        window.setTimeout(() => (suppressClickRef.current = false), 0);
      }
      return;
    }
    // Dedo parado antes de soltar não conta como arremesso
    const stillMoving = performance.now() - d.lastT < 80;
    if (!stillMoving) d.velocity = 0;
    // Clique que segue o arrasto é descartado logo depois, mesmo sem click
    window.setTimeout(() => (suppressClickRef.current = false), 0);
    const passed = Math.abs(d.dx) > d.width * COMMIT_RATIO;
    const flung = Math.abs(d.velocity) > FLING_VELOCITY && Math.abs(d.dx) > 24;
    let target = activeIndex;
    if (passed || flung) {
      target = d.dx < 0 ? activeIndex + 1 : activeIndex - 1;
    }
    target = Math.min(PANELS.length - 1, Math.max(0, target));

    // Volta ao transform calculado (com transição CSS) e, se mudou, navega:
    // a rota muda o activeIndex e a transição anima até a nova aba.
    setTrackOffset(null);
    if (target !== activeIndex) {
      // replace: o swipe não empilha histórico (o Voltar sai do app, não percorre abas)
      navigate(TAB_PANEL_PATHS[target], { replace: true });
    }
  };

  // Click que sobrou de um arrasto não deve abrir link/botão embaixo do dedo
  const onClickCapture = (e: React.MouseEvent<HTMLDivElement>) => {
    if (suppressClickRef.current) {
      e.preventDefault();
      e.stopPropagation();
      suppressClickRef.current = false;
    }
  };

  return (
    <div
      ref={viewportRef}
      className="tab-viewport mw-page-in"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={() => finishDrag(false)}
      onPointerCancel={() => finishDrag(true)}
      onClickCapture={onClickCapture}
    >
      <div
        ref={trackRef}
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
