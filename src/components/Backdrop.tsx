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
      className="relative w-full h-[500px] md:h-[560px] overflow-hidden pointer-events-none select-none"
      aria-hidden={alt === ''}
    >
      <div className="relative w-full max-w-[1200px] h-full mx-auto">
        {/* Imagem nítida, brilho/contraste originais.
            mask-image faz os pixels ficarem 100% transparentes antes das
            bordas laterais e da base: transparência real, sem linha de corte */}
        <img
          loading="eager"
          decoding="async"
          src={src}
          alt={alt}
          className="absolute inset-0 w-full h-full object-cover object-[center_20%]"
          style={{
            WebkitMaskImage:
              'linear-gradient(to right, transparent 0%, transparent 2%, black 22%, black 78%, transparent 98%, transparent 100%),' +
              'linear-gradient(to top, transparent 0%, transparent 8%, black 55%, black 100%)',
            WebkitMaskComposite: 'source-in',
            maskImage:
              'linear-gradient(to right, transparent 0%, transparent 2%, black 22%, black 78%, transparent 98%, transparent 100%),' +
              'linear-gradient(to top, transparent 0%, transparent 8%, black 55%, black 100%)',
            maskComposite: 'intersect',
          }}
        />
        {/* Fusão com o fundo SOMENTE nas extremidades (cor idêntica ao body: #14181c) */}
        <div
          className="absolute inset-0"
          style={{
            background:
              /* Base: densa o bastante para a área do texto já ser #14181c */
              'linear-gradient(to top, #14181c 0%, #14181c 10%, rgba(20, 24, 28, 0.85) 30%, transparent 60%),' +
              /* Laterais: faixa sólida 0–3% + transição ampla até 25% (sem corte seco) */
              'linear-gradient(to right, #14181c 0%, #14181c 3%, rgba(20, 24, 28, 0.7) 10%, transparent 25%),' +
              'linear-gradient(to left, #14181c 0%, #14181c 3%, rgba(20, 24, 28, 0.7) 10%, transparent 25%),' +
              /* Topo: reforçado para contraste da navbar, ainda sem faixa visível */
              'linear-gradient(to bottom, rgba(20, 24, 28, 0.75) 0%, rgba(20, 24, 28, 0.3) 12%, transparent 25%)',
          }}
        />
      </div>
    </div>
  );
};
