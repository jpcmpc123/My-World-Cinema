import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useParams, Navigate } from 'react-router-dom';
import { MoreHorizontal, Search, Rss, Heart } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useProfileByUsername } from '../lib/useProfileByUsername';
import { tmdb, type TMDBMovie } from '../services/tmdb';
import { PosterCard } from '../components/PosterCard';

export const ProfilePage: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'profile';

  const {
    user,
    updateUser,
    logs,
    watchlist,
    watchedMovieIds,
    likedMovieIds,
    top4MovieIds,
    lists,
  } = useApp();

  const { isAuthenticated } = useAuth();

  const [top4Movies, setTop4Movies] = useState<(TMDBMovie | null)[]>([null, null, null, null]);
  const [, setWatchedMovies] = useState<TMDBMovie[]>([]);
  const [likedMovies, setLikedMovies] = useState<TMDBMovie[]>([]);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [editForm, setEditForm] = useState({
    displayName: user.displayName,
    bio: user.bio,
    location: user.location,
    website: user.website,
  });

  // Lock body scroll while the edit-profile modal is open + close on Escape
  useEffect(() => {
    if (!isEditingBio) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsEditingBio(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isEditingBio]);

  // Load Top 4 Movies
  useEffect(() => {
    async function loadTop4() {
      const fetched = await Promise.all(
        top4MovieIds.map(async (id) => {
          try {
            return await tmdb.getMovieDetails(id);
          } catch {
            return null;
          }
        })
      );
      setTop4Movies(fetched);
    }
    loadTop4();
  }, [top4MovieIds]);

  // Load Watched Movies
  useEffect(() => {
    async function loadWatched() {
      const uniqueIds = Array.from(new Set(watchedMovieIds)).slice(0, 24);
      const fetched = await Promise.all(
        uniqueIds.map(async (id) => {
          try {
            return await tmdb.getMovieDetails(id);
          } catch {
            return null;
          }
        })
      );
      setWatchedMovies(fetched.filter(Boolean) as TMDBMovie[]);
    }
    loadWatched();
  }, [watchedMovieIds]);

  // Load Liked Movies
  useEffect(() => {
    async function loadLiked() {
      const uniqueIds = Array.from(new Set(likedMovieIds)).slice(0, 24);
      const fetched = await Promise.all(
        uniqueIds.map(async (id) => {
          try {
            return await tmdb.getMovieDetails(id);
          } catch {
            return null;
          }
        })
      );
      setLikedMovies(fetched.filter(Boolean) as TMDBMovie[]);
    }
    loadLiked();
  }, [likedMovieIds]);

  const setTab = (tab: string) => {
    setSearchParams({ tab });
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateUser(editForm);
    setIsEditingBio(false);
  };

  // Perfil remoto (Supabase) quando a URL aponta para outro username
  const remote = useProfileByUsername(username, user.username);

  // Dados efetivamente exibidos (remoto se houver, senão o estado local)
  const viewUsername = remote.isRemote && remote.profile ? remote.profile.username : user.username;
  const viewAvatar = remote.isRemote && remote.profile?.avatar_url ? remote.profile.avatar_url : user.avatarUrl;
  const viewLogs = remote.isRemote ? remote.logs : logs;

  // Estatísticas reais, derivadas dos dados exibidos (sem números de demo)
  const currentYear = String(new Date().getFullYear());
  const viewFilmsCount = new Set(viewLogs.map((l) => l.movieId)).size;
  const viewThisYearCount = viewLogs.filter((l) =>
    (l.watchedDate || l.createdAt || '').startsWith(currentYear)
  ).length;
  const viewDiaryCount = viewLogs.length;
  const viewListsCount = remote.isRemote ? 0 : lists.length;
  const viewWatchlistCount = remote.isRemote ? 0 : watchlist.length;
  const viewFollowingCount = remote.isRemote || isAuthenticated ? 0 : user.followingCount;
  const viewFollowersCount = remote.isRemote || isAuthenticated ? 0 : user.followersCount;

  // Recent 4 activity movies
  const recentLogs = viewLogs.slice(0, 4);

  // Guard: username desconhecido (sem perfil local nem no Supabase) vai para home
  if (username && username.toLowerCase() !== user.username.toLowerCase() && remote.status === 'not-found') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* 1. Profile Header */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 pt-2 pb-4">
        {/* Avatar & User Details */}
        <div className="flex items-center gap-5">
          <img loading="lazy" decoding="async"
            src={viewAvatar}
            alt={viewUsername}
            className="w-24 h-24 rounded-full object-cover border border-lb-border-light shadow-xl"
          />

          <div className="space-y-2.5">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {viewUsername}
            </h1>

            {!remote.isRemote && (
            <div className="flex items-center gap-2">
              <Link
                to="/settings?tab=profile"
                className="btn-edit-profile text-[10px] uppercase font-bold tracking-wider text-lb-white px-3 py-1 rounded-sm border border-lb-border-light/60 cursor-pointer"
              >
                EDIT PROFILE
              </Link>

              <Link
                to="/settings"
                className="bg-lb-elevated hover:bg-lb-border text-lb-text p-1 rounded-full cursor-pointer transition-colors"
                title="Account settings"
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
              </Link>
            </div>
            )}
          </div>
        </div>

        {/* User Statistics (Matching exact screenshot counts) */}
        <div className="flex items-center gap-6 sm:gap-8 text-center pt-2">
          <div>
            <span className="block text-xl sm:text-2xl font-bold text-white tracking-tight">{viewFilmsCount}</span>
            <span className="text-[10px] uppercase tracking-wider font-semibold text-lb-muted">Films</span>
          </div>
          <div>
            <span className="block text-xl sm:text-2xl font-bold text-white tracking-tight">{viewThisYearCount}</span>
            <span className="text-[10px] uppercase tracking-wider font-semibold text-lb-muted">This Year</span>
          </div>
          <div>
            <span className="block text-xl sm:text-2xl font-bold text-white tracking-tight">{viewListsCount}</span>
            <span className="text-[10px] uppercase tracking-wider font-semibold text-lb-muted">Lists</span>
          </div>
          <div>
            <span className="block text-xl sm:text-2xl font-bold text-white tracking-tight">{viewFollowingCount}</span>
            <span className="text-[10px] uppercase tracking-wider font-semibold text-lb-muted">Following</span>
          </div>
          <div>
            <span className="block text-xl sm:text-2xl font-bold text-white tracking-tight">{viewFollowersCount}</span>
            <span className="text-[10px] uppercase tracking-wider font-semibold text-lb-muted">Followers</span>
          </div>
        </div>
      </div>

      {/* 2. Subnav Tabs (Matching exact MyWorld order) */}
      <div className="border-b border-lb-elevated flex items-center justify-between text-xs font-semibold overflow-x-auto pb-0.5">
        <div className="flex items-center gap-6">
          {[
            { id: 'profile', label: 'Profile' },
            { id: 'activity', label: 'Activity' },
            { id: 'films', label: 'Films' },
            { id: 'diary', label: 'Diary' },
            { id: 'reviews', label: 'Reviews' },
            { id: 'watchlist', label: 'Watchlist' },
            { id: 'lists', label: 'Lists' },
            { id: 'likes', label: 'Likes' },
            { id: 'tags', label: 'Tags' },
            { id: 'network', label: 'Network' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setTab(tab.id)}
              className={`pb-2 tracking-wide transition-colors cursor-pointer ${
                currentTab === tab.id
                  ? 'text-white border-b-2 border-lb-green -mb-[1px]'
                  : 'text-lb-text hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="hidden sm:flex items-center gap-3 text-lb-muted pb-1">
          <Search className="w-3.5 h-3.5" />
          <Rss className="w-3.5 h-3.5" />
        </div>
      </div>

      {/* 3. Main 2-Column Content */}
      {currentTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-2">
          {/* LEFT COLUMN (8 cols): Favorite Films + Recent Activity */}
          <div className="lg:col-span-8 space-y-10">
            {/* FAVORITE FILMS (THE TOP 4) — local user only */}
            {!remote.isRemote && (
            <section className="space-y-3">
              <div className="border-b border-lb-elevated pb-1.5 flex items-center justify-between">
                <h2 className="text-[11px] uppercase tracking-wider font-bold text-lb-text">
                  Favorite Films
                </h2>
              </div>

              {top4Movies.every((m) => !m) ? (
                <div className="py-12 text-center space-y-2">
                  <p className="text-sm text-white font-semibold">Nothing here yet</p>
                  <p className="text-xs text-lb-muted">Pick up to four favorite films to show off on your profile.</p>
                </div>
              ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                {top4Movies.map((movie, idx) => (
                  <div
                    key={idx}
                    className="relative aspect-[2/3] bg-lb-surface rounded-xs overflow-hidden border border-white/12 shadow-md w-full h-full"
                  >
                    {movie ? (
                      <Link to={`/film/${movie.id}`} title={movie.title}>
                        <img loading="lazy" decoding="async"
                          src={tmdb.getImageUrl(movie.poster_path, 'w500')}
                          alt={movie.title}
                          className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                        />
                      </Link>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-lb-muted text-xs">
                        Slot #{idx + 1}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              )}
            </section>
            )}

            {/* RECENT ACTIVITY */}
            <section className="space-y-3">
              <div className="border-b border-lb-elevated pb-1.5 flex items-center justify-between">
                <h2 className="text-[11px] uppercase tracking-wider font-bold text-lb-text">
                  Recent Activity
                </h2>
                <button
                  onClick={() => setTab('diary')}
                  className="text-[10px] uppercase font-bold tracking-wider text-lb-muted hover:text-white"
                >
                  All
                </button>
              </div>

              {recentLogs.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <p className="text-sm text-white font-semibold">Nothing here yet</p>
                  <p className="text-xs text-lb-muted">Recent activity will appear when you log films.</p>
                </div>
              ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                {recentLogs.map((log, idx) => (
                  <div key={`recent-${log.id}-${idx}`} className="group">
                    <div className="aspect-[2/3] bg-lb-surface rounded-xs overflow-hidden border border-white/12 hover:border-white transition-all shadow-md">
                      <Link to={`/film/${log.movieId}`}>
                        <img loading="lazy" decoding="async"
                          src={tmdb.getImageUrl(log.moviePoster, 'w500')}
                          alt={log.movieTitle}
                          className="w-full h-full object-cover"
                        />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
              )}
            </section>
          </div>

          {/* RIGHT COLUMN (4 cols): Watchlist, Diary */}
          <div className="lg:col-span-4 space-y-6">
            {/* WATCHLIST PREVIEW */}
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b border-lb-elevated pb-1 text-xs">
                <span className="uppercase tracking-wider font-bold text-lb-text text-[11px]">
                  Watchlist
                </span>
                <span className="text-lb-muted text-[11px]">{viewWatchlistCount}</span>
              </div>

              {/* Overlapping mini-posters */}
              {viewWatchlistCount === 0 ? (
                <p className="text-[11px] text-lb-muted pt-2">
                  No films in watchlist yet.
                </p>
              ) : (
                <div className="flex items-center -space-x-4 pt-1">
                  {watchlist.slice(0, 4).map((m, i) => (
                    <div
                      key={m.id}
                      className="w-14 aspect-[2/3] rounded-xs overflow-hidden shadow border border-white/20"
                      style={{ zIndex: 10 - i }}
                    >
                      {m.poster_path ? (
                        <img loading="lazy" decoding="async"
                          src={m.poster_path.startsWith('http') ? m.poster_path : tmdb.getImageUrl(m.poster_path, 'w185')}
                          alt={m.title}
                          title={m.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-lb-surface flex items-center justify-center text-[8px] text-lb-muted px-0.5 text-center">
                          {m.title}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* DIARY PREVIEW */}
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b border-lb-elevated pb-1 text-xs">
                <span className="uppercase tracking-wider font-bold text-lb-text text-[11px]">
                  Diary
                </span>
                <span className="text-lb-muted text-[11px]">{viewDiaryCount}</span>
              </div>

              <div className="space-y-1.5 text-xs text-lb-white">
                {viewDiaryCount === 0 ? (
                  <p className="text-[11px] text-lb-muted pt-1">No diary entries yet.</p>
                ) : viewLogs.slice(0, 3).map((l, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-lb-muted">
                      {l.watchedDate.slice(8, 10)}
                    </span>
                    <Link
                      to={`/film/${l.movieId}`}
                      className="text-white hover:text-lb-green truncate text-xs"
                    >
                      {l.movieTitle}
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* OTHER TABS */}
      {currentTab === 'films' && (
        <div className="space-y-4">
          <h2 className="text-xs uppercase tracking-widest font-bold text-lb-text border-b border-lb-elevated pb-2">
            All Watched Films ({logs.length})
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
            {logs.map((log, idx) => (
              <PosterCard
                key={`all-${log.id}-${idx}`}
                movie={{
                  id: log.movieId,
                  title: log.movieTitle,
                  poster_path: log.moviePoster,
                  release_date: log.movieYear,
                }}
                showDetails
              />
            ))}
          </div>
        </div>
      )}

      {currentTab === 'diary' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-lb-elevated pb-2">
            <h2 className="text-xs uppercase tracking-widest font-bold text-lb-text">
              Film Diary ({logs.length} entries)
            </h2>
          </div>

          <div className="bg-lb-surface border border-lb-elevated rounded-sm overflow-x-auto">
            <table className="w-full min-w-[560px] text-xs text-left">
              <thead className="bg-lb-bg border-b border-lb-elevated text-[11px] uppercase font-bold text-lb-muted">
                <tr>
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4">Film</th>
                  <th className="py-2.5 px-4">Released</th>
                  <th className="py-2.5 px-4">Rating</th>
                  <th className="py-2.5 px-4 text-center">Like</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-lb-elevated/60">
                {logs.map((log, idx) => (
                  <tr key={`diary-tab-${log.id}-${idx}`} className="hover:bg-lb-elevated/50 transition-colors">
                    <td className="py-2.5 px-4 font-mono text-lb-text">{log.watchedDate}</td>
                    <td className="py-2.5 px-4 font-bold text-white">
                      <Link to={`/film/${log.movieId}`} className="hover:text-lb-green">
                        {log.movieTitle}
                      </Link>
                    </td>
                    <td className="py-2.5 px-4 text-lb-muted">{log.movieYear}</td>
                    <td className="py-2.5 px-4 text-lb-green font-bold">
                      {log.rating > 0 ? `${log.rating} ★` : '—'}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      {log.liked ? <Heart className="w-3.5 h-3.5 fill-lb-orange text-lb-orange inline" /> : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {currentTab === 'reviews' && (
        <div className="space-y-4">
          <h2 className="text-xs uppercase tracking-widest font-bold text-lb-text border-b border-lb-elevated pb-2">
            Reviews
          </h2>
          <div className="space-y-4">
            {logs
              .filter((l) => l.reviewText)
              .map((l, idx) => (
                <div key={`rev-${l.id}-${idx}`} className="bg-lb-surface border border-lb-elevated p-4 rounded text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <Link to={`/film/${l.movieId}`} className="font-bold text-white text-sm hover:text-lb-green">
                      {l.movieTitle} ({l.movieYear})
                    </Link>
                    <span className="text-lb-muted">{l.watchedDate}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lb-green font-bold">★ {l.rating}</span>
                    {l.liked && <Heart className="w-3.5 h-3.5 fill-lb-orange text-lb-orange" />}
                  </div>
                  <p className="text-lb-white leading-relaxed">{l.reviewText}</p>
                </div>
              ))}
          </div>
        </div>
      )}

      {currentTab === 'activity' && (
        <div className="space-y-4">
          <h2 className="text-xs uppercase tracking-widest font-bold text-lb-text border-b border-lb-elevated pb-2">
            Activity
          </h2>
          {logs.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <p className="text-sm text-white font-semibold">Nothing here yet</p>
              <p className="text-xs text-lb-muted">Activity will appear when you log films.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
              {logs.map((log, idx) => (
                <PosterCard
                  key={`act-${log.id}-${idx}`}
                  movie={{
                    id: log.movieId,
                    title: log.movieTitle,
                    poster_path: log.moviePoster,
                    release_date: log.movieYear,
                  }}
                  showDetails
                />
              ))}
            </div>
          )}
        </div>
      )}

      {currentTab === 'watchlist' && (
        <div className="space-y-4">
          <h2 className="text-xs uppercase tracking-widest font-bold text-lb-text border-b border-lb-elevated pb-2">
            Watchlist ({viewWatchlistCount})
          </h2>
          {viewWatchlistCount === 0 ? (
            <div className="py-12 text-center space-y-2">
              <p className="text-sm text-white font-semibold">Nothing here yet</p>
              <p className="text-xs text-lb-muted">Add films to your watchlist and they will appear here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
              {watchlist.map((m) => (
                <PosterCard
                  key={`wl-${m.id}`}
                  size="fluid"
                  movie={{
                    id: m.id,
                    title: m.title,
                    poster_path:
                      m.poster_path && m.poster_path.startsWith('http')
                        ? null
                        : m.poster_path,
                    release_date: m.release_date,
                  }}
                  showDetails
                />
              ))}
            </div>
          )}
        </div>
      )}

      {currentTab === 'likes' && (
        <div className="space-y-4">
          <h2 className="text-xs uppercase tracking-widest font-bold text-lb-text border-b border-lb-elevated pb-2">
            Likes
          </h2>
          {likedMovies.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <p className="text-sm text-white font-semibold">Nothing here yet</p>
              <p className="text-xs text-lb-muted">Films you like will appear here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
              {likedMovies.map((m) => (
                <PosterCard key={`like-${m.id}`} movie={m} showDetails />
              ))}
            </div>
          )}
        </div>
      )}

      {currentTab === 'tags' && (
        <div className="space-y-4">
          <h2 className="text-xs uppercase tracking-widest font-bold text-lb-text border-b border-lb-elevated pb-2">
            Tags
          </h2>
          <div className="py-12 text-center space-y-2">
            <p className="text-sm text-white font-semibold">Nothing here yet</p>
            <p className="text-xs text-lb-muted">Tags you add to your logs will appear here.</p>
          </div>
        </div>
      )}

      {currentTab === 'network' && (
        <div className="space-y-4">
          <h2 className="text-xs uppercase tracking-widest font-bold text-lb-text border-b border-lb-elevated pb-2">
            Network
          </h2>
          <div className="py-12 text-center space-y-2">
            <p className="text-sm text-white font-semibold">Nothing here yet</p>
            <p className="text-xs text-lb-muted">Members you follow and their activity will appear here.</p>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {isEditingBio && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-lb-surface border border-lb-elevated w-full max-w-md rounded p-6 shadow-2xl">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white mb-4">
              Edit Profile
            </h3>
            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div>
                <label className="block text-lb-muted uppercase font-bold mb-1">Display Name</label>
                <input
                  type="text"
                  value={editForm.displayName}
                  onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                  className="w-full bg-lb-bg border border-lb-elevated rounded p-2 text-white"
                />
              </div>
              <div>
                <label className="block text-lb-muted uppercase font-bold mb-1">Bio</label>
                <textarea
                  rows={3}
                  value={editForm.bio}
                  onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                  className="w-full bg-lb-bg border border-lb-elevated rounded p-2 text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditingBio(false)}
                  className="px-3 py-1.5 text-lb-muted hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-lb-green text-lb-bg font-bold rounded"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
