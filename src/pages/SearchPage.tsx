import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronRight, Eye, Star } from 'lucide-react';
import { tmdb, type TMDBSearchPerson, type TMDBSearchResult } from '../services/tmdb';
import { useLanguage } from '../i18n/LanguageContext';
import { useApp } from '../context/AppContext';
import type { TranslationKey } from '../i18n/translations';
import { openPersonProfile, personRoleFromDepartment } from '../utils/personNav';

/**
 * SearchPage — página dedicada de RESULTADOS DE BUSCA no layout do Letterboxd.
 *
 * - Container centralizado (980px) com grid 1fr / 240px (1 coluna no mobile).
 * - Coluna esquerda: "SHOWING MATCHES FOR …" + lista de resultados.
 * - Coluna direita: "SHOW RESULTS FOR" com os filtros (All/Films/Series/…).
 * - O termo vive em ?q= e o filtro em ?f= (compartilhável/voltar funciona).
 * - Filmes e séries NUNCA se misturam na mesma lista: a aba "All" mostra
 *   filmes primeiro e depois séries, cada um com seu próprio tipo.
 */
type SearchFilter = 'all' | 'films' | 'series' | 'reviews' | 'lists' | 'cast' | 'members';

const FILTERS: { id: SearchFilter; labelKey: TranslationKey }[] = [
  { id: 'all', labelKey: 'search_filter_all' },
  { id: 'films', labelKey: 'search_filter_films' },
  { id: 'series', labelKey: 'search_filter_series' },
  { id: 'reviews', labelKey: 'search_filter_reviews' },
  { id: 'lists', labelKey: 'search_filter_lists' },
  { id: 'cast', labelKey: 'search_filter_cast' },
  { id: 'members', labelKey: 'search_filter_members' },
];

/** Título de seção no estilo Letterboxd (caixa alta, borda inferior). */
const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2 className="uppercase text-[0.78rem] tracking-[0.08em] text-[#9ab] border-b border-[#2c3440] pb-2 mb-1">
    {children}
  </h2>
);

/** Máximo de títulos alternativos exibidos antes do "…more". */
const ALT_TITLES_VISIBLE = 10;

