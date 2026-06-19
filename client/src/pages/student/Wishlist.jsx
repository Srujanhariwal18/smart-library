import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPost, getCoverUrl } from '../../utils/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import { Heart, Trash2, BookOpen, ArrowRight } from 'lucide-react';

const StudentWishlist = () => {
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();
  const navigate = useNavigate();

  const fetchWishlist = async () => {
    try {
      const data = await apiGet('/wishlist');
      setWishlist(data);
    } catch (err) {
      addToast(err.message || 'Failed to load wishlist', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWishlist();
  }, []);

  const handleRemove = async (e, bookId) => {
    e.stopPropagation(); // Avoid triggering card navigation
    try {
      const res = await apiPost('/wishlist/toggle', { bookId });
      addToast(res.message, 'success');
      fetchWishlist();
    } catch (err) {
      addToast(err.message || 'Failed to remove item', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
          <Heart className="text-rose-500" fill="currentColor" />
          My Saved Wishlist
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Your saved library catalog entries for quick access and tracking.
        </p>
      </div>

      {loading ? (
        <div className="min-h-[300px] flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : wishlist.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl">
          <Heart size={48} className="mx-auto text-slate-300 dark:text-slate-700 mb-4" />
          <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">Wishlist is empty</h3>
          <p className="text-sm text-slate-400 mt-1">Browse the catalog to add items to your wishlist.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {wishlist.map((book) => {
            const coverUrl = getCoverUrl(book.cover_image);

            return (
              <div
                key={book.id}
                onClick={() => navigate(`/books/${book.id}`)}
                className="flex items-center gap-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/60 dark:border-slate-800/85 p-4 hover:shadow-lg transition-all duration-300 cursor-pointer group"
              >
                <img
                  src={coverUrl}
                  alt={book.title}
                  onError={(e) => {
                    e.target.src = getCoverUrl(null);
                  }}
                  className="w-16 h-20 object-cover rounded bg-slate-100 shrink-0"
                />
                
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-extrabold uppercase text-primary-500">
                    {book.category_name}
                  </span>
                  <h3 className="font-bold text-slate-850 dark:text-white truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                    {book.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    by {book.author_name}
                  </p>

                  <div className="flex gap-4 mt-3">
                    <button
                      onClick={(e) => handleRemove(e, book.id)}
                      className="text-xs text-rose-500 hover:text-rose-600 font-semibold flex items-center gap-1"
                      title="Remove from wishlist"
                    >
                      <Trash2 size={12} />
                      Remove
                    </button>
                    
                    <span className="text-[10px] font-bold uppercase text-slate-400 ml-auto flex items-center gap-0.5 group-hover:text-slate-800 dark:group-hover:text-white transition-colors">
                      View details
                      <ArrowRight size={10} />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StudentWishlist;
