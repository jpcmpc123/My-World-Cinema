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

  const res = await fetch(url.toString(), { headers });
  if (!res.ok) {
    throw new Error(`TMDB error ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

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
    sortBy?: string;
    page?: number;
  }): Promise<TMDBResponse<TMDBMovie>> {
    const apiParams: Record<string, string | number | undefined> = {
      page: params.page || 1,
      sort_by: params.sortBy || 'popularity.desc',
      'vote_count.gte': params.sortBy?.includes('vote_average') ? 200 : 30,
      include_adult: 'false',
      language: 'en-US',
    };

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

    return fetchFromTMDB<TMDBResponse<TMDBMovie>>('/discover/movie', apiParams);
  },

  async discoverMoviesBatch(params: {
    genreId?: number;
    year?: number;
    decade?: number;
    providerId?: number;
    language?: string;
    sortBy?: string;
    page?: number;
    pagesToFetch?: number;
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
