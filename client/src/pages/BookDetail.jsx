import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiGet, apiPost, getCoverUrl } from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { 
  Heart, Download, Star, Calendar, MessageSquare, 
  MapPin, BookOpen, Layers, User, Award, ArrowLeft
} from 'lucide-react';

const BookDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();

  const [book, setBook] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Interactive state
  const [inWishlist, setInWishlist] = useState(false);
  const [reserving, setReserving] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [borrowStatus, setBorrowStatus] = useState(null);
  const [borrowRequestLoading, setBorrowRequestLoading] = useState(false);

  // Review submission state
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const fetchBookDetails = async () => {
    try {
      const data = await apiGet(`/books/${id}`);
      setBook(data.book);
      setReviews(data.reviews);

      // If user is student or teacher, check if book is in wishlist
      if (user && (user.role === 'student' || user.role === 'teacher')) {
        const wishlist = await apiGet('/wishlist');
        const isSaved = wishlist.some((item) => item.id === data.book.id);
        setInWishlist(isSaved);

        // Fetch borrows history to check borrow/request status of this book
        const history = await apiGet('/borrows/history');
        const record = history.find(b => b.book_id === data.book.id && ['pending_borrow', 'borrowed', 'overdue', 'pending_renewal', 'pending_return'].includes(b.status));
        setBorrowStatus(record ? record.status : null);
      }
    } catch (err) {
      addToast(err.message || 'Failed to load book details', 'error');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookDetails();
  }, [id, user]);

  const handleWishlistToggle = async () => {
    if (wishlistLoading) return;
    setWishlistLoading(true);
    try {
      const res = await apiPost('/wishlist/toggle', { bookId: book.id });
      setInWishlist(res.inWishlist);
      addToast(res.message, 'success');
    } catch (err) {
      addToast(err.message || 'Wishlist update failed', 'error');
    } finally {
      setWishlistLoading(false);
    }
  };

  const handleReserve = async () => {
    setReserving(true);
    try {
      const res = await apiPost('/reservations/reserve', { bookId: book.id });
      addToast(res.message, 'success');
      // Refresh details to sync reservations if any
      fetchBookDetails();
    } catch (err) {
      addToast(err.message || 'Reservation failed', 'error');
    } finally {
      setReserving(false);
    }
  };

  const handleRequestBorrow = async () => {
    setBorrowRequestLoading(true);
    try {
      const res = await apiPost('/borrows/request-borrow', { bookId: book.id });
      addToast(res.message, 'success');
      fetchBookDetails();
    } catch (err) {
      addToast(err.message || 'Borrow request failed', 'error');
    } finally {
      setBorrowRequestLoading(false);
    }
  };

  const handleDownloadEbook = async () => {
    try {
      const isSupabaseEnabled = !!import.meta.env.VITE_SUPABASE_URL;

      if (isSupabaseEnabled) {
        if (!book.ebook_path) throw new Error('E-book is missing.');
        const a = document.createElement('a');
        a.href = book.ebook_path;
        a.target = '_blank';
        a.download = `${book.title.replace(/\s+/g, '_')}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        addToast('E-book download started', 'success');
        return;
      }

      const token = localStorage.getItem('lib_token');
      // Fetch PDF as Blob to bypass browser standard link download hurdles
      const res = await fetch(`http://localhost:5000/api/books/${book.id}/ebook/download`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        throw new Error('E-book file download failed');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${book.title.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      addToast('E-book downloaded successfully', 'success');
    } catch (err) {
      addToast(err.message || 'Download failed. E-book might be missing.', 'error');
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (rating < 1 || rating > 5) return;

    setSubmittingReview(true);
    try {
      const res = await apiPost(`/books/${book.id}/review`, { rating, comment });
      addToast(res.message, 'success');
      setComment('');
      fetchBookDetails(); // Reload reviews list
    } catch (err) {
      addToast(err.message || 'Failed to submit review', 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const isAvailable = book.available_copies > 0;
  const coverUrl = getCoverUrl(book.cover_image);

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Catalog
      </button>

      {/* Main Details Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 md:p-8 shadow-xl flex flex-col md:flex-row gap-8">
        
        {/* Cover image area */}
        <div className="w-full md:w-1/3 shrink-0">
          <div className="aspect-[4/5] bg-slate-100 dark:bg-slate-950 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-850 shadow-inner flex items-center justify-center">
            <img
              src={coverUrl}
              alt={book.title}
              onError={(e) => {
                e.target.src = getCoverUrl(null);
              }}
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Book properties details */}
        <div className="flex-1 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start gap-4">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-primary-100 dark:bg-primary-950/50 text-primary-800 dark:text-primary-400">
                {book.category_name || 'General Category'}
              </span>
              
              {/* Wishlist toggle for students/teachers */}
              {user && (user.role === 'student' || user.role === 'teacher') && (
                <button
                  onClick={handleWishlistToggle}
                  disabled={wishlistLoading}
                  className={`p-2.5 rounded-full border transition-all ${
                    inWishlist 
                      ? 'bg-rose-50 border-rose-200 text-rose-500 dark:bg-rose-950/20 dark:border-rose-900/50' 
                      : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800 text-slate-400'
                  }`}
                  title={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
                >
                  <Heart size={18} fill={inWishlist ? 'currentColor' : 'none'} />
                </button>
              )}
            </div>

            <h1 className="text-3xl font-extrabold text-slate-850 dark:text-white mt-3 leading-tight">
              {book.title}
            </h1>
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 mt-1 flex items-center gap-1.5">
              <User size={16} />
              by {book.author_name || 'Unknown Author'}
            </p>

            <div className="grid grid-cols-2 gap-4 mt-6 p-4 bg-slate-50 dark:bg-slate-800/20 rounded-xl border border-slate-100 dark:border-slate-800/50">
              <div className="text-xs">
                <span className="text-slate-400 block mb-0.5">ISBN</span>
                <span className="font-bold text-slate-700 dark:text-slate-200">{book.isbn}</span>
              </div>
              <div className="text-xs">
                <span className="text-slate-400 block mb-0.5">Publication Year</span>
                <span className="font-bold text-slate-700 dark:text-slate-200">{book.publication_year || 'N/A'}</span>
              </div>
              <div className="text-xs">
                <span className="text-slate-400 block mb-0.5">Library Location</span>
                <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                  <MapPin size={12} className="text-rose-500" />
                  {book.location || 'Shelf Stock'}
                </span>
              </div>
              <div className="text-xs">
                <span className="text-slate-400 block mb-0.5">Available Copies</span>
                <span className={`font-bold ${isAvailable ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {book.available_copies} / {book.total_copies} available
                </span>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Description</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                {book.description || 'No summary description has been added for this library catalog item.'}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap gap-4">
            {/* E-book download */}
            {book.ebook_path && (
              <button
                onClick={handleDownloadEbook}
                className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 shadow-lg shadow-primary-500/20 transition-all"
              >
                <Download size={16} />
                Download E-Book (PDF)
              </button>
            )}

            {/* Reserve Book (if copies == 0 and user is student/teacher) */}
            {user && (user.role === 'student' || user.role === 'teacher') && !isAvailable && (
              <button
                onClick={handleReserve}
                disabled={reserving}
                className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 shadow-lg shadow-amber-500/20 disabled:opacity-50 transition-all"
              >
                <Calendar size={16} />
                {reserving ? 'Reserving...' : 'Reserve Online (Join Waitlist)'}
              </button>
            )}

            {/* Teacher Online Borrow Actions */}
            {user && user.role === 'teacher' && isAvailable && (
              <>
                {borrowStatus === 'pending_borrow' && (
                  <button
                    disabled
                    className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700 cursor-not-allowed transition-all"
                  >
                    <div className="w-4 h-4 border-2 border-slate-500 border-t-transparent rounded-full animate-spin"></div>
                    <span>Pending Borrow Approval</span>
                  </button>
                )}
                {['borrowed', 'overdue', 'pending_renewal', 'pending_return'].includes(borrowStatus) && (
                  <button
                    disabled
                    className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-750 cursor-not-allowed transition-all"
                  >
                    <span>Already Checked Out</span>
                  </button>
                )}
                {!borrowStatus && (
                  <button
                    onClick={handleRequestBorrow}
                    disabled={borrowRequestLoading}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 shadow-lg shadow-primary-500/20 disabled:opacity-50 transition-all"
                  >
                    {borrowRequestLoading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <Layers size={16} />
                        <span>Request to Borrow Online</span>
                      </>
                    )}
                  </button>
                )}
              </>
            )}

            {/* Availability Indicator for non-Teacher roles */}
            {isAvailable && (!user || user.role !== 'teacher') && (
              <div className="text-xs font-semibold px-4 py-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50 rounded-xl flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></div>
                <span>In Stock: Ask librarian at desk to check out this book</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reviews & Ratings Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Review Form (Student/Teacher only) */}
        {user && (user.role === 'student' || user.role === 'teacher') && (
          <div className="md:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 shadow-lg h-fit">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <MessageSquare size={18} className="text-primary-500" />
              Write a Review
            </h3>
            
            <form className="mt-4 space-y-4" onSubmit={handleReviewSubmit}>
              {/* Rating selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Overall Rating
                </label>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className={`text-2xl transition-colors ${
                        star <= rating ? 'text-amber-400' : 'text-slate-300 dark:text-slate-700'
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              {/* Comment text */}
              <div>
                <label htmlFor="comment" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Review Comment
                </label>
                <textarea
                  id="comment"
                  rows={4}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share your thoughts on this book..."
                  required
                  className="w-full p-3 text-sm rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 outline-none focus:border-primary-500 focus:bg-white text-slate-800 dark:text-slate-100 transition"
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={submittingReview}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-50 transition"
              >
                {submittingReview ? 'Submitting...' : 'Submit Review'}
              </button>
            </form>
          </div>
        )}

        {/* Reviews List */}
        <div className={`md:col-span-2 space-y-4 ${user && (user.role === 'student' || user.role === 'teacher') ? '' : 'md:col-span-3'}`}>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 shadow-lg">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-4">
              <Star size={18} className="text-amber-400" />
              User Reviews ({reviews.length})
            </h3>

            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {reviews.length === 0 ? (
                <div className="text-center py-12 text-slate-400 dark:text-slate-500 text-sm">
                  No reviews submitted yet for this book.
                </div>
              ) : (
                reviews.map((rev) => (
                  <div key={rev.id} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-sm text-slate-700 dark:text-slate-200">
                        {rev.user_name}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(rev.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    
                    {/* Stars */}
                    <div className="flex gap-0.5 mt-1 text-amber-400 text-sm">
                      {Array.from({ length: 5 }).map((_, idx) => (
                        <span key={idx}>{idx < rev.rating ? '★' : '☆'}</span>
                      ))}
                    </div>

                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                      {rev.comment}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookDetail;
