/**
 * Indicador elástico (Elastic / Rubber-band Indicator) das barras de abas.
 *
 * Reproduz o comportamento do app do Letterboxd: ao trocar de aba a barra verde
 * NÃO translada/redimensiona como um bloco rígido. Ela se ESTICA na direção da
 * nova aba (fase 1, ~160ms) e só então a cauda alcança o destino, ENCOLHENDO
 * suavemente (fase 2, ~220ms):
 *
 *   → indo para a direita: a ponta DIREITA avança até o fim da nova aba
 *     (a barra fica esticada), depois a ponta ESQUERDA corre atrás e a largura
 *     volta ao tamanho da coluna.
 *   ← indo para a esquerda: a ponta ESQUERDA pula na frente até o início da
 *     nova aba (barra esticada), depois a ponta DIREITA encolhe até o destino.
 *
 * A transição é escrita no `style` do elemento em cada fase (o CSS do
 * `.tab-indicator` NÃO define transition, senão o bloco rígido voltaria).
 */

export interface IndicatorPos {
  /** translateX atual (offsetLeft da aba ativa) */
  left: number;
  /** largura atual (offsetWidth da aba ativa) */
  width: number;
}

/** Fase 2 em andamento, por elemento — evita duas caudas concorrentes em cliques rápidos */
const phaseTimers = new WeakMap<HTMLElement, number>();

/** Estica até a nova aba (fase 1) — chegada rápida, sem "overshoot" */
const EASE_STRETCH = 'cubic-bezier(0, 0, 0.2, 1)';
/** Cauda alcançando o destino (fase 2) — começa suave (sem o "salto" de arrancada)
    e desacelera no fim, acompanhando o slide do conteúdo */
const EASE_ELASTIC = 'cubic-bezier(0.4, 0, 0.2, 1)';

/** Duração da fase de estiramento antes da cauda entrar (ms) */
const STRETCH_MS = 120;
/** Delay da fase 2 — igual ao STRETCH_MS: a cauda entra quando o estiramento terminou */
const CATCH_UP_DELAY_MS = 120;
/**
 * Quanto a barra ESTICA no meio do arrasto (fração da distância entre abas).
 * Zero nas pontas: em t=0 ela está na aba atual e em t=1 exatamente na vizinha.
 */
const SWIPE_STRETCH = 0.3;

function clearPhaseTimer(indicator: HTMLElement): void {
  const id = phaseTimers.get(indicator);
  if (id !== undefined) {
    clearTimeout(id);
    phaseTimers.delete(indicator);
  }
}

/**
 * Posiciona a barra SEM animação (1º carregamento, resize, rotação de tela,
 * troca de idioma ou troca de breakpoint, quando só as MEDIDAS mudam).
 */
export function placeTabIndicator(
  indicator: HTMLElement,
  left: number,
  width: number,
): void {
  clearPhaseTimer(indicator);
  indicator.style.transition = 'none';
  indicator.style.transform = `translateX(${left}px)`;
  indicator.style.width = `${width}px`;
  // Lê o layout para fixar esta posição como base da PRÓXIMA transição.
  void indicator.offsetWidth;
}

/**
 * Cola a barra no dedo durante um ARRASTO lateral (swipe entre abas).
 *
 * O `TabViewPager` publica o deslocamento do gesto (ver src/utils/tabSwipe.ts) e
 * o Header chama isto a cada frame: a barra é redesenhada na MESMA fração do
 * caminho que o conteúdo percorreu, SEM transição — igual ao trilho, que também
 * é transladado cru pelo dedo. Sem o `transition: none` o CSS ficaria correndo
 * atrás de cada frame e a barra "atrasaria" em relação à tela.
 *
 * RÉGUA DO MOVIMENTO (`progress`): deslocamento do trilho dividido pela largura
 * de UM painel — exatamente o quanto a tela andou rumo à aba vizinha. Medir pela
 * distância entre as abas (1/4 da tela) fazia a barra CHEGAR na aba seguinte com
 * o conteúdo ainda no meio do caminho. Com a régua certa:
 *   • conteúdo no meio → barra no meio (centro exatamente entre as duas abas);
 *   • conteúdo em 100% → barra exatamente sobre a aba vizinha.
 *
 * EFEITO ELÁSTICO DURANTE O GESTO: a barra ESTICA no meio do caminho e relaxa
 * nas pontas (sen²π t — zero em t=0 e t=1). A dilatação é SIMÉTRICA em torno do
 * centro, justamente para o centro nunca sair do lugar certo: é o elástico sendo
 * puxado sem "adiantar" a barra em relação à tela.
 *
 * `prevPos` é atualizado em toda chamada: assim o elástico final parte de onde
 * o dedo parou (sem salto).
 */
