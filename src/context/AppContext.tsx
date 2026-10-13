import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { UserProfile, LogEntry, MovieList, Review } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface MovieShort {
  id: number;
  title: string;
  poster_path: string | null;
  release_date: string;
}

interface AppContextType {
  user: UserProfile;
  updateUser: (updates: Partial<UserProfile>) => void;
  logs: LogEntry[];
  saveLog: (entry: Omit<LogEntry, 'id' | 'createdAt'>) => void;
  deleteLog: (id: string) => void;
  watchlist: MovieShort[];
  toggleWatchlist: (movie: MovieShort) => void;
  isMovieInWatchlist: (movieId: number) => boolean;
  watchedMovieIds: number[];
  toggleWatched: (movieId: number) => void;
  isMovieWatched: (movieId: number) => boolean;
  likedMovieIds: number[];
  toggleLikeMovie: (movieId: number) => void;
  isMovieLiked: (movieId: number) => boolean;
  ratingsMap: Record<number, number>;
  setMovieRating: (movieId: number, rating: number) => void;
  top4MovieIds: number[];
  setTop4Movie: (slotIndex: number, movieId: number) => void;
  lists: MovieList[];
  createList: (newList: Omit<MovieList, 'id' | 'createdAt' | 'author' | 'likesCount' | 'commentsCount'>) => void;
  deleteList: (listId: string) => void;
  reviews: Review[];
  addReview: (newReview: Omit<Review, 'id' | 'createdAt' | 'author' | 'likesCount' | 'commentsCount'>) => void;
  movieOverrides: Record<number, { poster?: string; backdrop?: string }>;
  setMovieOverride: (movieId: number, override: { poster?: string; backdrop?: string }) => void;
  // Modal states
  isLogModalOpen: boolean;
  selectedMovieForLog: MovieShort | null;
  openLogModal: (movie?: MovieShort) => void;
  closeLogModal: () => void;
  isTop4PickerOpen: boolean;
  activeTop4Slot: number | null;
  openTop4Picker: (slotIndex: number) => void;
  closeTop4Picker: () => void;
}

import jpcmpc23Logs from '../data/jpcmpc23_logs.json';

// Perfil neutro para visitante DESLOGADO Ã¢â‚¬â€ nunca exibimos dados de outra
// conta (era o bug: guestUser hardcoded "jpcmpc23" aparecia no F5 sem login).
const guestUser: UserProfile = {
  id: 'guest',
  username: 'visitante',
  displayName: 'Visitante',
  bio: '',
  avatarUrl: '',
  backdropUrl: '',
  location: '',
  website: '',
  isPro: false,
  isPatron: false,
  top4MovieIds: [0, 0, 0, 0],
  followingCount: 0,
  followersCount: 0,
};

const initialLogs: LogEntry[] = [];

const initialWatchedIds: number[] = [];
const initialLikedIds: number[] = initialLogs.filter((l) => l.liked).map((l) => l.movieId);
const initialRatings: Record<number, number> = Object.fromEntries(
  initialLogs.filter((l) => l.rating > 0).map((l) => [l.movieId, l.rating])
);

const initialReviewsList: Review[] = (jpcmpc23Logs as LogEntry[])
  .filter((l) => Boolean(l.reviewText))
  .map((l, idx) => ({
    id: `rev-jpcmpc23-${idx + 1}`,
    movieId: l.movieId,
    movieTitle: l.movieTitle,
    moviePoster: l.moviePoster,
    movieYear: l.movieYear,
    author: {
      username: 'jpcmpc23',
      displayName: 'jpcmpc23',
      avatarUrl: '',
      isPro: true,
    },
    rating: l.rating,
    liked: l.liked,
    content: l.reviewText,
    containsSpoilers: l.containsSpoilers,
    watchedDate: l.watchedDate,
    likesCount: l.liked ? 4 : 1,
    commentsCount: 0,
    createdAt: l.createdAt,
  }));



const AppContext = createContext<AppContextType | undefined>(undefined);

// Row shape of public.film_logs in Supabase
interface FilmLogRow {
  id: string;
  user_id: string;
  film_id: number;
  film_title: string;
  film_poster: string | null;
  film_year: number | null;
  watched_on: string | null;
  rating: number | null;
  liked: boolean;
  review_text: string | null;
  contains_spoilers: boolean;
  created_at: string;
}

