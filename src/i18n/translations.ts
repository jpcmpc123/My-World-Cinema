// ---------------------------------------------------------------------------
// MyWorld i18n — Tradução ESTÁTICA e MANUAL (pt-BR ↔ en-US).
// Nenhuma tradução por IA: os termos usam o vocabulário real do mercado de
// cinema brasileiro. Qualquer chave ausente cai no texto em inglês (fallback).
// ---------------------------------------------------------------------------

export type Language = 'en-US' | 'pt-BR';

export const LANGUAGES: { id: Language; label: string; short: string }[] = [
  { id: 'pt-BR', label: 'Português (Brasil)', short: 'PT' },
  { id: 'en-US', label: 'English (US)', short: 'EN' },
];

export type TranslationKey = keyof typeof en;

// ---------------------------------------------------------------------------
// Inglês (en-US) — idioma base. As chaves são semanticamente nomeadas.
// ---------------------------------------------------------------------------
const en = {
  // Navegação e conta
  nav_films: 'Films',
  nav_series: 'Series',
  nav_reviews: 'Reviews',
  nav_lists: 'Lists',
  nav_log: 'Log',
  nav_settings: 'Settings',
  nav_sign_in: 'Sign In',
  nav_create_account: 'Create Account',
  nav_sign_out: 'Sign Out',
  nav_profile: 'Profile',
  nav_language_tick: 'Language',

  // Página de resultados de busca (estilo Letterboxd)
  search_show_results_for: 'Show results for',
  search_showing_matches: 'Showing matches for',
  search_filter_all: 'All',
  search_filter_films: 'Films',
  search_filter_series: 'Series',
  search_filter_reviews: 'Reviews',
  search_filter_lists: 'Lists',
  search_filter_cast: 'Cast, Crew or Studios',
  search_filter_members: 'Members',
  search_alt_titles: 'Alternative titles',
  search_directed_by: 'Directed by',
  search_more: '…more',
  search_no_results: 'No matches for',
  search_searching: 'Searching…',
  search_load_more: 'Load more',
  search_empty_hint: 'Search for a film, a series or a person.',
  search_placeholder: 'Search…',
  search_view_all: 'View all results',

  // Seções da Home e Catálogo
  sec_popular_week: 'Popular this week',
  sec_highest_rated: 'Highest rated',
  sec_most_watched: 'Most watched',
  sec_most_anticipated: 'Most anticipated',
  sec_just_reviewed: 'Just reviewed',
  sec_popular_lists: 'Popular lists',
  browse_by: 'Browse by',
  filter_year: 'Year',
  filter_rating: 'Rating',
  filter_popular: 'Popularity',
  filter_genre: 'Genre',
  filter_service: 'Service',
  filter_country: 'Country',
  filter_language: 'Language',
  filter_released: 'Released',
  find_a_film: 'Find a film',
  find_a_series: 'Find a series',

  // Página do filme / série
  directed_by: 'Directed by',
  created_by: 'Created by',
  action_watch: 'Watch',
  action_watched: 'Watched',
  action_like: 'Like',
  action_liked: 'Liked',
  action_watchlist: 'Watchlist',
  action_rate: 'Rate',
  ratings: 'Ratings',
  average_out_of_5: 'average out of 5',
  review_or_log: 'Review or log...',
  set_backdrop: 'Set film backdrop',
  set_poster: 'Set film poster',
  view_poster: 'View poster',
  add_to_lists: 'Add to lists...',
  share: 'Share',
  trailer: 'Trailer',
  members: 'Members',
  reviews_label: 'Reviews',

  // As 5 abas da página do filme
  tab_cast: 'Cast',
  tab_crew: 'Crew',
  tab_details: 'Details',
  tab_genres: 'Genre',
  tab_releases: 'Releases',

  // Cargos da aba Crew (chave = rótulo exibido)
  crew_director: 'Director',
  crew_writers: 'Writers',
  crew_producers: 'Producers',
  crew_exec_producers: 'Executive Producers',
  crew_composer: 'Composer',
  crew_cinematography: 'Cinematography',
  crew_editor: 'Editor',
  crew_production_design: 'Production Design',
  crew_art_direction: 'Art Direction',
  crew_set_decoration: 'Set Decoration',
  crew_costume: 'Costume Design',
  crew_makeup: 'Makeup & Hair',
  crew_vfx: 'Visual Effects',
  crew_stunts: 'Stunts',
  crew_sound: 'Sound',

  // Aba Details
  det_studios: 'Studios',
  det_countries: 'Countries',
  det_primary_language: 'Primary Language',
  det_spoken_languages: 'Spoken Languages',
  det_alt_titles: 'Alternative Titles',
  det_status: 'Status',
  det_budget: 'Estimated Budget',
  det_revenue: 'Worldwide Revenue',
  det_original_title: 'Original Title',
  det_release_date: 'Release Date',
  det_production_info: 'Production Info',
  det_box_office: 'Box Office',

  // Especificações técnicas + curiosidades (IMDb)
  tech_specs: 'Technical Specifications',
  tech_runtime: 'Runtime',
  tech_aspect_ratio: 'Aspect Ratio',
  tech_camera: 'Camera',
  tech_laboratory: 'Laboratory',
  tech_negative_format: 'Negative Format',
  tech_cine_process: 'Cinematographic Process',
  tech_printed_format: 'Printed Film Format',
  tech_color: 'Color',
  tech_sound_mix: 'Sound Mix',
  tech_sound: 'Sound',
  trivia: 'Trivia',
  reveal_spoiler: 'Reveal Spoiler',
  show_all: 'Show all',
  spoiler_warning: 'Contains spoiler',

  // Aba Releases — tipos de lançamento
  rel_premiere: 'Premiere',
  rel_theatrical_limited: 'Theatrical (Limited)',
  rel_theatrical: 'Theatrical',
  rel_digital: 'Digital',
  rel_physical: 'Physical',
  rel_tv: 'TV',

  // Aba Genres
  genres_label: 'Genres',
  themes_label: 'Themes',

  // Gerais
  show_more: 'Show more',
  mins: 'mins',
  cast_empty: 'Cast information is not available.',

  // Perfil de pessoa (/actor/:id) — abas por função (estilo app Letterboxd)
  person_tab_bio: 'Bio',
  person_tab_actor: 'Actor',
  person_tab_producer: 'Producer',
  person_tab_writer: 'Writer',
  person_tab_director: 'Director',
  person_tab_exec_producer: 'Executive Producer',
  person_tab_composer: 'Composer',
  person_tab_cinematography: 'Cinematography',
  person_tab_editor: 'Editor',
  person_films_label: 'films',
  person_bio_empty: 'No biography available for this person yet.',
  person_not_found: 'Person not found',
  person_load_error: 'Could not load this person. Please try again later.',
  person_films_starring: 'Films starring',
  person_films_directed: 'Films directed by',
  person_films_written: 'Films written by',
  person_films_produced: 'Films produced by',
  person_films_exec_produced: 'Films executive produced by',
  person_films_scored: 'Films scored by',
  person_films_shot: 'Films shot by',
  person_films_edited: 'Films edited by',
  person_share: 'Share',
  person_view_mode: 'Change view',
  person_filters: 'Filters',
  person_all_decades: 'All decades',
  person_all_genres: 'All genres',
  person_sort_by: 'Sort by',
  person_clear: 'Clear',
  person_no_films: 'No films with this person were found on TMDB.',
  person_nothing: 'Nothing here yet',
  person_sort_popularity: 'Popularity',
  person_sort_rating: 'Highest rated',
  person_sort_newest: 'Newest first',
  person_sort_oldest: 'Oldest first',
} as const;

