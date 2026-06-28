import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { apiGet, apiPost, getCoverUrl } from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Search, Filter, BookOpen, Layers, User, ChevronLeft, ChevronRight, Star, X, SlidersHorizontal } from 'lucide-react';

const Home = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();

  // Search filter states
  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [authors, setAuthors] = useState([]);
  const [loading, setLoading] = useState(true);

  // Feature 2: Ratings
  const [ratingsMap, setRatingsMap] = useState({}); // book_id -> { avg_rating, review_count }
  const [ratingModal, setRatingModal] = useState(null); // { bookId, bookTitle }
  const [ratingValue, setRatingValue] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const [returnedBookIds, setReturnedBookIds] = useState(new Set());

  // Feature 3: Advanced Client-side Filters
  const [advFiltersOpen, setAdvFiltersOpen] = useState(false);
  const [minYear, setMinYear] = useState('');
  const [maxYear, setMaxYear] = useState('');
  const [minRating, setMinRating] = useState(0);

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

  // Fetch avg ratings (Feature 2)
  useEffect(() => {
    const fetchRatings = async () => {
      try {
        const data = await apiGet('/catalog/ratings');
        const map = {};
        for (const r of (data || [])) map[r.book_id] = r;
        setRatingsMap(map);
      } catch { /* silent */ }
    };
    fetchRatings();
  }, []);

  // Fetch user's returned book IDs for rating eligibility (Feature 2)
  useEffect(() => {
    if (!user || user.role !== 'student') return;
    const fetchReturned = async () => {
      try {
        const history = await apiGet('/borrows/history');
        const ids = new Set(
          history.filter(b => b.status === 'returned').map(b => b.book_id)
        );
        setReturnedBookIds(ids);
      } catch { /* silent */ }
    };
    fetchReturned();
  }, [user]);

  const handleSubmitRating = async () => {
    if (!ratingModal) return;
    setSubmittingRating(true);
    try {
      await apiPost(`/books/${ratingModal.bookId}/review`, { rating: ratingValue, comment: ratingComment });
      addToast('Review submitted!', 'success');
      setRatingModal(null); setRatingComment(''); setRatingValue(5);
      // Refresh ratings
      const data = await apiGet('/catalog/ratings');
      const map = {};
      for (const r of (data || [])) map[r.book_id] = r;
      setRatingsMap(map);
    } catch (err) {
      addToast(err.message || 'Failed to submit review', 'error');
    } finally {
      setSubmittingRating(false);
    }
  };

  // Feature 3: Derive filtered books client-side
  const filteredBooks = books.filter(book => {
    if (minYear && book.publication_year && book.publication_year < parseInt(minYear)) return false;
    if (maxYear && book.publication_year && book.publication_year > parseInt(maxYear)) return false;
    if (minRating > 0) {
      const rating = ratingsMap[book.id]?.avg_rating || 0;
      if (rating < minRating) return false;
    }
    return true;
  });

  const hasAdvFilters = minYear || maxYear || minRating > 0;

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

  // Star rating render helper
  const renderStars = (avg, size = 14) => (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <Star
          key={n}
          size={size}
          className={n <= Math.round(avg) ? 'text-amber-400 fill-amber-400' : 'text-slate-300 dark:text-slate-700'}
        />
      ))}
    </span>
  );

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

        {/* Feature 3: Advanced Filters Toggle */}
        <button
          onClick={() => setAdvFiltersOpen(v => !v)}
          className={`flex items-center gap-1.5 ml-auto px-3 py-2 rounded-lg text-xs font-bold border transition-all ${
            advFiltersOpen || hasAdvFilters
              ? 'bg-primary-100 text-primary-700 border-primary-300 dark:bg-primary-950/40 dark:text-primary-400 dark:border-primary-900/50'
              : 'text-slate-500 border-slate-200 dark:border-slate-700 hover:border-primary-400 hover:text-primary-600'
          }`}
        >
          <SlidersHorizontal size={13} />
          Advanced Filters {hasAdvFilters ? '●' : ''}
        </button>
      </div>

      {/* Feature 3: Advanced Filter Panel */}
      {advFiltersOpen && (
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-primary-200 dark:border-primary-900/40 shadow-md flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Min Year</label>
            <input
              type="number" min="1900" max={new Date().getFullYear()}
              value={minYear} onChange={e => setMinYear(e.target.value)}
              placeholder="e.g. 2000"
              className="w-28 px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-300 outline-none focus:border-primary-500"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Max Year</label>
            <input
              type="number" min="1900" max={new Date().getFullYear()}
              value={maxYear} onChange={e => setMaxYear(e.target.value)}
              placeholder={String(new Date().getFullYear())}
              className="w-28 px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-300 outline-none focus:border-primary-500"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Min Rating</label>
            <select
              value={minRating} onChange={e => setMinRating(Number(e.target.value))}
              className="px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-300 outline-none focus:border-primary-500"
            >
              <option value={0}>Any Rating</option>
              {[1,2,3,4].map(n => <option key={n} value={n}>{n}+ Stars</option>)}
            </select>
          </div>
          {hasAdvFilters && (
            <button
              onClick={() => { setMinYear(''); setMaxYear(''); setMinRating(0); }}
              className="text-xs font-bold text-rose-500 hover:text-rose-600 px-2 py-2"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Book Grid */}
      {loading ? (
        <div className="min-h-[400px] flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredBooks.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl">
          <BookOpen size={48} className="mx-auto text-slate-300 dark:text-slate-700 mb-4" />
          <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">No books found</h3>
          <p className="text-sm text-slate-400 mt-1">Try modifying your search queries or filter attributes.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBooks.map((book) => {
            const hasEbook = !!book.ebook_path;
            const isAvailable = book.available_copies > 0;
            const coverUrl = getCoverUrl(book.cover_image);
            const bookRating = ratingsMap[book.id];
            const canRate = user?.role === 'student' && returnedBookIds.has(book.id);

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
                    {/* Feature 2: Show avg rating */}
                    {bookRating && (
                      <div className="flex items-center gap-1.5 mt-2">
                        {renderStars(bookRating.avg_rating)}
                        <span className="text-[10px] font-semibold text-slate-400">
                          {bookRating.avg_rating.toFixed(1)} ({bookRating.review_count})
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                      {book.available_copies} / {book.total_copies} copies left
                    </span>
                    <div className="flex gap-2">
                      {/* Feature 2: Rate button for eligible students */}
                      {canRate && (
                        <button
                          onClick={() => setRatingModal({ bookId: book.id, bookTitle: book.title })}
                          className="px-3 py-2 text-xs font-bold rounded-lg text-amber-700 bg-amber-50 hover:bg-amber-100 dark:text-amber-400 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 transition flex items-center gap-1"
                        >
                          <Star size={11} className="fill-amber-400 text-amber-400" />
                          Rate
                        </button>
                      )}
                      <button
                        onClick={() => navigate(`/books/${book.id}`)}
                        className="px-4 py-2 text-xs font-bold rounded-lg text-white bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700/80 transition-colors"
                      >
                        View Details
                      </button>
                    </div>
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

      {/* Feature 2: Rate Book Modal */}
      {ratingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-sm w-full p-6 relative">
            <button
              onClick={() => setRatingModal(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 dark:hover:text-white"
            >
              <X size={20} />
            </button>
            <h3 className="text-base font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 mb-4 flex items-center gap-2">
              <Star size={16} className="text-amber-400 fill-amber-400" />
              Rate: {ratingModal.bookTitle}
            </h3>

            {/* Star picker */}
            <div className="flex justify-center gap-2 mb-4">
              {[1,2,3,4,5].map(n => (
                <button
                  key={n}
                  onClick={() => setRatingValue(n)}
                  className="focus:outline-none transition-transform hover:scale-110"
                >
                  <Star
                    size={32}
                    className={n <= ratingValue ? 'text-amber-400 fill-amber-400' : 'text-slate-300 dark:text-slate-600'}
                  />
                </button>
              ))}
            </div>
            <p className="text-center text-xs font-semibold text-slate-400 mb-4">{ratingValue} / 5 stars</p>

            <textarea
              rows={3}
              value={ratingComment}
              onChange={e => setRatingComment(e.target.value)}
              placeholder="Write a short review (optional)..."
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 resize-none outline-none focus:border-primary-500 mb-4"
            />

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setRatingModal(null)}
                className="px-4 py-2 text-sm border rounded-xl text-slate-600 dark:text-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitRating}
                disabled={submittingRating}
                className="px-5 py-2 rounded-xl text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 shadow-md shadow-amber-500/20 disabled:opacity-50 flex items-center gap-2"
              >
                {submittingRating ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Star size={14} className="fill-white" />}
                Submit Review
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
