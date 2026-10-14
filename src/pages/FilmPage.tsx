import React, { useEffect, useState } from 'react';
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
  MessageSquare,
  List,
  ChevronRight,
} from 'lucide-react';
import { tmdb, type TMDBMovieDetails } from '../services/tmdb';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { StarRating } from '../components/StarRating';
import { RatingHistogram } from '../components/RatingHistogram';
import { WhereToWatch } from '../components/WhereToWatch';
import { PosterCard } from '../components/PosterCard';
import { ImagePickerModal } from '../components/ImagePickerModal';
import { Backdrop } from '../components/Backdrop';
import { ActionBottomSheet } from '../components/ActionBottomSheet';

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
        <p className="text-xs text-lb-text tracking-wide">{isTv ? 'Loading series...' : 'Loading film...'}</p>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="max-w-[950px] mx-auto px-4 py-32 text-center">
        <h2 className="text-xl font-bold text-white mb-2 font-serif">{isTv ? 'Series not found' : 'Film not found'}</h2>
        <Link to={isTv ? '/series' : '/films'} className="text-sm text-lb-green hover:underline">
          {isTv ? 'Return to series catalog' : 'Return to films catalog'}
        </Link>
      </div>
    );
  }

  // Logs & Reviews
  const userLogsForMovie = logs.filter((l) => l.movieId === movie.id);
  const movieReviews = reviews.filter((r) => r.movieId === movie.id);
  const hasUserReviewed = userLogsForMovie.some((l) => l.reviewText && l.reviewText.trim().length > 0);

  const watched = isMovieWatched(movie.id) || userLogsForMovie.length > 0;
  const liked = isMovieLiked(movie.id) || userLogsForMovie.some((l) => l.liked);
  const inWatchlist = isMovieInWatchlist(movie.id);
  const userRating = ratingsMap[movie.id] || (userLogsForMovie[0]?.rating ? userLogsForMovie[0].rating : 0);

  // Key Crew Members
  const director = movie.credits?.crew.find((c) => c.job === 'Director' || c.job === 'Creator');
  const writers = movie.credits?.crew.filter((c) =>
    ['Screenplay', 'Writer', 'Author', 'Novel'].includes(c.job)
  ).slice(0, 3);
  const producers = movie.credits?.crew.filter((c) =>
    ['Producer', 'Executive Producer'].includes(c.job)
  ).slice(0, 3);
  const dop = movie.credits?.crew.find((c) =>
    ['Director of Photography', 'Cinematography'].includes(c.job)
  );
  const composer = movie.credits?.crew.find((c) =>
    ['Original Music Composer', 'Composer', 'Music'].includes(c.job)
  );

  // Trailer finding
  const trailerVideo =
    movie.videos?.results.find(
      (v) => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')
    ) || movie.videos?.results.find((v) => v.site === 'YouTube');

  // Format release year
  const releaseYear = movie.release_date ? movie.release_date.slice(0, 4) : '';

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
      {backdropUrl && <Backdrop src={backdropUrl} alt={movie.title} />}

      {/* Floating back + overflow buttons over the backdrop â€” mobile only (app-style) */}
      <div className="md:hidden absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-3 pt-3">
        <button
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="w-9 h-9 rounded-full bg-black/40 backdrop-blur flex items-center justify-center text-white shadow-md active:scale-95 transition-transform"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <button
          onClick={() => setShowActionSheet(true)}
          aria-label="More actions"
          className="w-9 h-9 rounded-full bg-black/40 backdrop-blur flex items-center justify-center text-white shadow-md active:scale-95 transition-transform"
        >
          <MoreVertical className="w-5 h-5" />
        </button>
      </div>

      {/* 2. Main Content Container: 3-column myworld layout */}
      <div
        className={`relative z-10 max-w-[950px] mx-auto px-4 pb-16 ${
          backdropUrl ? '-mt-10 md:-mt-[150px]' : 'pt-20'
        }`}
      >
        <div className="flex flex-col md:grid md:grid-cols-[230px_minmax(0,1fr)_230px] gap-8 items-start">

          {/* ========================================================
              LEFT COLUMN (w-[230px]): Poster, Stats Bar, Where to Watch
              (ocupa as 2 linhas do grid em telas md+)
              ======================================================== */}
          <div className="w-full md:w-[230px] md:row-span-2 flex-shrink-0 flex flex-col items-center md:items-start">
            {/* Film Poster (230x345px standard) */}
            {/* No mobile o pÃ´ster aparece compacto ao lado do tÃ­tulo (acima) */}
            <div className="hidden md:block w-[230px] h-[345px] rounded-sm overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.8)] border border-[#303840] bg-lb-surface flex-shrink-0">
              <img loading="lazy" decoding="async"
                src={posterUrl}
                alt={movie.title}
                className="w-full h-full object-cover"
              />
            </div>

            {/* MyWorld 4-metric Badge Row — desktop only (no mobile ficam os 3 cartões coloridos) */}
            <div className="hidden md:flex w-[230px] max-w-full border-b border-lb-elevated py-2 px-1 items-center justify-between text-xs select-none">
              <div className="flex items-center gap-1.5" title={`${watchedStat.toLocaleString()} watched`}>
                <Eye className="w-4 h-4 text-lb-green" />
                <span className="text-lb-muted font-medium text-[11px]">{formatNumber(watchedStat)}</span>
              </div>
              <div className="flex items-center gap-1.5" title={`${ratingsStat.toLocaleString()} ratings`}>
                <BarChart2 className="w-4 h-4 text-lb-blue" />
                <span className="text-lb-muted font-medium text-[11px]">{formatNumber(ratingsStat)}</span>
              </div>
              <div className="flex items-center gap-1.5" title={`${likesStat.toLocaleString()} likes`}>
                <Heart className="w-4 h-4 text-lb-orange fill-lb-orange" />
                <span className="text-lb-muted font-medium text-[11px]">{formatNumber(likesStat)}</span>
              </div>
              <div className="flex items-center gap-1.5" title={`${listsStat.toLocaleString()} lists`}>
                <Layers className="w-4 h-4 text-[#e5a00d]" />
                <span className="text-lb-muted font-medium text-[11px]">{formatNumber(listsStat)}</span>
              </div>
            </div>

            {/* Where to Watch — desktop only (oculto no mobile para o cabeçalho colar no backdrop) */}
            <div className="hidden md:block w-[230px] max-w-full mt-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold tracking-wider uppercase text-lb-muted">
                  Where to watch
                </span>
                {trailerVideo ? (
                  <button
                    onClick={() => setShowTrailerModal(true)}
                    className="inline-flex items-center gap-1.5 bg-[#202830] hover:bg-lb-elevated border border-lb-elevated text-white text-[11px] font-medium px-2.5 py-0.5 rounded-full transition-colors cursor-pointer"
                  >
                    <Play className="w-2.5 h-2.5 fill-white text-white" />
                    <span>Trailer</span>
                  </button>
                ) : null}
              </div>

              {/* Providers Pill Box */}
              <WhereToWatch providers={movie['watch/providers']} />
            </div>
          </div>

          {/* ========================================================
              HEADER: Title + Year + Director + Tagline
              (ocupa as colunas do centro E da direita â€” como no Letterboxd,
              permitindo tÃ­tulos longos em uma Ãºnica linha)
              ======================================================== */}
          <div className="md:col-span-2 min-w-0 md:px-2 flex max-md:items-start md:items-end justify-between gap-4">
            {/* Bloco de texto: título + ano/diretor + tagline */}
            <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                <h1 className="font-sans md:font-serif font-bold text-2xl sm:text-[32px] text-white tracking-tight leading-tight">
                  {movie.title}
                </h1>
              </div>

              {/* DESKTOP: ano + diretor + duração na mesma linha */}
              <div className="hidden md:flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 mt-1 text-xs text-lb-muted">
                {releaseYear && (
                  <Link
                    to={isTv ? `/series/year/${releaseYear}` : `/films/year/${releaseYear}`}
                    className="text-lb-muted hover:text-white underline underline-offset-2 decoration-lb-muted/40 hover:decoration-white transition-colors"
                  >
                    {releaseYear}
                  </Link>
                )}
                {director && (
                  <span className="whitespace-nowrap">
                    {isTv ? 'Created by' : 'Directed by'}{' '}
                    <Link
                      to={`/actor/${director.id}`}
                      className="font-semibold text-lb-muted hover:text-white underline underline-offset-2 decoration-lb-muted/40 hover:decoration-white transition-colors"
                    >
                      {director.name}
                    </Link>
                  </span>
                )}
                {!isTv && movie.runtime ? (
                  <span>&bull; {Math.floor(movie.runtime / 60)}h {movie.runtime % 60}m</span>
                ) : null}
                {isTv && numberOfSeasons ? (
                  <span>&bull; {numberOfSeasons} season{numberOfSeasons === 1 ? '' : 's'}</span>
                ) : null}
              </div>

              {/* MOBILE (app): "2026 • DIRECTED BY" pequeno cinza + nome do diretor em destaque */}
              <div className="md:hidden">
                <p className="text-[11px] tracking-wider uppercase text-[#9ab] mt-1">
                  {releaseYear}
                  {releaseYear && director ? ' \u2022 ' : ''}
                  {director ? (isTv ? 'Created by' : 'Directed by') : ''}
                </p>
                {director && (
                  <Link
                    to={`/actor/${director.id}`}
                    className="text-sm font-semibold text-[#def] block mt-0.5"
                  >
                    {director.name}
                  </Link>
                )}

                {/* Trailer pill + minutos/temporadas */}
                <div className="flex items-center gap-3 mt-2.5">
                  <a
                    href={trailerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 bg-[#2c3440] text-[11px] font-semibold tracking-wider uppercase px-3 py-1 rounded-full text-[#def]"
                  >
                    <Play className="w-2.5 h-2.5 fill-[#def] text-[#def]" />
                    Trailer
                  </a>
                  {!isTv && movie.runtime ? (
                    <span className="text-xs text-[#9ab]">{movie.runtime} mins</span>
                  ) : null}
                  {isTv && numberOfSeasons ? (
                    <span className="text-xs text-[#9ab]">
                      {numberOfSeasons} season{numberOfSeasons === 1 ? '' : 's'}
                    </span>
                  ) : null}
                </div>
              </div>

            {/* Tagline (MyWorld uppercase tracking) */}
            {movie.tagline && (
              <p className="uppercase tracking-[0.14em] font-semibold text-[10px] text-lb-muted mt-2 leading-snug">
                {movie.tagline.replace(/^"|"$/g, '')}
              </p>
            )}
            </div>

            {/* PÃ´ster compacto Ã  direita â€” SOMENTE mobile (padrÃ£o app Letterboxd) */}
            <div className="md:hidden w-[92px] shrink-0">
              <div className="w-full aspect-[2/3] rounded-[4px] overflow-hidden ring-1 ring-white/15 shadow-xl bg-lb-surface">
                <img loading="lazy" decoding="async" src={posterUrl} alt={movie.title} className="w-full h-full object-cover" />
              </div>
            </div>
          </div>

          {/* ========================================================
              CENTER COLUMN: Synopsis, Tabs, Reviews
              ======================================================== */}
          <div className="min-w-0 md:px-2 space-y-3">
            {/* Overview / Synopsis â€” mobile: 3 linhas com toque para expandir */}
            <div
              className="text-[13px] text-lb-text leading-[1.6] font-normal cursor-pointer md:cursor-default"
              onClick={() => setShowFullSynopsis((v) => !v)}
            >
              <p className={showFullSynopsis ? '' : 'max-md:line-clamp-3'}>
                {movie.overview || 'Synopsis not available for this film.'}
                {!showFullSynopsis && (
                  <span className="md:hidden text-lb-muted"> ...more</span>
                )}
              </p>
            </div>

            {/* RATINGS — mobile only: label à esquerda, estrela verde na base,
                barras verticais cinzas no meio, média grande + 5 estrelas à direita */}
            <div className="md:hidden border-t border-white/10 pt-3 mt-4">
              <span className="text-[11px] uppercase tracking-wider text-[#9ab]">Ratings</span>
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
                    <div className="flex-1 flex items-end gap-1 h-12 border-b border-white/10">
                      {dist.map((v, i) => (
                        <div
                          key={i}
                          className="flex-1 bg-[#556677] rounded-t-[1px]"
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
            <div className="md:hidden grid grid-cols-3 gap-2 my-4">
              <div className="bg-[#00b020] rounded-md p-2.5 flex flex-col gap-1 text-white">
                <Eye className="w-4 h-4" />
                <span className="text-sm font-bold leading-tight">Members</span>
                <span className="text-[11px] opacity-90">{formatNumber(watchedStat)}</span>
              </div>
              <div className="bg-[#445566] rounded-md p-2.5 flex flex-col gap-1 text-white">
                <MessageSquare className="w-4 h-4" />
                <span className="text-sm font-bold leading-tight">Reviews</span>
                <span className="text-[11px] opacity-90">
                  {movieReviews.length > 0 ? movieReviews.length : formatNumber(ratingsStat)}
                </span>
              </div>
              <div className="bg-[#209ce4] rounded-md p-2.5 flex flex-col gap-1 text-white">
                <Layers className="w-4 h-4" />
                <span className="text-sm font-bold leading-tight">Lists</span>
                <span className="text-[11px] opacity-90">{formatNumber(listsStat)}</span>
              </div>
            </div>

            {/* MyWorld Tabs Bar: Cast, Crew, Details, Genres (DESKTOP ONLY — mobile uses app-style tabs below) */}
            <div className="hidden md:block pt-2">
              <div className="flex items-center gap-6 border-b border-lb-elevated text-[11px] uppercase font-bold tracking-wider pb-1">
                <button
                  onClick={() => setActiveTab('cast')}
                  className={`pb-2 -mb-[1px] transition-colors cursor-pointer ${
                    activeTab === 'cast'
                      ? 'text-white border-b-2 border-lb-green'
                      : 'text-lb-muted hover:text-white'
                  }`}
                >
                  Cast
                </button>
                <button
                  onClick={() => setActiveTab('crew')}
                  className={`pb-2 -mb-[1px] transition-colors cursor-pointer ${
                    activeTab === 'crew'
                      ? 'text-white border-b-2 border-lb-green'
                      : 'text-lb-muted hover:text-white'
                  }`}
                >
                  Crew
                </button>
                <button
                  onClick={() => setActiveTab('details')}
                  className={`pb-2 -mb-[1px] transition-colors cursor-pointer ${
                    activeTab === 'details'
                      ? 'text-white border-b-2 border-lb-green'
                      : 'text-lb-muted hover:text-white'
                  }`}
                >
                  Details
                </button>
                <button
                  onClick={() => setActiveTab('genres')}
                  className={`pb-2 -mb-[1px] transition-colors cursor-pointer ${
                    activeTab === 'genres'
                      ? 'text-white border-b-2 border-lb-green'
                      : 'text-lb-muted hover:text-white'
                  }`}
                >
                  Genres
                </button>
              </div>

              {/* Tab Contents */}
              <div className="py-4">
                {/* 1. Cast Tab */}
                {activeTab === 'cast' && (
                  movie.credits?.cast && movie.credits.cast.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {movie.credits?.cast?.slice(0, 18).map((actor) => (
                      <Link
                        to={`/actor/${actor.id}`}
                        key={actor.id}
                        className="bg-[#202830] hover:bg-lb-elevated border border-lb-elevated hover:border-lb-border-light text-lb-white px-2.5 py-1 rounded text-xs inline-flex items-center gap-1.5 transition-colors"
                        title={actor.character ? `as ${actor.character}` : undefined}
                      >
                        <span className="font-medium">{actor.name}</span>
                        {actor.character && (
                          <span className="text-[10px] text-lb-muted">
                            ({actor.character})
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                  ) : (
                    <div className="py-12 text-center space-y-2">
                      <p className="text-sm text-white font-semibold">Nothing here yet</p>
                      <p className="text-xs text-lb-muted">Cast information is not available for this film.</p>
                    </div>
                  )
                )}

                {/* 2. Crew Tab */}
                {activeTab === 'crew' && (
                  <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs">
                    {director && (
                      <div>
                        <span className="text-lb-muted uppercase block text-[10px] font-bold">
                          Director
                        </span>
                        <Link
                          to={`/actor/${director.id}`}
                          className="text-white font-medium hover:text-lb-green underline underline-offset-2 decoration-white/30 hover:decoration-lb-green transition-colors"
                        >
                          {director.name}
                        </Link>
                      </div>
                    )}
                    {writers && writers.length > 0 && (
                      <div>
                        <span className="text-lb-muted uppercase block text-[10px] font-bold">
                          Writers
                        </span>
                        <span className="text-white font-medium">
                          {writers.map((w, i) => (
                            <span key={w.id}>
                              {i > 0 && ', '}
                              <Link
                                to={`/actor/${w.id}`}
                                className="hover:text-lb-green underline underline-offset-2 decoration-white/30 hover:decoration-lb-green transition-colors"
                              >
                                {w.name}
                              </Link>
                            </span>
                          ))}
                        </span>
                      </div>
                    )}
                    {producers && producers.length > 0 && (
                      <div>
                        <span className="text-lb-muted uppercase block text-[10px] font-bold">
                          Producers
                        </span>
                        <span className="text-white font-medium">
                          {producers.map((p, i) => (
                            <span key={p.id}>
                              {i > 0 && ', '}
                              <Link
                                to={`/actor/${p.id}`}
                                className="hover:text-lb-green underline underline-offset-2 decoration-white/30 hover:decoration-lb-green transition-colors"
                              >
                                {p.name}
                              </Link>
                            </span>
                          ))}
                        </span>
                      </div>
                    )}
                    {dop && (
                      <div>
                        <span className="text-lb-muted uppercase block text-[10px] font-bold">
                          Cinematography
                        </span>
                        <Link
                          to={`/actor/${dop.id}`}
                          className="text-white font-medium hover:text-lb-green underline underline-offset-2 decoration-white/30 hover:decoration-lb-green transition-colors"
                        >
                          {dop.name}
                        </Link>
                      </div>
                    )}
                    {composer && (
                      <div>
                        <span className="text-lb-muted uppercase block text-[10px] font-bold">
                          Original Score
                        </span>
                        <Link
                          to={`/actor/${composer.id}`}
                          className="text-white font-medium hover:text-lb-green underline underline-offset-2 decoration-white/30 hover:decoration-lb-green transition-colors"
                        >
                          {composer.name}
                        </Link>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Details Tab */}
                {activeTab === 'details' && (
                  <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs">
                    <div>
                      <span className="text-lb-muted block text-[10px] uppercase font-bold">
                        Original Title
                      </span>
                      <span className="text-white font-medium">{movie.original_title}</span>
                    </div>
                    <div>
                      <span className="text-lb-muted block text-[10px] uppercase font-bold">
                        Release Date
                      </span>
                      <span className="text-white font-medium">{movie.release_date || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-lb-muted block text-[10px] uppercase font-bold">
                        Runtime
                      </span>
                      <span className="text-white font-medium">
                        {movie.runtime ? `${movie.runtime} mins` : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-lb-muted block text-[10px] uppercase font-bold">
                        Country
                      </span>
                      <span className="text-white font-medium">
                        {movie.production_countries?.map((c) => c.name).join(', ') || 'N/A'}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-lb-muted block text-[10px] uppercase font-bold">
                        Studios
                      </span>
                      <span className="text-white font-medium">
                        {movie.production_companies?.map((c) => c.name).join(', ') || 'N/A'}
                      </span>
                    </div>
                  </div>
                )}

                {/* 4. Genres Tab */}
                {activeTab === 'genres' && (
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
                )}
              </div>
            </div>

            {/* App-style tabs — MOBILE ONLY: Cast / Crew / Details / Genre / Releases */}
            <div className="md:hidden pt-4">
              <div className="flex items-center gap-5 border-b border-lb-elevated text-[11px] uppercase font-bold tracking-wider overflow-x-auto">
                {(
                  [
                    ['cast', 'Cast'],
                    ['crew', 'Crew'],
                    ['details', 'Details'],
                    ['genres', 'Genre'],
                    ['releases', 'Releases'],
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

              <div className="py-3">
                {activeTab === 'cast' && (
                  movie.credits?.cast && movie.credits.cast.length > 0 ? (
                    <div className="divide-y divide-lb-elevated">
                      {movie.credits.cast.slice(0, 18).map((actor) => (
                        <Link
                          to={`/actor/${actor.id}`}
                          key={actor.id}
                          className="flex items-center gap-3 py-2.5"
                        >
                          {actor.profile_path ? (
                            <img
                              loading="lazy"
                              decoding="async"
                              src={tmdb.getProfileUrl(actor.profile_path, 'w185')}
                              alt={actor.name}
                              className="w-10 h-10 rounded-full object-cover ring-1 ring-white/10 shrink-0"
                            />
                          ) : (
                            <span className="w-10 h-10 rounded-full bg-lb-surface ring-1 ring-white/10 flex items-center justify-center text-white text-sm font-bold shrink-0">
                              {actor.name.charAt(0).toUpperCase()}
                            </span>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white font-medium truncate">{actor.name}</p>
                            {actor.character && (
                              <p className="text-xs text-lb-muted truncate">{actor.character}</p>
                            )}
                          </div>
                          <ChevronRight className="w-4 h-4 text-lb-muted shrink-0" />
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="py-8 text-center text-xs text-lb-muted">
                      Cast information is not available.
                    </p>
                  )
                )}

                {activeTab === 'crew' && (
                  <div className="divide-y divide-lb-elevated">
                    {(movie.credits?.crew ?? [])
                      .filter((c) =>
                        [
                          'Director',
                          'Creator',
                          'Screenplay',
                          'Writer',
                          'Author',
                          'Novel',
                          'Producer',
                          'Executive Producer',
                          'Director of Photography',
                          'Cinematography',
                          'Original Music Composer',
                          'Composer',
                          'Music',
                        ].includes(c.job),
                      )
                      .slice(0, 20)
                      .map((c, idx) => (
                        <Link
                          to={`/actor/${c.id}`}
                          key={`${c.id}-${idx}`}
                          className="flex items-center gap-3 py-2.5"
                        >
                          {c.profile_path ? (
                            <img
                              loading="lazy"
                              decoding="async"
                              src={tmdb.getProfileUrl(c.profile_path, 'w185')}
                              alt={c.name}
                              className="w-10 h-10 rounded-full object-cover ring-1 ring-white/10 shrink-0"
                            />
                          ) : (
                            <span className="w-10 h-10 rounded-full bg-lb-surface ring-1 ring-white/10 flex items-center justify-center text-white text-sm font-bold shrink-0">
                              {c.name.charAt(0).toUpperCase()}
                            </span>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white font-medium truncate">{c.name}</p>
                            <p className="text-xs text-lb-muted truncate">{c.job}</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-lb-muted shrink-0" />
                        </Link>
                      ))}
                  </div>
                )}

                {activeTab === 'details' && (
                  <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs">
                    <div>
                      <span className="text-lb-muted block text-[10px] uppercase font-bold">
                        Original Title
                      </span>
                      <span className="text-white font-medium">{movie.original_title}</span>
                    </div>
                    <div>
                      <span className="text-lb-muted block text-[10px] uppercase font-bold">
                        Release Date
                      </span>
                      <span className="text-white font-medium">{movie.release_date || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-lb-muted block text-[10px] uppercase font-bold">
                        Runtime
                      </span>
                      <span className="text-white font-medium">
                        {isTv
                          ? numberOfSeasons
                            ? `${numberOfSeasons} season${numberOfSeasons === 1 ? '' : 's'}`
                            : 'N/A'
                          : movie.runtime
                            ? `${movie.runtime} mins`
                            : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-lb-muted block text-[10px] uppercase font-bold">
                        Language
                      </span>
                      <span className="text-white font-medium">
                        {(movie as unknown as { original_language?: string }).original_language?.toUpperCase() ||
                          'N/A'}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-lb-muted block text-[10px] uppercase font-bold">
                        Country
                      </span>
                      <span className="text-white font-medium">
                        {movie.production_countries?.map((c) => c.name).join(', ') || 'N/A'}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-lb-muted block text-[10px] uppercase font-bold">
                        Studios
                      </span>
                      <span className="text-white font-medium">
                        {movie.production_companies?.map((c) => c.name).join(', ') || 'N/A'}
                      </span>
                    </div>
                  </div>
                )}

                {activeTab === 'genres' && (
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
                )}

                {activeTab === 'releases' && (
                  <div className="divide-y divide-lb-elevated text-sm">
                    <div className="flex items-center justify-between py-2.5">
                      <span className="text-white font-medium">Theatrical release</span>
                      <span className="text-lb-muted text-xs">{movie.release_date || 'N/A'}</span>
                    </div>
                    <div className="flex items-center justify-between py-2.5">
                      <span className="text-white font-medium">Original language</span>
                      <span className="text-lb-muted text-xs">
                        {(movie as unknown as { original_language?: string }).original_language?.toUpperCase() ||
                          'N/A'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Popular Reviews Section */}
            <div className="pt-4 border-t border-lb-elevated space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs uppercase font-bold tracking-wider text-lb-text">
                  Popular Reviews
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
                  + Write a review
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
                  No reviews yet. Be the first to write about this film!
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
                  title={watched ? (hasUserReviewed ? 'Reviewed' : 'Watched') : 'Mark as watched'}
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
                    {watched ? (hasUserReviewed ? 'Reviewed' : 'Watched') : 'Watch'}
                  </span>
                </button>

                {/* Like */}
                <button
                  onClick={() => toggleLikeMovie(movie.id)}
                  className="flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer group"
                  title={liked ? 'Liked' : 'Like'}
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
                    {liked ? 'Liked' : 'Like'}
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
                  title={inWatchlist ? 'In Watchlist' : 'Add to watchlist'}
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
                    Watchlist
                  </span>
                </button>
              </div>

              {/* Row 2: Rate interactive star widget */}
              <div className="border-t border-[#384654] py-2 px-3 flex flex-col items-center justify-center bg-lb-border-light">
                <span className="text-[10px] font-bold uppercase tracking-wider text-lb-muted mb-1">
                  {userRating > 0 ? 'Rated' : 'Rate'}
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
                    Show your activity
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
                  {userLogsForMovie.length > 0 ? 'Log again/edit review...' : 'Review or log...'}
                </button>

                {isAuthenticated && (
                  <>
                    <button
                      onClick={() => setImagePicker('backdrop')}
                      className="w-full py-2 px-3 text-lb-white hover:text-white hover:bg-[#4e6275] transition-colors cursor-pointer block text-xs"
                    >
                      Set film backdrop
                    </button>

                    <button
                      onClick={() => setImagePicker('poster')}
                      className="w-full py-2 px-3 text-lb-white hover:text-white hover:bg-[#4e6275] transition-colors cursor-pointer block text-xs"
                    >
                      Set film poster
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
                  Add to lists...
                </button>
              </div>

              {/* Row 4: Share Link (Collapsible - matches MyWorld authentic look) */}
              <div className="border-t border-[#384654] bg-lb-border-light">
                <button
                  onClick={() => setShowSharePanel(!showSharePanel)}
                  className="w-full py-2 px-3 text-center text-lb-muted hover:text-white hover:bg-[#4e6275] text-xs font-medium transition-colors cursor-pointer"
                >
                  Share
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
                      title="Copy URL"
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
                      title="Share to Twitter / X"
                    >
                      <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                    </button>

                    {/* Facebook */}
                    <button
                      onClick={shareFacebook}
                      className="p-1.5 rounded hover:bg-lb-border-light text-lb-muted hover:text-white transition-colors cursor-pointer"
                      title="Share to Facebook"
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

        {/* Similar Movies Carousel */}
        {movie.similar?.results && movie.similar.results.length > 0 && (
          <section className="mt-16 pt-8 border-t border-lb-elevated space-y-4">
            <h2 className="text-xs uppercase tracking-widest font-bold text-lb-muted">
              {isTv ? 'Similar Series' : 'Similar Films'}
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
                {movie.title} â€” Official Trailer
              </h3>
              <button
                onClick={() => setShowTrailerModal(false)}
                aria-label="Close trailer"
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
