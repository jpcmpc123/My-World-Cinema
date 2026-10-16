import React, { useMemo, useState } from 'react';
import { ArrowLeft, Check, X } from 'lucide-react';
import { tmdb } from '../../services/tmdb';

/**
 * FiltersModal — full-screen filters sheet used by BrowseResultsPage.
 *
 * Contract:
 *   <FiltersModal
 *     open={filtersOpen}
 *     initial={currentParamsAsRecord}   // Record<string,string> from useSearchParams entries
 *     onClose={() => setFiltersOpen(false)}
 *     onApply={(draft) => { setSearchParams(draft); setFiltersOpen(false); }}
 *   />
 *
 * The modal owns a DRAFT copy of the URL filters. ✓ commits via onApply,
 * ✕ and the back arrow close without applying. Reset clears everything to Any.
 */

// ---- Shared option lists (also imported by BrowseDrilldownPage) ----
export interface FilterOption {
  id: string;
  label: string;
}

export const COUNTRY_OPTIONS: FilterOption[] = [
  { id: 'US', label: 'United States' },
  { id: 'GB', label: 'United Kingdom' },
  { id: 'BR', label: 'Brazil' },
  { id: 'FR', label: 'France' },
  { id: 'JP', label: 'Japan' },
  { id: 'KR', label: 'South Korea' },
  { id: 'DE', label: 'Germany' },
  { id: 'IT', label: 'Italy' },
  { id: 'ES', label: 'Spain' },
  { id: 'IN', label: 'India' },
  { id: 'CA', label: 'Canada' },
  { id: 'AU', label: 'Australia' },
  { id: 'MX', label: 'Mexico' },
  { id: 'AR', label: 'Argentina' },
  { id: 'PT', label: 'Portugal' },
  { id: 'CN', label: 'China' },
  { id: 'SE', label: 'Sweden' },
  { id: 'DK', label: 'Denmark' },
  { id: 'NL', label: 'Netherlands' },
  { id: 'PL', label: 'Poland' },
];

export const LANGUAGE_OPTIONS: FilterOption[] = [
  { id: 'en', label: 'English' },
  { id: 'pt', label: 'Portuguese' },
  { id: 'es', label: 'Spanish' },
  { id: 'fr', label: 'French' },
  { id: 'ja', label: 'Japanese' },
  { id: 'ko', label: 'Korean' },
  { id: 'de', label: 'German' },
  { id: 'it', label: 'Italian' },
  { id: 'zh', label: 'Mandarin' },
  { id: 'hi', label: 'Hindi' },
  { id: 'ru', label: 'Russian' },
  { id: 'sv', label: 'Swedish' },
];

export const SORT_OPTIONS: FilterOption[] = [
  { id: 'popularity.desc', label: 'Film popularity' },
  { id: 'vote_average.desc', label: 'Highest rated' },
  { id: 'vote_average.asc', label: 'Lowest rated' },
  { id: 'primary_release_date.desc', label: 'Release date: Newest first' },
  { id: 'primary_release_date.asc', label: 'Release date: Oldest first' },
  { id: 'original_title.asc', label: 'Title A-Z' },
];

export const DECADE_OPTIONS: string[] = [
  '2020s', '2010s', '2000s', '1990s', '1980s', '1970s', '1960s', '1950s',
  '1940s', '1930s', '1920s', '1910s', '1900s', '1890s', '1880s', '1870s',
];

export type FiltersDraft = Record<string, string>;

type PickerId =
  | 'sort'
  | 'year'
  | 'genre'
  | 'country'
  | 'language'
  | 'service'
  | 'released'
  | 'length'
  | 'type'
  | 'watched'
  | 'watchlist'
  | 'backdrop'
  | null;

interface FiltersModalProps {
  open: boolean;
  initial: FiltersDraft;
  onClose: () => void;
  onApply: (draft: FiltersDraft) => void;
}