const ResultRow: React.FC<{ item: TMDBSearchResult; t: (k: TranslationKey) => string }> = ({
  item,
  t,
}) => {
  const { isMovieWatched, ratingsMap } = useApp();
  const [showAllTitles, setShowAllTitles] = useState(false);
  const year = item.release_date ? item.release_date.slice(0, 4) : '';

  // Sem títulos alternativos, cai para o título original (quando diferente)
  const altTitles = useMemo(() => {
    const list = item.alternativeTitles.filter(
      (alt) => alt.trim() && alt.trim().toLowerCase() !== item.title.trim().toLowerCase()
    );
    if (list.length) return list;
    if (item.original_title && item.original_title.trim() !== item.title.trim()) {
      return [item.original_title];
    }
    return [];
  }, [item.alternativeTitles, item.original_title, item.title]);

  const hasMoreTitles = altTitles.length > ALT_TITLES_VISIBLE;
  const visibleTitles = showAllTitles ? altTitles : altTitles.slice(0, ALT_TITLES_VISIBLE);

  const userRating = ratingsMap[item.id] ?? 0;
  const watched = isMovieWatched(item.id);
  const href = item.media_type === 'tv' ? `/tv/${item.id}` : `/film/${item.id}`;

  return (
    <Link
      to={href}
      className="flex gap-[18px] py-[18px] border-b border-[#2c3440] items-start group"
    >
      {/* Pôster 70x105 (placeholder escuro quando não há arte) */}
      <div className="w-[70px] h-[105px] shrink-0 rounded-[4px] overflow-hidden border border-white/12 bg-[#1c2228]">
        {item.poster_path ? (
          <img
            src={tmdb.getImageUrl(item.poster_path, 'w185')}
            alt={item.title}
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="w-full h-full border border-[#2c3440]" aria-hidden="true" />
        )}
      </div>

      {/* Bloco de informações */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-[1.25rem] font-bold text-white leading-tight group-hover:text-lb-green transition-colors">
            {item.title}
          </span>
          {year && <span className="text-base font-normal text-[#789]">{year}</span>}
          {watched && <Eye className="w-3.5 h-3.5 text-lb-green self-center" aria-hidden="true" />}
          {userRating > 0 && (
            <span className="inline-flex items-center gap-0.5 self-center" aria-label={`${userRating} stars`}>
              {[1, 2, 3, 4, 5].map((n) => {
                const fill = Math.max(0, Math.min(1, userRating - (n - 1)));
                return (
                  <span key={n} className="relative inline-block w-3 h-3">
                    <Star className="w-3 h-3 text-lb-border stroke-[1.5]" />
                    {fill > 0 && (
                      <span
                        className="absolute inset-0 overflow-hidden"
                        style={{ width: fill >= 1 ? '100%' : '50%' }}
                      >
                        <Star className="w-3 h-3 text-lb-green fill-lb-green stroke-lb-green" />
                      </span>
                    )}
                  </span>
                );
              })}
            </span>
          )}
        </div>

        {altTitles.length > 0 && (
          <p className="mt-1.5 text-[0.78rem] text-[#678] leading-[1.45] break-words">
            {t('search_alt_titles')}: {visibleTitles.join(', ')}
            {hasMoreTitles && !showAllTitles && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowAllTitles(true);
                }}
                className="ml-1 font-bold text-white hover:text-lb-green cursor-pointer"
              >
                {t('search_more')}
              </button>
            )}
          </p>
        )}

        {item.directors.length > 0 && (
          <div className="mt-2.5 flex items-center flex-wrap gap-1.5 text-[0.8rem] text-[#789]">
            <span>{t('search_directed_by')}</span>
            {item.directors.map((director) => (
              <span
                key={director}
                className="bg-[#283038] text-[#9ab] px-2 py-[3px] rounded-[3px] text-[0.78rem] font-medium"
              >
                {director}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
};

const PersonRow: React.FC<{ person: TMDBSearchPerson }> = ({ person }) => {
  const known = (person.known_for ?? [])
    .map((k) => k.title || k.name)
    .filter(Boolean)
    .slice(0, 4)
    .join(', ');

  return (
    <Link
      to={openPersonProfile(person.id, personRoleFromDepartment(person.known_for_department))}
      className="flex gap-[18px] py-[18px] border-b border-[#2c3440] items-start group"
    >
      <div className="w-[70px] h-[105px] shrink-0 rounded-[4px] overflow-hidden border border-white/12 bg-[#1c2228]">
        {person.profile_path ? (
          <img
            src={tmdb.getImageUrl(person.profile_path, 'w185')}
            alt={person.name}
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="w-full h-full border border-[#2c3440]" aria-hidden="true" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-[1.25rem] font-bold text-white leading-tight group-hover:text-lb-green transition-colors">
          {person.name}
        </span>
        {person.known_for_department && (
          <p className="mt-1.5 text-[0.78rem] text-[#678]">{person.known_for_department}</p>
        )}
        {known && (
          <div className="mt-2.5 flex items-center flex-wrap gap-1.5 text-[0.8rem] text-[#789]">
            {known.split(', ').map((credit) => (
              <span
                key={credit}
                className="bg-[#283038] text-[#9ab] px-2 py-[3px] rounded-[3px] text-[0.78rem] font-medium"
              >
                {credit}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
};

export const SearchPage: React.FC = () => {
  const { t } = useLanguage();
  const { reviews, lists } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') ?? '';
  const rawFilter = searchParams.get('f') as SearchFilter | null;
  const filter: SearchFilter =
    rawFilter && FILTERS.some((f) => f.id === rawFilter) ? rawFilter : 'all';

  const setFilter = (next: SearchFilter) => {
    const params: Record<string, string> = {};
    if (query.trim()) params.q = query;
    if (next !== 'all') params.f = next;
    setSearchParams(params, { replace: true });
  };

  const [items, setItems] = useState<TMDBSearchResult[]>([]);
  const [people, setPeople] = useState<TMDBSearchPerson[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  // Debounce do termo (a busca do header atualiza o ?q= a cada tecla)
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQuery(query), 300);
    return () => window.clearTimeout(id);
  }, [query]);

  const term = debouncedQuery.trim();
  const isLocalFilter = filter === 'reviews' || filter === 'lists' || filter === 'members';

  // Resultados locais (críticas e listas do próprio usuário)
  const localResults = useMemo(() => {
    const q = term.toLowerCase();
    if (!q) return [];
    if (filter === 'reviews') {
      return reviews
        .filter((r) => (r.movieTitle ?? '').toLowerCase().includes(q))
        .map((r) => ({
          key: `review-${r.id}`,
          title: r.movieTitle,
          subtitle: r.author?.displayName,
          poster: r.moviePoster,
          to: `/film/${r.movieId}`,
          year: r.movieYear,
        }));
    }
    if (filter === 'lists') {
      return lists
        .filter(
          (l) =>
            l.title.toLowerCase().includes(q) || (l.description ?? '').toLowerCase().includes(q)
        )
        .map((l) => ({
          key: `list-${l.id}`,
          title: l.title,
          subtitle: `${l.movies.length} films`,
          poster: l.movies[0]?.poster_path ?? null,
          to: `/list/${l.id}`,
          year: '',
        }));
    }
    return [];
  }, [filter, term, reviews, lists]);

  const requestKey = `${term}|${filter}`;
  const keyRef = useRef('');

  useEffect(() => {
    const isNewKey = keyRef.current !== requestKey;
    keyRef.current = requestKey;

    // Termo/filtro mudou com página > 1: volta para a 1 e deixa o próximo
    // ciclo buscar (evita anexar resultados da página antiga a uma nova busca)
    if (isNewKey && page !== 1) {
      setPage(1);
      return;
    }
    if (!term || isLocalFilter) {
      setItems([]);
      setPeople([]);
      setHasMore(false);
      setSearched(Boolean(term));
      setLoading(false);
      return;
    }

    let cancelled = false;
    const reset = isNewKey || page === 1;
    setLoading(true);

    (async () => {
      try {
        if (filter === 'cast') {
          const res = await tmdb.searchPeople(term, page);
          if (cancelled) return;
          setPeople((prev) => (reset ? res.results : [...prev, ...res.results]));
          if (reset) setItems([]);
          setHasMore(page < Math.min(res.total_pages || 1, 20));
        } else {
          const res =
            filter === 'films' || filter === 'series'
              ? await tmdb.searchEnriched(term, filter === 'films' ? 'movie' : 'tv', page)
              : await tmdb.searchMultiEnriched(term, page);
          if (cancelled) return;
          setItems((prev) => (reset ? res : [...prev, ...res]));
          if (reset) setPeople([]);
          setHasMore(res.length > 0 && page < 20);
        }
        setSearched(true);
      } catch {
        if (cancelled) return;
        if (reset) {
          setItems([]);
          setPeople([]);
        }
        setHasMore(false);
        setSearched(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [requestKey, page, term, filter, isLocalFilter]);

  const browseRows: { label: string; to: string }[] = [
    { label: 'Release date', to: '/browse/release-date' },
    { label: 'Genre', to: '/browse/genre' },
    { label: 'Country', to: '/browse/country' },
    { label: 'Language', to: '/browse/language' },
    { label: 'Service', to: '/browse/service' },
    { label: 'Most popular', to: '/browse/results?sort=popularity.desc&title=Most%20Popular' },
    { label: 'Highest rated', to: '/browse/results?sort=vote_average.desc&title=Highest%20Rated' },
    {
      label: 'Most anticipated',
      to: '/browse/results?released=upcoming&sort=popularity.desc&title=Most%20Anticipated',
    },
    { label: 'Featured lists', to: '/lists' },
  ];

  const totalShown = filter === 'cast' ? people.length : isLocalFilter ? localResults.length : items.length;
  const emptyState = searched && !loading && totalShown === 0;

  return (
    <div className="max-w-[980px] mx-auto mt-10 mb-24 md:mb-10 px-5">
      {/* Sem termo: estado padrão com o BROWSE BY (mantém o comportamento antigo) */}
      {!term ? (
        <div className="max-w-[950px]">
          <h2 className="text-xs uppercase tracking-widest text-lb-muted font-bold mb-1">
            {t('browse_by')}
          </h2>
          <p className="text-[13px] text-lb-muted mb-3">{t('search_empty_hint')}</p>
          <nav className="flex flex-col">
            {browseRows.map((row) => (
              <Link
                key={row.label}
                to={row.to}
                className="flex items-center justify-between py-3.5 border-b border-white/5 text-sm text-white hover:text-[#00e054] transition-colors"
              >
                <span>{row.label}</span>
                <ChevronRight className="w-4 h-4 text-lb-muted" />
              </Link>
            ))}
          </nav>
        </div>
      ) : (
        <div className="flex flex-col md:grid md:grid-cols-[1fr_240px] md:gap-12 md:items-start">
          {/* SIDEBAR — SHOW RESULTS FOR (mobile: chips roláveis acima da lista) */}
          <aside className="order-1 md:order-2 mb-4 md:mb-0">
            <SectionTitle>{t('search_show_results_for')}</SectionTitle>
            <nav
              className="flex md:flex-col gap-1 overflow-x-auto no-scrollbar md:overflow-visible py-1"
              aria-label={t('search_show_results_for')}
            >
              {FILTERS.map((f) => {
                const active = filter === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFilter(f.id)}
                    aria-current={active ? 'true' : undefined}
                    className={`shrink-0 md:shrink text-left whitespace-nowrap rounded-[3px] transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#2c3440] text-white font-semibold py-[7px] px-3'
                        : 'text-[#789] hover:text-white py-[6px] px-3'
                    }`}
                  >
                    {t(f.labelKey)}
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* COLUNA ESQUERDA — resultados */}
          <div className="order-2 md:order-1 min-w-0">
            <SectionTitle>
              {t('search_showing_matches')} “{term}”
            </SectionTitle>

            {loading && totalShown === 0 ? (
              <p className="text-sm text-[#789] py-8">{t('search_searching')}</p>
            ) : emptyState ? (
              <p className="text-sm text-[#789] py-8">
                {t('search_no_results')} “{term}”.
              </p>
            ) : isLocalFilter ? (
              <div>
                {localResults.map((row) => (
                  <Link
                    key={row.key}
                    to={row.to}
                    className="flex gap-[18px] py-[18px] border-b border-[#2c3440] items-start group"
                  >
                    <div className="w-[70px] h-[105px] shrink-0 rounded-[4px] overflow-hidden border border-white/12 bg-[#1c2228]">
                      {row.poster ? (
                        <img
                          src={tmdb.getImageUrl(row.poster, 'w185')}
                          alt={row.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <div className="w-full h-full border border-[#2c3440]" aria-hidden="true" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <span className="text-[1.25rem] font-bold text-white leading-tight group-hover:text-lb-green transition-colors">
                          {row.title}
                        </span>
                        {row.year && <span className="text-base text-[#789]">{row.year}</span>}
                      </div>
                      {row.subtitle && (
                        <p className="mt-1.5 text-[0.78rem] text-[#678]">{row.subtitle}</p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            ) : filter === 'cast' ? (
              <div>
                {people.map((person) => (
                  <PersonRow key={person.id} person={person} />
                ))}
              </div>
            ) : (
              <div>
                {items.map((item) => (
                  <ResultRow key={`${item.media_type}-${item.id}`} item={item} t={t} />
                ))}
              </div>
            )}

            {/* Paginação */}
            {hasMore && !emptyState && (
              <div className="flex justify-center py-6">
                <button
                  type="button"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={loading}
                  className="px-5 py-2 rounded-full bg-[#2c3440] hover:bg-[#3a4550] text-white text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {loading ? t('search_searching') : t('search_load_more')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
