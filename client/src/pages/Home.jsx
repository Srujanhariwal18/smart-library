import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { apiGet, getCoverUrl } from '../utils/api.js';
import { Search, Filter, BookOpen, Layers, User, ChevronLeft, ChevronRight } from 'lucide-react';

const Home = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Search filter states
  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [authors, setAuthors] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pagination states
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 6,
    totalItems: 0,
    totalPages: 1
  });

  // Read URL search params
  const searchVal = searchParams.get('search') || '';
  const categoryVal = searchParams.get('category') || '';
  const authorVal = searchParams.get('author') || '';
  const statusVal = searchParams.get('status') || '';
  const pageVal = parseInt(searchParams.get('page')) || 1;

  useEffect(() => {
    // Fetch metadata (categories/authors) on load
    const fetchMetadata = async () => {
      try {
        const data = await apiGet('/books/meta');
        setCategories(data.categories);
        setAuthors(data.authors);
      } catch (err) {
        console.error('Failed to load categories/authors:', err.message);
      }
    };
    fetchMetadata();
  }, []);

  useEffect(() => {
    // Fetch catalog books matching parameters
    const fetchBooks = async () => {
      setLoading(true);
      try {
        const query = new URLSearchParams();
        if (searchVal) query.append('search', searchVal);
        if (categoryVal) query.append('category', categoryVal);
        if (authorVal) query.append('author', authorVal);
        if (statusVal) query.append('status', statusVal);
        query.append('page', pageVal.toString());
        query.append('limit', '6'); // 6 books per page

        const data = await apiGet(`/books?${query.toString()}`);
        setBooks(data.books);
        setPagination(data.pagination);
      } catch (err) {
        console.error('Failed to load books:', err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchBooks();
  }, [searchVal, categoryVal, authorVal, statusVal, pageVal]);

  const updateFilters = (key, value) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    newParams.set('page', '1'); // reset page to 1
    setSearchParams(newParams);
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    const newParams = new URLSearchParams(searchParams);
    newParams.set('page', newPage.toString());
    setSearchParams(newParams);
  };

  return (
    <div className="space-y-6">
      
      {/* Title section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-800 dark:text-white">
            Library Catalog
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Browse and search academic references, literature novels, study guides and digital publications.
          </p>
        </div>
      </div>

      {/* Filter panel */}
      <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 shadow-md flex flex-wrap gap-4 items-center">
        
        {/* Category filter */}
        <div className="flex items-center gap-2">
          <Layers size={16} className="text-slate-400" />
          <select
            value={categoryVal}
            onChange={(e) => updateFilters('category', e.target.value)}
            className="px-3 py-2 rounded-lg text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:border-primary-500 transition text-slate-700 dark:text-slate-300"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Author filter */}
        <div className="flex items-center gap-2">
          <User size={16} className="text-slate-400" />
          <select
            value={authorVal}
            onChange={(e) => updateFilters('author', e.target.value)}
            className="px-3 py-2 rounded-lg text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:border-primary-500 transition text-slate-700 dark:text-slate-300"
          >
            <option value="">All Authors</option>
            {authors.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-2">
          <BookOpen size={16} className="text-slate-400" />
          <select
            value={statusVal}
            onChange={(e) => updateFilters('status', e.target.value)}
            className="px-3 py-2 rounded-lg text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:border-primary-500 transition text-slate-700 dark:text-slate-300"
          >
            <option value="">All Availability</option>
            <option value="available">Available Now</option>
            <option value="unavailable">Reserved / Checked Out</option>
          </select>
        </div>

        {/* Clear Filters helper */}
        {(searchVal || categoryVal || authorVal || statusVal) && (
          <button
            onClick={() => setSearchParams(new URLSearchParams())}
            className="text-xs font-bold text-rose-500 hover:text-rose-600 hover:underline px-2 py-1 ml-auto"
          >
            Clear All Filters
          </button>
        )}
      </div>

      {/* Book Grid */}
      {loading ? (
        <div className="min-h-[400px] flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : books.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl">
          <BookOpen size={48} className="mx-auto text-slate-300 dark:text-slate-700 mb-4" />
          <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">No books found</h3>
          <p className="text-sm text-slate-400 mt-1">Try modifying your search queries or filter attributes.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {books.map((book) => {
            const hasEbook = !!book.ebook_path;
            const isAvailable = book.available_copies > 0;
            const coverUrl = getCoverUrl(book.cover_image);

            return (
              <div
                key={book.id}
                className="flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 overflow-hidden hover:shadow-xl dark:hover:shadow-black/20 hover:-translate-y-0.5 transition-all duration-300 group"
              >
                {/* Image & Badges */}
                <div className="relative aspect-[4/5] w-full bg-slate-100 dark:bg-slate-950 overflow-hidden flex items-center justify-center">
                  <img
                    src={coverUrl}
                    alt={book.title}
                    onError={(e) => {
                      e.target.src = getCoverUrl(null);
                    }}
                    className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                    {/* Availability indicator */}
                    {isAvailable ? (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/90 text-white shadow-sm">
                        Available
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/90 text-white shadow-sm">
                        Reserved Only
                      </span>
                    )}

                    {/* PDF E-book badge */}
                    {hasEbook && (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/90 text-white shadow-sm">
                        E-BOOK PDF
                      </span>
                    )}
                  </div>
                  <div className="absolute bottom-3 right-3 bg-slate-900/80 backdrop-blur-sm text-white px-2 py-1 rounded text-[10px] font-bold tracking-wider">
                    {book.location || 'Library Stock'}
                  </div>
                </div>

                {/* Info */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase text-primary-500 dark:text-primary-400 tracking-wider">
                      {book.category_name || 'General Category'}
                    </span>
                    <h3 className="font-bold text-slate-850 dark:text-white mt-1 line-clamp-1 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                      {book.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                      by {book.author_name || 'Unknown Author'}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                      {book.description || 'No description available for this catalog entry.'}
                    </p>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                      {book.available_copies} / {book.total_copies} copies left
                    </span>
                    <button
                      onClick={() => navigate(`/books/${book.id}`)}
                      className="px-4 py-2 text-xs font-bold rounded-lg text-white bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700/80 transition-colors"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Footer */}
      {!loading && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8 pt-4 border-t border-slate-200 dark:border-slate-800/50">
          <button
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={pagination.page === 1}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 disabled:opacity-50 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
          >
            <ChevronLeft size={16} />
          </button>
          
          <span className="text-sm font-semibold text-slate-600 dark:text-slate-400 px-4">
            Page {pagination.page} of {pagination.totalPages}
          </span>

          <button
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page === pagination.totalPages}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 disabled:opacity-50 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default Home;
