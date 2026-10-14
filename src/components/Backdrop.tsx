import React from 'react';

interface BackdropProps {
  /** URL da imagem de destaque (TMDB ou override do usuário) */
  src: string;
  /** Texto alternativo da imagem */
  alt?: string;
}

/**
 * Backdrop estilo Letterboxd: imagem nítida centralizada no topo
 * (máx. 1200px) que se funde à cor de fundo #14181c nos 4 lados
 * apenas nas extremidades, via gradientes lineares sobrepostos —
 * sem overlay escuro uniforme, sem blur e sem máscaras.
 *
 * O componente fixa-se no topo da página (top: 0), passando por baixo
 * da navbar transparente, e o conteúdo da página sobrepõe sua base
 * com margem negativa (ex.: -mt-[200px]).
 */
export const Backdrop: React.FC<BackdropProps> = ({ src, alt = '' }) => {
  return (
    <div
      className="relative w-full h-[230px] md:h-[560px] overflow-hidden pointer-events-none select-none"
      aria-hidden={alt === ''}
    >
      {/* Mobile (<md): imagem em 100% da largura, fades só no topo/base.
          Desktop (md+): container de 1200px com fades nos 4 lados (inalterado). */}
      <div className="relative w-full md:max-w-[1200px] h-full mx-auto">
        {/* Imagem nítida, brilho/contraste originais.
            mask-image faz os pixels ficarem 100% transparentes antes das
            bordas laterais e da base: transparência real, sem linha de corte.
            No mobile a máscara horizontal é desligada (w-full). */}
        <img
          loading="eager"
          decoding="async"
          src={src}
          alt={alt}
          className={
            'absolute inset-0 w-full h-full object-cover max-md:object-[center_25%] md:object-[center_20%] ' +
            /* Mobile: máscara só na base (imagem vai de ponta a ponta) */
            'max-md:[mask-image:linear-gradient(to_top,transparent_0%,transparent_8%,black_55%,black_100%)] ' +
            'max-md:[-webkit-mask-image:linear-gradient(to_top,transparent_0%,transparent_8%,black_55%,black_100%)] ' +
            /* Desktop: máscara composta horizontal+vertical (inalterada) */
            'md:[mask-image:linear-gradient(to_right,transparent_0%,transparent_2%,black_22%,black_78%,transparent_98%,transparent_100%),linear-gradient(to_top,transparent_0%,transparent_8%,black_55%,black_100%)] ' +
            'md:[-webkit-mask-image:linear-gradient(to_right,transparent_0%,transparent_2%,black_22%,black_78%,transparent_98%,transparent_100%),linear-gradient(to_top,transparent_0%,transparent_8%,black_55%,black_100%)] ' +
            'md:[mask-composite:intersect] md:[-webkit-mask-composite:source-in]'
          }
        />
        {/* Fusão com o fundo SOMENTE nas extremidades (cor idêntica ao body: #14181c) */}
        <div
          className="absolute inset-0"
          style={{
            background:
              /* Base: densa o bastante para a área do texto já ser #14181c */
              'linear-gradient(to top, #14181c 0%, #14181c 10%, rgba(20, 24, 28, 0.85) 30%, transparent 60%),' +
              /* Topo: reforçado para contraste da navbar/botões flutuantes */
              'linear-gradient(to bottom, rgba(20, 24, 28, 0.75) 0%, rgba(20, 24, 28, 0.3) 12%, transparent 25%)',
          }}
        />
        {/* Fades laterais — SOMENTE desktop (onde há o container de 1200px) */}
        <div
          className="absolute inset-0 hidden md:block"
          style={{
            background:
              'linear-gradient(to right, #14181c 0%, #14181c 3%, rgba(20, 24, 28, 0.7) 10%, transparent 25%),' +
              'linear-gradient(to left, #14181c 0%, #14181c 3%, rgba(20, 24, 28, 0.7) 10%, transparent 25%)',
          }}
        />
      </div>
    </div>
  );
};
