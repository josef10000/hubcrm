import { cn } from '@/lib/utils';
import React from 'react';

export interface BookProps {
  children?: React.ReactNode;
  color?: string;
  textColor?: string;
  texture?: boolean;
  depth?: number;
  variant?: 'default' | 'simple' | 'hardcover' | 'notebook';
  illustration?: React.ReactNode;
  width?: number;
  height?: number;
  spineText?: string;
  bookmark?: boolean;
  bookmarkColor?: string;
  animation?: 'hover' | 'float' | 'pulse' | 'flip' | 'none';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  orientation?: 'portrait' | 'landscape';
  pages?: number;
  author?: string;
  title?: string;
  className?: string;
}

const sizePresets = {
  xs: { width: 100, height: 140 },
  sm: { width: 130, height: 180 },
  md: { width: 160, height: 215 },
  lg: { width: 200, height: 270 },
  xl: { width: 250, height: 340 },
};

export function Book({
  children,
  color = '#3b82f6',
  textColor = '#ffffff',
  depth,
  variant = 'default',
  illustration,
  width,
  height,
  spineText,
  bookmark = false,
  bookmarkColor = '#fbbf24',
  animation = 'hover',
  size = 'md',
  pages = 100,
  author,
  title,
  className,
}: BookProps) {
  const dimensions = sizePresets[size];
  const bookWidth = width || dimensions.width;
  const bookHeight = height || dimensions.height;

  // Calcula profundidade física baseada no número de páginas (min 4px, max 20px)
  const computedDepth = depth || Math.max(4, Math.min(22, Math.round(pages / 35)));

  // Renderiza o marcador bookmark
  const renderBookmark = () => {
    if (!bookmark) return null;
    return (
      <div
        className="absolute top-0 right-4 w-3.5 h-14 z-40 transition-transform duration-300 group-hover:translate-y-2.5 shadow-md"
        style={{
          backgroundColor: bookmarkColor,
          clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%)',
        }}
      />
    );
  };

  const getAnimationClass = () => {
    switch (animation) {
      case 'float':
        return 'animate-bounce';
      case 'pulse':
        return 'animate-pulse';
      case 'flip':
        return 'group-hover:[transform:rotateY(-180deg)]';
      case 'hover':
        return 'group-hover:[transform:rotateY(-25deg)_scale(1.05)translateX(-8px)]';
      default:
        return '';
    }
  };

  return (
    <div
      className={cn('w-fit [perspective:1200px] inline-block group', className)}
      style={
        {
          '--book-color': color,
          '--text-color': textColor,
          '--book-depth': `${computedDepth}px`,
          '--book-width': `${bookWidth}px`,
          '--book-height': `${bookHeight}px`,
        } as React.CSSProperties
      }
    >
      <div
        className={cn(
          'relative w-[var(--book-width)] h-[var(--book-height)] transition-transform duration-500 ease-out [transform-style:preserve-3d] origin-left',
          getAnimationClass()
        )}
      >
        {/* Capa Frontal */}
        <div
          className="absolute inset-0 bg-[var(--book-color)] rounded-l-[2px] rounded-r-[4px] border border-black/15 overflow-hidden shadow-book [transform-style:preserve-3d] z-20 flex flex-col justify-between"
          style={{
            color: textColor,
          }}
        >
          {/* Dobra da Capa (Lombada Esquerda) */}
          <div className="absolute inset-y-0 left-0 mix-blend-overlay opacity-100 w-[8.2%] bg-book-bind-bg" />
          <div className="absolute inset-y-0 left-[8%] w-[1px] bg-black/20" />
          
          {renderBookmark()}

          {/* Textura de Couro / Notebook */}
          {(variant === 'notebook' || variant === 'hardcover') && (
            <div className="absolute inset-0 bg-stone-950/5 mix-blend-multiply pointer-events-none" />
          )}

          {/* Conteúdo da Capa */}
          {variant !== 'simple' ? (
            <div className="p-4 flex flex-col h-full justify-between z-10 select-none">
              {/* Cabeçalho */}
              <div className="flex flex-col gap-0.5 pl-[8%]">
                <span className="text-[7.5px] font-black uppercase tracking-[0.25em] opacity-50">
                  {spineText || 'NEXUS EDITION'}
                </span>
                <div className="h-[2px] w-8 bg-current opacity-30 rounded-full mt-1" />
              </div>

              {/* Ilustração se houver */}
              {illustration && (
                <div className="h-[35%] flex items-center justify-center overflow-hidden rounded opacity-80 my-2">
                  {illustration}
                </div>
              )}

              {/* Título & Autor */}
              <div className="flex flex-col gap-1 pl-[8%] mt-auto">
                <h4 className="text-[11px] font-black uppercase tracking-wider leading-snug line-clamp-3 filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]">
                  {title}
                </h4>
                {author && (
                  <span className="text-[7.5px] font-bold tracking-widest uppercase opacity-75 truncate mt-1">
                    {author}
                  </span>
                )}
              </div>

              {/* Detalhes de Páginas */}
              <div className="flex items-center justify-between text-[7px] font-black uppercase tracking-widest opacity-45 pl-[8%] mt-2 pt-2 border-t border-current/10">
                <span>{pages} páginas</span>
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center p-4">
              {children}
            </div>
          )}
        </div>

        {/* Páginas do Livro (Lateral Direita) */}
        <div
          aria-hidden="true"
          className="absolute bg-book-pages w-[calc(var(--book-depth)-2px)] h-[calc(100%-2*3px)] top-[3px]"
          style={{
            transform:
              'translateX(calc(var(--book-width) - var(--book-depth) / 2 - 3px)) rotateY(90deg) translateX(calc(var(--book-depth) / 2))',
          }}
        />

        {/* Contracapa (Traseira) */}
        <div
          aria-hidden="true"
          className="absolute left-0 w-full h-full bg-[var(--book-color)] rounded-l-[4px] rounded-r-[2px] shadow-2xl border border-black/15"
          style={{
            transform: 'translateZ(calc(-1 * var(--book-depth)))',
            filter: 'brightness(0.75)',
          }}
        />
      </div>
    </div>
  );
}
