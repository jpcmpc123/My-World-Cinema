import React from 'react';
import { Link } from 'react-router-dom';
import { Eye, Heart, Star } from 'lucide-react';
import { tmdb } from '../services/tmdb';
import { useApp } from '../context/AppContext';
import { useLongPress } from '../hooks/useLongPress';

interface PosterCardProps {
  movie: {
    id: number;
    title: string;
    poster_path: string | null;
    release_date?: string;
    vote_average?: number;
  };
  size?: 'fluid' | 'sm' | 'md' | 'lg';
  showDetails?: boolean;
  rank?: number;
  tv?: boolean;
  enableLongPressActions?: boolean;
}

const PosterCardBase: React.FC<PosterCardProps> = ({
  movie,
  size = 'md',
  showDetails = false,
  rank,
  tv = false,
  enableLongPressActions = false,
}) => {
  const {
    isMovieWatched,
    isMovieLiked,
    ratingsMap,
    movieOverrides,
    openActionSheet,
  } = useApp();

  // Custom poster override (Set film poster) applies site-wide
  const overridePoster = movieOverrides[movie.id]?.poster || null;
  const displayPosterPath = overridePoster || movie.poster_path;

  const watched = isMovieWatched(movie.id);
  const liked = isMovieLiked(movie.id);
  const userRating = ratingsMap[movie.id];

  const posterSizes = {
    fluid: 'w-full min-w-0',
    sm: 'w-24 min-w-24',
    md: 'w-36 min-w-36 md:w-40 md:min-w-40',
    lg: 'w-48 min-w-48 md:w-56 md:min-w-56',
  };

  const year = movie.release_date ? movie.release_date.slice(0, 4) : '';

  // Fade-in do pôster: shimmer escuro enquanto carrega, imagem surge suave
  const [isLoaded, setIsLoaded] = React.useState(false);
  const longPressHandlers = useLongPress(
    () => {
      if (enableLongPressActions) {
        openActionSheet({ id: movie.id, title: movie.title, release_date: movie.release_date });
      }
    },
    { threshold: 500 }
  );

  return (
    <div className={`group flex flex-col ${posterSizes[size]} transition-all duration-200 md:hover:-translate-y-0.5 active:scale-[0.96] active:duration-150`}>
      {/* Poster Image Container */}
      <div
        className="relative aspect-[2/3] rounded-[4px] bg-lb-surface overflow-hidden border border-white/12 ring-0 hover:ring-2 hover:ring-[#00e054] group-hover:ring-2 group-hover:ring-[#00e054] transition-all duration-200 shadow-md"
        {...(enableLongPressActions ? longPressHandlers : {})}
        style={enableLongPressActions ? { touchAction: 'manipulation' } : undefined}
      >
        {rank !== undefined && (
          <div className="absolute top-1.5 left-1.5 z-20 bg-black/80 text-white font-bold text-xs px-2 py-0.5 rounded border border-white/20 backdrop-blur-xs">
            #{rank}
          </div>
        )}

        <Link to={`${tv ? "/tv" : "/film"}/${movie.id}`} className="block w-full h-full">
          {displayPosterPath ? (
            <>
              {/* Skeleton shimmer escuro atrás do pôster enquanto carrega */}
              {!isLoaded && <div className="absolute inset-0 mw-shimmer" aria-hidden="true" />}
              <img
                src={tmdb.getImageUrl(displayPosterPath, 'w342')}
                srcSet={`${tmdb.getImageUrl(displayPosterPath, 'w185')} 185w, ${tmdb.getImageUrl(displayPosterPath, 'w342')} 342w, ${tmdb.getImageUrl(displayPosterPath, 'w500')} 500w`}
                sizes="(max-width: 640px) 25vw, (max-width: 1024px) 16vw, 160px"
                alt={movie.title}
                onLoad={() => setIsLoaded(true)}
                className={`w-full h-full object-cover transition-opacity duration-300 ${
                  isLoaded ? 'opacity-100' : 'opacity-0'
                }`}
                loading="lazy"
                decoding="async"
              />
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center p-2 text-center text-[11px] text-lb-muted bg-lb-surface">
              <span className="line-clamp-3">{movie.title}</span>
            </div>
          )}
        </Link>

        {/* User Status Indicators (Corner badges) */}
        <div className="absolute bottom-1 right-1 flex items-center gap-1 pointer-events-none transition-opacity">
          {watched && (
            <div className="bg-lb-green text-lb-bg p-0.5 rounded-full shadow">
              <Eye className="w-2.5 h-2.5" />
            </div>
          )}
          {liked && (
            <div className="bg-lb-orange text-white p-0.5 rounded-full shadow">
              <Heart className="w-2.5 h-2.5 fill-white" />
            </div>
          )}
          {userRating && (
            <div className="bg-lb-bg/90 text-lb-green font-semibold text-[10px] px-1 py-0.2 rounded border border-lb-green/30">
              {userRating}★
            </div>
          )}
        </div>
      </div>

      {/* Details below poster (Optional) */}
      {showDetails && (
        <div className="mt-2 flex flex-col">
          <Link
            to={`${tv ? "/tv" : "/film"}/${movie.id}`}
            className="text-xs font-semibold text-white hover:text-lb-green truncate transition-colors"
            title={movie.title}
          >
            {movie.title}
          </Link>
          <div className="flex items-center justify-between text-[11px] text-lb-muted mt-0.5">
            <span>{year}</span>
            {movie.vote_average ? (
              <span className="flex items-center gap-0.5 text-lb-green">
                <Star className="w-2.5 h-2.5 fill-lb-green" />
                {(movie.vote_average / 2).toFixed(1)}
              </span>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};

// Memoizado: só re-renderiza se as props mudarem (pôster por pôster),
// em vez do grid inteiro a cada mudança de estado global.
export const PosterCard = React.memo(PosterCardBase);
