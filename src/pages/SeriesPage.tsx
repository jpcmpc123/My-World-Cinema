import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { tmdb, type TMDBMovie } from '../services/tmdb';
import { PosterCard } from '../components/PosterCard';

const SORTS = [
  { id: 'popularity.desc', label: 'Popularity' },
  { id: 'vote_average.desc', label: 'Highest Rated' },
  { id: 'first_air_date.desc', label: 'Newest' },
];

export const SeriesPage: React.FC = () => {
  const { genre, decade, year, sort: sortParam } = useParams<{
    genre?: string;
    decade?: string;
    year?: string;
    sort?: string;
  }>();

  const [results, setResults] = useState<TMDBMovie[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState(sortParam || 'popularity.desc');

  const genreId = genre ? Number(genre) : undefined;
  const decadeNum = decade ? Number(decade) : undefined;
  const yearNum = year ? Number(year) : undefined;

  const genreName = tmdb.tvGenres.find((g) => g.id === genreId)?.name;

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await tmdb.discoverTVBatch({
          genreId,
          decade: decadeNum,
          year: yearNum,
          sortBy,
          page,
        });
        setResults(res.results);
        setTotalPages(res.total_pages);
        window.scrollTo(0, 0);
      } catch (e) {
        console.error('Failed to load series:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [genreId, decadeNum, yearNum, sortBy, page]);

  useEffect(() => {
    setPage(1);
  }, [genreId, decadeNum, yearNum, sortBy]);

  const title = genreName
    ? `Series: ${genreName}`
    : decadeNum
      ? `${decadeNum}s series`
      : yearNum
        ? `Series from ${yearNum}`
        : 'All series';

  return (
    <div className="max-w-[960px] mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-white tracking-tight">
            {title}
          </h1>
          <p className="text-xs text-lb-muted mt-1">
            <Link to="/series" className="hover:text-white transition-colors">
              Series
            </Link>{' '}
            / filtered view
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-lb-muted uppercase tracking-wider">Sort by</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-[#202830] border border-lb-elevated text-white text-xs rounded px-2 py-1.5 focus:outline-none focus:border-lb-green"
          >
            {SORTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center space-y-3">
          <div className="w-10 h-10 border-3 border-lb-green border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-lb-muted">Loading series...</p>
        </div>
      ) : results.length === 0 ? (
        <div className="py-20 text-center space-y-2">
          <p className="text-sm text-white font-semibold">Nothing here yet</p>
          <p className="text-xs text-lb-muted">No series found for this filter.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {results.map((m) => (
              <PosterCard key={m.id} movie={m} size="fluid" showDetails tv />
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-center gap-3 pt-4">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="flex items-center gap-1 bg-[#202830] hover:bg-lb-elevated border border-lb-elevated disabled:opacity-30 text-white text-xs px-3 py-1.5 rounded transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Prev
            </button>
            <span className="text-xs text-lb-muted">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="flex items-center gap-1 bg-[#202830] hover:bg-lb-elevated border border-lb-elevated disabled:opacity-30 text-white text-xs px-3 py-1.5 rounded transition-colors cursor-pointer"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default SeriesPage;
