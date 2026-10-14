import React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { tmdb } from '../services/tmdb';
import {
  COUNTRY_OPTIONS,
  DECADE_OPTIONS,
  LANGUAGE_OPTIONS,
} from '../components/mobile/FiltersModal';

/**
 * BrowseDrilldownPage — cascade browse menus (Release date / Genre / Country /
 * Language / Service). App-style full screen, mobile-first; degrades to a
 * centered 950px column on desktop.
 */
interface Row {
  label: string;
  to: string;
}

type Kind = 'decades' | 'years' | 'genre' | 'country' | 'language' | 'service';

export const BrowseDrilldownPage: React.FC<{ kind: Kind }> = ({ kind }) => {
  const navigate = useNavigate();
  const { decade: decadeParam } = useParams<{ decade?: string }>();

  let title = '';
  let rows: Row[] = [];

  if (kind === 'decades') {
    title = 'Release Date';
    rows = [
      { label: 'Upcoming', to: '/browse/results?released=upcoming&title=Upcoming' },
      ...DECADE_OPTIONS.map((d) => ({ label: d, to: `/browse/release-date/${d}` })),
    ];
  } else if (kind === 'years') {
    const decade = decadeParam && /^\d{4}s$/.test(decadeParam) ? decadeParam : '2020s';
    const start = parseInt(decade.replace('s', ''), 10);
    title = decade;
    rows = [
      { label: 'Any', to: `/browse/results?decade=${decade}&title=${decade}` },
    ];
    for (let y = start + 9; y >= start; y--) {
      rows.push({ label: String(y), to: `/browse/results?year=${y}&title=${y}` });
    }
  } else if (kind === 'genre') {
    title = 'Genre';
    rows = tmdb.genres.map((g) => ({
      label: g.name,
      to: `/browse/results?genre=${g.id}&title=${encodeURIComponent(g.name)}`,
    }));
  } else if (kind === 'country') {
    title = 'Country';
    rows = COUNTRY_OPTIONS.map((c) => ({
      label: c.label,
      to: `/browse/results?country=${c.id}&title=${encodeURIComponent(c.label)}`,
    }));
  } else if (kind === 'language') {
    title = 'Language';
    rows = LANGUAGE_OPTIONS.map((l) => ({
      label: l.label,
      to: `/browse/results?language=${l.id}&title=${encodeURIComponent(l.label)}`,
    }));
  } else if (kind === 'service') {
    title = 'Service';
    rows = tmdb.streamingServices.map((s) => ({
      label: s.name,
      to: `/browse/results?service=${s.id}&title=${encodeURIComponent(s.name)}`,
    }));
  }

  return (
    <div className="min-h-screen bg-[#14181c]">
      <div className="max-w-[950px] mx-auto">
        <div className="bg-[#0a0c0f] h-14 px-4 flex items-center gap-4 sticky top-0 z-30">
          <button onClick={() => navigate(-1)} aria-label="Back" className="text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold text-white">{title}</h1>
        </div>

        <nav className="flex flex-col pb-24">
          {rows.map((row) => (
            <Link
              key={row.label}
              to={row.to}
              className="px-4 py-3.5 text-[15px] text-[#9ab] flex justify-between items-center border-b border-white/5 hover:text-white transition-colors"
            >
              <span>{row.label}</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
};
