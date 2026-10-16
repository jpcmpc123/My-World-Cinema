import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Heart, Trash2, Calendar, MessageSquare, Plus } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useProfileByUsername } from '../lib/useProfileByUsername';
import { tmdb } from '../services/tmdb';

export const DiaryPage: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const { user, logs, deleteLog, openLogModal } = useApp();
  const remote = useProfileByUsername(username, user.username);
  const [selectedYear, setSelectedYear] = useState<string>('all');

  // Logs efetivamente exibidos: remotos (Supabase) se for perfil de outro usuário
  const viewLogs = remote.isRemote ? remote.logs : logs;

  // Collect available years
  const years = Array.from(new Set(viewLogs.map((l) => l.watchedDate.slice(0, 4)).filter(Boolean))).sort().reverse();

  const filteredLogs = viewLogs.filter((l) =>
    selectedYear === 'all' ? true : l.watchedDate.startsWith(selectedYear)
  );

  return (
    <div className="max-w-[950px] mx-auto px-4 pt-4 pb-0 md:py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-lb-elevated pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Film Diary
          </h1>
          <p className="text-xs text-lb-text mt-1">
            Your personal chronological record of every movie you’ve watched.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Year filter */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="bg-lb-surface border border-lb-elevated text-xs text-white rounded px-3 py-1.5 focus:outline-none focus:border-lb-green"
          >
            <option value="all">All Years</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          <button
            onClick={() => openLogModal()}
            className="flex items-center gap-1.5 bg-lb-green hover:bg-lb-green-hover text-lb-bg font-black text-xs uppercase px-3.5 py-1.5 rounded-sm transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Add Entry</span>
          </button>
        </div>
      </div>

      {/* Diary Table */}
      {filteredLogs.length > 0 ? (
        <div className="bg-lb-surface border border-lb-elevated rounded-lg overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-lb-bg border-b border-lb-elevated text-[11px] uppercase font-bold text-lb-muted">
                <tr>
                  <th className="py-3 px-4 w-28">Date</th>
                  <th className="py-3 px-3 w-14">Poster</th>
                  <th className="py-3 px-4">Film Title</th>
                  <th className="py-3 px-3 w-20">Released</th>
                  <th className="py-3 px-4 w-28">Rating</th>
                  <th className="py-3 px-3 text-center w-16">Like</th>
                  <th className="py-3 px-3 text-center w-20">Rewatch</th>
                  <th className="py-3 px-3 text-center w-16">Review</th>
                  <th className="py-3 px-4 text-right w-16">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-lb-elevated/60">
                {filteredLogs.map((entry) => {
                  const dateObj = new Date(entry.watchedDate + 'T00:00:00');
                  const formattedDate = dateObj.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  });

                  return (
                    <tr
                      key={entry.id}
                      className="hover:bg-lb-elevated/40 transition-colors group"
                    >
                      {/* Date */}
                      <td className="py-3 px-4 text-lb-text font-medium whitespace-nowrap">
                        {formattedDate}
                      </td>

                      {/* Poster */}
                      <td className="py-3 px-3">
                        <Link to={`/film/${entry.movieId}`}>
                          <img loading="lazy" decoding="async"
                            src={tmdb.getImageUrl(entry.moviePoster, 'w92')}
                            alt={entry.movieTitle}
                            className="w-9 h-13 object-cover rounded shadow border border-white/10 group-hover:border-lb-green transition-colors"
                          />
                        </Link>
                      </td>

                      {/* Film Title */}
                      <td className="py-3 px-4">
                        <Link
                          to={`/film/${entry.movieId}`}
                          className="font-bold text-white text-sm hover:text-lb-green transition-colors line-clamp-1"
                        >
                          {entry.movieTitle}
                        </Link>
                        {entry.tags?.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {entry.tags.map((t, idx) => (
                              <span
                                key={idx}
                                className="text-[10px] bg-lb-bg text-lb-muted px-1.5 py-0.2 rounded"
                              >
                                #{t}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Released */}
                      <td className="py-3 px-3 text-lb-muted font-mono">
                        {entry.movieYear}
                      </td>

                      {/* Rating */}
                      <td className="py-3 px-4 text-lb-green font-bold text-sm whitespace-nowrap">
                        {entry.rating > 0 ? `${entry.rating} ★` : '—'}
                      </td>

                      {/* Like */}
                      <td className="py-3 px-3 text-center">
                        {entry.liked ? (
                          <Heart className="w-4 h-4 fill-lb-orange text-lb-orange inline" />
                        ) : (
                          <span className="text-lb-muted">—</span>
                        )}
                      </td>

                      {/* Rewatch */}
                      <td className="py-3 px-3 text-center text-lb-text">
                        {entry.isRewatch ? (
                          <span title="Rewatched" className="text-sm">🔄</span>
                        ) : (
                          <span className="text-lb-muted">—</span>
                        )}
                      </td>

                      {/* Review */}
                      <td className="py-3 px-3 text-center">
                        {entry.reviewText ? (
                          <span title={entry.reviewText} className="cursor-pointer">
                            <MessageSquare className="w-4 h-4 text-lb-blue inline" />
                          </span>
                        ) : (
                          <span className="text-lb-muted">—</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-right">
                        {!remote.isRemote && (
                        <button
                          onClick={() => deleteLog(entry.id)}
                          title="Delete entry"
                          className="text-lb-muted hover:text-lb-red p-1 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-lb-surface border border-lb-elevated rounded-lg p-12 text-center space-y-3">
          <Calendar className="w-10 h-10 text-lb-muted mx-auto" />
          <h3 className="text-base font-bold text-white">No diary entries found</h3>
          <p className="text-xs text-lb-text">
            Start logging films to track your movie watch history over time.
          </p>
          <button
            onClick={() => openLogModal()}
            className="mt-2 bg-lb-green text-lb-bg font-black text-xs uppercase px-4 py-2 rounded-sm"
          >
            + Log your first film
          </button>
        </div>
      )}
    </div>
  );
};