const SIMPLE_PICKERS: Record<string, { title: string; key: string; options: FilterOption[] }> = {
  released: {
    title: 'Released',
    key: 'released',
    options: [
      { id: 'any', label: 'Any' },
      { id: 'released', label: 'Released' },
      { id: 'upcoming', label: 'Upcoming' },
    ],
  },
  length: {
    title: 'Length',
    key: 'length',
    options: [
      { id: 'any', label: 'Any' },
      { id: 'short', label: '< 90 mins' },
      { id: 'medium', label: '90–120 mins' },
      { id: 'long', label: '> 120 mins' },
    ],
  },
  type: {
    title: 'Film/TV',
    key: 'type',
    options: [
      { id: 'any', label: 'Any' },
      { id: 'movie', label: 'Films only' },
      { id: 'tv', label: 'TV Series only' },
    ],
  },
  watched: {
    title: 'Watched',
    key: 'watched',
    options: [
      { id: 'any', label: 'Any' },
      { id: 'watched', label: 'Watched' },
      { id: 'not-watched', label: 'Not watched' },
    ],
  },
  watchlist: {
    title: 'Watchlist',
    key: 'watchlist',
    options: [
      { id: 'any', label: 'Any' },
      { id: 'in', label: 'In watchlist' },
      { id: 'not-in', label: 'Not in watchlist' },
    ],
  },
  backdrop: {
    title: 'Backdrops',
    key: 'backdrop',
    options: [
      { id: 'any', label: 'Any' },
      { id: 'with', label: 'With backdrop' },
    ],
  },
};

