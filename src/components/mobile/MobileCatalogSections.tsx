import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Eye } from 'lucide-react';
import type { TMDBMovie } from '../../services/tmdb';
import { PosterCard } from '../PosterCard';

// ---------------------------------------------------------------------------
// MobileCatalogSections — SOMENTE mobile (md:hidden).
// Estrutura IDÊNTICA para a aba Films e a aba Series do app Android:
//   1. Popular this week    (4 pôsteres limpos)
//   2. Highest rated        (4 pôsteres + nota em estrelas/número abaixo)
//   3. Most watched         (4 pôsteres + olho verde + contagem)
//   4. Most anticipated     (4 pôsteres limpos — "Just reviewed" em séries)
// Cada cabeçalho navega para a grade completa de 4 colunas já filtrada.
// ---------------------------------------------------------------------------

interface MobileCatalogSectionsProps {
  /** Caminho base da categoria: '/films' ou '/series' */
  basePath: '/films' | '/series';
  popular: TMDBMovie[];
  topRated: TMDBMovie[];
  anticipated: TMDBMovie[];
  loading: boolean;
}

const SectionShell: React.FC<{ title: string; to: string; children: React.ReactNode }> = ({
  title,
  to,
  children,
}) => (
  <section className="space-y-3">
    {/* Título + seta navegam para a grade completa filtrada */}
    <Link to={to} className="flex items-center justify-between group">
      <h2 className="text-lg font-bold text-white group-active:text-lb-green">{title}</h2>
      <ChevronRight className="w-5 h-5 text-lb-muted group-active:text-lb-green" />
    </Link>
    {children}
  </section>
);

const PosterShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="rounded-[4px] ring-1 ring-white/15 overflow-hidden">{children}</div>
);

const SkeletonRow: React.FC = () => (
  <div className="grid grid-cols-4 gap-1.5">
    {[...Array(4)].map((_, i) => (
      <div key={i} className="aspect-[2/3] bg-lb-surface animate-pulse rounded-[4px] ring-1 ring-white/15" />
    ))}
  </div>
);

/** "★★★★☆ 4.6" — texto cinza-claro abaixo do pôster (seção Highest rated) */
const RatingLine: React.FC<{ movie: TMDBMovie }> = ({ movie }) => {
  const rating5 = movie.vote_average ? movie.vote_average / 2 : 0;
  const full = Math.round(rating5);
  return (
    <div className="flex items-center gap-1 px-0.5 pt-1">
      <span className="text-[10px] leading-none tracking-tight">
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} className={i < full ? 'text-lb-green' : 'text-[#3a4550]'}>★</span>
        ))}
      </span>
      <span className="text-[10px] text-[#9ab]">{rating5.toFixed(1)}</span>
    </div>
  );
};

/** Número compacto: 1234 → "1.2K", 1234567 → "1.2M" */
function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return `${n}`;
}

export const MobileCatalogSections: React.FC<MobileCatalogSectionsProps> = ({
  basePath,
  popular,
  topRated,
  anticipated,
  loading,
}) => {
  const isSeries = basePath === '/series';

  // "Most watched": ordena os populares por votos (proxy de visualizações)
  const mostWatched = [...popular].sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0)).slice(0, 4);

  // Rotas da grade completa filtrada por categoria
  const routes = {
    popular: `${basePath}/decade/2020s?sort=popularity.desc`,
    rated: `${basePath}/decade/2020s?sort=vote_average.desc`,
    watched: `${basePath}/decade/2020s?sort=vote_count.desc`,
    anticipated: isSeries ? '/series/popular' : `${basePath}/decade/2020s?sort=release_date.desc`,
  };

  return (
    <div className="md:hidden space-y-8">
      {/* 1. Popular this week — 4 pôsteres limpos */}
      <SectionShell title="Popular this week" to={routes.popular}>
        {loading ? (
          <SkeletonRow />
        ) : (
          <div className="grid grid-cols-4 gap-1.5">
            {popular.slice(0, 4).map((m) => (
              <PosterShell key={m.id}>
                <PosterCard movie={m} size="fluid" showDetails={false} tv={isSeries} enableLongPressActions />
              </PosterShell>
            ))}
          </div>
        )}
      </SectionShell>

      {/* 2. Highest rated — pôsteres + nota em estrelas abaixo */}
      <SectionShell title="Highest rated" to={routes.rated}>
        {loading ? (
          <SkeletonRow />
        ) : (
          <div className="grid grid-cols-4 gap-1.5">
            {topRated.slice(0, 4).map((m) => (
              <div key={m.id}>
                <PosterShell>
                  <PosterCard movie={m} size="fluid" showDetails={false} tv={isSeries} enableLongPressActions />
                </PosterShell>
                <RatingLine movie={m} />
              </div>
            ))}
          </div>
        )}
      </SectionShell>

      {/* 3. Most watched — pôsteres + olho verde + contagem */}
      <SectionShell title="Most watched" to={routes.watched}>
        {loading ? (
          <SkeletonRow />
        ) : (
          <div className="grid grid-cols-4 gap-1.5">
            {mostWatched.map((m) => (
              <div key={m.id}>
                <PosterShell>
                  <PosterCard movie={m} size="fluid" showDetails={false} tv={isSeries} enableLongPressActions />
                </PosterShell>
                <div className="flex items-center gap-1 px-0.5 pt-1 text-[#00e054]">
                  <Eye className="w-3 h-3" />
                  <span className="text-[10px] text-[#9ab]">
                    {/* Votos escalados ≈ visualizações (mesma proporção da página de detalhe) */}
                    {compact(Math.max(35000, (m.vote_count || 100) * 350))}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionShell>

      {/* 4. Most anticipated (films) / Just reviewed (series) — pôsteres limpos */}
      <SectionShell title={isSeries ? 'Just reviewed' : 'Most anticipated'} to={routes.anticipated}>
        {loading ? (
          <SkeletonRow />
        ) : (
          <div className="grid grid-cols-4 gap-1.5">
            {anticipated.slice(0, 4).map((m) => (
              <PosterShell key={m.id}>
                <PosterCard movie={m} size="fluid" showDetails={false} tv={isSeries} enableLongPressActions />
              </PosterShell>
            ))}
          </div>
        )}
      </SectionShell>
    </div>
  );
};

export default MobileCatalogSections;
