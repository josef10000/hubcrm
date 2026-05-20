import { describe, it, expect } from 'vitest';
import { NexusBook, DEFAULT_BOOK_CATEGORIES } from '@store/useNexusStore';

/**
 * Testes unitários para lógicas puras do Nexus Store
 * Testam funções de manipulação de livros, categorias e progresso de leitura
 */

// ===== FUNÇÕES EXTRAÍDAS PARA TESTES PUROS =====

const updateBookCategoryLogic = (
  bookCategories: string[],
  books: NexusBook[],
  oldCategory: string,
  newCategory: string
) => {
  const newList = bookCategories.map(c => c === oldCategory ? newCategory : c);
  const newBooks = books.map(b => b.category === oldCategory ? { ...b, category: newCategory } : b);
  return { bookCategories: newList, books: newBooks };
};

const deleteBookCategoryLogic = (
  bookCategories: string[],
  books: NexusBook[],
  category: string
) => {
  const newList = bookCategories.filter(c => c !== category);
  const newBooks = books.map(b => b.category === category ? { ...b, category: 'Outros' } : b);
  return { bookCategories: newList, books: newBooks };
};

const calculateReadingProgressUpdates = (
  book: NexusBook,
  newPage: number
): Partial<NexusBook> => {
  const updates: Partial<NexusBook> = { currentPage: newPage };

  if (book.totalPages && newPage >= book.totalPages) {
    updates.status = 'finished';
  } else if (newPage > 0) {
    updates.status = 'reading';
  } else {
    updates.status = undefined;
  }

  return updates;
};

// ===== DADOS DE TESTE =====

const mockBooks: NexusBook[] = [
  { id: '1', title: 'Dune', author: 'Frank Herbert', category: 'Ficção Científica', addedAt: Date.now(), totalPages: 412 },
  { id: '2', title: 'O Senhor dos Anéis', author: 'Tolkien', category: 'Fantasia', addedAt: Date.now(), totalPages: 1000 },
  { id: '3', title: 'It', author: 'Stephen King', category: 'Terror', addedAt: Date.now(), totalPages: 1138 },
  { id: '4', title: 'Neuromancer', author: 'William Gibson', category: 'Ficção Científica', addedAt: Date.now(), totalPages: 271 },
];

// ===== TESTES =====

describe('Nexus Store — Lógicas Puras', () => {

  describe('updateBookCategory', () => {
    it('deve renomear a categoria na lista', () => {
      const result = updateBookCategoryLogic(
        DEFAULT_BOOK_CATEGORIES,
        mockBooks,
        'Ficção Científica',
        'Sci-Fi'
      );
      expect(result.bookCategories).toContain('Sci-Fi');
      expect(result.bookCategories).not.toContain('Ficção Científica');
    });

    it('deve atualizar todos os livros da categoria renomeada', () => {
      const result = updateBookCategoryLogic(
        DEFAULT_BOOK_CATEGORIES,
        mockBooks,
        'Ficção Científica',
        'Sci-Fi'
      );
      const sciFiBooks = result.books.filter(b => b.category === 'Sci-Fi');
      expect(sciFiBooks).toHaveLength(2); // Dune + Neuromancer
      expect(sciFiBooks.map(b => b.title)).toContain('Dune');
      expect(sciFiBooks.map(b => b.title)).toContain('Neuromancer');
    });

    it('não deve alterar livros de outras categorias', () => {
      const result = updateBookCategoryLogic(
        DEFAULT_BOOK_CATEGORIES,
        mockBooks,
        'Ficção Científica',
        'Sci-Fi'
      );
      const fantasyBooks = result.books.filter(b => b.category === 'Fantasia');
      expect(fantasyBooks).toHaveLength(1);
      expect(fantasyBooks[0].title).toBe('O Senhor dos Anéis');
    });

    it('deve manter o total de categorias igual', () => {
      const result = updateBookCategoryLogic(
        DEFAULT_BOOK_CATEGORIES,
        mockBooks,
        'Terror',
        'Horror'
      );
      expect(result.bookCategories.length).toBe(DEFAULT_BOOK_CATEGORIES.length);
    });
  });

  describe('deleteBookCategory', () => {
    it('deve remover a categoria da lista', () => {
      const result = deleteBookCategoryLogic(
        DEFAULT_BOOK_CATEGORIES,
        mockBooks,
        'Terror'
      );
      expect(result.bookCategories).not.toContain('Terror');
      expect(result.bookCategories.length).toBe(DEFAULT_BOOK_CATEGORIES.length - 1);
    });

    it('deve mover livros da categoria deletada para "Outros"', () => {
      const result = deleteBookCategoryLogic(
        DEFAULT_BOOK_CATEGORIES,
        mockBooks,
        'Terror'
      );
      const itBook = result.books.find(b => b.title === 'It');
      expect(itBook?.category).toBe('Outros');
    });

    it('não deve alterar livros de outras categorias', () => {
      const result = deleteBookCategoryLogic(
        DEFAULT_BOOK_CATEGORIES,
        mockBooks,
        'Terror'
      );
      const dune = result.books.find(b => b.title === 'Dune');
      expect(dune?.category).toBe('Ficção Científica');
    });

    it('deve funcionar quando categoria não tem livros', () => {
      const result = deleteBookCategoryLogic(
        DEFAULT_BOOK_CATEGORIES,
        mockBooks,
        'Filosofia'
      );
      expect(result.bookCategories).not.toContain('Filosofia');
      // Nenhum livro deve mudar
      expect(result.books).toEqual(mockBooks);
    });
  });

  describe('calculateReadingProgressUpdates', () => {
    const book: NexusBook = { id: '1', title: 'Dune', addedAt: Date.now(), totalPages: 412 };

    it('deve marcar como "finished" quando page >= totalPages', () => {
      const updates = calculateReadingProgressUpdates(book, 412);
      expect(updates.status).toBe('finished');
      expect(updates.currentPage).toBe(412);
    });

    it('deve marcar como "finished" quando page > totalPages', () => {
      const updates = calculateReadingProgressUpdates(book, 500);
      expect(updates.status).toBe('finished');
    });

    it('deve marcar como "reading" quando 0 < page < totalPages', () => {
      const updates = calculateReadingProgressUpdates(book, 100);
      expect(updates.status).toBe('reading');
      expect(updates.currentPage).toBe(100);
    });

    it('deve retornar status undefined quando page é 0', () => {
      const updates = calculateReadingProgressUpdates(book, 0);
      expect(updates.status).toBeUndefined();
      expect(updates.currentPage).toBe(0);
    });

    it('deve marcar como "reading" quando livro não tem totalPages', () => {
      const bookNoTotal: NexusBook = { id: '2', title: 'Book', addedAt: Date.now() };
      const updates = calculateReadingProgressUpdates(bookNoTotal, 50);
      expect(updates.status).toBe('reading');
    });
  });
});
