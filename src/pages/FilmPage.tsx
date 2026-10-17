import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Eye,
  Heart,
  Clock,
  Play,
  X,
  Check,
  BarChart2,
  Layers,
  Copy,
  ArrowLeft,
  MoreVertical,
  MoreHorizontal,
  Users,
  List,
  ChevronRight,
} from 'lucide-react';
import { tmdb, type TMDBMovieDetails } from '../services/tmdb';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage, formatMoneyUSD, formatDatePt, regionNames, languageNames, type TranslationKey } from '../i18n/LanguageContext';
import { StarRating } from '../components/StarRating';
import { RatingHistogram } from '../components/RatingHistogram';
import { WhereToWatch } from '../components/WhereToWatch';
import { PosterCard } from '../components/PosterCard';
import { ImagePickerModal } from '../components/ImagePickerModal';
import { Backdrop } from '../components/Backdrop';
import { ActionBottomSheet } from '../components/ActionBottomSheet';
import { openPersonProfile, type PersonRole } from '../utils/personNav';

function formatNumber(num: number): string {
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(0) + 'K';
  }
  return num.toString();
}

export const FilmPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const isTv = location.pathname.startsWith('/tv/');
  const movieId = Number(id);

  const {
    isMovieWatched,
    toggleWatched,
    isMovieLiked,
    toggleLikeMovie,
    isMovieInWatchlist,
    toggleWatchlist,
    ratingsMap,
    setMovieRating,
    openLogModal,
    logs,
    reviews,
    movieOverrides,
    setMovieOverride,
  } = useApp();
  const { isAuthenticated, profile } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [movie, setMovie] = useState<TMDBMovieDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'cast' | 'crew' | 'details' | 'genres' | 'releases'>('cast');
  const [copiedLink, setCopiedLink] = useState(false);
  const [showTrailerModal, setShowTrailerModal] = useState(false);
  const [showFullSynopsis, setShowFullSynopsis] = useState(false);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [imagePicker, setImagePicker] = useState<'poster' | 'backdrop' | null>(null);
  const [showSharePanel, setShowSharePanel] = useState(false);

  // Lock body scroll while the trailer modal is open + close on Escape
  useEffect(() => {
    if (!showTrailerModal) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowTrailerModal(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [showTrailerModal]);

  useEffect(() => {
    async function loadFilm() {
      if (!movieId) return;
      setLoading(true);
      window.scrollTo(0, 0);
      try {
        const details = isTv ? await tmdb.getTVDetails(movieId) : await tmdb.getMovieDetails(movieId);
        setMovie(details);
      } catch (err) {
        console.error('Failed to load movie details:', err);
      } finally {
        setLoading(false);
      }
    }
    loadFilm();
  }, [movieId]);

  if (loading) {
    return (
      <div className="max-w-[950px] mx-auto px-4 py-32 flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-3 border-lb-green border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-lb-text tracking-wide">{isTv ? t('film_loading_series') : t('film_loading')}</p>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="max-w-[950px] mx-auto px-4 py-32 text-center">
        <h2 className="text-xl font-bold text-white mb-2 font-serif">{isTv ? t('series_not_found') : t('film_not_found')}</h2>
        <Link to={isTv ? '/series' : '/films'} className="text-sm text-lb-green hover:underline">
          {isTv ? t('film_return_series') : t('film_return_films')}
        </Link>
      </div>
    );
  }

  // Logs & Reviews
  const userLogsForMovie = logs.filter((l) => l.movieId === movie.id);
  const movieReviews = reviews.filter((r) => r.movieId === movie.id);
  const hasUserReviewed = userLogsForMovie.some((l) => l.reviewText && l.reviewText.trim().length > 0);

  // Similar (mobile): carrossel horizontal com EXATAMENTE 20 títulos, só pôsteres.
  // A lista já vem do /movie/{id}/similar ou /tv/{id}/similar (append no fetch
  // único de getMovieDetails/getShowDetails) — nenhuma chamada extra aqui.
  const displaySimilar = (movie.similar?.results || []).filter((item) => item.poster_path).slice(0, 20);

  const watched = isMovieWatched(movie.id) || userLogsForMovie.length > 0;
  const liked = isMovieLiked(movie.id) || userLogsForMovie.some((l) => l.liked);
  const inWatchlist = isMovieInWatchlist(movie.id);
  const userRating = ratingsMap[movie.id] || (userLogsForMovie[0]?.rating ? userLogsForMovie[0].rating : 0);

  // Key Crew: diretor usado no cabeçalho
  const director = movie.credits?.crew.find((c) => c.job === 'Director' || c.job === 'Creator');

  // Trailer finding
  const trailerVideo =
    movie.videos?.results.find(
      (v) => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')
    ) || movie.videos?.results.find((v) => v.site === 'YouTube');

  // Format release year
  const releaseYear = movie.release_date ? movie.release_date.slice(0, 4) : '';

  // Classificação indicativa principal: prioriza BR, fallback US
  // (filmes → release_dates; séries → content_ratings)
  const certification = (() => {
    if (isTv) {
      const ratings = movie.content_ratings?.results ?? [];
      return (
        ratings.find((r) => r.iso_3166_1 === 'BR')?.rating ||
        ratings.find((r) => r.iso_3166_1 === 'US')?.rating ||
        ratings[0]?.rating ||
        ''
      );
    }
    const rel = movie.release_dates?.results ?? [];
    const pick = (iso: string) =>
      rel
        .find((r) => r.iso_3166_1 === iso)
        ?.release_dates?.find((d) => d.certification)?.certification || '';
    return pick('BR') || pick('US') || '';
  })();

  // Mobile header extras: N seasons (TV) and trailer link (videos already fetched in details)
  const numberOfSeasons = (movie as unknown as { number_of_seasons?: number }).number_of_seasons;
  const trailerUrl = trailerVideo
    ? `https://www.youtube.com/watch?v=${trailerVideo.key}`
    : `https://www.youtube.com/results?search_query=${encodeURIComponent(`${movie.title} trailer`)}`;

  const isOdyssey = movie.id === 1368337;
  const isPridePrejudice = movie.id === 4348;

  // Proportional MyWorld stats
  const watchedStat = isPridePrejudice ? 3300000 : isOdyssey ? 4800000 : Math.max(35000, (movie.vote_count || 100) * 350);
  const ratingsStat = isPridePrejudice ? 468000 : isOdyssey ? 594000 : Math.max(8000, (movie.vote_count || 100) * 50);
  const likesStat = isPridePrejudice ? 1300000 : isOdyssey ? 2100000 : Math.max(12000, (movie.vote_count || 100) * 140);
  const listsStat = isPridePrejudice ? 470 : isOdyssey ? 113 : Math.max(120, Math.round((movie.vote_count || 100) * 0.05));

  // Sharable film URL
  const shortUrl = window.location.href;

  const override = movieOverrides[movie.id];

  const backdropUrl =
    override?.backdrop ||
    (movie.backdrop_path ? tmdb.getBackdropUrl(movie.backdrop_path, 'w1280') : null);

  const posterUrl =
    override?.poster ||
    (movie.poster_path ? tmdb.getImageUrl(movie.poster_path, 'w500') : '');

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const shareTwitter = () => {
    const text = encodeURIComponent(`${movie.title} (${releaseYear}) on MyWorld: ${window.location.href}`);
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
  };

  const shareFacebook = () => {
    const url = encodeURIComponent(window.location.href);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
  };

  return (
    <div className="relative min-h-screen text-lb-text">
      {/* 1. Cinematic Hero Vignette Backdrop */}
      {backdropUrl && (
        <div className="max-md:absolute max-md:inset-x-0 max-md:top-0 max-md:h-[calc(56.25vw+26px)] max-md:overflow-hidden max-md:z-0 max-md:[&_.backdrop-container]:!h-full max-md:[&_.backdrop-container]:!pt-0 max-md:[&_.backdropimage]:!bg-[length:110%_auto] max-md:[&_.backdropimage]:!bg-[position:-5vw_0]">
          <Backdrop src={backdropUrl} alt={movie.title} />
        </div>
      )}

      {/* Floating back + overflow buttons over the backdrop â€” mobile only (app-style) */}
      <div className="md:hidden absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-3 pt-3">
        <button
          onClick={() => navigate(-1)}
          aria-label={t('film_back')}
          className="w-9 h-9 rounded-full bg-black/40 backdrop-blur flex items-center justify-center text-white shadow-md active:scale-95 transition-transform"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <button
          onClick={() => setShowActionSheet(true)}
          aria-label={t('film_more_actions')}
          className="w-9 h-9 rounded-full bg-black/40 backdrop-blur flex items-center justify-center text-white shadow-md active:scale-95 transition-transform"
        >
          <MoreVertical className="w-5 h-5" />
        </button>
      </div>

      {/* 2. Main Content Container: 3-column Letterboxd layout (950px total)
          O backdrop é posicionado de forma absoluta (.backdrop-container).
          O topo do conteúdo inicia em pt-[210px] (mobile) e md:pt-[472px] (desktop, padrão Letterboxd). */}
      <div
        className={`relative z-10 max-w-[950px] mx-auto px-4 md:px-0 pb-16 ${
          backdropUrl ? 'pt-[calc(56.25vw+11px)] md:pt-[472px]' : 'pt-20'
        }`}
      >
        <div className="flex flex-col md:grid md:grid-cols-[230px_390px_230px] md:gap-x-[50px] md:gap-y-[30px] items-start">

          {/* ========================================================
              LEFT COLUMN (w-[230px]): Poster, Stats Bar, Where to Watch
              (ocupa as 2 linhas do grid em telas md+)
              ======================================================== */}
          <div className="w-full md:w-[230px] md:row-span-2 flex-shrink-0 flex flex-col items-center md:items-start">
            {/* Film Poster (230x345px standard Letterboxd frame) */}
            <div className="hidden md:block letterboxd-poster-frame overflow-hidden flex-shrink-0">
              <img loading="lazy" decoding="async"
                src={posterUrl}
                alt={movie.title}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Production Statistics List — 10px below poster, 12px font, #667788 */}
            <div className="hidden md:flex w-[230px] items-center justify-between mt-2.5 py-1 letterboxd-stats-list select-none">
              <div className="flex items-center gap-1.5 hover:text-white transition-colors" title={`${watchedStat.toLocaleString()} ${t('film_stat_watched')}`}>
                <Eye className="w-4 h-4 text-lb-green" />
                <span className="font-normal">{formatNumber(watchedStat)}</span>
              </div>
              <div className="flex items-center gap-1.5 hover:text-white transition-colors" title={`${ratingsStat.toLocaleString()} ${t('film_stat_ratings')}`}>
                <BarChart2 className="w-4 h-4 text-lb-blue" />
                <span className="font-normal">{formatNumber(ratingsStat)}</span>
              </div>
              <div className="flex items-center gap-1.5 hover:text-white transition-colors" title={`${likesStat.toLocaleString()} ${t('film_stat_likes')}`}>
                <Heart className="w-4 h-4 text-lb-orange fill-lb-orange" />
                <span className="font-normal">{formatNumber(likesStat)}</span>
              </div>
              <div className="flex items-center gap-1.5 hover:text-white transition-colors" title={`${listsStat.toLocaleString()} ${t('film_stat_lists')}`}>
                <Layers className="w-4 h-4 text-[#e5a00d]" />
                <span className="font-normal">{formatNumber(listsStat)}</span>
              </div>
            </div>

            {/* Where to Watch — desktop only */}
            <div className="hidden md:block w-[230px] max-w-full mt-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold tracking-wider uppercase text-lb-muted">
                  {t('film_where_watch')}
                </span>
                {trailerVideo ? (
                  <button
                    onClick={() => setShowTrailerModal(true)}
                    className="inline-flex items-center gap-1.5 bg-[#202830] hover:bg-lb-elevated border border-lb-elevated text-white text-[11px] font-medium px-2.5 py-0.5 rounded-full transition-colors cursor-pointer"
                  >
                    <Play className="w-2.5 h-2.5 fill-white text-white" />
                    <span>{t('trailer')}</span>
                  </button>
                ) : null}
              </div>

              {/* Providers Pill Box */}
              <WhereToWatch providers={movie['watch/providers']} />
            </div>
          </div>

          {/* ========================================================
              MASTHEAD: Title + Year + Director
              (ocupa 670px: colunas do centro e da direita — padrão Letterboxd)
              ======================================================== */}
          <div className="w-full md:col-span-2 min-w-0 md:mt-[-3px] flex max-md:items-start max-md:relative md:items-baseline justify-between gap-4">
            {/* DESKTOP Masthead: Title (32px serif bold) + Year (17px 300) + Director (17px bold) */}
            <div className="hidden md:block flex-1 min-w-0">
              <h1 className="letterboxd-title text-[32px] inline mr-2.5">
                {movie.title}
              </h1>
              <div className="inline-block items-baseline">
                {releaseYear && (
                  <Link
                    to={isTv ? `/series/year/${releaseYear}` : `/films/year/${releaseYear}`}
                    className="letterboxd-releasedate hover:text-white underline underline-offset-2 decoration-[#99aabb]/40 hover:decoration-white transition-colors mr-3 inline"
                  >
                    {releaseYear}
                  </Link>
                )}
                {director && (
                  <span className="letterboxd-credits whitespace-nowrap mr-3 inline">
                    {t(isTv ? 'created_by' : 'directed_by')}{' '}
                    <Link
                      to={openPersonProfile(
                        director.id,
                        !isTv ? 'Director' : director.job === 'Creator' ? 'Creator' : 'Writer',
                      )}
                      className="letterboxd-credits-name hover:text-lb-blue underline underline-offset-2 decoration-white/40 hover:decoration-lb-blue transition-colors"
                    >
                      {director.name}
                    </Link>
                  </span>
                )}
                {!isTv && movie.runtime ? (
                  <span className="letterboxd-releasedate whitespace-nowrap mr-3 inline">
                    &bull; {Math.floor(movie.runtime / 60)}h {movie.runtime % 60}m
                  </span>
                ) : null}
                {certification && <CertBadge cert={certification} />}
                {isTv && numberOfSeasons ? (
                  <span className="letterboxd-releasedate whitespace-nowrap mr-3 inline">
                    &bull; {numberOfSeasons} season{numberOfSeasons === 1 ? '' : 's'}
                  </span>
                ) : null}
              </div>
            </div>

            {/* MOBILE Header: Title + Director + compact poster (padrão app Letterboxd) */}
            <div className="md:hidden flex-1 min-w-0 max-md:pr-[118px]">
              <h1 className="font-sans font-extrabold text-[23px] text-white leading-[1.2] tracking-tight mb-5">
                {movie.title}
              </h1>
              {/* Mesma formatação da página de FILMES: ano • crédito na 1a linha,
                  nome em negrito na 2a, e a mesma fileira de pílulas (trailer /
                  duração / classificação). Séries usam o rótulo "Criado por". */}
              <p className="text-[11px] tracking-wider uppercase text-[#9ab] mt-1">
                {releaseYear}
                {releaseYear && director ? ' \u2022 ' : ''}
                {director ? t(isTv ? 'created_by' : 'directed_by') : ''}
              </p>
              {director && (
                <Link
                  // Cargo de origem vira a aba inicial do perfil: criador de
                  // série abre em "Criador" (antes caía em "Roteiro").
                  to={openPersonProfile(
                    director.id,
                    !isTv ? 'Director' : director.job === 'Creator' ? 'Creator' : 'Writer',
                  )}
                  className="text-sm font-semibold text-[#def] block mt-0.5"
                >
                  {director.name}
                </Link>
              )}

              {/* Trailer pill + minutos (séries usam a mesma linha, sem temporadas) */}
              <div className="flex items-center gap-3 mt-2.5">
                <a
                  href={trailerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 bg-[#2c3440] text-[11px] font-semibold tracking-wider uppercase px-3 py-1 rounded-full text-[#def]"
                >
                  <Play className="w-2.5 h-2.5 fill-[#def] text-[#def]" />
                  {t('trailer')}
                </a>
                {movie.runtime ? (
                  <span className="text-xs text-[#9ab]">{movie.runtime} {t('mins')}</span>
                ) : null}
                {certification && <CertBadge cert={certification} small />}
              </div>
            </div>

            {/* Pôster compacto à direita — SOMENTE mobile (padrão app Letterboxd) */}
            <div className="md:hidden absolute right-[-7px] top-0 w-[86px]">
              <div className="w-full aspect-[2/3] rounded-[4px] overflow-hidden ring-1 ring-white/15 shadow-xl bg-lb-surface">
                <img loading="lazy" decoding="async" src={posterUrl} alt={movie.title} className="w-full h-full object-cover" />
              </div>
            </div>
          </div>

          {/* ========================================================
              CENTER COLUMN (w-[390px] no desktop): Synopsis, Tabs, Reviews
              ======================================================== */}
          <div className="w-full md:w-[390px] min-w-0 space-y-3">
            {/* Tagline — Letterboxd: 13px uppercase tracking-[0.075em] #778899 */}
            {movie.tagline && (
              <h4 className="letterboxd-tagline tagline-mobile-sm mt-[-2px] max-md:mt-6 mb-[10px]">
                {movie.tagline.replace(/^"|"$/g, '')}
              </h4>
            )}

            {/* Overview / Synopsis — Letterboxd: 15px serif leading-[1.67] #99aabb */}
            <div
              className="letterboxd-synopsis synopsis-mobile-sm max-md:font-sans cursor-pointer md:cursor-default"
              onClick={() => setShowFullSynopsis((v) => !v)}
            >
              <p className={showFullSynopsis ? '' : 'max-md:line-clamp-3'}>
                {movie.overview || t('film_synopsis_na')}
              </p>
              {!showFullSynopsis && (
                <div className="md:hidden text-center text-[#899aa9] tracking-[0.2em] text-sm leading-none my-1.5">
                  •••
                </div>
              )}
            </div>

            {/* RATINGS — mobile only: label à esquerda, estrela verde na base,
                barras verticais cinzas no meio, média grande + 5 estrelas à direita */}
            <div className="md:hidden border-t border-white/10 border-b border-[#232a32] pt-3 pb-4 mt-4 -mx-4 px-4">
              <span className="text-[11px] uppercase tracking-wider text-[#9ab]">{t('ratings')}</span>
              {(() => {
                const avg = isOdyssey ? 4.01 : movie.vote_average ? movie.vote_average / 2 : 3.8;
                const scale = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];
                const dist = scale.map((r) => Math.max(0.06, Math.exp(-(((r - avg) ** 2)) / 0.75)));
                const maxVal = Math.max(...dist);
                const fullStars = Math.round(avg);
                return (
                  <div className="flex items-end gap-3 mt-1.5">
                    {/* Estrela verde pequena à esquerda da base */}
                    <span className="text-[#00e054] text-sm leading-none pb-0.5">★</span>
                    {/* Histograma de barras cinzas */}
                    <div className="flex-1 flex items-end gap-1 h-12 border-b border-[#2c3440]">
                      {dist.map((v, i) => (
                        <div
                          key={i}
                          className="flex-1 bg-[#556677] rounded-t-none"
                          style={{ height: `${Math.max(8, Math.round((v / maxVal) * 100))}%` }}
                        />
                      ))}
                    </div>
                    {/* Média grande + 5 estrelinhas verdes */}
                    <div className="flex flex-col items-end pb-0.5">
                      <span className="text-2xl font-light text-[#9ab] leading-none">{avg.toFixed(1)}</span>
                      <span className="text-xs leading-none mt-1">
                        {Array.from({ length: 5 }, (_, i) => (
                          <span key={i} className={i < fullStars ? 'text-[#00e054]' : 'text-[#3a4550]'}>★</span>
                        ))}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Barra "Rate, log, review + more": acessada apenas pelo botão ⋮
                no topo do backdrop (abre o ActionBottomSheet) */}

            {/* 3 cartões coloridos — mobile only (ícone no topo, label em negrito, contagem abaixo) */}
            {/* Pílula de status (mobile): só quando o usuário já assistiu ao filme */}
            {watched && (
              <div className="md:hidden border-b border-[#232a32] -mx-4 px-4 py-3.5">
                <div className="flex items-center justify-between bg-[#2c3440] rounded-lg px-3.5 py-2.5">
                  <div className="flex items-center min-w-0">
                    {isAuthenticated && profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt={profile.username}
                        className="w-6 h-6 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <span className="w-6 h-6 rounded-full bg-[#3a4550] shrink-0" aria-hidden="true" />
                    )}
                    <span className="ml-2.5 text-[0.85rem] text-[#cdd5de] truncate">
                      {t('film_you_watched')}
                    </span>
                  </div>
                  <MoreVertical className="w-4 h-4 text-[#899aa9] shrink-0" aria-hidden="true" />
                </div>
              </div>
            )}

            {/* MyWorld Tabs Bar: Cast, Crew, Details, Genres, Releases (DESKTOP ONLY) */}
            <div className="hidden md:block pt-2">
              <div className="flex items-center gap-6 border-b border-lb-elevated text-[11px] uppercase font-bold tracking-wider pb-1">
                {(
                  [
                    ['cast', t('tab_cast')],
                    ['crew', t('tab_crew')],
                    ['details', t('tab_details')],
                    ['genres', t('tab_genres')],
                    ['releases', t('tab_releases')],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={`pb-2 -mb-[1px] transition-colors cursor-pointer ${
                      activeTab === key
                        ? 'text-white border-b-2 border-lb-green'
                        : 'text-lb-muted hover:text-white'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Tab Contents (componentes compartilhados com o mobile) */}
              <div className="py-4">
                <FilmTabContent activeTab={activeTab} movie={movie} isTv={isTv} numberOfSeasons={numberOfSeasons} />
              </div>
            </div>

            {/* App-style tabs — MOBILE ONLY: Cast / Crew / Details / Genre / Releases */}
            <div className="md:hidden pt-4">
              {/* Só a barra de abas sai da margem (borda a borda); o conteúdo abaixo não */}
              <div className="-mx-4">
              <div className="flex items-center gap-5 px-4 border-b border-lb-elevated text-[11px] uppercase font-bold tracking-wider overflow-x-auto no-scrollbar">
                {(
                  [
                    ['cast', t('tab_cast')],
                    ['crew', t('tab_crew')],
                    ['details', t('tab_details')],
                    ['genres', t('tab_genres')],
                    ['releases', t('tab_releases')],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={`pb-2 -mb-[1px] transition-colors cursor-pointer whitespace-nowrap ${
                      activeTab === key
                        ? 'text-white border-b-2 border-lb-green'
                        : 'text-lb-muted hover:text-white'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              </div>

              <div className="py-3">
                <FilmTabContent activeTab={activeTab} movie={movie} isTv={isTv} numberOfSeasons={numberOfSeasons} mobile />
              </div>
            </div>

            {/* Popular Reviews Section */}
            <div className="pt-4 border-t border-lb-elevated space-y-4 max-md:-mx-4 max-md:px-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs uppercase font-bold tracking-wider text-lb-text">
                  {t('film_popular_reviews')}
                </h3>
                <button
                  onClick={() =>
                    openLogModal({
                      id: movie.id,
                      title: movie.title,
                      poster_path: movie.poster_path,
                      release_date: movie.release_date,
                    })
                  }
                  className="text-xs text-lb-green hover:underline font-semibold cursor-pointer"
                >
                  {t('film_write_review')}
                </button>
              </div>

              {movieReviews.length > 0 ? (
                <div className="space-y-3">
                  {movieReviews.map((rev) => (
                    <div
                      key={rev.id}
                      className="bg-lb-surface border border-lb-elevated rounded p-4 text-xs space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <img loading="lazy" decoding="async"
                            src={rev.author.avatarUrl}
                            alt=""
                            className="w-6 h-6 rounded-full object-cover border border-lb-elevated"
                          />
                          <span className="font-bold text-white">{rev.author.displayName}</span>
                          <span className="text-lb-green">★ {rev.rating}</span>
                        </div>
                        <span className="text-lb-muted">
                          {new Date(rev.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-lb-white leading-relaxed">{rev.content}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-lb-muted text-xs text-center py-6">
                  {t('film_no_reviews')}
                </p>
              )}
            </div>
          </div>

          {/* ========================================================
              RIGHT COLUMN (w-[230px]): Action Panel & Rating Histogram
              (no mobile Ã© substituÃ­da pela barra rÃ¡pida + gaveta de aÃ§Ãµes)
              ======================================================== */}
          <div className="hidden md:block w-[230px] flex-shrink-0 space-y-5">
            {/* MyWorld Action Card */}
            <div className="bg-lb-border-light border border-[#556677] rounded-[4px] shadow-lg overflow-hidden text-xs text-lb-text">
              
              {/* Row 1: Watch, Like, Watchlist 3-column circular buttons */}
              <div className="grid grid-cols-3 py-2.5 bg-lb-border-light">
                {/* Watch / Reviewed */}
                <button
                  onClick={() => toggleWatched(movie.id)}
                  className="flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer group"
                  title={watched ? (hasUserReviewed ? t('film_reviewed') : t('action_watched')) : t('abs_mark_watched')}
                >
                  <Eye
                    className={`w-5 h-5 transition-colors ${
                      watched ? 'text-lb-green' : 'text-lb-muted group-hover:text-white'
                    }`}
                  />
                  <span
                    className={`text-[10px] font-semibold tracking-wide ${
                      watched ? 'text-lb-green' : 'text-lb-muted group-hover:text-white'
                    }`}
                  >
                    {watched ? (hasUserReviewed ? t('film_reviewed') : t('action_watched')) : t('action_watch')}
                  </span>
                </button>

                {/* Like */}
                <button
                  onClick={() => toggleLikeMovie(movie.id)}
                  className="flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer group"
                  title={liked ? t('action_liked') : t('action_like')}
                >
                  <Heart
                    className={`w-5 h-5 transition-colors ${
                      liked
                        ? 'text-lb-orange fill-lb-orange'
                        : 'text-lb-muted group-hover:text-lb-orange'
                    }`}
                  />
                  <span
                    className={`text-[10px] font-semibold tracking-wide ${
                      liked ? 'text-lb-orange' : 'text-lb-muted group-hover:text-lb-orange'
                    }`}
                  >
                    {liked ? t('action_liked') : t('action_like')}
                  </span>
                </button>

                {/* Watchlist */}
                <button
                  onClick={() =>
                    toggleWatchlist({
                      id: movie.id,
                      title: movie.title,
                      poster_path: movie.poster_path,
                      release_date: movie.release_date || '',
                    })
                  }
                  className="flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer group"
                  title={inWatchlist ? t('film_in_watchlist') : t('abs_add_watchlist')}
                >
                  <Clock
                    className={`w-5 h-5 transition-colors ${
                      inWatchlist ? 'text-lb-blue' : 'text-lb-muted group-hover:text-lb-blue'
                    }`}
                  />
                  <span
                    className={`text-[10px] font-semibold tracking-wide ${
                      inWatchlist ? 'text-lb-blue' : 'text-lb-muted group-hover:text-lb-blue'
                    }`}
                  >
                    {t('action_watchlist')}
                  </span>
                </button>
              </div>

              {/* Row 2: Rate interactive star widget */}
              <div className="border-t border-[#384654] py-2 px-3 flex flex-col items-center justify-center bg-lb-border-light">
                <span className="text-[10px] font-bold uppercase tracking-wider text-lb-muted mb-1">
                  {userRating > 0 ? t('film_rated') : t('action_rate')}
                </span>
                <StarRating
                  value={userRating}
                  onChange={(val) => setMovieRating(movie.id, val)}
                  size="md"
                />
              </div>

              {/* Row 3: Action Links List */}
              <div className="border-t border-[#384654] divide-y divide-[#384654] text-center font-medium bg-lb-border-light">
                {userLogsForMovie.length > 0 && (
                  <button
                    onClick={() =>
                      openLogModal({
                        id: movie.id,
                        title: movie.title,
                        poster_path: movie.poster_path,
                        release_date: movie.release_date,
                      })
                    }
                    className="w-full py-2 px-3 text-lb-white hover:text-white hover:bg-[#4e6275] transition-colors cursor-pointer block text-xs"
                  >
                    {t('film_show_activity')}
                  </button>
                )}

                <button
                  onClick={() =>
                    openLogModal({
                      id: movie.id,
                      title: movie.title,
                      poster_path: movie.poster_path,
                      release_date: movie.release_date,
                    })
                  }
                  className="w-full py-2 px-3 text-lb-white hover:text-white hover:bg-[#4e6275] transition-colors cursor-pointer block text-xs"
                >
                  {userLogsForMovie.length > 0 ? t('film_log_again') : t('review_or_log')}
                </button>

                {isAuthenticated && (
                  <>
                    <button
                      onClick={() => setImagePicker('backdrop')}
                      className="w-full py-2 px-3 text-lb-white hover:text-white hover:bg-[#4e6275] transition-colors cursor-pointer block text-xs"
                    >
                      {t('set_backdrop')}
                    </button>

                    <button
                      onClick={() => setImagePicker('poster')}
                      className="w-full py-2 px-3 text-lb-white hover:text-white hover:bg-[#4e6275] transition-colors cursor-pointer block text-xs"
                    >
                      {t('set_poster')}
                    </button>
                  </>
                )}

                <button
                  onClick={() =>
                    openLogModal({
                      id: movie.id,
                      title: movie.title,
                      poster_path: movie.poster_path,
                      release_date: movie.release_date,
                    })
                  }
                  className="w-full py-2 px-3 text-lb-white hover:text-white hover:bg-[#4e6275] transition-colors cursor-pointer block text-xs"
                >
                  {t('add_to_lists')}
                </button>
              </div>

              {/* Row 4: Share Link (Collapsible - matches MyWorld authentic look) */}
              <div className="border-t border-[#384654] bg-lb-border-light">
                <button
                  onClick={() => setShowSharePanel(!showSharePanel)}
                  className="w-full py-2 px-3 text-lb-white hover:text-white hover:bg-[#4e6275] transition-colors cursor-pointer block text-xs"
                >
                  {t('share')}
                </button>

                {showSharePanel && (
                  <div className="p-2 border-t border-[#384654] bg-[#394857] flex items-center justify-between gap-1.5 animate-fade-in">
                    <div className="flex-1 bg-[#2c3743] border border-lb-border-light rounded px-2 py-1 text-[11px] text-lb-white font-mono select-all truncate">
                      {shortUrl}
                    </div>
                    
                    {/* Copy URL */}
                    <button
                      onClick={handleCopyLink}
                      className="p-1.5 rounded hover:bg-lb-border-light text-lb-muted hover:text-white transition-colors cursor-pointer"
                      title={t('film_copy_url')}
                    >
                      {copiedLink ? (
                        <Check className="w-3.5 h-3.5 text-lb-green" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {/* Twitter / X */}
                    <button
                      onClick={shareTwitter}
                      className="p-1.5 rounded hover:bg-lb-border-light text-lb-muted hover:text-white transition-colors cursor-pointer"
                      title={t('film_share_twitter')}
                    >
                      <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                    </button>

                    {/* Facebook */}
                    <button
                      onClick={shareFacebook}
                      className="p-1.5 rounded hover:bg-lb-border-light text-lb-muted hover:text-white transition-colors cursor-pointer"
                      title={t('film_share_facebook')}
                    >
                      <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Community Rating Histogram */}
            <RatingHistogram
              averageRating={isOdyssey ? 4.01 : (movie.vote_average ? movie.vote_average / 2 : 3.8)}
              voteCount={isOdyssey ? 244000 : (movie.vote_count || 1420)}
            />
          </div>
        </div>

        {/* Similar — MOBILE: carrossel horizontal de 20 pôsteres (sem títulos
            nem estrelas embaixo, igual ao app); DESKTOP: grade de 6 (inalterada) */}
        {displaySimilar.length > 0 && (
          <section className="similar-section md:hidden">
            <div className="similar-header">
              <span>{isTv ? t('film_similar_series').toUpperCase() : t('film_similar_films').toUpperCase()}</span>
              <span aria-hidden="true">›</span>
            </div>
            <div className="similar-carousel">
              {displaySimilar.map((item) => (
                <Link
                  key={item.id}
                  to={`${isTv ? '/tv' : '/film'}/${item.id}`}
                  className="similar-card"
                  aria-label={item.title}
                >
                  <img
                    src={tmdb.getImageUrl(item.poster_path, 'w342')}
                    alt={item.title}
                    loading="lazy"
                    decoding="async"
                  />
                </Link>
              ))}
            </div>
          </section>
        )}

        {movie.similar?.results && movie.similar.results.length > 0 && (
          <section className="hidden md:block mt-16 pt-8 border-t border-lb-elevated space-y-4">
            <h2 className="text-xs uppercase tracking-widest font-bold text-lb-muted">
              {isTv ? t('film_similar_series') : t('film_similar_films')}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 sm:gap-4">
              {movie.similar.results.slice(0, 6).map((m) => (
                <PosterCard key={m.id} movie={m} size="fluid" showDetails tv={isTv} />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Set Poster / Backdrop Picker */}
      {imagePicker && (
        <ImagePickerModal
          mode={imagePicker}
          movieId={movie.id}
          currentUrl={imagePicker === 'poster' ? posterUrl : backdropUrl}
          onSelect={(url) =>
            setMovieOverride(
              movie.id,
              imagePicker === 'poster' ? { poster: url } : { backdrop: url }
            )
          }
          onClose={() => setImagePicker(null)}
        />
      )}

      {/* Gaveta de aÃ§Ãµes mobile (Watch/Like/Watchlist/Rate/Share) */}
      <ActionBottomSheet
        open={showActionSheet}
        onClose={() => setShowActionSheet(false)}
        movie={{ id: movie.id, title: movie.title, release_date: movie.release_date }}
        onPickImage={(mode) => setImagePicker(mode)}
      />

      {/* 3. Trailer Modal */}
      {showTrailerModal && trailerVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-3xl bg-lb-bg border border-lb-elevated rounded-lg shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-lb-elevated bg-lb-surface">
              <h3 className="text-sm font-semibold text-white">
                {movie.title} â€” {t('film_official_trailer')}
              </h3>
              <button
                onClick={() => setShowTrailerModal(false)}
                aria-label={t('film_close_trailer')}
                className="text-lb-muted hover:text-white transition-colors p-1 rounded hover:bg-lb-elevated cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="aspect-video w-full bg-black">
              <iframe
                src={`https://www.youtube.com/embed/${trailerVideo.key}?autoplay=1`}
                title={`${movie.title} Trailer`}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ===========================================================================
// COMPONENTES COMPARTILHADOS DAS 5 ABAS (desktop + mobile)
// Cast / Crew / Details (TMDB + IMDb) / Genres+Themes / Releases
// ===========================================================================

type TabKey = 'cast' | 'crew' | 'details' | 'genres' | 'releases';

// ---- Badge de classificação indicativa -------------------------------------
// Cores oficiais brasileiras: L verde, 10 azul, 12 amarelo, 14 laranja,
// 16 vermelho, 18 preto. Países estrangeiros: cinza neutro.
const BR_CERT_COLORS: Record<string, string> = {
  L: 'bg-[#16a34a] text-white',
  '10': 'bg-[#0284c7] text-white',
  '12': 'bg-[#facc15] text-black',
  '14': 'bg-[#f97316] text-white',
  '16': 'bg-[#dc2626] text-white',
  '18': 'bg-black text-white border border-white/40',
};
const CertBadge: React.FC<{ cert: string; small?: boolean }> = ({ cert, small }) => {
  const key = cert.replace(/\s/g, '').toUpperCase();
  const colors = BR_CERT_COLORS[key] ?? 'bg-[#556677] text-white';
  return (
    <span
      title={cert}
      className={`inline-flex items-center justify-center rounded-[3px] font-black leading-none shrink-0 ${colors} ${
        small ? 'text-[9px] min-w-[18px] h-[18px] px-1' : 'text-[10px] min-w-[20px] h-[20px] px-1'
      }`}
    >
      {cert}
    </span>
  );
};

// Bandeira emoji a partir do ISO 3166-1 (ex.: 'BR' → 🇧🇷)
const flagEmoji = (iso: string): string =>
  /^[A-Za-z]{2}$/.test(iso)
    ? iso.toUpperCase().replace(/./g, (c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    : '';

// ---- 1. CAST ---------------------------------------------------------------
const CastTab: React.FC<{ movie: TMDBMovieDetails; mobile?: boolean }> = ({ movie }) => {
  const { t } = useLanguage();
  const [showAll, setShowAll] = useState(false);
  const cast = movie.credits?.cast ?? [];
  if (cast.length === 0) {
    return (
      <div className="py-12 text-center space-y-2">
        <p className="text-sm text-white font-semibold">—</p>
        <p className="text-xs text-lb-muted">{t('cast_empty')}</p>
      </div>
    );
  }
  const LIMIT = 10;
  const shown = showAll ? cast : cast.slice(0, LIMIT);
  const hiddenCount = cast.length - LIMIT;
  return (
    <div>
      <ul>
        {shown.map((actor) => (
          <li key={`${actor.id}-${actor.character ?? ''}`}>
            <Link
              to={openPersonProfile(actor.id, 'Actor')}
              className="flex items-center gap-3 px-0 md:px-2 py-2.5 hover:bg-lb-surface/60 transition-colors"
            >
              {actor.profile_path ? (
                <img
                  loading="lazy"
                  decoding="async"
                  src={tmdb.getProfileUrl(actor.profile_path, 'w185')}
                  alt=""
                  className="w-[53px] h-[53px] rounded-[4px] object-cover shrink-0 bg-lb-elevated"
                />
              ) : (
                <div className="w-[53px] h-[53px] rounded-[4px] shrink-0 bg-lb-elevated flex items-center justify-center text-lb-muted">
                  <Users className="w-5 h-5" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[15px] text-white truncate leading-tight">{actor.name}</p>
                {actor.character && (
                  <p className="text-[13px] text-lb-muted truncate leading-snug mt-0.5">{actor.character}</p>
                )}
              </div>
              <ChevronRight className="w-5 h-5 text-lb-muted shrink-0" />
            </Link>
          </li>
        ))}
      </ul>
      {cast.length > LIMIT && (
        <button
          onClick={() => setShowAll((v) => !v)}
          className="w-full mt-2 py-3 text-xs font-semibold uppercase tracking-[0.15em] text-white hover:text-lb-green transition-colors cursor-pointer"
        >
          {showAll ? '−' : `${t('show_more')} ${hiddenCount}`}
        </button>
      )}
    </div>
  );
};

// ---- 2. CREW (agrupado por cargo, layout Letterboxd com linha pontilhada) --

const CREW_GROUPS: { key: TranslationKey; jobs: string[]; role?: PersonRole }[] = [
  { key: 'crew_director', jobs: ['Director', 'Creator'], role: 'Director' },
  { key: 'crew_writers', jobs: ['Screenplay', 'Writer', 'Author', 'Novel', 'Story'], role: 'Writer' },
  { key: 'crew_producers', jobs: ['Producer', 'Co-Producer', 'Associate Producer'], role: 'Producer' },
  { key: 'crew_exec_producers', jobs: ['Executive Producer'], role: 'Executive Producer' },
  { key: 'crew_composer', jobs: ['Original Music Composer', 'Composer', 'Music'], role: 'Composer' },
  { key: 'crew_cinematography', jobs: ['Director of Photography', 'Cinematography'], role: 'Cinematography' },
  { key: 'crew_editor', jobs: ['Editor', 'Film Editor'], role: 'Editor' },
  { key: 'crew_production_design', jobs: ['Production Design'] },
  { key: 'crew_art_direction', jobs: ['Art Direction'] },
  { key: 'crew_set_decoration', jobs: ['Set Decoration'] },
  { key: 'crew_costume', jobs: ['Costume Design', 'Costume Designer'] },
  { key: 'crew_makeup', jobs: ['Makeup Artist', 'Makeup Department Head', 'Hairstylist', 'Hair Department Head', 'Makeup & Hair'] },
  { key: 'crew_vfx', jobs: ['Visual Effects Supervisor', 'Visual Effects', 'VFX Supervisor', 'Special Effects'] },
  { key: 'crew_stunts', jobs: ['Stunt Coordinator', 'Stunts', 'Stunt Double'] },
  { key: 'crew_sound', jobs: ['Sound', 'Sound Mixer', 'Sound Designer', 'Supervising Sound Editor', 'Sound Re-Recording Mixer'] },
];

const CrewTab: React.FC<{ movie: TMDBMovieDetails }> = ({ movie }) => {
  const { t } = useLanguage();
  const crew = movie.credits?.crew ?? [];
  const [showAll, setShowAll] = useState(false);
  const LIMIT = 10;

  // Lista única (como no Elenco): cada pessoa aparece uma vez por cargo,
  // na ordem dos grupos (Direção, Roteiro, Produção...)
  const rows = CREW_GROUPS.flatMap((g) =>
    crew
      .filter((c) => g.jobs.includes(c.job))
      .map((c, i) => ({
        key: `${g.key}-${c.id}-${i}`,
        id: c.id,
        name: c.name,
        job: c.job,
        profile_path: c.profile_path,
        role: g.role,
      })),
  );

  if (rows.length === 0) {
    return <p className="py-8 text-center text-xs text-lb-muted">{t('cast_empty')}</p>;
  }

  const shown = showAll ? rows : rows.slice(0, LIMIT);
  const hiddenCount = rows.length - LIMIT;
  return (
    <div>
      <ul>
        {shown.map((p) => (
          <li key={p.key}>
            <Link
              to={openPersonProfile(p.id, p.role ?? 'Actor')}
              className="flex items-center gap-3 px-0 md:px-2 py-2.5 hover:bg-lb-surface/60 transition-colors"
            >
              {p.profile_path ? (
                <img
                  loading="lazy"
                  decoding="async"
                  src={tmdb.getProfileUrl(p.profile_path, 'w185')}
                  alt=""
                  className="w-[53px] h-[53px] rounded-[4px] object-cover shrink-0 bg-lb-elevated"
                />
              ) : (
                <div className="w-[53px] h-[53px] rounded-[4px] shrink-0 bg-lb-elevated flex items-center justify-center text-lb-muted">
                  <Users className="w-5 h-5" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[15px] text-white truncate leading-tight">{p.name}</p>
                <p className="text-[13px] text-lb-muted truncate leading-snug mt-0.5">{p.job}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-lb-muted shrink-0" />
            </Link>
          </li>
        ))}
      </ul>
      {rows.length > LIMIT && (
        <button
          onClick={() => setShowAll((v) => !v)}
          className="w-full mt-2 py-3 text-xs font-semibold uppercase tracking-[0.15em] text-white hover:text-lb-green transition-colors cursor-pointer"
        >
          {showAll ? '−' : `${t('show_more')} ${hiddenCount}`}
        </button>
      )}
    </div>
  );
};

// ---- 3. DETAILS (Ficha TMDB + Box Office + Tech Specs/Trivia IMDb) ---------
interface ImdbSpec { label: string; value: string }
interface ImdbTrivia { text: string; spoiler: boolean }
interface ImdbData { specs: ImdbSpec[]; trivia: ImdbTrivia[] }

/** Hook com cache em localStorage (chave imdb_<id>) */
function useImdbData(imdbId: string | null | undefined): ImdbData | null {
  const [data, setData] = useState<ImdbData | null>(null);
  useEffect(() => {
    if (!imdbId) return;
    let cancelled = false;
    const key = `imdb_${imdbId}`;
    try {
      const cached = localStorage.getItem(key);
      if (cached) {
        setData(JSON.parse(cached));
        return;
      }
    } catch { /* cache ilegível */ }
    fetch(`/api/imdb?imdbId=${imdbId}`)
      .then((r) => (r.ok ? r.json() : { specs: [], trivia: [] }))
      .then((d: ImdbData) => {
        if (cancelled) return;
        setData(d);
        try { localStorage.setItem(key, JSON.stringify(d)); } catch { /* quota */ }
      })
      .catch(() => { if (!cancelled) setData({ specs: [], trivia: [] }); });
    return () => { cancelled = true; };
  }, [imdbId]);
  return data;
}

// Mapeia rótulos do IMDb (em inglês) para as chaves traduzidas da aba
const SPEC_LABEL_MAP: Record<string, TranslationKey> = {
  'runtime': 'tech_runtime',
  'aspect ratio': 'tech_aspect_ratio',
  'camera': 'tech_camera',
  'laboratory': 'tech_laboratory',
  'negative format': 'tech_negative_format',
  'cinematographic process': 'tech_cine_process',
  'printed film format': 'tech_printed_format',
  'color': 'tech_color',
  'sound mix': 'tech_sound_mix',
};

const DetailRow: React.FC<{ label: string; children?: React.ReactNode }> = ({ label, children }) =>
  children ? (
    <div className="flex items-baseline gap-2">
      <span className="text-[10px] uppercase font-bold text-lb-muted whitespace-nowrap shrink-0">
        {label}
      </span>
      <span className="border-b border-dotted border-white/15 flex-1 mx-2 -translate-y-1" aria-hidden="true" />
      <span className="text-white text-right max-w-[70%]">{children}</span>
    </div>
  ) : null;

const DetailsTab: React.FC<{ movie: TMDBMovieDetails; isTv: boolean }> = ({ movie, isTv }) => {
  const { language, t } = useLanguage();
  const regions = useMemo(() => regionNames(language), [language]);
  const langs = useMemo(() => languageNames(language), [language]);
  const imdb = useImdbData(isTv ? null : movie.external_ids?.imdb_id);
  const [showAllTrivia, setShowAllTrivia] = useState(false);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());

  const altTitles = movie.alternative_titles?.titles ?? movie.alternative_titles?.results ?? [];
  const spoken = movie.spoken_languages?.map((l) => l.english_name || l.name).filter(Boolean) ?? [];
  const triviaShown = imdb?.trivia ? (showAllTrivia ? imdb.trivia : imdb.trivia.slice(0, 5)) : [];

  return (
    <div className="space-y-5 text-xs">
      {/* Seção 1 — Ficha de Produção (TMDB) */}
      <section className="space-y-2.5">
        <h4 className="text-[10px] uppercase font-bold tracking-wider text-white border-b border-lb-elevated pb-1">
          {t('det_production_info')}
        </h4>
        <DetailRow label={t('det_studios')}>
          {movie.production_companies?.length
            ? movie.production_companies.map((c) => c.name).join(', ')
            : undefined}
        </DetailRow>
        <DetailRow label={t('det_countries')}>
          {movie.production_countries?.length
            ? movie.production_countries
                .map((c) => regions.of(c.iso_3166_1) ?? c.name)
                .join(', ')
            : undefined}
        </DetailRow>
        <DetailRow label={t('det_primary_language')}>
          {movie.original_language
            ? langs.of(movie.original_language) ?? movie.original_language.toUpperCase()
            : undefined}
        </DetailRow>
        {spoken.length > 0 && (
          <DetailRow label={t('det_spoken_languages')}>{spoken.join(', ')}</DetailRow>
        )}
        {altTitles.length > 0 && (
          <DetailRow label={t('det_alt_titles')}>
            {altTitles.slice(0, 5).map((a) => `${a.title} (${a.iso_3166_1})`).join(' · ')}
          </DetailRow>
        )}
        {movie.status && <DetailRow label={t('det_status')}>{movie.status}</DetailRow>}
      </section>

      {/* Seção 2 — Box Office (TMDB) */}
      {(movie.budget > 0 || movie.revenue > 0) && !isTv && (
        <section className="space-y-2.5">
          <h4 className="text-[10px] uppercase font-bold tracking-wider text-white border-b border-lb-elevated pb-1">
            {t('det_box_office')}
          </h4>
          {movie.budget > 0 && (
            <DetailRow label={t('det_budget')}>{formatMoneyUSD(language, movie.budget)}</DetailRow>
          )}
          {movie.revenue > 0 && (
            <DetailRow label={t('det_revenue')}>{formatMoneyUSD(language, movie.revenue)}</DetailRow>
          )}
        </section>
      )}

      {/* Seção 3 — Technical Specifications (IMDb) */}
      {!isTv && imdb && imdb.specs.length > 0 && (
        <section className="space-y-2.5">
          <h4 className="text-[10px] uppercase font-bold tracking-wider text-white border-b border-lb-elevated pb-1">
            {t('tech_specs')}
          </h4>
          {imdb.specs.map((s, i) => {
            const mapped = SPEC_LABEL_MAP[s.label.toLowerCase()];
            return (
              <DetailRow key={`${s.label}-${i}`} label={mapped ? t(mapped) : s.label}>
                {s.value}
              </DetailRow>
            );
          })}
        </section>
      )}

      {/* Seção 4 — Trivia / Curiosidades (IMDb) */}
      {!isTv && imdb && imdb.trivia.length > 0 && (
        <section className="space-y-2.5">
          <h4 className="text-[10px] uppercase font-bold tracking-wider text-white border-b border-lb-elevated pb-1">
            {t('trivia')}
          </h4>
          <div className="space-y-2">
            {triviaShown.map((item, i) => {
              const hidden = item.spoiler && !revealed.has(i);
              return (
                <div key={i} className="relative bg-lb-surface border border-lb-elevated rounded p-3">
                  <p className={`text-lb-text leading-relaxed transition-all ${hidden ? 'blur-sm select-none' : ''}`}>
                    {item.text}
                  </p>
                  {hidden && (
                    <button
                      onClick={() => setRevealed((prev) => new Set(prev).add(i))}
                      className="absolute inset-0 flex items-center justify-center text-[11px] font-bold uppercase tracking-wider text-white bg-black/40 hover:bg-black/50 rounded cursor-pointer"
                    >
                      {t('reveal_spoiler')}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          {imdb.trivia.length > 5 && (
            <button
              onClick={() => setShowAllTrivia((v) => !v)}
              className="text-xs font-bold text-lb-green hover:underline cursor-pointer"
            >
              {showAllTrivia ? '−' : t('show_all')}
            </button>
          )}
        </section>
      )}
    </div>
  );
};

// ---- 4. GENRES + THEMES ----------------------------------------------------
const GenresTab: React.FC<{ movie: TMDBMovieDetails; isTv: boolean }> = ({ movie, isTv }) => {
  const { t } = useLanguage();
  const themes = movie.keywords?.keywords ?? movie.keywords?.results ?? [];
  return (
    <div className="space-y-5">
      <div>
        <h4 className="text-[10px] uppercase font-bold tracking-wider text-white border-b border-lb-elevated pb-1 mb-2.5">
          {t('genres_label')}
        </h4>
        <div className="flex flex-wrap gap-2">
          {movie.genres?.map((g) => (
            <Link
              key={g.id}
              to={isTv ? `/series/decade/2020s?genre=${g.id}` : `/films/decade/2020s?genre=${g.id}`}
              className="bg-[#202830] border border-lb-elevated hover:border-lb-green text-lb-white hover:text-lb-green px-3 py-1 rounded text-xs transition-colors"
            >
              {g.name}
            </Link>
          ))}
        </div>
      </div>
      {themes.length > 0 && (
        <div>
          <h4 className="text-[10px] uppercase font-bold tracking-wider text-white border-b border-lb-elevated pb-1 mb-2.5">
            {t('themes_label')}
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {themes.slice(0, 30).map((k) => (
              <span
                key={k.id}
                className="bg-lb-bg border border-lb-elevated text-lb-text px-2.5 py-1 rounded text-[11px]"
              >
                {k.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ---- 5. RELEASES (agrupado por tipo, ordenado cronologicamente) ------------
const RELEASE_TYPE_LABELS: Record<number, TranslationKey> = {
  1: 'rel_premiere',
  2: 'rel_theatrical_limited',
  3: 'rel_theatrical',
  4: 'rel_digital',
  5: 'rel_physical',
  6: 'rel_tv',
};

const ReleasesTab: React.FC<{ movie: TMDBMovieDetails }> = ({ movie }) => {
  const { language, t } = useLanguage();
  const regions = useMemo(() => regionNames(language), [language]);

  const entries = useMemo(() => {
    const list: { iso: string; type: number; date: string; cert: string; note: string }[] = [];
    for (const r of movie.release_dates?.results ?? []) {
      for (const d of r.release_dates) {
        list.push({
          iso: r.iso_3166_1,
          type: d.type,
          date: d.release_date || '',
          cert: d.certification || '',
          note: d.note || '',
        });
      }
    }
    return list;
  }, [movie]);

  if (entries.length === 0) {
    return (
      <div className="divide-y divide-lb-elevated text-sm">
        <div className="flex items-center justify-between py-2.5">
          <span className="text-white font-medium">{t('rel_theatrical')}</span>
          <span className="text-lb-muted text-xs">
            {movie.release_date ? formatDatePt(language, movie.release_date) : t('na')}
          </span>
        </div>
      </div>
    );
  }

  const groups = [1, 2, 3, 4, 5, 6]
    .map((type) => ({
      type,
      items: entries
        .filter((e) => e.type === type)
        .sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999')),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="space-y-5">
      {groups.map((g) => (
        <div key={g.type}>
          <h4 className="text-[10px] uppercase font-bold tracking-wider text-white border-b border-lb-elevated pb-1 mb-2">
            {t(RELEASE_TYPE_LABELS[g.type])}
          </h4>
          <div className="divide-y divide-lb-elevated/50 text-xs">
            {g.items.map((e, i) => (
              <div key={i} className="flex items-center gap-2.5 py-2">
                <span className="text-base leading-none" aria-hidden="true">{flagEmoji(e.iso)}</span>
                <span className="text-white font-medium">{regions.of(e.iso) ?? e.iso}</span>
                {e.cert && <CertBadge cert={e.cert} small />}
                <span className="flex-1" />
                <span className="text-lb-muted">{e.date ? formatDatePt(language, e.date.slice(0, 10)) : '—'}</span>
                {e.note && <span className="text-lb-muted/70 italic truncate max-w-[30%]">{e.note}</span>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// ---- Dispatcher compartilhado desktop/mobile -------------------------------
const FilmTabContent: React.FC<{
  activeTab: TabKey;
  movie: TMDBMovieDetails;
  isTv: boolean;
  numberOfSeasons?: number;
  mobile?: boolean;
}> = ({ activeTab, movie, isTv, mobile }) => {
  switch (activeTab) {
    case 'cast':
      return <CastTab movie={movie} mobile={mobile} />;
    case 'crew':
      return <CrewTab movie={movie} />;
    case 'details':
      return <DetailsTab movie={movie} isTv={isTv} />;
    case 'genres':
      return <GenresTab movie={movie} isTv={isTv} />;
    case 'releases':
      return <ReleasesTab movie={movie} />;
    default:
      return null;
  }
};
