import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { tmdb, type TMDBPerson, type TMDBPersonMovieCredit } from '../services/tmdb';
import { PosterCard } from '../components/PosterCard';

type SortKey = 'popularity' | 'rating' | 'newest' | 'oldest';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'popularity', label: 'Popularity' },
  { value: 'rating', label: 'Highest rated' },
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
];

export function ActorPage() {
  const { id } = useParams<{ id: string }>();
  const [person, setPerson] = useState<TMDBPerson | null>(null);
  const [films, setFilms] = useState<TMDBPersonMovieCredit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bioExpanded, setBioExpanded] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>('popularity');
  const [genreFilter, setGenreFilter] = useState<number | null>(null);
  const [decadeFilter, setDecadeFilter] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setBioExpanded(false);
    setPerson(null);
    setFilms([]);

    (async () => {
      try {
        const [personData, credits] = await Promise.all([
          tmdb.getPerson(Number(id)),
          tmdb.getPersonMovieCredits(Number(id)),
        ]);
        setPerson(personData);

        // Combina atuações (cast) e trabalhos técnicos (crew: direção,
        // roteiro, produção...) — diretores como Destin Daniel Cretton têm
        // a filmografia em crew, não em cast. Dedup por id de filme.
        const seen = new Set<number>();
        const unique = [...credits.cast, ...credits.crew]
          .filter((m) => {
            if (seen.has(m.id)) return false;
            seen.add(m.id);
            return true;
          })
          .sort((a, b) => b.popularity - a.popularity);
        setFilms(unique);
      } catch {
        setError('Could not load this person. Please try again later.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // Décadas disponíveis com base na filmografia carregada
  // (hooks ANTES dos early returns — regra dos hooks do React)
  const decades = useMemo(() => {
    const set = new Set<string>();
    films.forEach((f) => {
      const y = f.release_date?.slice(0, 4);
      if (y) set.add(`${y.slice(0, 3)}0s`);
    });
    return Array.from(set).sort().reverse();
  }, [films]);

  // Filtros + ordenação funcionais
  const visibleFilms = useMemo(() => {
    let list = films;
    if (genreFilter) {
      list = list.filter((f) => f.genre_ids?.includes(genreFilter));
    }
    if (decadeFilter) {
      list = list.filter((f) => f.release_date?.startsWith(decadeFilter.slice(0, 3)));
    }
    const sorted = [...list];
    sorted.sort((a, b) => {
      if (sortBy === 'rating') return b.vote_average - a.vote_average;
      if (sortBy === 'newest') return (b.release_date || '').localeCompare(a.release_date || '');
      if (sortBy === 'oldest') return (a.release_date || '').localeCompare(b.release_date || '');
      return b.popularity - a.popularity;
    });
    return sorted;
  }, [films, genreFilter, decadeFilter, sortBy]);

  const selectCls =
    'bg-[#202830] border border-lb-elevated text-white text-[11px] uppercase font-bold tracking-wider px-3 py-1.5 rounded cursor-pointer focus:outline-none focus:border-lb-green';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-40">
        <Loader2 className="w-8 h-8 animate-spin text-lb-green" />
      </div>
    );
  }

  if (error || !person) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center space-y-2">
        <p className="text-white font-semibold">{error || 'Person not found.'}</p>
        <p className="text-xs text-lb-muted">The requested actor could not be loaded.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-4">
        <div className="text-[11px] font-bold uppercase tracking-widest text-lb-muted mb-1">
          {(() => {
            switch (person.known_for_department) {
              case 'Directing': return 'Films directed by';
              case 'Writing': return 'Films written by';
              case 'Production': return 'Films produced by';
              case 'Camera': return 'Films shot by';
              case 'Sound': return 'Films scored by';
              case 'Editing': return 'Films edited by';
              default: return 'Films starring';
            }
          })()}
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-white">{person.name}</h1>
      </div>

      {/* Filter Bar (funcional) */}
      <div className="flex flex-wrap items-center justify-between gap-2 py-3 mb-6 border-t border-b border-lb-elevated">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={decadeFilter ?? ''}
            onChange={(e) => setDecadeFilter(e.target.value || null)}
            className={selectCls}
            aria-label="Filter by decade"
          >
            <option value="">All decades</option>
            {decades.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <select
            value={genreFilter ?? ''}
            onChange={(e) => setGenreFilter(e.target.value ? Number(e.target.value) : null)}
            className={selectCls}
            aria-label="Filter by genre"
          >
            <option value="">All genres</option>
            {tmdb.genres.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          {(decadeFilter || genreFilter) && (
            <button
              onClick={() => {
                setDecadeFilter(null);
                setGenreFilter(null);
              }}
              className="text-lb-muted hover:text-white text-[11px] uppercase font-bold tracking-wider px-2 transition-colors cursor-pointer"
            >
              ✕ Clear
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 text-[11px] uppercase font-bold tracking-wider">
          <span className="text-lb-muted">Sort by</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortKey)}
            className={selectCls}
            aria-label="Sort by"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 2-Column Layout */}
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left: Poster Grid */}
        <div className="flex-1 min-w-0">
          {visibleFilms.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
              {visibleFilms.map((film) => (
                <PosterCard
                  key={film.id}
                  movie={{
                    id: film.id,
                    title: film.title,
                    poster_path: film.poster_path,
                    release_date: film.release_date,
                    vote_average: film.vote_average,
                  }}
                  size="fluid"
                />
              ))}
            </div>
          ) : (
            <div className="py-20 text-center space-y-2 border border-dashed border-lb-elevated rounded">
              <p className="text-sm text-white font-semibold">Nothing here yet</p>
              <p className="text-xs text-lb-muted">
                No films with {person.name} were found on TMDB.
              </p>
            </div>
          )}
        </div>

        {/* Right: Sidebar */}
        <aside className="w-full lg:w-56 xl:w-64 flex-shrink-0 flex flex-col gap-4">
          {person.profile_path && (
            <img loading="lazy" decoding="async"
              src={tmdb.getProfileUrl(person.profile_path, 'h632')}
              alt={person.name}
              className="w-full max-w-64 lg:max-w-none mx-auto rounded border border-lb-elevated shadow-md object-cover"
            />
          )}

          {person.biography && (
            <div className="border-t border-b border-lb-elevated py-4">
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-lb-muted mb-3">
                Biography
              </h3>
              <p
                className={`text-[13px] text-lb-text leading-relaxed whitespace-pre-line ${
                  bioExpanded ? '' : 'line-clamp-6'
                }`}
              >
                {person.biography}
              </p>
              <button
                onClick={() => setBioExpanded((v) => !v)}
                className="mt-2 text-xs font-semibold text-lb-muted hover:text-white uppercase tracking-wider transition-colors"
              >
                {bioExpanded ? 'less' : 'more'}
              </button>
            </div>
          )}

          {person.birthday && (
            <div className="text-[11px] uppercase tracking-wider">
              <span className="text-lb-muted font-bold">Born: </span>
              <span className="text-lb-text">
                {new Date(person.birthday).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

export default ActorPage;
