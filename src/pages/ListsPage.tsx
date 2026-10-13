import React from 'react';
import { Link } from 'react-router-dom';
import { Plus, Heart, MessageSquare } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { tmdb } from '../services/tmdb';

export const ListsPage: React.FC = () => {
  const { lists } = useApp();

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-lb-elevated pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Film Lists
          </h1>
          <p className="text-xs text-lb-text mt-1">
            Collect, curate, and share lists of films. From all-time favorites to obscure subgenres.
          </p>
        </div>

        <Link
          to="/list/new"
          className="flex items-center gap-1.5 bg-lb-green hover:bg-lb-green-hover text-lb-bg font-black text-xs uppercase px-4 py-2 rounded-sm transition-colors cursor-pointer shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Start Your Own List</span>
        </Link>
      </div>

      {/* Grid of Lists */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {lists.map((list) => (
          <Link
            key={list.id}
            to={`/list/${list.id}`}
            className="bg-lb-surface border border-lb-elevated hover:border-lb-green rounded-lg p-5 transition-all group block shadow-lg hover:shadow-[0_4px_20px_rgba(0,0,0,0.5)]"
          >
            {/* Overlapping poster fan */}
            <div className="flex items-center -space-x-8 mb-4 overflow-hidden pt-1 pb-2">
              {list.movies.slice(0, 5).map((m, idx) => (
                <img
                  key={idx}
                  src={tmdb.getImageUrl(m.poster_path, 'w185')}
                  alt={m.title}
                  className="w-20 h-30 object-cover rounded shadow-lg border border-white/10 group-hover:translate-y-[-4px] transition-transform"
                  style={{ zIndex: 10 - idx }}
                />
              ))}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white group-hover:text-lb-green transition-colors truncate">
                  {list.title}
                </h3>
                {list.isRanked && (
                  <span className="text-[10px] bg-lb-elevated text-lb-text px-2 py-0.5 rounded font-mono font-semibold">
                    RANKED
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-lb-muted">
                <span>by</span>
                <span className="text-lb-text font-semibold">{list.author.displayName}</span>
              </div>

              <p className="text-xs text-lb-text line-clamp-2 leading-relaxed pt-1">
                {list.description}
              </p>

              <div className="flex items-center justify-between text-xs text-lb-muted pt-3 border-t border-lb-elevated">
                <span>{list.movies.length} films</span>
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <Heart className="w-3.5 h-3.5 text-lb-orange" /> {list.likesCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5 text-lb-blue" /> {list.commentsCount}
                  </span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};
