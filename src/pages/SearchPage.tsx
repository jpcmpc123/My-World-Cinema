import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { tmdb, type TMDBMovie } from '../services/tmdb';
import { PosterCard } from '../components/PosterCard';

/**
 * SearchPage — Letterboxd Android-style Search/Browse screen.
 * Mobile-first; on desktop it renders centered in the standard 950px column.
 * O texto da busca vive na URL (?q=) para ficar em sincronia com o campo
 * que o Header exibe na faixa preta do topo no mobile.
 */
export const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') ?? '';
  const setQuery = (v: string) =>
    setSearchParams(v ? { q: v } : {}, { replace: true });
  const [segment, setSegment] = useState<'films' | 'series'>('films');
  const [results, setResults] = useState<TMDBMovie[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  // Debounced live search (also fires on submit)
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      setSearched(false);
      setSearching(false);
      return;
    }

    setSearching(true);
    const timeout = window.setTimeout(async () => {
      try {
        // searchTV is typed as TMDBMovie in the service; normalize name → title below
        const res =
          segment === 'films' ? await tmdb.searchMovies(q) : await tmdb.searchTV(q);
        const normalized = res.results.map((m) => {
          const any = m as unknown as Record<string, unknown>;
          return {
            ...m,
            title: m.title || (any.name as string) || '',
            release_date: m.release_date || (any.first_air_date as string) || '',
          };
        });
        setResults(normalized);
        setSearched(true);
      } catch {
        setResults([]);
        setSearched(true);
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [query, segment]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const browseRows: { label: string; to: string }[] = [
    { label: 'Release date', to: '/browse/release-date' },
    { label: 'Genre', to: '/browse/genre' },
    { label: 'Country', to: '/browse/country' },
    { label: 'Language', to: '/browse/language' },
    { label: 'Service', to: '/browse/service' },
    { label: 'Most popular', to: '/browse/results?sort=popularity.desc&title=Most%20Popular' },
    { label: 'Highest rated', to: '/browse/results?sort=vote_average.desc&title=Highest%20Rated' },
    { label: 'Most anticipated', to: '/browse/results?released=upcoming&sort=popularity.desc&title=Most%20Anticipated' },
    { label: 'Featured lists', to: '/lists' },
  ];

  return (
    <div className="max-w-[950px] mx-auto px-4 pt-4 pb-24 md:py-8">
      {/* Search field — na tela: apenas desktop; no mobile o campo vive na faixa
          preta do Header (mesmo estado, via ?q=) */}
      <form onSubmit={handleSubmit} className="max-w-md mx-auto md:max-w-xl">
        <div className="hidden md:flex items-center gap-2 bg-[#2c3440] rounded-full px-4 py-2.5">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={segment === 'films' ? 'Search films…' : 'Search series…'}
            className="flex-1 bg-transparent text-sm text-white placeholder-lb-muted focus:outline-none"
          />
        </div>

        {/* Segmented toggle Films | Series */}
        <div className="flex justify-center md:mt-3">
          <div className="inline-flex bg-[#2c3440] rounded-full p-0.5 text-xs font-bold uppercase tracking-wider">
            {(['films', 'series'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSegment(s)}
                className={`px-5 py-1.5 rounded-full transition-colors cursor-pointer ${
                  segment === s ? 'bg-[#00e054] text-black' : 'text-lb-muted hover:text-white'
                }`}
              >
                {s === 'films' ? 'Films' : 'Series'}
              </button>
            ))}
          </div>
        </div>
      </form>

      {/* Results */}
      {query.trim() ? (
        <div className="mt-5">
          {searching ? (
            <p className="text-center text-sm text-lb-muted py-8">Searching…</p>
          ) : searched && results.length === 0 ? (
            <p className="text-center text-sm text-lb-muted py-8">
              No {segment === 'films' ? 'films' : 'series'} found for “{query.trim()}”.
            </p>
          ) : (
            <div className="grid grid-cols-4 gap-1.5 md:grid-cols-6 md:gap-3">
              {results.map((m) => (
                <PosterCard key={`${segment}-${m.id}`} movie={m} size="fluid" tv={segment === 'series'} />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* BROWSE BY (empty query state) */
        <div className="mt-6">
          <h2 className="text-xs uppercase tracking-widest text-lb-muted font-bold mb-1">
            Browse by
          </h2>
          <nav className="flex flex-col">
            {browseRows.map((row) => (
              <Link
                key={row.label}
                to={row.to}
                className="flex items-center justify-between py-3.5 border-b border-white/5 text-sm text-white hover:text-[#00e054] transition-colors"
              >
                <span>{row.label}</span>
                <ChevronRight className="w-4 h-4 text-lb-muted" />
              </Link>
            ))}
          </nav>
        </div>
      )}
    </div>
  );
};
