import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Flame, Trophy, Tv, ChevronRight } from 'lucide-react';
import { tmdb, type TMDBMovie } from '../services/tmdb';
import { PosterCard } from '../components/PosterCard';

interface Section {
  title: string;
  icon: React.ReactNode;
  movies: TMDBMovie[];
}

export const SeriesHubPage: React.FC = () => {
  const [popular, setPopular] = useState<TMDBMovie[]>([]);
  const [topRated, setTopRated] = useState<TMDBMovie[]>([]);
  const [trending, setTrending] = useState<TMDBMovie[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [p, t, tr] = await Promise.all([
          tmdb.getPopularTV(),
          tmdb.getTopRatedTV(),
          tmdb.getTrendingTV('week'),
        ]);
        setPopular(p.results.slice(0, 12));
        setTopRated(t.results.slice(0, 12));
        setTrending(tr.results.slice(0, 12));
      } catch (e) {
        console.error('Failed to load series hub:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const sections: Section[] = [
    { title: 'Trending this week', icon: <Flame className="w-4 h-4 text-lb-orange" />, movies: trending },
    { title: 'Popular series', icon: <Tv className="w-4 h-4 text-lb-green" />, movies: popular },
    { title: 'All-time top rated', icon: <Trophy className="w-4 h-4 text-lb-blue" />, movies: topRated },
  ];

  const decades = [2020, 2010, 2000, 1990, 1980, 1970, 1960];

  return (
    <div className="max-w-[960px] mx-auto px-4 py-8 space-y-10">
      <div>
        <h1 className="font-serif text-2xl md:text-3xl font-bold text-white tracking-tight">
          Series
        </h1>
        <p className="text-sm text-lb-muted mt-1">
          Browse and track every series on MyWorld.
        </p>
      </div>

      {/* Genres */}
      <section className="space-y-3">
        <h2 className="text-[11px] uppercase tracking-wider font-bold text-lb-text border-b border-lb-elevated pb-1.5">
          Browse by genre
        </h2>
        <div className="flex flex-wrap gap-2">
          {tmdb.tvGenres.map((g) => (
            <Link
              key={g.id}
              to={`/series/genre/${g.id}`}
              className="bg-[#202830] hover:bg-lb-elevated border border-lb-elevated hover:border-lb-green text-lb-white hover:text-white px-3 py-1.5 rounded text-xs transition-colors"
            >
              {g.name}
            </Link>
          ))}
        </div>
      </section>

      {/* Decades */}
      <section className="space-y-3">
        <h2 className="text-[11px] uppercase tracking-wider font-bold text-lb-text border-b border-lb-elevated pb-1.5">
          Browse by decade
        </h2>
        <div className="flex flex-wrap gap-2">
          {decades.map((d) => (
            <Link
              key={d}
              to={`/series/decade/${d}`}
              className="bg-[#202830] hover:bg-lb-elevated border border-lb-elevated hover:border-lb-green text-lb-white hover:text-white px-3 py-1.5 rounded text-xs transition-colors"
            >
              {d}s
            </Link>
          ))}
        </div>
      </section>

      {loading ? (
        <div className="py-20 flex flex-col items-center space-y-3">
          <div className="w-10 h-10 border-3 border-lb-green border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-lb-muted">Loading series...</p>
        </div>
      ) : (
        sections.map((sec) => (
          <section key={sec.title} className="space-y-3">
            <div className="flex items-center justify-between border-b border-lb-elevated pb-1.5">
              <h2 className="text-[11px] uppercase tracking-wider font-bold text-lb-text flex items-center gap-2">
                {sec.icon}
                {sec.title}
              </h2>
              <Link
                to="/series/popular"
                className="text-[11px] text-lb-muted hover:text-white flex items-center gap-1 transition-colors"
              >
                See all <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {sec.movies.map((m) => (
                <PosterCard key={m.id} movie={m} size="fluid" tv />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
};

export default SeriesHubPage;
