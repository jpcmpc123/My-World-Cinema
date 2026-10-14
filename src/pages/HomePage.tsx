import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { tmdb, type TMDBMovie } from '../services/tmdb';
import { PosterCard } from '../components/PosterCard';
import { useApp } from '../context/AppContext';

export const HomePage: React.FC = () => {
  const { lists, openLogModal } = useApp();

  const [popularFilms, setPopularFilms] = useState<TMDBMovie[]>([]);
  const [topRatedFilms, setTopRatedFilms] = useState<TMDBMovie[]>([]);
  const [featuredFilm, setFeaturedFilm] = useState<TMDBMovie | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [popRes, topRes] = await Promise.all([
          tmdb.getPopular(1),
          tmdb.getTopRated(1),
        ]);
        setPopularFilms(popRes.results.slice(0, 12));
        setTopRatedFilms(topRes.results.slice(0, 6));
        setFeaturedFilm(popRes.results[0] || null);
      } catch (err) {
        console.error('Failed to load homepage movies:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <div className="relative h-[380px] md:h-[460px] overflow-hidden bg-lb-bg border-b border-lb-elevated">
        {featuredFilm && (
          <img
            src={tmdb.getBackdropUrl(featuredFilm.backdrop_path, 'w1280')}
            alt={featuredFilm.title}
            className="absolute inset-0 w-full h-full object-cover object-top opacity-35 filter brightness-75 backdrop-mask"
            fetchPriority="high"
            decoding="async"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-lb-bg via-lb-bg/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-lb-bg via-transparent to-lb-bg" />

        <div className="relative max-w-6xl mx-auto px-4 h-full flex flex-col justify-end pb-12">
          <div className="max-w-2xl space-y-4">
            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
              Track films you’ve watched.
              <br />
              <span className="text-lb-green">Save those you want to see.</span>
              <br />
              Tell your friends what’s good.
            </h1>
            <p className="text-sm md:text-base text-lb-text">
              A rede social para quem ama cinema. Registre suas sessões, monte listas e descubra novos clássicos.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => openLogModal()}
                className="bg-lb-green hover:bg-lb-green-hover text-lb-bg font-black text-xs uppercase tracking-wider px-6 py-2.5 rounded-sm transition-all shadow-[0_0_15px_rgba(0,224,84,0.4)] cursor-pointer"
              >
                + Log Film Now
              </button>
              <Link
                to="/films"
                className="bg-lb-elevated/80 hover:bg-lb-border text-white font-bold text-xs uppercase tracking-wider px-6 py-2.5 rounded-sm transition-all border border-white/10"
              >
                Explore Films
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 space-y-14">
        {/* Popular Films This Week */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-lb-elevated pb-2">
            <h2 className="text-xs uppercase tracking-widest font-bold text-lb-text flex items-center gap-2">
              <span>Popular Films This Week</span>
            </h2>
            <Link
              to="/films"
              className="text-xs font-semibold text-lb-muted hover:text-lb-green flex items-center transition-colors"
            >
              <span>More</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="aspect-[2/3] bg-lb-surface animate-pulse rounded border border-lb-elevated" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
              {popularFilms.slice(0, 6).map((movie) => (
                <PosterCard key={movie.id} movie={movie} showDetails />
              ))}
            </div>
          )}
        </section>

        {/* Second Row: Popular Lists */}
        <div className="grid grid-cols-1 gap-10">
          {/* Popular Lists Sidebar (1 Column) */}
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b border-lb-elevated pb-2">
              <h2 className="text-xs uppercase tracking-widest font-bold text-lb-text">
                Popular Lists
              </h2>
              <Link to="/lists" className="text-xs font-semibold text-lb-muted hover:text-lb-green">
                All
              </Link>
            </div>

            <div className="space-y-4">
              {lists.map((list) => (
                <Link
                  key={list.id}
                  to={`/list/${list.id}`}
                  className="block bg-lb-surface border border-lb-elevated rounded-lg p-3 hover:border-lb-green transition-all group"
                >
                  {/* Overlapping mini posters */}
                  <div className="flex items-center -space-x-4 mb-3 overflow-hidden pb-1">
                    {list.movies.slice(0, 4).map((m, idx) => (
                      <img
                        key={idx}
                        src={tmdb.getImageUrl(m.poster_path, 'w92')}
                        alt={m.title}
                        className="w-12 h-18 object-cover rounded shadow border border-white/10 group-hover:translate-y-[-2px] transition-transform"
                        style={{ zIndex: 10 - idx }}
                      />
                    ))}
                  </div>

                  <h3 className="text-xs font-bold text-white group-hover:text-lb-green transition-colors truncate">
                    {list.title}
                  </h3>
                  <div className="flex items-center justify-between text-[11px] text-lb-muted mt-1">
                    <span>{list.movies.length} films</span>
                    <span>{list.likesCount} likes</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </div>

        {/* Top Rated Showcase */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-lb-elevated pb-2">
            <h2 className="text-xs uppercase tracking-widest font-bold text-lb-text">
              All-Time Classics (Highest Rated)
            </h2>
            <Link
              to="/films/decade/2020s?sort=vote_average.desc"
              className="text-xs font-semibold text-lb-muted hover:text-lb-green flex items-center transition-colors"
            >
              <span>Browse Catalog</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            {topRatedFilms.map((movie) => (
              <PosterCard key={movie.id} movie={movie} showDetails />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