export const FiltersModal: React.FC<FiltersModalProps> = ({ open, initial, onClose, onApply }) => {
  const [draft, setDraft] = useState<FiltersDraft>({});
  const [picker, setPicker] = useState<PickerId>(null);
  const [yearDecade, setYearDecade] = useState<string | null>(null);
  const [prevOpen, setPrevOpen] = useState(false);

  // Sync draft each time the modal opens (fresh copy of URL params)
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setDraft({ ...initial });
      setPicker(null);
      setYearDecade(null);
    }
  }

  const setParam = (key: string, value: string) => {
    setDraft((d) => {
      const next = { ...d };
      if (!value || value === 'any') delete next[key];
      else next[key] = value;
      return next;
    });
  };

  const valueLabel = useMemo(() => {
    const genreName = (id?: string) => tmdb.genres.find((g) => String(g.id) === id)?.name;
    const serviceName = (id?: string) => tmdb.streamingServices.find((s) => String(s.id) === id)?.name;
    const optLabel = (list: FilterOption[], id?: string) => list.find((o) => o.id === id)?.label;
    return {
      sort: SORT_OPTIONS.find((o) => o.id === (draft.sort || 'popularity.desc'))?.label || 'Film popularity',
      year: draft.year || draft.decade || 'Any',
      genre: genreName(draft.genre) || 'Any',
      country: optLabel(COUNTRY_OPTIONS, draft.country) || 'Any',
      language: optLabel(LANGUAGE_OPTIONS, draft.language) || 'Any',
      service: serviceName(draft.service) || 'Any',
      released: optLabel(SIMPLE_PICKERS.released.options, draft.released) || 'Any',
      length:
        draft.length === 'short'
          ? '< 90 mins'
          : draft.length === 'medium'
            ? '90–120 mins'
            : draft.length === 'long'
              ? '> 120 mins'
              : 'Any',
      type:
        draft.type === 'movie' ? 'Films only' : draft.type === 'tv' ? 'TV Series only' : 'Any',
      watched:
        draft.watched === 'watched'
          ? 'Watched'
          : draft.watched === 'not-watched'
            ? 'Not watched'
            : 'Any',
      watchlist:
        draft.watchlist === 'in'
          ? 'In watchlist'
          : draft.watchlist === 'not-in'
            ? 'Not in watchlist'
            : 'Any',
      backdrop: draft.backdrop === 'with' ? 'With backdrop' : 'Any',
    };
  }, [draft]);

  if (!open) return null;

  const fade = draft.fade === '1';
  const toggleFade = () => setParam('fade', fade ? '' : '1');

  const reset = () => setDraft({});

  const Row: React.FC<{ label: string; value: string; onClick?: () => void }> = ({
    label,
    value,
    onClick,
  }) => (
    <button
      type="button"
      onClick={onClick}
      className="w-full px-4 py-3.5 flex items-center justify-between text-left"
    >
      <span className="text-[15px] text-[#ccd6e0]">{label}</span>
      <span className="text-[15px] text-[#789] flex items-center gap-1">{value} ›</span>
    </button>
  );

  const PickerRow: React.FC<{ label: string; active: boolean; onClick: () => void }> = ({
    label,
    active,
    onClick,
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={`w-full px-4 py-3.5 flex items-center justify-between text-left text-[15px] border-b border-white/5 ${
        active ? 'text-white' : 'text-[#9ab]'
      }`}
    >
      <span>{label}</span>
      {active && <Check className="w-4 h-4 text-[#00e054]" />}
    </button>
  );

  const pickerHeader = (title: string, back: () => void) => (
    <div className="bg-black h-14 px-4 flex items-center gap-4 border-b border-white/10 shrink-0">
      <button onClick={back} aria-label="Back" className="text-white">
        <ArrowLeft className="w-5 h-5" />
      </button>
      <h2 className="text-lg font-bold text-white">{title}</h2>
    </div>
  );

  // ---- Picker sub-screens ----
  const renderPicker = () => {
    if (!picker) return null;

    if (picker === 'sort') {
      return (
        <>
          {pickerHeader('Sort by', () => setPicker(null))}
          <div className="flex-1 overflow-y-auto pb-24">
            {SORT_OPTIONS.map((o) => (
              <PickerRow
                key={o.id}
                label={o.label}
                active={(draft.sort || 'popularity.desc') === o.id}
                onClick={() => {
                  setParam('sort', o.id);
                  setPicker(null);
                }}
              />
            ))}
          </div>
        </>
      );
    }

    if (picker === 'year') {
      if (yearDecade) {
        const start = parseInt(yearDecade.replace('s', ''), 10) || 2020;
        const years = Array.from({ length: 10 }, (_, i) => start + 9 - i);
        return (
          <>
            {pickerHeader(yearDecade, () => setYearDecade(null))}
            <div className="flex-1 overflow-y-auto pb-24">
              <PickerRow
                label="Any"
                active={draft.decade === yearDecade && !draft.year}
                onClick={() => {
                  setDraft((d) => {
                    const n = { ...d };
                    delete n.year;
                    n.decade = yearDecade;
                    return n;
                  });
                  setPicker(null);
                  setYearDecade(null);
                }}
              />
              {years.map((y) => (
                <PickerRow
                  key={y}
                  label={String(y)}
                  active={draft.year === String(y)}
                  onClick={() => {
                    setDraft((d) => {
                      const n = { ...d };
                      n.year = String(y);
                      // keep the decade for context but year takes precedence in the results page
                      n.decade = yearDecade;
                      return n;
                    });
                    setPicker(null);
                    setYearDecade(null);
                  }}
                />
              ))}
            </div>
          </>
        );
      }
      return (
        <>
          {pickerHeader('Year', () => setPicker(null))}
          <div className="flex-1 overflow-y-auto pb-24">
            <PickerRow
              label="Any"
              active={!draft.year && !draft.decade}
              onClick={() => {
                setDraft((d) => {
                  const n = { ...d };
                  delete n.year;
                  delete n.decade;
                  return n;
                });
                setPicker(null);
              }}
            />
            {DECADE_OPTIONS.map((dec) => (
              <PickerRow key={dec} label={dec} active={false} onClick={() => setYearDecade(dec)} />
            ))}
          </div>
        </>
      );
    }

    if (picker === 'genre' || picker === 'country' || picker === 'language' || picker === 'service') {
      const config: Record<string, { title: string; key: string; options: FilterOption[] }> = {
        genre: {
          title: 'Genre',
          key: 'genre',
          options: tmdb.genres.map((g) => ({ id: String(g.id), label: g.name })),
        },
        country: { title: 'Country', key: 'country', options: COUNTRY_OPTIONS },
        language: { title: 'Language', key: 'language', options: LANGUAGE_OPTIONS },
        service: {
          title: 'Service',
          key: 'service',
          options: tmdb.streamingServices.map((s) => ({ id: String(s.id), label: s.name })),
        },
      };
      const { title, key, options } = config[picker];
      return (
        <>
          {pickerHeader(title, () => setPicker(null))}
          <div className="flex-1 overflow-y-auto pb-24">
            <PickerRow
              label="Any"
              active={!draft[key]}
              onClick={() => {
                setParam(key, '');
                setPicker(null);
              }}
            />
            {options.map((o) => (
              <PickerRow
                key={o.id}
                label={o.label}
                active={draft[key] === o.id}
                onClick={() => {
                  setParam(key, o.id);
                  setPicker(null);
                }}
              />
            ))}
          </div>
        </>
      );
    }

    // Simple radio pickers (released/length/type/watched/watchlist/backdrop)
    const cfg = SIMPLE_PICKERS[picker];
    if (cfg) {
      return (
        <>
          {pickerHeader(cfg.title, () => setPicker(null))}
          <div className="flex-1 overflow-y-auto pb-24">
            {cfg.options.map((o) => (
              <PickerRow
                key={o.id}
                label={o.label}
                active={(draft[cfg.key] || 'any') === o.id}
                onClick={() => {
                  setParam(cfg.key, o.id);
                  setPicker(null);
                }}
              />
            ))}
          </div>
        </>
      );
    }
    return null;
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex flex-col bg-[#14181c] mw-sheet-up"
      role="dialog"
      aria-modal="true"
    >

      {picker ? (
        renderPicker()
      ) : (
        <>
          {/* Header */}
          <div className="bg-black h-14 px-4 flex items-center justify-between border-b border-white/10 shrink-0">
            <button onClick={onClose} aria-label="Close filters" className="text-white">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-white font-bold">Filters</h2>
            <button
              onClick={() => onApply(draft)}
              aria-label="Apply filters"
              className="text-[#00e054]"
            >
              <Check className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto">
            <div className="divide-y divide-white/10">
              <Row label="Sort by" value={valueLabel.sort} onClick={() => setPicker('sort')} />

              <div>
                <h3 className="text-[11px] uppercase tracking-wider text-lb-muted px-4 pt-4 pb-1">
                  Appearance
                </h3>
                <div className="divide-y divide-white/10">
                  <div className="px-4 py-3.5 flex items-center justify-between">
                    <span className="text-[15px] text-[#ccd6e0]">Fade watched films</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={fade}
                      onClick={toggleFade}
                      className="w-10 h-6 rounded-full bg-[#2c3440] relative transition-colors"
                    >
                      <span
                        className={`absolute top-0.5 w-5 h-5 rounded-full transition-all ${
                          fade ? 'bg-[#ff8000] left-[18px]' : 'bg-[#9ab] left-0.5'
                        }`}
                      />
                    </button>
                  </div>
                  {/* Stub: custom posters are always applied site-wide via movieOverrides */}
                  <div className="px-4 py-3.5 flex items-center justify-between">
                    <span className="text-[15px] text-[#ccd6e0]">Custom posters</span>
                    <span className="text-[15px] text-[#789]">Enabled ›</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-[11px] uppercase tracking-wider text-lb-muted px-4 pt-4 pb-1">
                  Content
                </h3>
                <div className="divide-y divide-white/10">
                  <Row label="Year" value={valueLabel.year} onClick={() => setPicker('year')} />
                  <Row label="Genre" value={valueLabel.genre} onClick={() => setPicker('genre')} />
                  <Row
                    label="Country"
                    value={valueLabel.country}
                    onClick={() => setPicker('country')}
                  />
                  <Row
                    label="Language"
                    value={valueLabel.language}
                    onClick={() => setPicker('language')}
                  />
                  <Row
                    label="Service"
                    value={valueLabel.service}
                    onClick={() => setPicker('service')}
                  />
                  <Row
                    label="Released"
                    value={valueLabel.released}
                    onClick={() => setPicker('released')}
                  />
                  <Row label="Length" value={valueLabel.length} onClick={() => setPicker('length')} />
                  <Row label="Film/TV" value={valueLabel.type} onClick={() => setPicker('type')} />
                </div>
              </div>

              <div>
                <h3 className="text-[11px] uppercase tracking-wider text-lb-muted px-4 pt-4 pb-1">
                  Your account
                </h3>
                <div className="divide-y divide-white/10">
                  <Row label="Watched" value={valueLabel.watched} onClick={() => setPicker('watched')} />
                  <Row
                    label="Watchlist"
                    value={valueLabel.watchlist}
                    onClick={() => setPicker('watchlist')}
                  />
                  <Row
                    label="Backdrops"
                    value={valueLabel.backdrop}
                    onClick={() => setPicker('backdrop')}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-4 py-4 shrink-0">
            <button
              type="button"
              onClick={reset}
              className="text-[#ff8000] font-medium text-[15px]"
            >
              Reset filters
            </button>
          </div>
        </>
      )}
    </div>
  );
};
