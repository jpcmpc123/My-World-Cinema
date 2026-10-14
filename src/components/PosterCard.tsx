import React from 'react';
import { Link } from 'react-router-dom';
import { Eye, Heart, Star, MoreHorizontal } from 'lucide-react';
import { tmdb } from '../services/tmdb';
import { useApp } from '../context/AppContext';
import { useLongPress } from '../hooks/useLongPress';
import { ActionBottomSheet } from './ActionBottomSheet';

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
    toggleWatched,
    isMovieLiked,
    toggleLikeMovie,
    ratingsMap,
    openLogModal,
    movieOverrides,
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

  const [actionsOpen, setActionsOpen] = React.useState(false);
  const longPressHandlers = useLongPress(
    () => {
      if (enableLongPressActions) setActionsOpen(true);
    },
    { threshold: 500 }
  );

  const handleActionClick = (e: React.MouseEvent, action: () => void) => {
    e.preventDefault();
    e.stopPropagation();
    action();
  };

  return (
    <div className={`group flex flex-col ${posterSizes[size]}`}>
      {/* Poster Image Container */}
      <div
        className="relative aspect-[2/3] rounded-[4px] bg-lb-surface overflow-hidden border border-white/15 ring-0 group-hover:ring-1 group-hover:ring-lb-green transition-all duration-200 shadow-md group-hover:shadow-[0_4px_20px_rgba(0,224,84,0.2)]"
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
            <img
              src={tmdb.getImageUrl(displayPosterPath, 'w342')}
              srcSet={`${tmdb.getImageUrl(displayPosterPath, 'w185')} 185w, ${tmdb.getImageUrl(displayPosterPath, 'w342')} 342w, ${tmdb.getImageUrl(displayPosterPath, 'w500')} 500w`}
              sizes="(max-width: 640px) 25vw, (max-width: 1024px) 16vw, 160px"
              alt={movie.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center p-2 text-center text-[11px] text-lb-muted bg-lb-surface">
              <span className="line-clamp-3">{movie.title}</span>
            </div>
          )}
        </Link>

        {/* Hover Overlay estilo MyWorld — wrapper sem eventos; apenas a pill do rodapé é clicável */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none flex items-end justify-center">
          {/* Fundo escurecido (puro pointer-events-none, o link do pôster continua clicável) */}
          <div className="absolute inset-0 bg-black/50" />

          {/* Pill do rodapé com 3 ações — compacta por padrão, maior quando o pôster é grande */}
          <div className="relative z-10 mb-1.5 lg:mb-2 flex items-center gap-0.5 lg:gap-1 bg-black/70 backdrop-blur-xs rounded-full px-1 py-0.5 lg:px-1.5 lg:py-1 pointer-events-auto">
            <button
              onClick={(e) => handleActionClick(e, () => toggleWatched(movie.id))}
              title={watched ? 'Watched' : 'Mark as watched'}
              aria-label={watched ? `Marked ${movie.title} as watched` : `Mark ${movie.title} as watched`}
              className={`p-0.5 lg:p-1.5 rounded-full transition-colors ${
                watched ? 'text-lb-green' : 'text-lb-text hover:text-white'
              }`}
            >
              <Eye className="w-3 h-3 lg:w-3.5 lg:h-3.5" />
            </button>

            <button
              onClick={(e) => handleActionClick(e, () => toggleLikeMovie(movie.id))}
              title={liked ? 'Liked' : 'Like this film'}
              aria-label={liked ? `Unlike ${movie.title}` : `Like ${movie.title}`}
              className={`p-0.5 lg:p-1.5 rounded-full transition-colors ${
                liked ? 'text-lb-orange' : 'text-lb-text hover:text-lb-orange'
              }`}
            >
              <Heart className={`w-3 h-3 lg:w-3.5 lg:h-3.5 ${liked ? 'fill-lb-orange' : ''}`} />
            </button>

            <button
              onClick={(e) =>
                handleActionClick(e, () =>
                  openLogModal({
                    id: movie.id,
                    title: movie.title,
                    poster_path: movie.poster_path,
                    release_date: movie.release_date || '',
                  })
                )
              }
              title="Log this film"
              aria-label={`Log ${movie.title}`}
              className="p-0.5 lg:p-1.5 rounded-full text-lb-text hover:text-white transition-colors"
            >
              <MoreHorizontal className="w-3 h-3 lg:w-3.5 lg:h-3.5" />
            </button>
          </div>
        </div>

        {/* User Status Indicators (Corner badges when not hovered) */}
        <div className="absolute bottom-1 right-1 flex items-center gap-1 pointer-events-none group-hover:opacity-0 transition-opacity">
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

      {enableLongPressActions && (
        <ActionBottomSheet
          open={actionsOpen}
          onClose={() => setActionsOpen(false)}
          movie={{ id: movie.id, title: movie.title, release_date: movie.release_date }}
        />
      )}
    </div>
  );
};

// Memoizado: só re-renderiza se as props mudarem (pôster por pôster),
// em vez do grid inteiro a cada mudança de estado global.
export const PosterCard = React.memo(PosterCardBase);