// ---------------------------------------------------------------------------
// Português (Brasil) — tradução manual profissional
// ---------------------------------------------------------------------------
const pt: Record<TranslationKey, string> = {
  nav_films: 'Filmes',
  nav_series: 'Séries',
  nav_reviews: 'Críticas',
  nav_lists: 'Listas',
  nav_log: 'Registrar',
  nav_settings: 'Configurações',
  nav_sign_in: 'Entrar',
  nav_create_account: 'Criar Conta',
  nav_sign_out: 'Sair',
  nav_profile: 'Perfil',
  nav_language_tick: 'Idioma',

  // Página de resultados de busca (estilo Letterboxd)
  search_show_results_for: 'Mostrar resultados para',
  search_showing_matches: 'Resultados para',
  search_filter_all: 'Todos',
  search_filter_films: 'Filmes',
  search_filter_series: 'Séries',
  search_filter_reviews: 'Críticas',
  search_filter_lists: 'Listas',
  search_filter_cast: 'Elenco, equipe ou estúdios',
  search_filter_members: 'Membros',
  search_alt_titles: 'Títulos alternativos',
  search_directed_by: 'Direção de',
  search_more: '…mais',
  search_no_results: 'Nenhum resultado para',
  search_searching: 'Buscando…',
  search_load_more: 'Carregar mais',
  search_empty_hint: 'Busque por um filme, uma série ou uma pessoa.',
  search_placeholder: 'Buscar…',
  search_view_all: 'Ver todos os resultados',

  sec_popular_week: 'Populares da semana',
  sec_highest_rated: 'Mais bem avaliados',
  sec_most_watched: 'Mais assistidos',
  sec_most_anticipated: 'Mais aguardados',
  sec_just_reviewed: 'Avaliados recentemente',
  sec_popular_lists: 'Listas populares',
  browse_by: 'Filtrar por',
  filter_year: 'Ano',
  filter_rating: 'Avaliação',
  filter_popular: 'Popularidade',
  filter_genre: 'Gênero',
  filter_service: 'Streaming',
  filter_country: 'País',
  filter_language: 'Idioma',
  filter_released: 'Lançamento',
  find_a_film: 'Buscar um filme',
  find_a_series: 'Buscar uma série',

  directed_by: 'Dirigido por',
  created_by: 'Criado por',
  action_watch: 'Assistir',
  action_watched: 'Assistido',
  action_like: 'Curtir',
  action_liked: 'Curtido',
  action_watchlist: 'Quero Ver',
  action_rate: 'Avaliar',
  ratings: 'Avaliações',
  average_out_of_5: 'média de 5',
  review_or_log: 'Avaliar ou registrar...',
  set_backdrop: 'Definir backdrop',
  set_poster: 'Definir pôster',
  view_poster: 'Ver pôster',
  add_to_lists: 'Adicionar a listas...',
  share: 'Compartilhar',
  trailer: 'Trailer',
  members: 'Membros',
  reviews_label: 'Críticas',

  tab_cast: 'Elenco',
  tab_crew: 'Equipe',
  tab_details: 'Detalhes',
  tab_genres: 'Gêneros',
  tab_releases: 'Lançamentos',

  crew_director: 'Direção',
  crew_writers: 'Roteiro',
  crew_producers: 'Produção',
  crew_exec_producers: 'Produção Executiva',
  crew_composer: 'Trilha Sonora Original',
  crew_cinematography: 'Direção de Fotografia',
  crew_editor: 'Montagem',
  crew_production_design: 'Desenho de Produção',
  crew_art_direction: 'Direção de Arte',
  crew_set_decoration: 'Decoração de Set',
  crew_costume: 'Figurino',
  crew_makeup: 'Maquiagem e Cabelo',
  crew_vfx: 'Efeitos Visuais',
  crew_stunts: 'Dublês',
  crew_sound: 'Departamento de Som',

  det_studios: 'Estúdios',
  det_countries: 'Países de Origem',
  det_primary_language: 'Idioma Original',
  det_spoken_languages: 'Idiomas Falados',
  det_alt_titles: 'Títulos Alternativos',
  det_status: 'Status de Lançamento',
  det_budget: 'Orçamento Estimado',
  det_revenue: 'Bilheteria Mundial',
  det_original_title: 'Título Original',
  det_release_date: 'Data de Lançamento',
  det_production_info: 'Ficha de Produção',
  det_box_office: 'Bilheteria',

  tech_specs: 'Especificações Técnicas',
  tech_runtime: 'Duração',
  tech_aspect_ratio: 'Proporção de Tela',
  tech_camera: 'Câmera',
  tech_laboratory: 'Laboratório',
  tech_negative_format: 'Formato do Negativo',
  tech_cine_process: 'Processo Cinematográfico',
  tech_printed_format: 'Formato de Exibição',
  tech_color: 'Cor',
  tech_sound_mix: 'Mixagem de Som',
  tech_sound: 'Som',
  trivia: 'Curiosidades',
  reveal_spoiler: 'Revelar Spoiler',
  show_all: 'Ver tudo',
  spoiler_warning: 'Contém spoiler',

  rel_premiere: 'Pré-estreia / Festival',
  rel_theatrical_limited: 'Cinema (Circuito Limitado)',
  rel_theatrical: 'Cinema',
  rel_digital: 'Digital / Streaming',
  rel_physical: 'Mídia Física',
  rel_tv: 'Televisão',

  genres_label: 'Gêneros',
  themes_label: 'Temas',

  show_more: 'Ver mais',
  mins: 'min',
  cast_empty: 'Informações de elenco indisponíveis.',

  // Perfil de pessoa — abas por função
  person_tab_bio: 'Bio',
  person_tab_actor: 'Ator',
  person_tab_producer: 'Produção',
  person_tab_writer: 'Roteiro',
  person_tab_director: 'Direção',
  person_tab_exec_producer: 'Produção Executiva',
  person_tab_composer: 'Trilha Sonora',
  person_tab_cinematography: 'Fotografia',
  person_tab_editor: 'Montagem',
  person_films_label: 'filmes',
  person_bio_empty: 'Ainda não há biografia disponível para esta pessoa.',
  person_not_found: 'Pessoa não encontrada',
  person_load_error: 'Não foi possível carregar esta pessoa. Tente novamente mais tarde.',
  person_films_starring: 'Filmes estrelados por',
  person_films_directed: 'Filmes dirigidos por',
  person_films_written: 'Filmes escritos por',
  person_films_produced: 'Filmes produzidos por',
  person_films_exec_produced: 'Filmes com produção executiva de',
  person_films_scored: 'Trilhas sonoras de',
  person_films_shot: 'Fotografia de',
  person_films_edited: 'Montagem de',
  person_share: 'Compartilhar',
  person_view_mode: 'Alterar visualização',
  person_filters: 'Filtros',
  person_all_decades: 'Todas as décadas',
  person_all_genres: 'Todos os gêneros',
  person_sort_by: 'Ordenar por',
  person_clear: 'Limpar',
  person_no_films: 'Nenhum filme com esta pessoa foi encontrado no TMDB.',
  person_nothing: 'Nada por aqui ainda',
  person_sort_popularity: 'Popularidade',
  person_sort_rating: 'Melhor avaliados',
  person_sort_newest: 'Mais recentes',
  person_sort_oldest: 'Mais antigos',
};

const DICTS: Record<Language, Record<TranslationKey, string>> = {
  'en-US': en,
  'pt-BR': pt,
};

export function translate(lang: Language, key: TranslationKey): string {
  return DICTS[lang][key] ?? en[key] ?? key;
}

// ------- Formatadores nativos (Intl) -------
export function regionNames(lang: Language): Intl.DisplayNames {
  return new Intl.DisplayNames([lang], { type: 'region' });
}
export function languageNames(lang: Language): Intl.DisplayNames {
  return new Intl.DisplayNames([lang], { type: 'language' });
}
export function formatDatePt(lang: Language, isoDate: string): string {
  try {
    return new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'short', year: 'numeric' }).format(
      new Date(isoDate),
    );
  } catch {
    return isoDate;
  }
}
export function formatMoneyUSD(lang: Language, value: number): string {
  return new Intl.NumberFormat(lang === 'pt-BR' ? 'pt-BR' : 'en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}
