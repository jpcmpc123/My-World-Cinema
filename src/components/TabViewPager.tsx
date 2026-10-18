import React, { Suspense, lazy, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { TAB_PANEL_PATHS, tabPanelIndex } from '../utils/tabRoutes';
import { emitTabSwipe } from '../utils/tabSwipe';
import {
  TAB_SWIPE_CLAIM_EVENT,
  TAB_SWIPE_FINISH_EVENT,
  TAB_SWIPE_MOVE_EVENT,
  type TabSwipeClaimDetail,
  type TabSwipeFinishDetail,
  type TabSwipeMoveDetail,
} from '../utils/tabSwipeCommand';

/** Distância (px) a partir da qual o gesto deixa de ser "toque" e vira arrasto */
const DRAG_LOCK_PX = 8;
/**
 * Fração da largura de UM painel que o dedo precisa percorrer para a troca de
 * aba "pegar". Era 0.25 (um quarto da tela): o dedo andava pouco, a aba já virava
 * — e o trilho ainda tinha 3/4 de caminho para animar DEPOIS de soltar, o que
 * dava a sensação de "ele foi, voltou e só então trocou".
 * Agora o gesto só CONCRETIZA bem no fim: quase o painel inteiro.
 */
const COMMIT_RATIO = 0.6;
/**
 * Velocidade (px/ms) que troca de aba mesmo com arrasto curto (arremesso/fling).
 * Era 0.45 (~450px/s) e um "tapa" leve já trocava de aba. Agora exige um
 * arremesso decidido (~1200px/s).
 */
const FLING_VELOCITY = 1.2;
/**
 * Fling também exige DISTÂNCIA: sem isto um toque rápido e curtíssimo (20px em
 * 10ms = 2px/ms) trocaria de aba — o oposto do comportamento pedido.
 */
const FLING_MIN_PX = 0.4;

interface DragState {
  startX: number;
  startY: number;
  lastX: number;
  lastT: number;
  velocity: number;
  dx: number;
  axis: 'h' | 'v' | null;
  width: number;
  /** true depois que o arrasto lateral publicou o 1o evento para o Header */
  swipeEmitted: boolean;
  /** true quando o dedo encostou na FAIXA DE ABAS (gesto repassado) */
  fromBar: boolean;
  /** pointerId do gesto (para soltar a captura no fim) */
  pointerId: number | null;
  pointerType: string;
  /** Como capturar o ponteiro quando o arrasto se revela horizontal */
  attachCapture?: (pointerId: number | null) => void;
  /** Como liberar a captura no fim do gesto */
  releaseCapture?: (pointerId: number | null) => void;
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

  // Aba VIZINHA revelada pelo arrasto em andamento (null = nenhuma). O painel
  // fora da tela vive colapsado (.tab-panel-collapsed: max-height 0 + hidden) e
  // as abas nunca visitadas nem são montadas — sem isto o dedo puxa o trilho e
  // revela uma faixa PRETA em vez do conteúdo da aba ao lado.
  const [peek, setPeek] = useState<number | null>(null);

  /** Monta e EXPANDE a aba vizinha na direção do arrasto, para ela entrar
      visível pela lateral junto com o dedo. */
  const peekNeighbor = (dir: 1 | -1) => {
    const neighbor = activeIndex + dir;
    // Borda (primeira/última aba): não existe vizinha para revelar
    if (neighbor < 0 || neighbor >= PANELS.length) {
      setPeek(null);
      return;
    }
    setPeek((prev) => (prev === neighbor ? prev : neighbor));
    setPager((prev) =>
      prev.mounted[neighbor]
        ? prev
        : { ...prev, mounted: prev.mounted.map((wasMounted, i) => wasMounted || i === neighbor) },
    );
  };

  // Troca de aba volta ao topo (mesmo comportamento da barra de perfil de pessoa)
  useLayoutEffect(() => {
    window.scrollTo({ top: 0 });
  }, [activeIndex]);

  // A aba revelada pelo arrasto virou a ativa: a marca de "vizinha" já cumpriu
  // sua função. Limpar aqui (e não no pointerup) evita colapsar o painel por um
  // frame entre o fim do gesto e a troca de rota.
  useLayoutEffect(() => {
    setPeek(null);
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

  /**
   * Escreve o transform do trilho. `overrideIndex` existe para o momento da
   * TROCA de aba: a rota ainda não mudou, então precisamos escrever a posição do
   * DESTINO antes de navegar (é o que elimina o pulo para trás — ver finishDrag).
   */
  const setTrackOffset = (px: number | null, overrideIndex?: number) => {
    const track = trackRef.current;
    if (!track) return;
    const index = overrideIndex ?? activeIndex;
    if (px === null) {
      track.style.transition = '';
      track.style.transform = `translateX(-${index * 100}%)`;
    } else {
      track.style.transition = 'none';
      track.style.transform = `translateX(calc(-${index * 100}% + ${px}px))`;
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

  // Inicia o rastreamento do gesto. `fromBar` = o dedo encostou na FAIXA DE
  // ABAS (o pointerdown veio do Header por TAB_SWIPE_CLAIM_EVENT): nesse caso o
  // pager assume o ponteiro e passa a receber os moves, mesmo fora do viewport.
  const beginDrag = (
    x: number,
    y: number,
    timeStamp: number,
    pointerType: string,
    fromBar: boolean,
  ) => {
    // Uma nova pressão não reinicia um arrasto em andamento nem começa durante
    // a animação de troca (evita saltos do trilho)
    if (dragRef.current || (fromBar && pager.leaving !== null)) return;
    dragRef.current = {
      startX: x,
      startY: y,
      lastX: x,
      lastT: timeStamp,
      velocity: 0,
      dx: 0,
      axis: null,
      width: viewportRef.current?.clientWidth ?? window.innerWidth,
      swipeEmitted: false,
      fromBar,
      pointerId: null,
      pointerType,
    };
    suppressClickRef.current = false;
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.isPrimary) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (insideHorizontalScroller(e.target)) return;
    beginDrag(e.clientX, e.clientY, e.timeStamp, e.pointerType, false);
  };

  /** Corpo do arrasto, compartilhado pelos eventos locais e pelos repassados
      pelo Header (gesto que começou na faixa de abas). */
  const applyDragMove = (
    clientX: number,
    clientY: number,
    timeStamp: number,
    pointerType: string,
    buttons: number,
  ) => {
    const d = dragRef.current;
    if (!d) return;
    // Mouse solto fora da tela: o pointerup não chegou aqui, encerra o arrasto
    if (pointerType === 'mouse' && buttons === 0) {
      finishDrag(true);
      return;
    }
    const totalX = clientX - d.startX;
    const totalY = clientY - d.startY;
    if (d.axis === null) {
      if (Math.max(Math.abs(totalX), Math.abs(totalY)) < DRAG_LOCK_PX) return;
      d.axis = Math.abs(totalX) > Math.abs(totalY) ? 'h' : 'v';
      if (d.axis === 'h') {
        try {
          // Um gesto VERTICAL na faixa de abas pertence ao navegador (rolar
          // não cancela o ponteiro): só travamos a direção depois de saber que
          // o arrasto é horizontal. Assim que sabemos, o pager assume o
          // ponteiro — era a falta disto que fazia o Chrome disparar
          // pointercancel e matar o swipe.
          if (d.attachCapture) d.attachCapture(d.pointerId);
        } catch {
          /* captura indisponível: segue sem ela */
        }
      }
    }
    // Movimento vertical: é scroll da página, o arrasto lateral é cancelado
    if (d.axis === 'v') {
      dragRef.current = null;
      setPeek(null);
      return;
    }
    // Arrasto lateral: revela (monta + expande) a aba que está entrando.
    // Arrastar para a direita traz a aba ANTERIOR; para a esquerda, a SEGUINTE.
    peekNeighbor(totalX > 0 ? -1 : 1);
    suppressClickRef.current = true;
    const dt = Math.max(1, timeStamp - d.lastT);
    d.velocity = (clientX - d.lastX) / dt;
    d.lastX = clientX;
    d.lastT = timeStamp;

    // Resistência nas bordas (primeira/última aba): o trilho "puxa" e volta
    const atStart = activeIndex === 0 && totalX > 0;
    const atEnd = activeIndex === PANELS.length - 1 && totalX < 0;
    const dx = atStart || atEnd ? totalX * 0.3 : totalX;
    d.dx = dx;
    setTrackOffset(dx);
    // A barra verde (no Header) acompanha o MESMO deslocamento do dedo:
    // conteúdo e indicador deslizam juntos durante o gesto.
    d.swipeEmitted = true;
    emitTabSwipe({ shift: dx, width: d.width, end: false, committed: false });
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    applyDragMove(e.clientX, e.clientY, e.timeStamp, e.pointerType, e.buttons);
  };

  const finishDrag = (cancelled: boolean) => {
    const d = dragRef.current;
    dragRef.current = null;
    // Avisa o Header que o gesto terminou. `committed` só é true quando o
    // arrasto realmente troca de aba: nesse caso a barra fica onde o dedo
    // parou e o elástico da troca de rota continua dali. Caso contrário o
    // Header devolve a barra para a aba atual com o elástico.
    const notifyEnd = (committed: boolean) => {
      if (d?.axis === 'h' && d.swipeEmitted) emitTabSwipe({ shift: d.dx, width: d.width, end: true, committed });
    };
    // Um gesto repassado pelo Header capturou o ponteiro: solta antes de sair.
    const releaseCapture = () => {
      if (d?.fromBar && d.releaseCapture) {
        try {
          d.releaseCapture(d.pointerId);
        } catch {
          /* captura já liberada */
        }
      }
    };
    if (!d || d.axis !== 'h' || cancelled) {
      releaseCapture();
      setPeek(null);
      if (d?.axis === 'h') {
        setTrackOffset(null);
        notifyEnd(false);
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
    const flung =
      Math.abs(d.velocity) > FLING_VELOCITY && Math.abs(d.dx) > d.width * FLING_MIN_PX;
    let target = activeIndex;
    if (passed || flung) {
      target = d.dx < 0 ? activeIndex + 1 : activeIndex - 1;
    }
    target = Math.min(PANELS.length - 1, Math.max(0, target));

    releaseCapture();
    notifyEnd(target !== activeIndex);

    if (target !== activeIndex) {
      // ---------------------------------------------------------------------
      // TROCOU DE ABA — nada de voltar para a aba atual!
      //
      // Antes daqui saía um `setTrackOffset(null)`: ele reescrevia o transform
      // para `translateX(-abaAtual * 100%)` com a transition CSS de 0.32s
      // LIGADA e só depois vinha o `navigate`. Como o navigate do react-router
      // v7 é uma startTransition (a rota muda um frame depois), a transition
      // chegava a ANDAR na direção contrária por um frame — era exatamente o
      // "vai um pouco para trás e só depois vai para a outra página" relatado.
      //
      // Correção: fixar o trilho JÁ na posição do destino, SEM animação
      // (`transition: none`), antes de navegar. A rota troca no mesmo frame e o
      // trilho nunca anda para trás. O movimento do dedo até aqui já foi o
      // próprio slide; o que resta é encaixar a sobra.
      // ---------------------------------------------------------------------
      setTrackOffset(null, target);
      // A sobra (destino do dedo → posição exata da aba) é fechada com o mesmo
      // encaixe suave que as abas já usam ao entrar, para o painel novo não
      // "aparecer seco" quando o dedo parou no meio do caminho. Se o dedo já
      // chegou no fim, o delta é ~0 e nada se move (nenhum retrocesso possível).
      const residual = target > activeIndex ? d.width + d.dx : d.dx - d.width;
      if (Math.abs(residual) > 0.5) {
        const track = trackRef.current;
        if (track) {
          track.style.transform = `translateX(calc(-${target * 100}% + ${residual}px))`;
          void track.offsetWidth; // fixa o ponto de partida (com transition: none)
          track.style.transition = '';
          track.style.transform = `translateX(-${target * 100}%)`;
        }
      }
      // replace: o swipe não empilha histórico (o Voltar sai do app, não percorre abas)
      navigate(TAB_PANEL_PATHS[target], { replace: true });
      // A aba revelada passa a ser a ativa logo abaixo; `peek` é limpo no efeito
      // que observa a troca de rota (limpar aqui colapsaria o painel por 1 frame).
    } else {
      // Não trocou: o trilho volta suavemente (transition CSS) para a aba atual.
      setTrackOffset(null);
      // Sem troca de aba: a vizinha revelada volta a ficar colapsada
      setPeek(null);
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

  // Ref com a versão MAIS RECENTE dos handlers. Os listeners de janela (abaixo)
  // são registrados uma vez só, mas precisam enxergar o `activeIndex` e o
  // `pager.leaving` do render atual. A sincronização é feita num efeito (e não
  // durante o render): efeitos rodam na ordem de declaração, então este aqui
  // sempre roda antes do efeito que registra os listeners.
  const handlersRef = useRef({ beginDrag, applyDragMove, finishDrag });
  useEffect(() => {
    handlersRef.current = { beginDrag, applyDragMove, finishDrag };
  });

  // ---------------------------------------------------------------------------
  // Gesto que COMEÇA NA FAIXA DE ABAS (topo). O Header repassa o pointerdown
  // daqui para cá: o pager assume o ponteiro (setPointerCapture) no primeiro
  // movimento realmente horizontal, o que impede o Chrome de cancelar o gesto —
  // e passa a mover o trilho E a barrinha verde juntos, inclusive quando o dedo
  // arrasta por cima da própria barra.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const onClaim = (event: Event) => {
      const detail = (event as CustomEvent<TabSwipeClaimDetail>).detail;
      if (!detail) return;
      handlersRef.current.beginDrag(
        detail.clientX,
        detail.clientY,
        performance.now(),
        detail.pointerType,
        true,
      );
      const d = dragRef.current;
      if (!d) return;
      d.pointerId = detail.pointerId;
      // A captura usa o elemento do PRÓPRIO Header (o alvo do pointerdown):
      // setPointerCapture só vale em quem já recebeu aquele ponteiro.
      const target = detail.target as HTMLElement | null;
      d.attachCapture = (pointerId) => {
        if (target && pointerId !== null) target.setPointerCapture(pointerId);
      };
      d.releaseCapture = (pointerId) => {
        if (target && pointerId !== null && target.hasPointerCapture?.(pointerId)) {
          target.releasePointerCapture(pointerId);
        }
      };
    };

    const onMove = (event: Event) => {
      const detail = (event as CustomEvent<TabSwipeMoveDetail>).detail;
      const d = dragRef.current;
      if (!detail || !d || d.pointerId !== detail.pointerId) return;
      handlersRef.current.applyDragMove(
        detail.clientX,
        detail.clientY,
        detail.timeStamp,
        detail.pointerType,
        1,
      );
    };

    const onFinish = (event: Event) => {
      const detail = (event as CustomEvent<TabSwipeFinishDetail>).detail;
      if (!dragRef.current) return;
      handlersRef.current.finishDrag(!!detail?.cancelled);
    };

    window.addEventListener(TAB_SWIPE_CLAIM_EVENT, onClaim);
    window.addEventListener(TAB_SWIPE_MOVE_EVENT, onMove);
    window.addEventListener(TAB_SWIPE_FINISH_EVENT, onFinish);
    return () => {
      window.removeEventListener(TAB_SWIPE_CLAIM_EVENT, onClaim);
      window.removeEventListener(TAB_SWIPE_MOVE_EVENT, onMove);
      window.removeEventListener(TAB_SWIPE_FINISH_EVENT, onFinish);
    };
  }, []);

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
          // O painel que está saindo continua EXPANDIDO durante a animação, e a
          // aba vizinha revelada pelo arrasto (peek) também: só assim o conteúdo
          // dela entra pela lateral em vez de deixar a faixa preta.
          const expanded = isActive || pager.leaving === i || peek === i;
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
