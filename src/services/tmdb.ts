// ATENÇÃO: nunca recoloque chaves reais como fallback aqui — use apenas
// variáveis de ambiente (.env local ou secrets de CI). Chaves hardcoded
// vazam no repositório público mesmo se as envs estiverem corretas.
const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY as string | undefined;
const TMDB_ACCESS_TOKEN = import.meta.env.VITE_TMDB_ACCESS_TOKEN as string | undefined;

if (!TMDB_API_KEY || !TMDB_ACCESS_TOKEN) {
  // Falha rápida e visível em dev; em produção o .env commitado fornece os valores.
  console.error('[tmdb] VITE_TMDB_API_KEY / VITE_TMDB_ACCESS_TOKEN não definidas. Crie um .env local.');
}
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

export interface TMDBMovie {
  id: number;
  title: string;
  original_title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  release_date: string;
  vote_average: number;
  vote_count: number;
  genre_ids?: number[];
  popularity: number;
}


export interface TMDBSeries {
  id: number;
  name: string;
  original_name: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  first_air_date: string;
  vote_average: number;
  vote_count: number;
  genre_ids?: number[];
  popularity: number;
}
export interface TMDBMovieDetails extends TMDBMovie {
  tagline: string;
  runtime: number;
  status: string;
  budget: number;
  revenue: number;
  genres: { id: number; name: string }[];
  production_companies: { id: number; name: string; logo_path: string | null; origin_country: string }[];
  production_countries: { iso_3166_1: string; name: string }[];
  spoken_languages: { english_name: string; iso_639_1: string; name: string }[];
  credits?: {
    cast: {
      id: number;
      name: string;
      character: string;
      profile_path: string | null;
      order: number;
    }[];
    crew: {
      id: number;
      name: string;
      job: string;
      department: string;
      profile_path: string | null;
    }[];
  };
  similar?: {
    results: TMDBMovie[];
  };
  recommendations?: {
    results: TMDBMovie[];
  };
  'watch/providers'?: {
    results: {
      [countryCode: string]: {
        link: string;
        flatrate?: { provider_id: number; provider_name: string; logo_path: string }[];
        rent?: { provider_id: number; provider_name: string; logo_path: string }[];
        buy?: { provider_id: number; provider_name: string; logo_path: string }[];
      };
    };
  };
  videos?: {
    results: {
      id: string;
      key: string;
      name: string;
      site: string;
      type: string;
    }[];
  };
}

export interface TMDBImage {
  file_path: string;
  width: number;
  height: number;
  aspect_ratio: number;
  vote_average: number;
  vote_count: number;
}

export interface TMDBMovieImages {
  id: number;
  posters: TMDBImage[];
  backdrops: TMDBImage[];
}

export interface TMDBPerson {
  id: number;
  name: string;
  biography: string;
  profile_path: string | null;
  known_for_department: string;
  birthday: string | null;
  place_of_birth?: string | null;
  also_known_as?: string[];
}

export interface TMDBPersonMovieCredit {
  id: number;
  title: string;
  original_title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  popularity: number;
  character?: string;
  job?: string;
  department?: string;
  genre_ids?: number[];
}

export interface TMDBPersonMovieCredits {
  id: number;
  cast: TMDBPersonMovieCredit[];
  crew: TMDBPersonMovieCredit[];
}

export interface TMDBResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

// Cache em memória com TTL: evita refazer chamadas idênticas do TMDb ao
// navegar entre páginas (ex.: Home → Filme → voltar). Também deduplica
// chamadas simultâneas da mesma URL (React StrictMode / mounts paralelos).
const TMDB_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos
const tmdbCache = new Map<string, { data: unknown; expires: number }>();
const tmdbInflight = new Map<string, Promise<unknown>>();

