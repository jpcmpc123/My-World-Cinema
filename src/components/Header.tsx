import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Search, Plus, User, BookOpen, Clock, List, X, ChevronDown, Zap, Menu, LogOut, Settings, MoreVertical, Globe, Check } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { tmdb, type TMDBMovie } from '../services/tmdb';
import {
  animateElasticIndicator,
  followTabIndicator,
  placeTabIndicator,
  type IndicatorPos,
} from '../utils/tabIndicator';
import { isMainTabRoute } from '../utils/tabRoutes';
import { TAB_SWIPE_EVENT, type TabSwipeDetail } from '../utils/tabSwipe';
import {
  TAB_SWIPE_CLAIM_EVENT,
  TAB_SWIPE_FINISH_EVENT,
  TAB_SWIPE_MOVE_EVENT,
  type TabSwipeClaimDetail,
  type TabSwipeFinishDetail,
  type TabSwipeMoveDetail,
} from '../utils/tabSwipeCommand';

export const Header: React.FC = () => {
  const { user, openLogModal } = useApp();
  const { isAuthenticated, profile, signOut } = useAuth();
  const { language, toggleLanguage, t } = useLanguage();

  // Authenticated profile takes precedence over the local/fake user
  const displayUsername = isAuthenticated && profile ? profile.username : user.username;
  const displayDisplayName = isAuthenticated && profile?.display_name ? profile.display_name : user.displayName;
  const displayAvatar = (isAuthenticated && profile?.avatar_url) ? profile.avatar_url : user.avatarUrl;
  const navigate = useNavigate();
  const location = useLocation();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TMDBMovie[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Barra de abas principal (FILMES / SÉRIES / CRÍTICAS / LISTAS): container +
  // elemento da barra verde deslizante (mesma anatomia do perfil de pessoa).
  const tabsContainerRef = useRef<HTMLElement | null>(null);
  const indicatorRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
        if (!searchQuery) setIsSearchExpanded(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [searchQuery]);

  useEffect(() => {
    setIsSearchOpen(false);
    setIsUserMenuOpen(false);
    setIsSearchExpanded(false);
    setIsMenuOpen(false);
    setSearchQuery('');
  }, [location.pathname]);

  // Live Typeahead search
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await tmdb.searchMovies(searchQuery.trim(), 1);
        setSearchResults(res.results.slice(0, 6));
        setIsSearchOpen(true);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleMovieSelect = (id: number) => {
    setIsSearchOpen(false);
    setSearchQuery('');
    navigate(`/film/${id}`);
  };

  /**
   * Submissão da busca (Enter no input, clique na lupa ou "Ver todos os
   * resultados"): fecha o dropdown rápido e abre a PÁGINA de resultados
   * (/search?q=…) — sem sair do tema nem quebrar o header.
   */
  const submitSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    const q = searchQuery.trim() || searchParam.trim();
    setIsSearchOpen(false);
    setIsSearching(false);
    setSearchResults([]);
    if (!q) {
      navigate('/search');
      return;
    }
    navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  // Páginas de detalhe (filme/série): navbar flutua transparente por cima do backdrop
  const overBackdrop = /^\/(film|tv)\/\d+/.test(location.pathname);

  // Mobile (<768px): páginas principais exibem título centrado + faixa de 4 abas
  const path = location.pathname;
  const isMainPage = !overBackdrop && isMainTabRoute(path);
  // Tela de busca: no mobile o campo ocupa a faixa preta do topo (em vez do título/sign in)
  const isSearchRoute = path === '/search';
  // Telas do BROWSE BY (cascata/resultados): no mobile têm header próprio
  // (preto, com ← voltar) — esconde a barra global "MyWorld" para não duplicar.
  const isBrowseRoute = path.startsWith('/browse');
  // Perfil de PESSOA (/actor/:id): no mobile tem Top App Bar própria
  // (← + nome + abas de função) — a barra global some só no mobile.
  const isActorRoute = /^\/actor\/\d+/.test(path);
  // Configurações (mobile): a tela "Profile Settings" tem o próprio cabeçalho (✕ / ✓),
  // então a barra global com "MyWorld" some só no mobile.
  const isSettingsRoute = path === '/settings';

  // Área de perfil (mobile): barra própria com ⚙ + usuário + abas
  const segs = path.split('/').filter(Boolean);
  const isProfileArea =
    !overBackdrop &&
    !isSearchRoute &&
    ((segs.length === 1 &&
      !isMainPage &&
      !['settings', 'signin', 'signup', 'list'].includes(segs[0])) ||
      (segs.length === 2 &&
        ['diary', 'lists', 'watchlist'].includes(segs[1]) &&
        !['film', 'tv', 'actor', 'list', 'browse', 'films', 'series'].includes(segs[0])));
  // Rotas globais (/profile, /diary, /watchlist) apontam para o usuário logado
  const profileAreaUser =
    segs.length >= 1 && !['profile', 'diary', 'watchlist'].includes(segs[0])
      ? decodeURIComponent(segs[0])
      : displayUsername;
  const profileTab: 'profile' | 'diary' | 'lists' | 'watchlist' =
    (segs[1] as 'diary' | 'lists' | 'watchlist') ||
    (segs[0] === 'diary' || segs[0] === 'watchlist' ? segs[0] : 'profile');
  const [searchParams] = useSearchParams();
  const searchParam = searchParams.get('q') ?? '';
  const activeTab: 'films' | 'series' | 'reviews' | 'lists' =
    path === '/' || path.startsWith('/films')
      ? 'films'
      : path.startsWith('/series') || path.startsWith('/tv')
        ? 'series'
        : path === '/reviews' || path.startsWith('/reviews')
          ? 'reviews'
          : 'lists';
  const tabs: { key: typeof activeTab; label: string; to: string }[] = [
    { key: 'films', label: t('nav_films'), to: '/' },
    { key: 'series', label: t('nav_series'), to: '/series' },
    { key: 'reviews', label: t('nav_reviews'), to: '/reviews' },
    { key: 'lists', label: t('nav_lists'), to: '/lists' },
  ];

  // ---------------------------------------------------------------------------
  // Barra verde elástica (Elastic Indicator) embaixo da aba ativa
  // FILMES / SÉRIES / CRÍTICAS / LISTAS.
  // Ao clicar, a barra ESTICA na direção da nova aba e depois a cauda alcança o
  // destino encolhendo (ver src/utils/tabIndicator.ts — mesma mecânica da barra
  // de abas do perfil de pessoa, na ActorPage).
  // ---------------------------------------------------------------------------
  const prevPosRef = useRef<IndicatorPos>({ left: 0, width: 0 });
  /**
   * O gesto na faixa de abas virou arrasto lateral: o `click` que o navegador
   * dispara ao soltar abriria a aba onde o dedo encostou e desfaria a troca
   * feita pelo swipe (mesma proteção que o TabViewPager faz no conteúdo).
   */
  const suppressBarClickRef = useRef(false);

  // Chave estável com os rótulos: trocar o idioma (PT/EN) muda a largura dos
  // botões e exige uma nova medição.
  const tabsLabelKey = tabs.map((tab) => tab.label).join('|');

  const activeTabButton = () =>
    tabsContainerRef.current?.querySelector<HTMLElement>('.main-tab-btn.active') ?? null;

  // Troca de aba (clique/rota): efeito elástico de 2 fases.
  // useLayoutEffect: mede o DOM já comitado ANTES do primeiro paint (o 1º
  // posicionamento é sem animação, então a barra já nasce alinhada).
  useLayoutEffect(() => {
    const indicator = indicatorRef.current;
    const btn = activeTabButton();
    if (indicator && btn) animateElasticIndicator(btn, indicator, prevPosRef.current);
  }, [activeTab]);

  // Mudanças de MEDIDA (idioma, entrada/saída da faixa mobile): reposiciona sem animar.
  useLayoutEffect(() => {
    const indicator = indicatorRef.current;
    const btn = activeTabButton();
    if (indicator && btn) animateElasticIndicator(btn, indicator, prevPosRef.current, true);
  }, [tabsLabelKey, isMainPage]);

  // Girar a tela / redimensionar muda a largura dos botões: remede sem animar.
  useEffect(() => {
    const remeasure = () => {
      const indicator = indicatorRef.current;
      const btn = activeTabButton();
      if (indicator && btn) animateElasticIndicator(btn, indicator, prevPosRef.current, true);
    };
    window.addEventListener('resize', remeasure);
    window.addEventListener('orientationchange', remeasure);
    return () => {
      window.removeEventListener('resize', remeasure);
      window.removeEventListener('orientationchange', remeasure);
    };
  }, []);

  // ---------------------------------------------------------------------------
  // A barra verde ACOMPANHA O DEDO no swipe lateral entre abas (mobile).
  //
  // Quem move o conteúdo é o TabViewPager (src/components/TabViewPager.tsx),
  // que translada o trilho direto no DOM. Ele publica o deslocamento do gesto em
  // TAB_SWIPE_EVENT e aqui a barra é redesenhada na MESMA fração do caminho — o
  // CENTRO dela anda junto com a tela e a barra estica no meio do gesto, sem
  // nunca adiantar em relação ao conteúdo (ver followTabIndicator).
  //
  // Sem transição CSS durante o gesto (o dedo manda, frame a frame). Ao soltar:
  //   • trocou de aba → a barra fica onde o dedo parou e o elástico de 2 fases
  //     da troca de rota (efeito acima, em [activeTab]) fecha a sobra;
  //   • não trocou     → o elástico devolve a barra para a aba atual.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const tabButtons = () =>
      Array.from(tabsContainerRef.current?.querySelectorAll<HTMLElement>('.main-tab-btn') ?? []);
    const rectOf = (el: HTMLElement): IndicatorPos => ({
      left: el.offsetLeft,
      width: el.offsetWidth,
    });

    const onSwipe = (event: Event) => {
      const detail = (event as CustomEvent<TabSwipeDetail>).detail;
      const indicator = indicatorRef.current;
      if (!indicator || !detail) return;

      // Arrasto lateral em andamento: o `click` do fim do gesto não pode abrir
      // a aba onde o dedo encostou (senão desfaz a troca feita pelo swipe).
      if (!detail.end) suppressBarClickRef.current = true;

      const buttons = tabButtons();
      const fromIndex = buttons.findIndex((btn) => btn.classList.contains('active'));
      if (fromIndex < 0) return;

      // Dedo soltou: ou a troca de rota assume (committed), ou a barra volta.
      const targetIdx = (): number => {
        const dir = detail.shift > 0 ? -1 : 1;
        const i = fromIndex + dir;
        return i < 0 || i >= buttons.length ? fromIndex : i;
      };
      /** Para qual aba o DEDO está apontando (usa o deslocamento JÁ com a
          resistência de borda aplicada pelo pager, então bate com o trilho). */
      const fingerPos = (): IndicatorPos => {
        const rect = rectOf(buttons[targetIdx()]);
        // Mesma régua do gesto: 1 painel de conteúdo = 1 aba de distância.
        const t = Math.abs(detail.shift) / Math.max(1, detail.width);
        const clamped = t < 0 ? 0 : t > 1 ? 1 : t;
        const from = rectOf(buttons[fromIndex]);
        const left = from.left + (rect.left - from.left) * clamped;
        const width = from.width + (rect.width - from.width) * clamped;
        return { left, width };
      };
      if (detail.end) {
        if (!detail.committed) {
          // Arrasto que NÃO troca de aba: a barra volta para a aba atual com o
          // elástico (comportamento que já estava certo).
          const back = buttons[fromIndex];
          if (back) animateElasticIndicator(back, indicator, prevPosRef.current);
          return;
        }
        // Arrasto que TROCA de aba: o destaque (texto branco) só acende quando a
        // ROTA mudar — este efeito nunca o antecipa.
        //
        // A barra, porém, não pode simplesmente ficar onde o dedo parou: o
        // `followTabIndicator` a desenha com o elástico do MEIO do gesto (mais
        // larga que a coluna) e o pager agora fecha a sobra do painel na hora,
        // sem animação. Ancorar o dedo aqui deixava a barra larga/fora de lugar
        // "presa" até o efeito de [activeTab] assumir — mais um salto. Então:
        // 1) fixa a posição do dedo como ponto de partida REAL (sem animação);
        // 2) deixa o efeito de [activeTab], que roda no MESMO frame da troca de
        //    rota, aplicar o elástico de 2 fases a partir dali.
        // Nenhum passo anda para trás: a barra segue de onde o dedo estava até a
        // aba nova.
        placeTabIndicator(indicator, fingerPos().left, fingerPos().width);
        return;
      }

      // Arrastar para a esquerda (shift < 0) revela a aba SEGUINTE; para a
      // direita, a ANTERIOR.
      const toIndex = fromIndex + (detail.shift > 0 ? -1 : 1);
      // Borda (primeira/última aba): não há vizinha, a barra fica na aba atual
      if (toIndex < 0 || toIndex >= buttons.length) return;

      const from = rectOf(buttons[fromIndex]);
      const to = rectOf(buttons[toIndex]);
      // RÉGUA: a largura de UM painel de conteúdo. O trilho precisa andar essa
      // distância inteira para a aba vizinha ficar visível; então a fração da
      // barra é |deslocamento| / largura do painel. Medir pela distância entre
      // as abas (1/4 disso) fazia a barra pular para a aba seguinte com a tela
      // ainda na metade do caminho.
      const panel = detail.width > 0 ? detail.width : window.innerWidth;
      if (panel <= 0) return;

      followTabIndicator(
        indicator,
        from,
        to,
        Math.min(1, Math.abs(detail.shift) / panel),
        prevPosRef.current,
      );
    };

    window.addEventListener(TAB_SWIPE_EVENT, onSwipe);
    return () => window.removeEventListener(TAB_SWIPE_EVENT, onSwipe);
  }, []);

  // ---------------------------------------------------------------------------
  // O gesto também pode COMEÇAR NA FAIXA DE ABAS — que é o caminho natural: o
  // dedo encosta no topo e arrasta. A faixa não tem trilho para mover nem
  // lógica de commit, então o Header só REPASSA o gesto ao TabViewPager, dono
  // do swipe. É o pager que captura o ponteiro (setPointerCapture), e é isso
  // que impede o Chrome de disparar `pointercancel` no primeiro movimento
  // horizontal e matar o arrasto antes de a barra verde se mexer.
  // ---------------------------------------------------------------------------
  const barPointerIdRef = useRef<number | null>(null);

  const onBarPointerDown = (e: React.PointerEvent<HTMLElement>) => {
    if (!e.isPrimary) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (!indicatorRef.current) return; // faixa de abas não está na tela
    if (barPointerIdRef.current !== null) return; // já existe dono para o gesto
    barPointerIdRef.current = e.pointerId;
    suppressBarClickRef.current = false;
    // O pager decide se aceita (ex.: ignora durante a animação de troca de aba)
    window.dispatchEvent(
      new CustomEvent<TabSwipeClaimDetail>(TAB_SWIPE_CLAIM_EVENT, {
        detail: {
          pointerId: e.pointerId,
          clientX: e.clientX,
          clientY: e.clientY,
          pointerType: e.pointerType,
          target: e.target as Element | null,
        },
      }),
    );
  };

  const onBarPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    if (barPointerIdRef.current !== e.pointerId) return;
    // Clique-and-arrastar de mouse: botão solto encerra o gesto
    if (e.pointerType === 'mouse' && e.buttons === 0) {
      onBarPointerFinish(false);
      return;
    }
    window.dispatchEvent(
      new CustomEvent<TabSwipeMoveDetail>(TAB_SWIPE_MOVE_EVENT, {
        detail: {
          pointerId: e.pointerId,
          clientX: e.clientX,
          clientY: e.clientY,
          timeStamp: e.timeStamp,
          pointerType: e.pointerType,
        },
      }),
    );
  };

  const onBarPointerFinish = (cancelled: boolean) => {
    if (barPointerIdRef.current === null) return;
    barPointerIdRef.current = null;
    window.dispatchEvent(
      new CustomEvent<TabSwipeFinishDetail>(TAB_SWIPE_FINISH_EVENT, { detail: { cancelled } }),
    );
    // Sem `click` depois de um cancelamento: não deixa a flag engolir o próximo
    if (cancelled) window.setTimeout(() => (suppressBarClickRef.current = false), 0);
  };

  /** Click sobrando de um arrasto na faixa não deve trocar de aba */
  const onBarClickCapture = (e: React.MouseEvent<HTMLElement>) => {
    if (suppressBarClickRef.current) {
      suppressBarClickRef.current = false;
      e.preventDefault();
      e.stopPropagation();
    }
  };

  // Mobile-only: botão de opções nas páginas de detalhe (compartilhar)
  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ url });
        return;
      }
      throw new Error('no-share');
    } catch {
      try {
        await navigator.clipboard.writeText(url);
      } catch {
        /* noop */
      }
    }
  };

  return (
    <header
      className={
        overBackdrop
          ? 'hidden md:block absolute inset-x-0 top-0 z-50 bg-transparent select-none'
          : isBrowseRoute || isActorRoute
            ? 'hidden md:block sticky top-0 z-50 bg-black border-b border-lb-elevated shadow-md select-none'
            : isSearchRoute
              ? 'hidden md:block sticky top-0 z-50 bg-black md:border-b md:border-lb-elevated md:shadow-md select-none'
              : 'sticky top-0 z-50 bg-black border-b border-lb-elevated shadow-md select-none'
      }
    >
      {/* Camada de contraste da navbar sobre o backdrop — MESMA receita do
          Letterboxd (.site-header .site-header-bg): 95px, gradiente de
          #14181c (sólido no topo) até transparente, opacidade 2/3 parada e
          0.85 no hover. Só existe nas rotas com backdrop (filme/série). */}
      {overBackdrop && <div className="site-header-bg hidden md:block" aria-hidden="true" />}
      <div className={`relative max-w-[950px] mx-auto px-4 ${isMainPage ? 'h-[84px] md:h-14' : 'h-14'} flex items-center justify-between gap-4 ${
        overBackdrop ? '[text-shadow:0_1px_3px_rgba(0,0,0,0.8)] [&_svg]:drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]' : ''
      }`}>
        {/* Mobile-only (páginas de detalhe): os botões ← e ⋮ flutuantes são
            renderizados pela própria FilmPage (o ⋮ abre o ActionBottomSheet) */}

        {/* Left: Brand Logo (oculto no mobile em páginas de detalhe e principais) */}
        <Link to="/" className={`${overBackdrop || isMainPage || isSearchRoute || isProfileArea || isSettingsRoute ? 'hidden md:flex' : 'flex'} items-center gap-2 group`}>
          <svg
            viewBox="0 0 32 32"
            className="w-7 h-7 shrink-0 drop-shadow-[0_2px_6px_rgba(0,224,84,0.35)] transition-transform duration-300 group-hover:rotate-6"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="mw-globe" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#00e054" />
                <stop offset="55%" stopColor="#40bcf4" />
                <stop offset="100%" stopColor="#2c7fb8" />
              </linearGradient>
            </defs>
            {/* Globe */}
            <circle cx="16" cy="16" r="13" fill="url(#mw-globe)" />
            <ellipse cx="16" cy="16" rx="6" ry="13" fill="none" stroke="#14181c" strokeOpacity="0.35" strokeWidth="1.2" />
            <line x1="3.2" y1="16" x2="28.8" y2="16" stroke="#14181c" strokeOpacity="0.35" strokeWidth="1.2" />
            <path d="M5.2 9h21.6M5.2 23h21.6" stroke="#14181c" strokeOpacity="0.25" strokeWidth="1.1" fill="none" />
            {/* Shine */}
            <ellipse cx="10.5" cy="9.5" rx="4" ry="2.6" fill="#ffffff" opacity="0.25" transform="rotate(-20 10.5 9.5)" />
          </svg>
          <span className="font-extrabold text-xl tracking-tight text-white">
            My<span className="text-lb-green">World</span>
          </span>
        </Link>

        {/* Mobile-only (Configurações): barra preta com ✕ / "Profile Settings" / ✓,
            no lugar do "MyWorld". Ações vêm da própria tela via eventos. */}
        {isSettingsRoute && (
          <div className="md:hidden absolute inset-0 flex items-center justify-between px-4 pointer-events-none">
            <button
              type="button"
              aria-label={t('btn_cancel')}
              onClick={() => window.dispatchEvent(new CustomEvent('settings:cancel'))}
              className="pointer-events-auto text-white hover:text-lb-muted transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <span className="text-base font-bold text-white">{t('hdr_profile_settings')}</span>
            <button
              type="button"
              aria-label={t('btn_save')}
              onClick={() => window.dispatchEvent(new CustomEvent('settings:save'))}
              className="pointer-events-auto text-white hover:text-lb-muted transition-colors cursor-pointer"
            >
              <Check className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Mobile-only (páginas principais): título centrado "MyWorld" */}
        {isMainPage && (
          <button
            type="button"
            onClick={() => navigate('/')}
            className="md:hidden absolute left-1/2 -translate-x-1/2 text-white text-[22px] font-bold tracking-[-0.01em] cursor-pointer leading-none"
            style={{ fontFamily: 'var(--font-brand)' }}
          >
            MyWorld
          </button>
        )}

        {/* Mobile-only (área de perfil): ⚙ à esquerda + nome de usuário ao lado */}
        {isProfileArea && (
          <div className="md:hidden flex items-center gap-3">
            <Link to="/settings" aria-label={t('nav_settings')} className="text-lb-muted hover:text-white transition-colors">
              <Settings className="w-5 h-5" />
            </Link>
            <span className="text-base font-bold text-white tracking-tight truncate">
              {profileAreaUser}
            </span>
          </div>
        )}

        {/* Mobile (/search): o campo de busca e as abas agora vivem na própria
            SearchPage (máquina de 3 estados), por isso a faixa do header some no mobile */}

        {/* Right Navigation (oculto no mobile em páginas de detalhe e na busca) */}
        <div className={`${overBackdrop || isSearchRoute || isProfileArea ? 'hidden md:flex' : 'flex'}${isMainPage ? ' ml-auto md:ml-0' : ''} items-center gap-3 md:gap-5 text-xs font-bold uppercase tracking-wider`}>
          {/* User Profile Link & Avatar (or Sign in when logged out) */}
          {!isAuthenticated ? (
            <div className="flex items-center gap-3">
              {/* Seletor de idioma — APENAS para visitantes (deslogados).
                  Após o login, o idioma só é alterado em Settings. */}
              <button
                type="button"
                onClick={toggleLanguage}
                aria-label={t('nav_language_label')}
                title={language === 'pt-BR' ? 'English (US)' : 'Português (Brasil)'}
                className="text-[11px] text-[#9ab] hover:text-white border border-white/10 rounded px-2 py-1 flex items-center gap-1 bg-white/5 cursor-pointer transition-colors"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>{language === 'pt-BR' ? 'PT' : 'EN'}</span>
              </button>
              <Link
                to="/signin"
                className={`hidden md:block transition-colors ${
                  location.pathname === '/signin' || location.pathname === '/signup'
                    ? 'text-white font-bold'
                    : 'text-lb-text hover:text-white'
                }`}
              >
                {t('nav_sign_in')}
              </Link>
            </div>
          ) : (
          <div ref={userMenuRef} className="relative hidden md:block">
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-2 text-lb-text hover:text-white transition-colors cursor-pointer"
            >
              <img
                src={displayAvatar}
                alt={displayDisplayName}
                className="w-6 h-6 rounded-full object-cover border border-lb-border-light"
              />
              <span className="hidden md:inline text-[11px] font-bold text-white tracking-wider uppercase">
                {displayUsername}
              </span>
              <ChevronDown className="hidden md:block w-3 h-3 text-lb-muted" />
            </button>

            {isUserMenuOpen && (
              <div className="absolute left-0 top-9 w-48 bg-lb-surface border border-lb-elevated rounded shadow-2xl py-1 z-50 text-xs normal-case mw-pop-in">
                <Link
                  to={`/${displayUsername}`}
                  className="flex items-center gap-2 px-4 py-2 text-lb-text hover:text-white hover:bg-lb-elevated"
                >
                  <User className="w-3.5 h-3.5 text-lb-green" />
                  <span>{t('nav_profile')}</span>
                </Link>
                <Link
                  to={`/${displayUsername}/diary`}
                  className="flex items-center gap-2 px-4 py-2 text-lb-text hover:text-white hover:bg-lb-elevated"
                >
                  <BookOpen className="w-3.5 h-3.5 text-lb-blue" />
                  <span>{t('hdr_diary')}</span>
                </Link>
                <Link
                  to={`/${displayUsername}/watchlist`}
                  className="flex items-center gap-2 px-4 py-2 text-lb-text hover:text-white hover:bg-lb-elevated"
                >
                  <Clock className="w-3.5 h-3.5 text-lb-blue" />
                  <span>{t('hdr_watchlist')}</span>
                </Link>
                <Link
                  to={`/${displayUsername}/lists`}
                  className="flex items-center gap-2 px-4 py-2 text-lb-text hover:text-white hover:bg-lb-elevated"
                >
                  <List className="w-3.5 h-3.5 text-lb-orange" />
                  <span>{t('nav_lists')}</span>
                </Link>
                <div className="border-t border-lb-elevated my-1" />
                <Link
                  to="/settings"
                  onClick={() => setIsUserMenuOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-lb-text hover:text-white hover:bg-lb-elevated"
                >
                  <Settings className="w-3.5 h-3.5 text-lb-muted" />
                  <span>{t('nav_settings')}</span>
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    void signOut();
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-lb-text hover:text-white hover:bg-lb-elevated cursor-pointer text-left"
                >
                  <LogOut className="w-3.5 h-3.5 text-red-400" />
                  <span>{t('nav_sign_out')}</span>
                </button>
              </div>
            )}
          </div>
          )}

          {/* Activity Zap Icon */}
          <Link
            to={`/${displayUsername}?tab=activity`}
            className="hidden md:block text-lb-text hover:text-white transition-colors p-1"
            title={t('nav_activity')}
          >
            <Zap className="w-3.5 h-3.5 fill-lb-text text-transparent hover:fill-white" />
          </Link>

          {/* Main Links */}
          <Link
            to="/films"
            className={`hidden md:block transition-colors ${
              location.pathname.startsWith('/films') ? 'text-white font-bold' : 'text-lb-text hover:text-white'
            }`}
          >
            {t('nav_films')}
          </Link>          <Link
            to="/series"
            className={`hidden md:block transition-colors ${
              location.pathname.startsWith('/series') || location.pathname.startsWith('/tv') ? 'text-white font-bold' : 'text-lb-text hover:text-white'
            }`}
          >
            {t('nav_series')}
          </Link>

          <Link
            to="/lists"
            className={`hidden md:block transition-colors ${
              location.pathname === '/lists' ? 'text-white' : 'text-lb-text hover:text-white'
            }`}
          >
            {t('nav_lists')}
          </Link>

          {/* Search Icon & Typeahead — desktop only (no mobile a busca vive na BottomNav/rota /search) */}
          <div ref={searchRef} className="relative hidden md:block">
            {isSearchExpanded ? (
              <form
                onSubmit={submitSearch}
                className="flex items-center h-7 bg-white rounded-full px-2.5 w-36 sm:w-44"
              >
                <input
                  type="text"
                  placeholder={t('search_placeholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') submitSearch(e);
                    if (e.key === 'Escape') {
                      setIsSearchOpen(false);
                      setIsSearchExpanded(false);
                      setSearchQuery('');
                    }
                  }}
                  autoFocus
                  className="no-focus-ring flex-1 min-w-0 h-full bg-transparent text-xs text-gray-900 placeholder-gray-500 border-0 outline-none p-0"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSearchResults([]);
                      setIsSearchOpen(false);
                      // Na página de resultados, o X volta para a tela inicial
                      if (isSearchRoute) navigate('/');
                    }}
                    aria-label={t('search_clear')}
                    className="ml-1 shrink-0 text-gray-400 hover:text-gray-700 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
                <button
                  type="submit"
                  aria-label={t('search_placeholder')}
                  className="ml-2 shrink-0 text-gray-400 hover:text-gray-700 cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5" />
                </button>
              </form>
            ) : (
              <button
                onClick={() => setIsSearchExpanded(true)}
                className="text-lb-text hover:text-white p-1 transition-colors"
                title={t('search_label')}
                aria-label={t('search_label')}
              >
                <Search className="w-4 h-4" />
              </button>
            )}

            {/* Typeahead Dropdown */}
            {isSearchOpen && (
              <div className="absolute right-0 top-9 w-72 sm:w-80 bg-lb-surface border border-lb-elevated rounded shadow-2xl overflow-hidden z-50 mw-pop-in">
                <div className="px-3 py-1.5 bg-lb-bg border-b border-lb-elevated text-[10px] uppercase font-bold text-lb-muted flex justify-between">
                  <span>
                    {t('search_showing_matches')} “{searchQuery}”
                  </span>
                  {isSearching && <span className="text-lb-green animate-pulse">{t('search_searching')}</span>}
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-lb-elevated/60 normal-case">
                  {searchResults.map((m) => (
                    <button
                      type="button"
                      key={m.id}
                      onClick={() => handleMovieSelect(m.id)}
                      className="p-2 flex items-center gap-2.5 hover:bg-lb-elevated cursor-pointer w-full text-left"
                    >
                      <img
                        src={tmdb.getImageUrl(m.poster_path, 'w92')}
                        alt={m.title}
                        className="w-8 h-12 object-cover rounded bg-lb-bg shrink-0"
                        loading="lazy"
                        decoding="async"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-white truncate">{m.title}</p>
                        <p className="text-[11px] text-lb-muted">{m.release_date?.slice(0, 4)}</p>
                      </div>
                    </button>
                  ))}
                </div>
                {/* Ver todos os resultados → página /search */}
                <button
                  type="button"
                  onClick={() => submitSearch()}
                  className="w-full text-center py-2 bg-lb-bg border-t border-lb-elevated text-[10px] uppercase font-bold tracking-wider text-lb-green hover:bg-lb-elevated transition-colors cursor-pointer"
                >
                  {t('search_view_all')}
                </button>
              </div>
            )}
          </div>

          {/* Mobile Hamburger Menu — oculto: a navegação mobile usa a BottomNav */}
          <div ref={menuRef} className="hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-1 text-lb-text hover:text-white"
              aria-label={t('nav_open_menu')}
            >
              {isMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 top-14 w-52 bg-lb-surface border border-lb-elevated rounded shadow-2xl py-1 z-50 flex flex-col md:hidden">
                <Link
                  to="/films"
                  onClick={() => setIsMenuOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-lb-text hover:text-white hover:bg-lb-elevated"
                >
                  {t('nav_films')}
                </Link>
                <Link
                  to="/lists"
                  onClick={() => setIsMenuOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-lb-text hover:text-white hover:bg-lb-elevated"
                >
                  {t('nav_lists')}
                </Link>
                <div className="border-t border-lb-elevated my-1" />
                <Link
                  to={`/${displayUsername}/diary`}
                  onClick={() => setIsMenuOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-lb-text hover:text-white hover:bg-lb-elevated"
                >
                  {t('hdr_diary')}
                </Link>
                <Link
                  to={`/${displayUsername}/watchlist`}
                  onClick={() => setIsMenuOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-lb-text hover:text-white hover:bg-lb-elevated"
                >
                  {t('hdr_watchlist')}
                </Link>
                <Link
                  to={`/${displayUsername}/lists`}
                  onClick={() => setIsMenuOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-lb-text hover:text-white hover:bg-lb-elevated"
                >
                  {t('hdr_my_lists')}
                </Link>
              </div>
            )}
          </div>

          {/* MyWorld "+ LOG ▼" Button */}
          {/* + Log: oculto no mobile (BottomNav tem o botão central de Log) */}
          <div className="hidden md:flex items-center">
            <button
              onClick={() => openLogModal()}
              className="btn-log-green flex items-center gap-1 text-lb-bg font-black text-xs px-2.5 py-1.5 rounded-l-xs cursor-pointer tracking-wider"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>{t('nav_log')}</span>
            </button>
            <button
              onClick={() => openLogModal()}
              className="btn-log-green px-1.5 py-1.5 rounded-r-xs border-l border-black/15 text-lb-bg cursor-pointer"
            >
              <ChevronDown className="w-3 h-3 stroke-[2.5]" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile-only (área de perfil): faixa de 4 abas Profile / Diary / Lists / Watchlist */}
      {isProfileArea && (
        <nav aria-label={t('nav_profile')} className="md:hidden hidden max-md:grid grid-cols-4 text-center mt-1">
          {([
            { key: 'profile', label: t('nav_profile'), to: `/${profileAreaUser}` },
            { key: 'diary', label: t('hdr_diary'), to: `/${profileAreaUser}/diary` },
            { key: 'lists', label: t('nav_lists'), to: `/${profileAreaUser}/lists` },
            { key: 'watchlist', label: t('hdr_watchlist'), to: `/${profileAreaUser}/watchlist` },
          ] as const).map((tab) => {
            const active = tab.key === profileTab;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => navigate(tab.to)}
                className={`flex flex-col items-center gap-1.5 pb-1 pt-2 text-[12px] font-bold uppercase tracking-wider cursor-pointer ${
                  active ? 'text-white' : 'text-lb-muted'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`h-[3px] w-full rounded-full transition-colors duration-250 ease-out ${active ? 'bg-[#00e054]' : 'bg-transparent'}`}
                />
              </button>
            );
          })}
        </nav>
      )}

      {/* Mobile-only (páginas principais): faixa de 4 abas Films / Series / Reviews / Lists
          com barra verde DESLIZANTE embaixo da aba ativa (.tab-indicator).
          As rotas/cliques continuam os mesmos (navigate(tab.to)); só a aparência
          mudou. O wrapper cuida de esconder a faixa no desktop. */}
      {isMainPage && (
        <div className="md:hidden hidden max-md:block">
          <nav
            ref={tabsContainerRef}
            aria-label={t('nav_sections')}
            className="main-tabs-container"
            onPointerDown={onBarPointerDown}
            onPointerMove={onBarPointerMove}
            onPointerUp={() => onBarPointerFinish(false)}
            onPointerCancel={() => onBarPointerFinish(true)}
            onClickCapture={onBarClickCapture}
          >
            {tabs.map((tab) => {
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => navigate(tab.to)}
                  aria-current={active ? 'page' : undefined}
                  className={`main-tab-btn${active ? ' active' : ''}`}
                >
                  {tab.label}
                </button>
              );
            })}
            {/* Barra verde deslizante (posição/largura via JS) */}
            <span ref={indicatorRef} className="tab-indicator" aria-hidden="true" />
          </nav>
        </div>
      )}
    </header>
  );
};
