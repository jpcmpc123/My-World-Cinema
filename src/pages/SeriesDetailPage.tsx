import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Star, Play, X, Tv } from 'lucide-react';
import { tmdb, type TMDBMovieDetails } from '../services/tmdb';
import { WhereToWatch } from '../components/WhereToWatch';
import { PosterCard } from '../components/PosterCard';

// Página de série (/tv/:id) — versão simplificada da FilmPage:
// navegação/leitura apenas (sem log/diário/rating; o app registra FILMES).
export const SeriesDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const tvId = Number(id);

  const [show, setShow] = useState<TMDBMovieDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTrailerModal, setShowTrailerModal] = useState(false);

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
    async function loadShow() {
      if (!tvId) return;
      setLoading(true);
      window.scrollTo(0, 0);
      try {
        const details = await tmdb.getTVDetails(tvId);
        setShow(details);
      } catch (err) {
        console.error('Failed to load series details:', err);
      } finally {
        setLoading(false);
      }
    }
    loadShow();
  }, [tvId]);

  if (loading) {
    return (
      <div className="max-w-[960px] mx-auto px-4 py-32 flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-3 border-lb-green border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-lb-text tracking-wide">Loading series...</p>
      </div>
    );
  }

  if (!show) {
    return (
      <div className="max-w-[960px] mx-auto px-4 py-32 text-center">
        <h2 className="text-xl font-bold text-white mb-2 font-serif">Series not found</h2>
        <Link to="/series" className="text-sm text-lb-green hover:underline">
          Return to series catalog
        </Link>
      </div>
    );
  }

  const showAny = show as unknown as Record<string, unknown>;
  const numberOfSeasons = showAny.number_of_seasons as number | undefined;

  const creators =
    show.credits?.crew.filter((c) => c.job === 'Creator' || c.job === 'Director') ?? [];
  const writers =
    show.credits?.crew
      .filter((c) => ['Screenplay', 'Writer', 'Author'].includes(c.job))
      .slice(0, 3) ?? [];
  const producers =
    show.credits?.crew
      .filter((c) => ['Producer', 'Executive Producer'].includes(c.job))
      .slice(0, 3) ?? [];

  const trailerVideo =
    show.videos?.results.find(
      (v) => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser'),
    ) || show.videos?.results.find((v) => v.site === 'YouTube');

  const releaseYear = show.release_date ? show.release_date.slice(0, 4) : '';
  const cast = show.credits?.cast?.slice(0, 18) ?? [];
  const similar = show.recommendations?.results?.slice(0, 6) ?? [];

  const backdropUrl = show.backdrop_path
    ? tmdb.getBackdropUrl(show.backdrop_path, 'w1280')
    : null;
  const posterUrl = show.poster_path ? tmdb.getImageUrl(show.poster_path, 'w500') : '';

  return (
    <div className="relative">
      {/* Backdrop hero */}
      {backdropUrl && (
        <div className="absolute inset-x-0 top-0 h-[480px] overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${backdropUrl})` }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, rgba(20,24,28,1) 95%)',
            }}
          />
        </div>
      )}

      <div
        className={`relative z-10 max-w-[960px] mx-auto px-4 pb-16 ${
          backdropUrl ? 'pt-[340px] md:pt-[400px]' : 'pt-8'
        }`}
      >
        <div className="flex flex-col md:flex-row gap-6 lg:gap-8 items-start">
          {/* LEFT: poster + where to watch */}
          <div className="w-full md:w-[230px] flex-shrink-0 flex flex-col items-center md:items-start">
            <div className="w-[230px] h-[345px] rounded-sm overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.8)] border border-[#303840] bg-lb-surface flex-shrink-0">
              {posterUrl ? (
                <img loading="lazy" decoding="async" src={posterUrl} alt={show.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center p-4 text-center text-xs text-lb-muted">
                  {show.title}
                </div>
              )}
            </div>

            <div className="w-[230px] mt-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold tracking-wider uppercase text-lb-muted">
                  Where to watch
                </span>
                {trailerVideo && (
                  <button
                    onClick={() => setShowTrailerModal(true)}
                    className="inline-flex items-center gap-1.5 bg-[#202830] hover:bg-lb-elevated border border-lb-elevated text-white text-[11px] font-medium px-2.5 py-0.5 rounded-full transition-colors cursor-pointer"
                  >
                    <Play className="w-2.5 h-2.5 fill-white text-white" />
                    <span>Trailer</span>
                  </button>
                )}
              </div>
              <WhereToWatch providers={show['watch/providers']} />
            </div>
          </div>

          {/* CENTER: title / year / creators / synopsis / tabs */}
          <div className="flex-1 min-w-0 md:px-2 space-y-3">
            <div>
              <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                <h1 className="font-serif font-bold text-[26px] sm:text-[32px] text-white tracking-tight leading-tight">
                  {show.title}
                </h1>
                {releaseYear && (
                  <Link
                    to={`/series/year/${releaseYear}`}
                    className="text-lb-muted hover:text-white text-base sm:text-lg font-normal transition-colors"
                  >
                    {releaseYear}
                  </Link>
                )}
                <span className="text-[10px] uppercase tracking-wider font-bold text-lb-green border border-lb-green/50 rounded px-1.5 py-0.5 flex items-center gap-1">
                  <Tv className="w-3 h-3" /> Series
                </span>
              </div>

              {creators.length > 0 && (
                <div className="text-xs text-lb-muted mt-1">
                  Created by{' '}
                  {creators.map((c, i) => (
                    <span key={c.id}>
                      {i > 0 && ', '}
                      <Link
                        to={`/actor/${c.id}`}
                        className="font-semibold text-lb-muted hover:text-white underline underline-offset-2 decoration-lb-muted/40 hover:decoration-white transition-colors"
                      >
                        {c.name}
                      </Link>
                    </span>
                  ))}
                </div>
              )}

              {show.tagline && (
                <p className="uppercase tracking-[0.14em] font-semibold text-[10px] text-lb-muted mt-2 leading-snug">
                  {show.tagline.replace(/^"|"$/g, '')}
                </p>
              )}
            </div>

            {/* Overview */}
            <div className="text-[13px] text-lb-text leading-[1.6]">{show.overview}</div>

            {/* Rating / seasons chips */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {show.vote_average > 0 && (
                <span className="flex items-center gap-1 text-lb-green font-semibold">
                  <Star className="w-3.5 h-3.5 fill-lb-green" />
                  {(show.vote_average / 2).toFixed(1)}
                </span>
              )}
              {numberOfSeasons !== undefined && (
                <span className="text-lb-muted">
                  {numberOfSeasons} season{numberOfSeasons === 1 ? '' : 's'}
                </span>
              )}
              {show.runtime > 0 && <span className="text-lb-muted">~{show.runtime} min/ep</span>}
            </div>

            {/* Genres */}
            {show.genres && show.genres.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {show.genres.map((g) => (
                  <Link
                    key={g.id}
                    to={`/series/genre/${g.id}`}
                    className="bg-[#202830] hover:bg-lb-elevated border border-lb-elevated hover:border-lb-green text-lb-white hover:text-white px-2.5 py-1 rounded text-xs transition-colors"
                  >
                    {g.name}
                  </Link>
                ))}
              </div>
            )}

            {/* Cast */}
            {cast.length > 0 && (
              <section className="pt-4 space-y-2">
                <h2 className="text-[11px] uppercase tracking-wider font-bold text-lb-text border-b border-lb-elevated pb-1.5">
                  Cast
                </h2>
                <div className="flex flex-wrap gap-1.5">
                  {cast.map((actor) => (
                    <Link
                      to={`/actor/${actor.id}`}
                      key={actor.id}
                      className="bg-[#202830] hover:bg-lb-elevated border border-lb-elevated hover:border-lb-border-light text-lb-white px-2.5 py-1 rounded text-xs inline-flex items-center gap-1.5 transition-colors"
                      title={actor.character ? `as ${actor.character}` : undefined}
                    >
                      <span className="font-medium">{actor.name}</span>
                      {actor.character && (
                        <span className="text-[10px] text-lb-muted">({actor.character})</span>
                      )}
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Crew */}
            {(writers.length > 0 || producers.length > 0) && (
              <section className="pt-2 space-y-2">
                <h2 className="text-[11px] uppercase tracking-wider font-bold text-lb-text border-b border-lb-elevated pb-1.5">
                  Crew
                </h2>
                <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs">
                  {writers.length > 0 && (
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
                  {producers.length > 0 && (
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
                </div>
              </section>
            )}

            {/* Similar */}
            {similar.length > 0 && (
              <section className="pt-4 space-y-2">
                <h2 className="text-[11px] uppercase tracking-wider font-bold text-lb-text border-b border-lb-elevated pb-1.5">
                  Similar series
                </h2>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {similar.map((m) => (
                    <PosterCard key={m.id} movie={m} size="fluid" tv />
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>

      {/* Trailer modal */}
      {showTrailerModal && trailerVideo && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowTrailerModal(false)}
        >
          <div
            className="w-full max-w-3xl aspect-video bg-black rounded-lg overflow-hidden relative shadow-2xl border border-lb-elevated"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowTrailerModal(false)}
              className="absolute top-2 right-2 z-10 bg-black/60 hover:bg-black text-white rounded-full p-1.5 transition-colors cursor-pointer"
              aria-label="Close trailer"
            >
              <X className="w-4 h-4" />
            </button>
            <iframe
              key={trailerVideo.key}
              className="w-full h-full"
              src={`https://www.youtube.com/embed/${trailerVideo.key}?autoplay=1&rel=0`}
              title={`${show.title} — Official Trailer`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default SeriesDetailPage;