async function fetchFromTMDB<T>(endpoint: string, params: Record<string, string | number | undefined> = {}): Promise<T> {
  if (!TMDB_API_KEY || !TMDB_ACCESS_TOKEN) {
    throw new Error('TMDB não configurado: defina VITE_TMDB_API_KEY e VITE_TMDB_ACCESS_TOKEN no .env');
  }
  const headers = {
    Authorization: `Bearer ${TMDB_ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
  };
  const url = new URL(`${BASE_URL}${endpoint}`);
  // Add API Key as fallback alongside Bearer token
  url.searchParams.append('api_key', TMDB_API_KEY);

  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      url.searchParams.append(key, String(val));
    }
  });

  const urlString = url.toString();

  // Cache hit?
  const cached = tmdbCache.get(urlString);
  if (cached && cached.expires > Date.now()) {
    return cached.data as T;
  }

  // Requisição idêntica já em andamento? Reutiliza a mesma Promise.
  const inflight = tmdbInflight.get(urlString);
  if (inflight) {
    return inflight as Promise<T>;
  }

  const promise = (async () => {
    const res = await fetch(urlString, { headers });
    if (!res.ok) {
      throw new Error(`TMDB error ${res.status}: ${res.statusText}`);
    }
    const data = await res.json();
    // Esconde itens sem pôster (no site todo): em listas de filmes, descarta
    // resultados com poster_path nulo. Itens sem a chave (ex.: pessoas em
    // buscas multi) ou com pôster preenchido passam normalmente.
    if (data && Array.isArray(data.results)) {
      data.results = data.results.filter(
        (r: { poster_path?: string | null }) => !('poster_path' in r) || Boolean(r.poster_path),
      );
    }
    tmdbCache.set(urlString, { data, expires: Date.now() + TMDB_CACHE_TTL_MS });
    // Limpeza simples: evita crescimento ilimitado do cache em sessões longas.
    if (tmdbCache.size > 300) {
      const now = Date.now();
      for (const [key, entry] of tmdbCache) {
        if (entry.expires <= now) tmdbCache.delete(key);
      }
    }
    return data as T;
  })();

  tmdbInflight.set(urlString, promise);
  try {
    return await promise;
  } finally {
    tmdbInflight.delete(urlString);
  }
}

// ---------------------------------------------------------------------------
// Referências de data e mapa de países — usados pelos filtros de elegibilidade
// das vitrines (Popular / Highest rated / Most watched / Most anticipated) e
// pelo filtro de nacionalidade (with_origin_country).
// ---------------------------------------------------------------------------
export const TMDB_TODAY = new Date().toISOString().split('T')[0];
export const TMDB_TOMORROW = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

// Gêneros de TV banidos das vitrines e filtros: Talk (Jimmy Fallon, Seth
// Meyers…), News e Reality diários. Nunca devem aparecer nas abas de séries.
const TV_EXCLUDED_GENRES = '10767,10763,10764';
const TV_EXCLUDED_GENRE_IDS = new Set([10767, 10763, 10764]);

// Nome do país (ou código já em ISO) → ISO 3166-1 alpha-2.
// O filtro de nacionalidade NUNCA envia o nome por extenso à API.
const COUNTRY_NAME_TO_ISO: Record<string, string> = {
  'united states': 'US', 'united kingdom': 'GB', brazil: 'BR', france: 'FR',
  japan: 'JP', 'south korea': 'KR', korea: 'KR', germany: 'DE', italy: 'IT',
  spain: 'ES', india: 'IN', canada: 'CA', australia: 'AU', mexico: 'MX',
  argentina: 'AR', portugal: 'PT', china: 'CN', sweden: 'SE', denmark: 'DK',
  netherlands: 'NL', poland: 'PL',
};

/** Normaliza qualquer entrada (nome por extenso ou código) para ISO alpha-2 */
export function toOriginCountryIso(input: string): string | null {
  const trimmed = input.trim();
  if (/^[A-Za-z]{2}$/.test(trimmed)) return trimmed.toUpperCase();
  return COUNTRY_NAME_TO_ISO[trimmed.toLowerCase()] ?? null;
}

/** Data de exibição/lançamento de um item de lista (filme ou série) */
function itemDate(m: TMDBMovie): string {
  const a = m as unknown as Record<string, unknown>;
  return m.release_date || (a.first_air_date as string) || '';
}

/** Filme elegível a vitrine: lançado (<= hoje) e com votos mínimos */
const isReleasedWithVotes = (m: TMDBMovie, minVotes: number) => {
  const d = itemDate(m);
  return Boolean(d) && d <= TMDB_TODAY && m.vote_count >= minVotes;
};

/** Estritamente inédito/futuro (estreia > hoje) */
const isFuture = (m: TMDBMovie) => {
  const d = itemDate(m);
  return Boolean(d) && d > TMDB_TODAY;
};

export const tmdb = {
  getImageUrl(path: string | null, size: 'w92' | 'w185' | 'w342' | 'w500' | 'w780' | 'original' = 'w500'): string {
    if (!path) return 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&auto=format&fit=crop&q=60';
    if (path.startsWith('http')) return path;
    return `${IMAGE_BASE_URL}/${size}${path}`;
  },

  getBackdropUrl(path: string | null, size: 'w780' | 'w1280' | 'original' = 'original'): string {
    if (!path) return 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1280&auto=format&fit=crop&q=80';
    if (path.startsWith('http')) return path;
    return `${IMAGE_BASE_URL}/${size}${path}`;
  },

  getProfileUrl(path: string | null, size: 'w185' | 'h632' | 'original' = 'w185'): string {
    if (!path) return 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=185&auto=format&fit=crop&q=60';
    return `${IMAGE_BASE_URL}/${size}${path}`;
  },

  async getPopular(page = 1): Promise<TMDBResponse<TMDBMovie>> {
    return fetchFromTMDB<TMDBResponse<TMDBMovie>>('/movie/popular', { page, language: 'en-US' });
  },

  async getTopRated(page = 1): Promise<TMDBResponse<TMDBMovie>> {
    return fetchFromTMDB<TMDBResponse<TMDBMovie>>('/movie/top_rated', { page, language: 'en-US' });
  },

  async getNowPlaying(page = 1): Promise<TMDBResponse<TMDBMovie>> {
    return fetchFromTMDB<TMDBResponse<TMDBMovie>>('/movie/now_playing', { page, language: 'en-US' });
  },

  async getTrending(timeWindow: 'day' | 'week' = 'week'): Promise<TMDBResponse<TMDBMovie>> {
    return fetchFromTMDB<TMDBResponse<TMDBMovie>>(`/trending/movie/${timeWindow}`, { language: 'en-US' });
  },

  async getMovieDetails(id: number): Promise<TMDBMovieDetails> {
    return fetchFromTMDB<TMDBMovieDetails>(`/movie/${id}`, {
      append_to_response: 'credits,similar,recommendations,watch/providers,videos',
      language: 'en-US',
    });
  },

  async getMovieImages(id: number): Promise<TMDBMovieImages> {
    return fetchFromTMDB<TMDBMovieImages>(`/movie/${id}/images`, {
      include_image_language: 'en,null',
    });
  },

  async searchTV(query: string, page = 1): Promise<TMDBResponse<TMDBMovie>> {
    return fetchFromTMDB<TMDBResponse<TMDBMovie>>('/search/tv', {
      query,
      page,
      language: 'en-US',
      include_adult: 'false',
    });
  },

  async searchMovies(query: string, page = 1): Promise<TMDBResponse<TMDBMovie>> {
    return fetchFromTMDB<TMDBResponse<TMDBMovie>>('/search/movie', {
      query,
      page,
      language: 'en-US',
      include_adult: 'false',
    });
  },

  async getPerson(id: number): Promise<TMDBPerson> {
    return fetchFromTMDB<TMDBPerson>(`/person/${id}`, { language: 'en-US' });
  },

  async getPersonMovieCredits(id: number): Promise<TMDBPersonMovieCredits> {
    return fetchFromTMDB<TMDBPersonMovieCredits>(`/person/${id}/movie_credits`, { language: 'en-US' });
  },

  streamingServices: [
    { id: 8, name: 'Netflix' },
    { id: 9, name: 'Amazon Prime Video' },
    { id: 337, name: 'Disney+' },
    { id: 350, name: 'Apple TV+' },
    { id: 1899, name: 'Max' },
  ],

  languages: [
    { code: 'en', name: 'English' },
    { code: 'fr', name: 'French' },
    { code: 'ja', name: 'Japanese' },
    { code: 'es', name: 'Spanish' },
    { code: 'it', name: 'Italian' },
    { code: 'de', name: 'German' },
    { code: 'ko', name: 'Korean' },
    { code: 'pt', name: 'Portuguese' },
  ],

  async discoverMovies(params: {
    genreId?: number;
    year?: number;
    decade?: number;
    providerId?: number;
    language?: string;
    /** País/nacionalidade: aceita ISO alpha-2 ou nome por extenso (Brazil → BR) */
    country?: string;
    sortBy?: string;
    page?: number;
    /** Limites de data de lançamento (YYYY-MM-DD) — usado pelo filtro Released */
    releaseDateGte?: string;
    releaseDateLte?: string;
    /** Piso de votos explícito (sobrescreve o padrão por sortBy) */
    minVotes?: number;
    /** Gêneros excluídos no servidor (ex.: '99,10402' p/ docs/musicais) */
    withoutGenres?: string;
  }): Promise<TMDBResponse<TMDBMovie>> {
    const apiParams: Record<string, string | number | undefined> = {
      page: params.page || 1,
      sort_by: params.sortBy || 'popularity.desc',
      // TMDB bug: vote_count.gte + lançamentos futuros (upcoming) = 0 resultados.
      // Quando há limite de data futura, omitimos o piso de votos.
      'vote_count.gte': params.releaseDateGte
        ? undefined
        : params.minVotes ??
          (params.sortBy?.includes('vote_average')
            ? 200
            : params.sortBy?.includes('vote_count')
              ? 100
              : 30),
      include_adult: 'false',
      language: 'en-US',
    };

    if (params.withoutGenres) {
      apiParams.without_genres = params.withoutGenres;
    }

    // Nacionalidade: SEMPRE with_origin_country com código ISO (jamais region
    // ou watch_region — esses mudam disponibilidade de streaming, não origem)
    if (params.country) {
      const iso = toOriginCountryIso(params.country);
      if (iso) apiParams.with_origin_country = iso;
    }

    if (params.genreId) {
      apiParams.with_genres = params.genreId;
    }

    if (params.providerId) {
      apiParams.with_watch_providers = params.providerId;
      apiParams.watch_region = 'US';
    }

    if (params.language) {
      apiParams.with_original_language = params.language;
    }

    if (params.year) {
      apiParams.primary_release_year = params.year;
    } else if (params.decade) {
      apiParams['primary_release_date.gte'] = `${params.decade}-01-01`;
      apiParams['primary_release_date.lte'] = `${params.decade + 9}-12-31`;
    }

    // Filtro Released (upcoming/released) — aplicado no servidor
    if (params.releaseDateGte) apiParams['primary_release_date.gte'] = params.releaseDateGte;
    if (params.releaseDateLte) apiParams['primary_release_date.lte'] = params.releaseDateLte;

    return fetchFromTMDB<TMDBResponse<TMDBMovie>>('/discover/movie', apiParams);
  },

  async discoverMoviesBatch(params: {
    genreId?: number;
    year?: number;
    decade?: number;
    providerId?: number;
    language?: string;
    country?: string;
    sortBy?: string;
    page?: number;
    pagesToFetch?: number;
    releaseDateGte?: string;
    releaseDateLte?: string;
    minVotes?: number;
    withoutGenres?: string;
  }): Promise<{ results: TMDBMovie[]; total_results: number; total_pages: number }> {
    const startPage = ((params.page || 1) - 1) * (params.pagesToFetch || 3) + 1;
    const count = params.pagesToFetch || 3;
    const pageNumbers = Array.from({ length: count }, (_, i) => startPage + i);

    const responses = await Promise.all(
      pageNumbers.map((p) => this.discoverMovies({ ...params, page: p }).catch(() => ({ results: [], total_results: 0, total_pages: 0, page: p })))
    );

    const allResults = responses.flatMap((r) => r.results);
    // Deduplicate by ID
    const seen = new Set<number>();
    const unique = allResults.filter((m) => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });

    const firstRes = responses[0] || { total_results: 0, total_pages: 1 };

    return {
      results: unique,
      total_results: firstRes.total_results,
      total_pages: Math.ceil(firstRes.total_pages / count),
    };
  },

  // ===================== TV / SERIES =====================

  async getPopularTV(page = 1): Promise<TMDBResponse<TMDBMovie>> {
    return fetchFromTMDB<TMDBResponse<TMDBMovie>>('/tv/popular', { page, language: 'en-US' });
  },

  async getTopRatedTV(page = 1): Promise<TMDBResponse<TMDBMovie>> {
    return fetchFromTMDB<TMDBResponse<TMDBMovie>>('/tv/top_rated', { page, language: 'en-US' });
  },

  async getTrendingTV(timeWindow: 'day' | 'week' = 'week'): Promise<TMDBResponse<TMDBMovie>> {
    return fetchFromTMDB<TMDBResponse<TMDBMovie>>(`/trending/tv/${timeWindow}`, { language: 'en-US' });
  },

  async discoverTV(params: {
    genreId?: number;
    year?: number;
    decade?: number;
    providerId?: number;
    language?: string;
    /** País/nacionalidade: aceita ISO alpha-2 ou nome por extenso (Brazil → BR) */
    country?: string;
    sortBy?: string;
    page?: number;
    /** Limites da primeira exibição (YYYY-MM-DD) — usado pelo filtro Released */
    releaseDateGte?: string;
    releaseDateLte?: string;
    /** Piso de votos explícito (sobrescreve o padrão por sortBy) */
    minVotes?: number;
    /** Gêneros excluídos no servidor — SEM reagendar talk/news/reality */
    withoutGenres?: string;
  }): Promise<TMDBResponse<TMDBMovie>> {
    // Banimento global anti Talk Show/News/Reality: só é suspenso se o usuário
    // escolher explicitamente um desses gêneros no filtro de gênero.
    const antiGenres =
      params.genreId && TV_EXCLUDED_GENRE_IDS.has(params.genreId)
        ? params.withoutGenres
        : [TV_EXCLUDED_GENRES, params.withoutGenres].filter(Boolean).join(',');

    const apiParams: Record<string, string | number | undefined> = {
      page: params.page || 1,
      sort_by: params.sortBy || 'popularity.desc',
      // TMDB bug: vote_count.gte + estreias futuras (upcoming) = 0 resultados.
      'vote_count.gte': params.releaseDateGte
        ? undefined
        : params.minVotes ?? (params.sortBy?.includes('vote_average') ? 100 : 20),
      include_adult: 'false',
      language: 'en-US',
      without_genres: antiGenres,
    };

    if (params.genreId) apiParams.with_genres = params.genreId;

    // Nacionalidade: SEMPRE with_origin_country com código ISO
    if (params.country) {
      const iso = toOriginCountryIso(params.country);
      if (iso) apiParams.with_origin_country = iso;
    }
    if (params.providerId) {
      apiParams.with_watch_providers = params.providerId;
      apiParams.watch_region = 'US';
    }
    if (params.language) apiParams.with_original_language = params.language;

    if (params.year) {
      apiParams.first_air_date_year = params.year;
    } else if (params.decade) {
      apiParams['first_air_date.gte'] = `${params.decade}-01-01`;
      apiParams['first_air_date.lte'] = `${params.decade + 9}-12-31`;
    }

    // Filtro Released (upcoming/released) — aplicado no servidor
    if (params.releaseDateGte) apiParams['first_air_date.gte'] = params.releaseDateGte;
    if (params.releaseDateLte) apiParams['first_air_date.lte'] = params.releaseDateLte;

    return fetchFromTMDB<TMDBResponse<TMDBMovie>>('/discover/tv', apiParams);
  },

  async discoverTVBatch(params: {
    genreId?: number;
    year?: number;
    decade?: number;
    providerId?: number;
    language?: string;
    country?: string;
    sortBy?: string;
    page?: number;
    pagesToFetch?: number;
    releaseDateGte?: string;
    releaseDateLte?: string;
    minVotes?: number;
    withoutGenres?: string;
  }): Promise<{ results: TMDBMovie[]; total_results: number; total_pages: number }> {
    const startPage = ((params.page || 1) - 1) * (params.pagesToFetch || 3) + 1;
    const count = params.pagesToFetch || 3;
    const pageNumbers = Array.from({ length: count }, (_, i) => startPage + i);
    const responses = await Promise.all(
      pageNumbers.map((p) => this.discoverTV({ ...params, page: p }).catch(() => ({ results: [], total_results: 0, total_pages: 0, page: p })))
    );
    const allResults = responses.flatMap((r) => r.results);
    const seen = new Set<number>();
    const unique = allResults.filter((m) => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
    const firstRes = responses[0] || { total_results: 0, total_pages: 1 };
    return {
      results: unique,
      total_results: firstRes.total_results,
      total_pages: Math.ceil(firstRes.total_pages / count),
    };
  },

  // ---------------------------------------------------------------------
  // Seções curadas das abas Films/Series (padrão app Letterboxd).
  // Regras OBRIGATÓRIAS (validadas no servidor E novamente em JS):
  //  - Popular/Highest rated/Most watched: APENAS títulos já lançados
  //    (data <= TODAY) com o piso de votos da seção.
  //  - Most anticipated: APENAS inéditos (estreia > TODAY), dupla checagem
  //    em JS e NUNCA compartilhando itens com Popular/Most watched.
  // ---------------------------------------------------------------------

  /** Aba Films: Popular / Highest rated / Most watched / Most anticipated */
  async getFilmsHubSections(): Promise<{
    popular: TMDBMovie[];
    highestRated: TMDBMovie[];
    mostWatched: TMDBMovie[];
    mostAnticipated: TMDBMovie[];
  }> {
    const [trendingRes, ratedRes, watchedRes, anticipatedRes] = await Promise.all([
      fetchFromTMDB<TMDBResponse<TMDBMovie>>('/trending/movie/week', { language: 'en-US' }),
      this.discoverMoviesBatch({
        sortBy: 'vote_average.desc',
        minVotes: 1500,
        // sem documentários/musicais de nota inflada; só lançados
        withoutGenres: '99,10402',
        releaseDateLte: TMDB_TODAY,
        pagesToFetch: 2,
      }),
      this.discoverMoviesBatch({
        sortBy: 'vote_count.desc',
        releaseDateLte: TMDB_TODAY,
        minVotes: 500,
        pagesToFetch: 1,
      }),
      this.discoverMoviesBatch({
        sortBy: 'popularity.desc',
        // somente estreias futuras (a partir de amanhã) — servidor
        releaseDateGte: TMDB_TOMORROW,
        pagesToFetch: 1,
      }),
    ]);

    // Pós-filtros JS obrigatórios: nada sem estrear entra; inéditos não vazam
    const popular = trendingRes.results.filter((m) => isReleasedWithVotes(m, 50));
    const highestRated = ratedRes.results.filter((m) => isReleasedWithVotes(m, 1500));
    const mostWatched = watchedRes.results.filter((m) => isReleasedWithVotes(m, 1));

    // Desduplicação: Most anticipated nunca compartilha itens das outras vitrines
    const seenIds = new Set([...popular, ...highestRated, ...mostWatched].map((m) => m.id));
    const mostAnticipated = anticipatedRes.results.filter((m) => isFuture(m) && !seenIds.has(m.id));

    return { popular, highestRated, mostWatched, mostAnticipated };
  },

  /** Aba Series: mesmas regras usando first_air_date + anti talk-show/news/reality */
  async getSeriesHubSections(): Promise<{
    popular: TMDBMovie[];
    highestRated: TMDBMovie[];
    mostWatched: TMDBMovie[];
    mostAnticipated: TMDBMovie[];
  }> {
    const [trendingRes, ratedRes, watchedRes, anticipatedRes] = await Promise.all([
      fetchFromTMDB<TMDBResponse<TMDBMovie>>('/trending/tv/week', { language: 'en-US' }),
      this.discoverTVBatch({
        sortBy: 'vote_average.desc',
        minVotes: 500,
        releaseDateLte: TMDB_TODAY,
        pagesToFetch: 2,
      }),
      this.discoverTVBatch({
        sortBy: 'vote_count.desc',
        releaseDateLte: TMDB_TODAY,
        minVotes: 100,
        pagesToFetch: 1,
      }),
      this.discoverTVBatch({
        sortBy: 'popularity.desc',
        releaseDateGte: TMDB_TOMORROW,
        pagesToFetch: 1,
      }),
    ]);

    const popular = trendingRes.results.filter((m) => isReleasedWithVotes(m, 30));
    const highestRated = ratedRes.results.filter((m) => isReleasedWithVotes(m, 500));
    const mostWatched = watchedRes.results.filter((m) => isReleasedWithVotes(m, 1));

    const seenIds = new Set([...popular, ...highestRated, ...mostWatched].map((m) => m.id));
    const mostAnticipated = anticipatedRes.results.filter((m) => isFuture(m) && !seenIds.has(m.id));

    return { popular, highestRated, mostWatched, mostAnticipated };
  },

  // Detalhes de serie normalizados para o formato de filme (title/name etc.)
  async getTVDetails(id: number): Promise<TMDBMovieDetails> {
    const show = await fetchFromTMDB<TMDBMovieDetails>(`/tv/${id}`, {
      append_to_response: 'credits,similar,recommendations,watch/providers,videos',
      language: 'en-US',
    });
    const showAny = show as unknown as Record<string, unknown>;
    show.title = (showAny.name as string) || '';
    show.original_title = (showAny.original_name as string) || show.title;
    show.release_date = (showAny.first_air_date as string) || '';
    const ert = showAny.episode_run_time as number[] | undefined;
    show.runtime = Array.isArray(ert) && ert.length ? ert[0] : 0;
    const createdBy = (showAny.created_by as { id: number; name: string }[] | undefined) || [];
    if (show.credits && createdBy.length > 0) {
      const existing = new Set(show.credits.crew.map((c) => c.id));
      for (const c of createdBy) {
        if (!existing.has(c.id)) {
          show.credits.crew.unshift({ id: c.id, name: c.name, job: 'Creator', department: 'Production', profile_path: null });
        }
      }
    }
    const normList = (r: TMDBMovie[]) =>
      r?.map((m) => {
        const a = m as unknown as Record<string, unknown>;
        return {
          ...m,
          title: (m.title || (a.name as string) || '') as string,
          release_date: (m.release_date || (a.first_air_date as string) || '') as string,
        };
      });
    if (show.similar) show.similar.results = normList(show.similar.results);
    if (show.recommendations) show.recommendations.results = normList(show.recommendations.results);
    return show;
  },

  tvGenres: [
    { id: 10759, name: 'Action & Adventure' },
    { id: 16, name: 'Animation' },
    { id: 35, name: 'Comedy' },
    { id: 80, name: 'Crime' },
    { id: 99, name: 'Documentary' },
    { id: 18, name: 'Drama' },
    { id: 10751, name: 'Family' },
    { id: 10762, name: 'Kids' },
    { id: 9648, name: 'Mystery' },
    { id: 10763, name: 'News' },
    { id: 10764, name: 'Reality' },
    { id: 10765, name: 'Sci-Fi & Fantasy' },
    { id: 10766, name: 'Soap' },
    { id: 10767, name: 'Talk' },
    { id: 10768, name: 'War & Politics' },
    { id: 37, name: 'Western' },
  ],
  genres: [
    { id: 28, name: 'Action' },
    { id: 12, name: 'Adventure' },
    { id: 16, name: 'Animation' },
    { id: 35, name: 'Comedy' },
    { id: 80, name: 'Crime' },
    { id: 99, name: 'Documentary' },
    { id: 18, name: 'Drama' },
    { id: 10751, name: 'Family' },
    { id: 14, name: 'Fantasy' },
    { id: 36, name: 'History' },
    { id: 27, name: 'Horror' },
    { id: 10402, name: 'Music' },
    { id: 9648, name: 'Mystery' },
    { id: 10749, name: 'Romance' },
    { id: 878, name: 'Sci-Fi' },
    { id: 53, name: 'Thriller' },
    { id: 10752, name: 'War' },
    { id: 37, name: 'Western' },
  ],
};
