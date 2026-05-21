import React, { useEffect, useState } from 'react';
import { ExternalLink, Globe } from 'lucide-react';

interface LinkPreviewCardProps {
  url: string;
}

interface MetaData {
  title: string;
  description: string;
  image?: string;
  url: string;
}

// Cache local simples em memória para evitar requests redundantes de previews na mesma sessão
const previewCache: { [url: string]: MetaData } = {};

export const LinkPreviewCard: React.FC<LinkPreviewCardProps> = ({ url }) => {
  const [metadata, setMetadata] = useState<MetaData | null>(previewCache[url] || null);
  const [loading, setLoading] = useState<boolean>(!previewCache[url]);
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    if (metadata) return;

    let active = true;
    const fetchMeta = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/link-preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url })
        });
        
        if (!res.ok) throw new Error();
        
        const data = await res.json();
        if (active) {
          previewCache[url] = data;
          setMetadata(data);
          setError(false);
        }
      } catch (err) {
        if (active) {
          setError(true);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchMeta();

    return () => {
      active = false;
    };
  }, [url, metadata]);

  if (loading) {
    return (
      <div className="mt-2 flex items-center gap-3 p-3 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 animate-pulse">
        <div className="w-16 h-16 rounded-lg bg-zinc-200 dark:bg-zinc-800 flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-1/3 bg-zinc-200 dark:bg-zinc-800 rounded" />
          <div className="h-4 w-3/4 bg-zinc-200 dark:bg-zinc-800 rounded" />
          <div className="h-3 w-5/6 bg-zinc-200 dark:bg-zinc-800 rounded" />
        </div>
      </div>
    );
  }

  if (error || !metadata) return null;

  const hostname = new URL(metadata.url).hostname;

  return (
    <a
      href={metadata.url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 block overflow-hidden rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm transition-all duration-300 hover:-translate-y-[2px] hover:shadow-md hover:border-violet-500/30 group"
    >
      <div className="flex flex-col sm:flex-row">
        {metadata.image && (
          <div className="relative sm:w-32 h-24 sm:h-auto overflow-hidden bg-zinc-50 dark:bg-zinc-800 flex-shrink-0">
            <img
              src={metadata.image}
              alt={metadata.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              onError={(e) => {
                // Ocultar imagem se falhar no carregamento
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
        )}
        <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
          <div>
            <div className="flex items-center gap-1.5 text-[10px] font-medium text-zinc-400 dark:text-zinc-500 mb-1">
              <Globe className="w-3 h-3 text-zinc-400" />
              <span className="truncate">{hostname}</span>
              <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
            </div>
            <h4 className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 line-clamp-1 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
              {metadata.title}
            </h4>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
              {metadata.description}
            </p>
          </div>
        </div>
      </div>
    </a>
  );
};