export function followTabIndicator(
  indicator: HTMLElement,
  from: IndicatorPos,
  to: IndicatorPos,
  progress: number,
  prevPos: IndicatorPos,
): void {
  const t = progress < 0 ? 0 : progress > 1 ? 1 : progress;

  // Primeiro frame de um gesto (ou indicador recém-montado): não há posição
  // anterior confiável para esticar a partir dela — só ancora.
  if (prevPos.width === 0) {
    placeTabIndicator(indicator, from.left, from.width);
    prevPos.left = from.left;
    prevPos.width = from.width;
    return;
  }

  // Centro exatamente na fração andada pelo conteúdo — regra de ouro.
  const fromCenter = from.left + from.width / 2;
  const toCenter = to.left + to.width / 2;
  const center = fromCenter + (toCenter - fromCenter) * t;

  const naturalWidth = from.width + (to.width - from.width) * t;
  // Estica no MEIO do gesto e relaxa nas pontas (0 → 1 → 0)
  const bulge = Math.sin(Math.PI * t) ** 2;
  const width = naturalWidth + SWIPE_STRETCH * Math.abs(toCenter - fromCenter) * bulge;
  const left = center - width / 2;

  clearPhaseTimer(indicator);
  indicator.style.transition = 'none';
  indicator.style.transform = `translateX(${left}px)`;
  indicator.style.width = `${Math.max(0, width)}px`;
  prevPos.left = left;
  prevPos.width = Math.max(0, width);
}

/**
 * Move a barra até `targetBtn` com o efeito elástico de 2 fases.
 *
 * @param immediate quando true, apenas posiciona (sem estirar) — usado quando
 *                  a mudança vem de medida (resize/idioma) e não de um clique.
 */
export function animateElasticIndicator(
  targetBtn: HTMLElement,
  indicator: HTMLElement,
  prevPos: IndicatorPos,
  immediate = false,
): void {
  const newLeft = targetBtn.offsetLeft;
  const newWidth = targetBtn.offsetWidth;
  const oldLeft = prevPos.left;
  const oldWidth = prevPos.width;

  // Primeiro carregamento (largura 0), elemento recém-montado (sem estilo
  // inline ainda), mesmo destino ou reposicionamento sem animação:
  // apenas posiciona, sem estirar.
  if (immediate || indicator.style.width === '' || oldWidth === 0 || oldLeft === newLeft) {
    placeTabIndicator(indicator, newLeft, newWidth);
    prevPos.left = newLeft;
    prevPos.width = newWidth;
    return;
  }

  // Uma nova animação cancela a cauda pendente da anterior.
  clearPhaseTimer(indicator);

  const movingRight = newLeft > oldLeft;

  if (movingRight) {
    // FASE 1 (estica para a direita): a ponta direita avança até o fim da nova
    // aba enquanto a esquerda ainda não saiu do lugar.
    const stretchedWidth = newLeft + newWidth - oldLeft;
    indicator.style.transition = `width ${STRETCH_MS}ms ${EASE_STRETCH}, transform 0.28s ${EASE_ELASTIC}`;
    indicator.style.transform = `translateX(${oldLeft}px)`;
    indicator.style.width = `${stretchedWidth}px`;

    // FASE 2 (encolhe a cauda): a ponta esquerda corre atrás e a largura
    // ajusta para o tamanho final da coluna.
    phaseTimers.set(
      indicator,
      window.setTimeout(() => {
        phaseTimers.delete(indicator);
        indicator.style.transition = `transform 0.28s ${EASE_ELASTIC}, width 0.28s ${EASE_ELASTIC}`;
        indicator.style.transform = `translateX(${newLeft}px)`;
        indicator.style.width = `${newWidth}px`;
      }, CATCH_UP_DELAY_MS),
    );
  } else {
    // FASE 1 (estica para a esquerda): a ponta esquerda pula na frente até o
    // início da nova aba e a largura cresce cobrindo o espaço.
    const oldRight = oldLeft + oldWidth;
    const stretchedWidth = oldRight - newLeft;
    indicator.style.transition = `transform ${STRETCH_MS}ms ${EASE_STRETCH}, width ${STRETCH_MS}ms ${EASE_STRETCH}`;
    indicator.style.transform = `translateX(${newLeft}px)`;
    indicator.style.width = `${stretchedWidth}px`;

    // FASE 2 (encolhe a cauda direita): só a largura muda.
    phaseTimers.set(
      indicator,
      window.setTimeout(() => {
        phaseTimers.delete(indicator);
        indicator.style.transition = `width 0.28s ${EASE_ELASTIC}`;
        indicator.style.width = `${newWidth}px`;
      }, CATCH_UP_DELAY_MS),
    );
  }

  prevPos.left = newLeft;
  prevPos.width = newWidth;
}
