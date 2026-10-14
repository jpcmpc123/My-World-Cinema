# Backdrop estilo Letterboxd — Como funciona

Documento técnico da implementação do backdrop (imagem de destaque no topo das
páginas de filme/série), replicando o visual do Letterboxd
(ex.: https://letterboxd.com/film/spider-man-brand-new-day/).

## Arquivos envolvidos

| Arquivo | Papel |
| --- | --- |
| `src/components/Backdrop.tsx` | Componente reutilizável do backdrop (imagem + fades) |
| `src/components/Header.tsx` | Navbar transparente sobre o backdrop nas rotas `/film/:id` e `/tv/:id` |
| `src/pages/FilmPage.tsx` | Usa `<Backdrop>` + grid de 3 colunas com overlap por margem negativa |
| `src/pages/SeriesDetailPage.tsx` | Mesmo padrão da FilmPage |
| `src/index.css` | Fundo do body unificado em `#14181C` (crucial, ver abaixo) |

## Princípio central

O "efeito de blur" do Letterboxd **não é blur**. É a fusão da imagem com a cor
de fundo da página (`#14181c`) por meio de gradientes. A imagem permanece
nítida no centro; apenas as extremidades desaparecem.

O efeito é composto por **duas camadas** dentro de um container centralizado de
`max-w-[1200px]` e altura `500px`/`560px`:

### 1. `mask-image` na `<img>` (transparência real)

Os pixels da imagem ficam 100% transparentes **antes** de tocar as bordas,
eliminando qualquer linha de corte visível:

```css
mask-image:
  linear-gradient(to right, transparent 0%, transparent 2%, black 22%, black 78%, transparent 98%, transparent 100%),
  linear-gradient(to top, transparent 0%, transparent 8%, black 55%, black 100%);
mask-composite: intersect;
/* + equivalentes -webkit- (source-in) */
```

### 2. Overlay de 4 gradientes (fusão com o fundo)

Um `<div>` sobre a imagem com `background` de 4 gradientes empilhados, todos na
cor exata do fundo da página:

- **Base**: `#14181c 0% → #14181c 10% → rgba(20,24,28,0.85) 30% → transparent 60%`
  — densa para que a área onde o texto começa já seja fundo sólido (legibilidade);
- **Laterais**: `#14181c 0–3% (sólido) → rgba(20,24,28,0.7) 10% → transparent 25%`
  — faixa sólida no início evita corte seco em imagens claras;
- **Topo**: `rgba(20,24,28,0.75) 0% → rgba(20,24,28,0.3) 12% → transparent 25%`
  — reforçado apenas para contraste da navbar transparente, sem criar faixa visível.

## Regras importantes (armadilhas já resolvidas)

1. **O fundo da página DEVE ser exatamente `#14181C` sólido.** O `body` tinha
   um gradiente (`#1C2228 → #14181C`) que causava uma linha vertical visível
   onde o container de 1200px terminava. Foi removido em `index.css`. Não
   reintroduzir gradiente/imagem de fundo no `body`.
2. **Nunca usar overlay escuro uniforme** sobre a imagem inteira — o centro
   deve manter brilho e contraste originais.
3. **Navbar transparente**: em `Header.tsx`, quando a rota é `/film/:id` ou
   `/tv/:id` (regex `/^\/(film|tv)\/\d+/`), o header usa
   `absolute inset-x-0 top-0 z-50 bg-transparent` + `text-shadow`/`drop-shadow`
   nos textos e ícones. Nas demais rotas permanece `sticky` com fundo sólido.
4. **Overlap do conteúdo**: o container principal da página usa margem negativa
   `-mt-[120px] md:-mt-[150px]` (com `relative z-10`) — o topo do pôster invade
   o backdrop, mas título e sinopse ficam sobre a área já escurecida pelo fade.
   Sem backdrop, usa `pt-20` (a navbar é `absolute` e não ocupa espaço no fluxo).

## Layout do cabeçalho do filme (padrão Letterboxd)

A FilmPage usa CSS Grid em telas `md+`:

```
grid-cols-[230px_minmax(0,1fr)_235px]
```

- **Coluna 1 (pôster)**: `md:row-span-2` — ocupa as duas linhas;
- **Linha 1, colunas 2–3**: cabeçalho (Título + Ano + Diretor + Tagline) com
  `md:col-span-2` — títulos longos cabem em uma linha;
- **Linha 2**: sinopse/tabs (coluna 2) e card de ações Watch/Like/Watchlist +
  Rate (coluna 3), naturalmente alinhados entre si.

## Uso

```tsx
import { Backdrop } from '../components/Backdrop';

// no topo do JSX da página:
{backdropUrl && <Backdrop src={backdropUrl} alt={movie.title} />}

// container de conteúdo logo em seguida:
<div className={`relative z-10 max-w-[960px] mx-auto px-4 pb-16 ${
  backdropUrl ? '-mt-[120px] md:-mt-[150px]' : 'pt-20'
}`}>
```
