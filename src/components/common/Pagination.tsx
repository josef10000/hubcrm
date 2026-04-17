import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems: number;
  itemsPerPage: number;
}

export default function Pagination({ 
  currentPage, 
  totalPages, 
  onPageChange, 
  totalItems, 
  itemsPerPage 
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const startIndex = (currentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(currentPage * itemsPerPage, totalItems);

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  
  // Lógica para mostrar apenas algumas páginas se houver muitas
  const visiblePages = pages.filter(p => 
    p === 1 || 
    p === totalPages || 
    (p >= currentPage - 1 && p <= currentPage + 1)
  );

  return (
    <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8 border-t border-white/5 mt-8">
      <div className="text-sm text-gray-500">
        Mostrando <span className="font-bold text-white text-base mx-1">{startIndex}-{endIndex}</span> 
        de <span className="font-bold text-white text-base ml-1">{totalItems}</span> resultados
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:hover:bg-white/5 disabled:cursor-not-allowed transition-all active:scale-95"
          aria-label="Página Anterior"
        >
          <ChevronLeft size={20} />
        </button>

        <div className="flex items-center gap-1.5">
          {pages.map((page, index) => {
            const isGap = index > 0 && page - pages[index - 1] > 1;
            
            // Simplificação para manter a UI limpa
            if (totalPages > 7 && !visiblePages.includes(page)) {
              if (page === currentPage - 2 || page === currentPage + 2) {
                return (
                  <span key={`gap-${page}`} className="px-2 text-gray-600 font-bold select-none">...</span>
                );
              }
              return null;
            }

            return (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={`w-10 h-10 rounded-xl font-bold text-sm transition-all active:scale-90 ${
                  currentPage === page 
                  ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20 scale-110' 
                  : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                {page}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:hover:bg-white/5 disabled:cursor-not-allowed transition-all active:scale-95"
          aria-label="Próxima Página"
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}