interface WatchlistRow {
  user_id: string;
  film_id: number;
  film_title: string;
  film_poster: string | null;
  film_year: number | null;
}

const rowToLogEntry = (row: FilmLogRow): LogEntry => ({
  id: row.id,
  movieId: row.film_id,
  movieTitle: row.film_title,
  moviePoster: row.film_poster,
  movieYear: row.film_year ? String(row.film_year) : '',
  watchedDate: row.watched_on ?? '',
  rating: row.rating ?? 0,
  isRewatch: false,
  liked: row.liked,
  reviewText: row.review_text ?? '',
  containsSpoilers: row.contains_spoilers,
  tags: [],
  createdAt: row.created_at,
});

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user: authUser, profile, isAuthenticated } = useAuth();

  // Movie metadata cache so quick toggles (watched/like/rating by id) can
  // still persist meaningful rows to Supabase.
  const movieMetaRef = useRef<Record<number, { title: string; poster: string | null; year: number | null }>>({});
  const rememberMovie = (m: { id: number; title?: string; poster_path?: string | null; release_date?: string; movieTitle?: string; moviePoster?: string | null; movieYear?: string | number }) => {
    const year = m.release_date?.slice(0, 4) ?? (m.movieYear ? String(m.movieYear).slice(0, 4) : '');
    movieMetaRef.current[m.id] = {
      title: m.title ?? m.movieTitle ?? movieMetaRef.current[m.id]?.title ?? '',
      poster: m.poster_path !== undefined ? m.poster_path : (m.moviePoster ?? movieMetaRef.current[m.id]?.poster ?? null),
      year: year ? parseInt(year, 10) : (movieMetaRef.current[m.id]?.year ?? null),
    };
  };

  // AuthProvider jÃ¡ garante que a sessÃ£o foi resolvida antes deste mount,
  // entÃ£o isAuthenticated Ã© confiÃ¡vel aqui. DESLOGADO â†’ estado visitante vazio
  // (nunca reidrata lb_* do localStorage â€” seriam dados de outra conta).
  const [user, setUser] = useState<UserProfile>(() => {
    if (!isAuthenticated) return guestUser;
    const saved = localStorage.getItem('lb_user');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.username === 'cinephile' || parsed.username === 'jpcmpc23') return guestUser;
      return parsed;
    }
    return guestUser;
  });

  const [logs, setLogs] = useState<LogEntry[]>(() => {
    if (!isAuthenticated) return initialLogs;
    const saved = localStorage.getItem('lb_logs');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.length <= 4) return initialLogs;
      return parsed;
    }
    return initialLogs;
  });

  const [watchlist, setWatchlist] = useState<MovieShort[]>(() => {
    if (!isAuthenticated) return [];
    const saved = localStorage.getItem('lb_watchlist');
    return saved ? JSON.parse(saved) : [];
  });

  const [watchedMovieIds, setWatchedMovieIds] = useState<number[]>(() => {
    if (!isAuthenticated) return initialWatchedIds;
    const saved = localStorage.getItem('lb_watched');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.length <= 5) return initialWatchedIds;
      return parsed;
    }
    return initialWatchedIds;
  });

  const [likedMovieIds, setLikedMovieIds] = useState<number[]>(() => {
    if (!isAuthenticated) return initialLikedIds;
    const saved = localStorage.getItem('lb_likes');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.length <= 5) return initialLikedIds;
      return parsed;
    }
    return initialLikedIds;
  });

  const [ratingsMap, setRatingsMap] = useState<Record<number, number>>(() => {
    if (!isAuthenticated) return initialRatings;
    const saved = localStorage.getItem('lb_ratings');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Object.keys(parsed).length <= 5) return initialRatings;
      return parsed;
    }
    return initialRatings;
  });

  const [top4MovieIds, setTop4MovieIds] = useState<number[]>(() => {
    if (!isAuthenticated) return guestUser.top4MovieIds;
    const saved = localStorage.getItem('lb_top4');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.includes(157336)) return guestUser.top4MovieIds;
      return parsed;
    }
    return guestUser.top4MovieIds;
  });

  const [lists, setLists] = useState<MovieList[]>(() => {
    if (!isAuthenticated) return [];
    const saved = localStorage.getItem('lb_lists');
    return saved ? JSON.parse(saved) : [];
  });

  const [reviews, setReviews] = useState<Review[]>(() => {
    if (!isAuthenticated) return [];
    const saved = localStorage.getItem('lb_reviews');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.length <= 2) return initialReviewsList;
      return parsed;
    }
    return initialReviewsList;
  });

  // Custom poster/backdrop overrides per film (like MyWorld's "Set film poster/backdrop")
  const [movieOverrides, setMovieOverrides] = useState<Record<number, { poster?: string; backdrop?: string }>>(() => {
    const saved = localStorage.getItem('lb_movie_overrides');
    return saved ? JSON.parse(saved) : {};
  });

  const setMovieOverride = (movieId: number, override: { poster?: string; backdrop?: string }) => {
    const next = { ...(movieOverrides[movieId] || {}), ...override };

    setMovieOverrides((prev) => {
      const merged = { ...prev[movieId], ...override };
      if (!merged.poster && !merged.backdrop) {
        const { [movieId]: _removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [movieId]: merged };
    });

    // Persiste no Supabase (tabela film_overrides Ã¢â‚¬â€ migration_film_overrides.sql)
    if (supabase && isAuthenticated && authUser) {
      void (async () => {
        if (!next.poster && !next.backdrop) {
          const { error } = await supabase
            .from('film_overrides')
            .delete()
            .eq('user_id', authUser.id)
            .eq('film_id', movieId);
          if (error) console.warn('film_overrides delete error (rode migration_film_overrides.sql):', error.message);
        } else {
          const { error } = await supabase
            .from('film_overrides')
            .upsert(
              {
                user_id: authUser.id,
                film_id: movieId,
                poster_url: next.poster ?? null,
                backdrop_url: next.backdrop ?? null,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'user_id,film_id' }
            );
          if (error) console.warn('film_overrides upsert error (rode migration_film_overrides.sql):', error.message);
        }
      })();
    }
  };

  // Modal controls
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [selectedMovieForLog, setSelectedMovieForLog] = useState<MovieShort | null>(null);
  const [isTop4PickerOpen, setIsTop4PickerOpen] = useState(false);
  const [activeTop4Slot, setActiveTop4Slot] = useState<number | null>(null);

  // Sync with LocalStorage
  useEffect(() => { localStorage.setItem('lb_user', JSON.stringify(user)); }, [user]);
  useEffect(() => { localStorage.setItem('lb_logs', JSON.stringify(logs)); }, [logs]);
  useEffect(() => { localStorage.setItem('lb_watchlist', JSON.stringify(watchlist)); }, [watchlist]);
  useEffect(() => { localStorage.setItem('lb_watched', JSON.stringify(watchedMovieIds)); }, [watchedMovieIds]);
  useEffect(() => { localStorage.setItem('lb_likes', JSON.stringify(likedMovieIds)); }, [likedMovieIds]);
  useEffect(() => { localStorage.setItem('lb_ratings', JSON.stringify(ratingsMap)); }, [ratingsMap]);
  useEffect(() => { localStorage.setItem('lb_top4', JSON.stringify(top4MovieIds)); }, [top4MovieIds]);
  useEffect(() => { localStorage.setItem('lb_lists', JSON.stringify(lists)); }, [lists]);
  useEffect(() => { localStorage.setItem('lb_reviews', JSON.stringify(reviews)); }, [reviews]);
  useEffect(() => {
    // Enquanto logado, overrides vivem no Supabase (nÃƒÂ£o no localStorage!)
    if (isAuthenticated) return;
    localStorage.setItem('lb_movie_overrides', JSON.stringify(movieOverrides));
  }, [movieOverrides, isAuthenticated]);

  // Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  // Supabase integration Ã¢â‚¬â€ ativa apenas quando hÃƒÂ¡ usuÃƒÂ¡rio autenticado
  // Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  const syncedUserIdRef = useRef<string | null>(null);
  // Estado (nÃƒÂ£o ref) para gatear o primeiro render: enquanto autenticado e
  // ainda nÃƒÂ£o sincronizado, nenhum filho renderiza (evita flash dos dados de
  // demo/localStorage, pois o clear acontece em useEffect, apÃƒÂ³s o 1Ã‚Âº paint).
  const [syncedUserId, setSyncedUserId] = useState<string | null>(null);

  // Quando autenticado, sobrepÃƒÂµe o usuÃƒÂ¡rio local com o perfil real do Supabase
  useEffect(() => {
    if (!isAuthenticated || !authUser || !profile) return;
    setUser((prev) => ({
      ...prev,
      id: authUser.id,
      username: profile.username,
      displayName: profile.display_name || profile.username,
      avatarUrl: profile.avatar_url || prev.avatarUrl,
      bio: profile.bio || prev.bio,
    }));
  }, [isAuthenticated, authUser, profile]);

  // Carrega film_logs + watchlist do Supabase no login
  useEffect(() => {
    const client = supabase;
    if (!client || !isAuthenticated || !authUser) {
      syncedUserIdRef.current = null;
      setSyncedUserId(null);
      // Ao deslogar, volta TUDO para o estado de visitante: dados da conta
      // anterior nÃ£o podem "vazar" (nem aparecer depois de F5) para visitantes.
      setUser(guestUser);
      setLogs([]);
      setWatchedMovieIds([]);
      setLikedMovieIds([]);
      setRatingsMap({});
      setReviews([]);
      setWatchlist([]);
      setLists([]);
      setTop4MovieIds([0, 0, 0, 0]);
      setMovieOverrides({});
      localStorage.removeItem('lb_movie_overrides');
      localStorage.removeItem('lb_user');
      localStorage.removeItem('lb_logs');
      localStorage.removeItem('lb_watched');
      localStorage.removeItem('lb_likes');
      localStorage.removeItem('lb_ratings');
      localStorage.removeItem('lb_top4');
      localStorage.removeItem('lb_lists');
      localStorage.removeItem('lb_reviews');
      localStorage.removeItem('lb_watchlist');
      return;
    }
    if (syncedUserIdRef.current === authUser.id) return;
    syncedUserIdRef.current = authUser.id;

    // Zera o estado local imediatamente para nÃƒÂ£o vazar dados de demo/localStorage
    // em "flash" enquanto o Supabase responde (ex.: refresh na pÃƒÂ¡gina de perfil).
    setLogs([]);
    setWatchedMovieIds([]);
    setLikedMovieIds([]);
    setRatingsMap({});
    setReviews([]);
    setWatchlist([]);
    setTop4MovieIds([0, 0, 0, 0]);
    setMovieOverrides({});

    const loadRemoteData = async () => {
      const [logsRes, watchlistRes, favRes, overridesRes] = await Promise.all([
        client.from('film_logs').select('*').eq('user_id', authUser.id).order('created_at', { ascending: false }),
        client.from('watchlist').select('*').eq('user_id', authUser.id).order('added_at', { ascending: false }),
        // favorite_films exige supabase/migration_settings.sql; tolerante a coluna ausente
        client.from('profiles').select('favorite_films').eq('id', authUser.id).maybeSingle(),
        // film_overrides exige supabase/migration_film_overrides.sql; tolerante a tabela ausente
        client.from('film_overrides').select('film_id, poster_url, backdrop_url').eq('user_id', authUser.id),
      ]);

      if (overridesRes.error) {
        console.warn('film_overrides indisponÃƒÂ­vel (rode supabase/migration_film_overrides.sql):', overridesRes.error.message);
      } else if (overridesRes.data) {
        const map: Record<number, { poster?: string; backdrop?: string }> = {};
        for (const row of overridesRes.data as { film_id: number; poster_url: string | null; backdrop_url: string | null }[]) {
          map[row.film_id] = {
            poster: row.poster_url || undefined,
            backdrop: row.backdrop_url || undefined,
          };
        }
        setMovieOverrides(map);
      }

      // Top 4 vindo do Supabase sobrepÃƒÂµe o local (quando a coluna existir e tiver dados)
      if (favRes.error) {
        console.warn('favorite_films indisponÃƒÂ­vel (rode supabase/migration_settings.sql):', favRes.error.message);
      } else if (Array.isArray(favRes.data?.favorite_films)) {
        // Conta nova tem favorite_films = {} Ã¢â‚¬â€ nesse caso os 4 slots ficam vazios
        const ids = (favRes.data.favorite_films as unknown[])
          .filter((n): n is number => typeof n === 'number' && Number.isFinite(n))
          .slice(0, 4);
        // Garante 4 slots; slots vazios sÃƒÂ£o representados como 0
        while (ids.length < 4) ids.push(0);
        setTop4MovieIds(ids);
      }

      if (logsRes.error) {
        console.error('Supabase film_logs load error:', logsRes.error);
      } else if (logsRes.data) {
        const remoteLogs = (logsRes.data as FilmLogRow[]).map(rowToLogEntry);
        setLogs(remoteLogs);
        setWatchedMovieIds(Array.from(new Set(remoteLogs.map((l) => l.movieId))));
        setLikedMovieIds(remoteLogs.filter((l) => l.liked).map((l) => l.movieId));
        setRatingsMap(
          Object.fromEntries(remoteLogs.filter((l) => l.rating > 0).map((l) => [l.movieId, l.rating]))
        );
        remoteLogs.forEach((l) => rememberMovie({ id: l.movieId, movieTitle: l.movieTitle, moviePoster: l.moviePoster, movieYear: l.movieYear }));
        setReviews(
          remoteLogs
            .filter((l) => l.reviewText.trim())
            .map((l) => ({
              id: `rev-${l.id}`,
              movieId: l.movieId,
              movieTitle: l.movieTitle,
              moviePoster: l.moviePoster,
              movieYear: l.movieYear,
              author: {
                username: profile?.username ?? 'me',
                displayName: profile?.display_name ?? 'me',
                avatarUrl: profile?.avatar_url ?? '',
              },
              rating: l.rating,
              liked: l.liked,
              content: l.reviewText,
              containsSpoilers: l.containsSpoilers,
              watchedDate: l.watchedDate,
              likesCount: 0,
              commentsCount: 0,
              createdAt: l.createdAt,
            }))
        );
      }

      if (watchlistRes.error) {
        console.error('Supabase watchlist load error:', watchlistRes.error);
      } else if (watchlistRes.data) {
        const remoteWatchlist = (watchlistRes.data as WatchlistRow[]).map((row) => ({
          id: row.film_id,
          title: row.film_title,
          poster_path: row.film_poster,
          release_date: row.film_year ? `${row.film_year}-01-01` : '',
        }));
        remoteWatchlist.forEach((m) => rememberMovie(m));
        setWatchlist(remoteWatchlist);
      }
    };

    void loadRemoteData()
      .catch((err) => console.error('Supabase remote load failed:', err))
      .finally(() => setSyncedUserId(authUser.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, authUser?.id]);

  // Upsert de um "quick log" (sem data) em film_logs Ã¢â‚¬â€ usado por toggles/rating
  const persistQuickLog = async (filmId: number, patch: { watched?: boolean; liked?: boolean; rating?: number }) => {
    if (!supabase || !isAuthenticated || !authUser) return;
    const meta = movieMetaRef.current[filmId] ?? { title: '', poster: null, year: null };

    const { data: existing } = await supabase
      .from('film_logs')
      .select('id, rating, liked, review_text')
      .eq('user_id', authUser.id)
      .eq('film_id', filmId)
      .is('watched_on', null)
      .maybeSingle();

    if (existing) {
      const updates: Record<string, unknown> = {};
      if (patch.liked !== undefined) updates.liked = patch.liked;
      if (patch.rating !== undefined) updates.rating = patch.rating > 0 ? patch.rating : null;
      if (patch.watched === false && !existing.review_text) {
        await supabase.from('film_logs').delete().eq('id', existing.id);
        return;
      }
      if (Object.keys(updates).length > 0) {
        const { error } = await supabase.from('film_logs').update(updates).eq('id', existing.id);
        if (error) console.error('Supabase film_logs update error:', error);
      }
    } else if (patch.watched !== false) {
      const { error } = await supabase.from('film_logs').insert({
        user_id: authUser.id,
        film_id: filmId,
        film_title: meta.title,
        film_poster: meta.poster,
        film_year: meta.year,
        watched_on: null,
        rating: patch.rating && patch.rating > 0 ? patch.rating : null,
        liked: patch.liked ?? false,
      });
      if (error) console.error('Supabase film_logs insert error:', error);
    }
  };

  const persistWatchlistAdd = async (movie: MovieShort) => {
    if (!supabase || !isAuthenticated || !authUser) return;
    rememberMovie(movie);
    const meta = movieMetaRef.current[movie.id];
    const { error } = await supabase.from('watchlist').upsert(
      {
        user_id: authUser.id,
        film_id: movie.id,
        film_title: meta?.title ?? movie.title,
        film_poster: meta?.poster ?? movie.poster_path,
        film_year: meta?.year ?? (movie.release_date ? parseInt(movie.release_date.slice(0, 4), 10) : null),
      },
      { onConflict: 'user_id,film_id' }
    );
    if (error) console.error('Supabase watchlist upsert error:', error);
  };

  const persistWatchlistRemove = async (filmId: number) => {
    if (!supabase || !isAuthenticated || !authUser) return;
    const { error } = await supabase.from('watchlist').delete().eq('user_id', authUser.id).eq('film_id', filmId);
    if (error) console.error('Supabase watchlist delete error:', error);
  };

  const persistFullLog = async (entry: Omit<LogEntry, 'id' | 'createdAt'>) => {
    if (!supabase || !isAuthenticated || !authUser) return;
    rememberMovie({ id: entry.movieId, movieTitle: entry.movieTitle, moviePoster: entry.moviePoster, movieYear: entry.movieYear });
    const meta = movieMetaRef.current[entry.movieId];
    const { error } = await supabase.from('film_logs').insert({
      user_id: authUser.id,
      film_id: entry.movieId,
      film_title: meta.title,
      film_poster: meta.poster,
      film_year: meta.year,
      watched_on: entry.watchedDate || null,
      rating: entry.rating > 0 ? entry.rating : null,
      liked: entry.liked,
      review_text: entry.reviewText.trim() || null,
      contains_spoilers: entry.containsSpoilers,
    });
    if (error) console.error('Supabase film_logs insert error:', error);
  };

  const updateUser = (updates: Partial<UserProfile>) => {
    setUser((prev) => ({ ...prev, ...updates }));
  };

  const saveLog = (entry: Omit<LogEntry, 'id' | 'createdAt'>) => {
    const newId = `log-${Date.now()}`;
    const newEntry: LogEntry = {
      ...entry,
      id: newId,
      createdAt: new Date().toISOString(),
    };

    setLogs((prev) => [newEntry, ...prev]);

    // Update watched
    if (!watchedMovieIds.includes(entry.movieId)) {
      setWatchedMovieIds((prev) => [entry.movieId, ...prev]);
    }

    // Update liked
    if (entry.liked && !likedMovieIds.includes(entry.movieId)) {
      setLikedMovieIds((prev) => [entry.movieId, ...prev]);
    } else if (!entry.liked && likedMovieIds.includes(entry.movieId)) {
      setLikedMovieIds((prev) => prev.filter((id) => id !== entry.movieId));
    }

    // Update rating
    if (entry.rating > 0) {
      setRatingsMap((prev) => ({ ...prev, [entry.movieId]: entry.rating }));
    }

    // If review exists, add to reviews list
    if (entry.reviewText.trim()) {
      const review: Review = {
        id: `rev-${Date.now()}`,
        movieId: entry.movieId,
        movieTitle: entry.movieTitle,
        moviePoster: entry.moviePoster,
        movieYear: entry.movieYear,
        author: {
          username: user.username,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          isPro: user.isPro,
        },
        rating: entry.rating,
        liked: entry.liked,
        content: entry.reviewText,
        containsSpoilers: entry.containsSpoilers,
        watchedDate: entry.watchedDate,
        likesCount: 1,
        commentsCount: 0,
        createdAt: new Date().toISOString(),
      };
      setReviews((prev) => [review, ...prev]);
    }

    void persistFullLog(entry);
  };

  const deleteLog = (id: string) => {
    setLogs((prev) => prev.filter((item) => item.id !== id));
  };

  const toggleWatchlist = (movie: MovieShort) => {
    const exists = watchlist.some((m) => m.id === movie.id);
    rememberMovie(movie);
    setWatchlist((prev) => {
      const wasInList = prev.some((m) => m.id === movie.id);
      if (wasInList) {
        return prev.filter((m) => m.id !== movie.id);
      }
      return [movie, ...prev];
    });
    if (exists) {
      void persistWatchlistRemove(movie.id);
    } else {
      void persistWatchlistAdd(movie);
    }
  };

  const isMovieInWatchlist = (movieId: number) => {
    return watchlist.some((m) => m.id === movieId);
  };

  const toggleWatched = (movieId: number) => {
    const wasWatched = watchedMovieIds.includes(movieId);
    setWatchedMovieIds((prev) =>
      prev.includes(movieId) ? prev.filter((id) => id !== movieId) : [movieId, ...prev]
    );
    void persistQuickLog(movieId, { watched: !wasWatched });
  };

  const isMovieWatched = (movieId: number) => {
    return watchedMovieIds.includes(movieId);
  };

  const toggleLikeMovie = (movieId: number) => {
    const wasLiked = likedMovieIds.includes(movieId);
    setLikedMovieIds((prev) =>
      prev.includes(movieId) ? prev.filter((id) => id !== movieId) : [movieId, ...prev]
    );
    if (watchedMovieIds.includes(movieId)) {
      void persistQuickLog(movieId, { liked: !wasLiked });
    }
  };

  const isMovieLiked = (movieId: number) => {
    return likedMovieIds.includes(movieId);
  };

  const setMovieRating = (movieId: number, rating: number) => {
    setRatingsMap((prev) => ({ ...prev, [movieId]: rating }));
    if (!watchedMovieIds.includes(movieId)) {
      setWatchedMovieIds((prev) => [movieId, ...prev]);
    }
    void persistQuickLog(movieId, { rating });
  };

  // Persiste o Top 4 no Supabase (profiles.favorite_films, int[]).
  // Slots vazios sÃƒÂ£o persistidos como 0 Ã¢â‚¬â€ int[] nÃƒÂ£o aceita null.
  const persistTop4 = async (ids: number[]) => {
    if (!supabase || !isAuthenticated || !authUser) return;
    const { error } = await supabase
      .from('profiles')
      .update({ favorite_films: ids })
      .eq('id', authUser.id);
    if (error) {
      console.warn(
        'NÃƒÂ£o foi possÃƒÂ­vel salvar favorite_films Ã¢â‚¬â€ rode supabase/migration_settings.sql no Supabase SQL Editor.',
        error.message
      );
    }
  };

  const setTop4Movie = (slotIndex: number, movieId: number) => {
    setTop4MovieIds((prev) => {
      const updated = [...prev];
      updated[slotIndex] = movieId;
      void persistTop4(updated);
      return updated;
    });
  };

  const createList = (newList: Omit<MovieList, 'id' | 'createdAt' | 'author' | 'likesCount' | 'commentsCount'>) => {
    const list: MovieList = {
      ...newList,
      id: `list-${Date.now()}`,
      author: {
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
      },
      likesCount: 0,
      commentsCount: 0,
      createdAt: new Date().toISOString(),
    };
    setLists((prev) => [list, ...prev]);
  };

  const deleteList = (listId: string) => {
    setLists((prev) => prev.filter((l) => l.id !== listId));
  };

  const addReview = (newReview: Omit<Review, 'id' | 'createdAt' | 'author' | 'likesCount' | 'commentsCount'>) => {
    const rev: Review = {
      ...newReview,
      id: `rev-${Date.now()}`,
      author: {
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        isPro: user.isPro,
      },
      likesCount: 0,
      commentsCount: 0,
      createdAt: new Date().toISOString(),
    };
    setReviews((prev) => [rev, ...prev]);
  };

  const openLogModal = (movie?: MovieShort) => {
    setSelectedMovieForLog(movie || null);
    setIsLogModalOpen(true);
  };

  const closeLogModal = () => {
    setIsLogModalOpen(false);
    setSelectedMovieForLog(null);
  };

  const openTop4Picker = (slotIndex: number) => {
    setActiveTop4Slot(slotIndex);
    setIsTop4PickerOpen(true);
  };

  const closeTop4Picker = () => {
    setIsTop4PickerOpen(false);
    setActiveTop4Slot(null);
  };

  // Gate: autenticado mas dados remotos ainda nÃƒÂ£o sincronizados Ã¢â€ â€™ spinner.
  // Sem isso, o primeiro render pintaria logs/watchlist/top4 do localStorage
  // (o clear sÃƒÂ³ roda em useEffect, depois do paint).
  if (isAuthenticated && authUser && syncedUserId !== authUser.id) {
    return (
      <div className="min-h-screen bg-[#14181c] flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-[#00e054] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AppContext.Provider
      value={{
        user,
        updateUser,
        logs,
        saveLog,
        deleteLog,
        watchlist,
        toggleWatchlist,
        isMovieInWatchlist,
        watchedMovieIds,
        toggleWatched,
        isMovieWatched,
        likedMovieIds,
        toggleLikeMovie,
        isMovieLiked,
        ratingsMap,
        setMovieRating,
        top4MovieIds,
        setTop4Movie,
        lists,
        createList,
        deleteList,
        reviews,
        addReview,
        movieOverrides,
        setMovieOverride,
        isLogModalOpen,
        selectedMovieForLog,
        openLogModal,
        closeLogModal,
        isTop4PickerOpen,
        activeTop4Slot,
        openTop4Picker,
        closeTop4Picker,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
