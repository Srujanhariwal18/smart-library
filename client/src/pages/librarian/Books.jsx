import React, { useState, useEffect } from 'react';
import { apiGet, apiDelete, apiUpload, apiPost, getCoverUrl } from '../../utils/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import { 
  FolderOpen, Plus, Edit3, Trash2, FileText, UploadCloud, 
  X, Check, ChevronLeft, ChevronRight, BookOpen, Search
} from 'lucide-react';

const LibrarianBooks = () => {
  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [authors, setAuthors] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  // Search/Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1 });

  // Modal states
  const [showBookModal, setShowBookModal] = useState(false);
  const [showEbookModal, setShowEbookModal] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);

  // Form states (Book)
  const [title, setTitle] = useState('');
  const [isbn, setIsbn] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [authorId, setAuthorId] = useState('');
  const [publicationYear, setPublicationYear] = useState('');
  const [description, setDescription] = useState('');
  const [totalCopies, setTotalCopies] = useState(1);
  const [location, setLocation] = useState('');
  const [coverFile, setCoverFile] = useState(null);

  // Form states (Ebook)
  const [pdfFile, setPdfFile] = useState(null);

  const fetchBooks = async () => {
    setLoading(true);
    try {
      const data = await apiGet(`/books?search=${encodeURIComponent(searchTerm)}&page=${page}&limit=6`);
      setBooks(data.books);
      setPagination(data.pagination);
    } catch (err) {
      addToast(err.message || 'Failed to load books', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      const data = await apiGet('/books/meta');
      setCategories(data.categories);
      setAuthors(data.authors);
    } catch (err) {
      console.error(err.message);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, [page, searchTerm]);

  useEffect(() => {
    fetchMetadata();
  }, []);

  const handleOpenAddModal = () => {
    setSelectedBook(null);
    setTitle('');
    setIsbn('');
    setCategoryId('');
    setAuthorId('');
    setPublicationYear('');
    setDescription('');
    setTotalCopies(1);
    setLocation('');
    setCoverFile(null);
    setShowBookModal(true);
  };

  const handleOpenEditModal = (book) => {
    setSelectedBook(book);
    setTitle(book.title);
    setIsbn(book.isbn);
    setCategoryId(book.category_id || '');
    setAuthorId(book.author_id || '');
    setPublicationYear(book.publication_year || '');
    setDescription(book.description || '');
    setTotalCopies(book.total_copies);
    setLocation(book.location || '');
    setCoverFile(null);
    setShowBookModal(true);
  };

  const handleOpenEbookModal = (book) => {
    setSelectedBook(book);
    setPdfFile(null);
    setShowEbookModal(true);
  };

  const handleDelete = async (bookId) => {
    if (!window.confirm('Are you sure you want to delete this book? This will clear all borrow records, wishlist items, and reviews for it.')) return;
    try {
      await apiDelete(`/books/${bookId}`);
      addToast('Book deleted successfully', 'success');
      fetchBooks();
    } catch (err) {
      addToast(err.message || 'Deletion failed', 'error');
    }
  };

  const handleBookSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('title', title);
    formData.append('isbn', isbn);
    formData.append('category_id', categoryId);
    formData.append('author_id', authorId);
    formData.append('publication_year', publicationYear);
    formData.append('description', description);
    formData.append('total_copies', totalCopies.toString());
    formData.append('location', location);
    if (coverFile) {
      formData.append('cover', coverFile);
    }

    try {
      if (selectedBook) {
        // Edit Book
        await apiUpload(`/books/${selectedBook.id}`, formData, 'PUT');
        addToast('Book updated successfully', 'success');
      } else {
        // Add Book
        await apiUpload('/books', formData, 'POST');
        addToast('Book added successfully', 'success');
      }
      setShowBookModal(false);
      fetchBooks();
    } catch (err) {
      addToast(err.message || 'Saving book details failed', 'error');
    }
  };

  const handleEbookSubmit = async (e) => {
    e.preventDefault();
    if (!pdfFile) return;

    const formData = new FormData();
    formData.append('pdf', pdfFile);

    try {
      await apiUpload(`/books/${selectedBook.id}/ebook`, formData, 'POST');
      addToast('E-book PDF uploaded successfully', 'success');
      setShowEbookModal(false);
      fetchBooks();
    } catch (err) {
      addToast(err.message || 'E-book upload failed', 'error');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
            <FolderOpen className="text-primary-500" />
            Book Inventory Manager
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Catalog new additions, edit publications details, upload PDFs, and check stock count.
          </p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 shadow-lg shadow-primary-500/20 self-start transition-all"
        >
          <Plus size={18} />
          Add New Book
        </button>
      </div>

      {/* Search Filter bar */}
      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl flex items-center gap-4 shadow-sm">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search by title or ISBN..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2.5 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-primary-500 outline-none text-slate-750 dark:text-slate-200"
          />
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="min-h-[300px] flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : books.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
          <BookOpen size={48} className="mx-auto text-slate-350 dark:text-slate-700 mb-4" />
          <h3 className="text-lg font-bold text-slate-700 dark:text-slate-350">No catalog books</h3>
          <p className="text-sm text-slate-400 mt-1">Get started by clicking the "Add New Book" button.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {books.map((book) => {
            const hasEbook = !!book.ebook_path;
            const coverUrl = getCoverUrl(book.cover_image);

            return (
              <div
                key={book.id}
                className="flex items-center gap-4 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-xl p-4 shadow hover:shadow-lg transition-all"
              >
                <img
                  src={coverUrl}
                  alt={book.title}
                  onError={(e) => {
                    e.target.src = getCoverUrl(null);
                  }}
                  className="w-16 h-20 object-cover rounded bg-slate-100 shrink-0"
                />

                <div className="min-w-0 flex-1 flex flex-col h-full justify-between">
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-white truncate">{book.title}</h3>
                    <p className="text-xs text-slate-500 truncate">ISBN: {book.isbn}</p>
                    <p className="text-xs text-slate-400 truncate mt-0.5">Location: {book.location || 'N/A'}</p>
                    <p className="text-xs text-primary-500 font-bold mt-1">
                      {book.available_copies} / {book.total_copies} Copies Available
                    </p>
                  </div>

                  <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-50 dark:border-slate-800/80">
                    <button
                      onClick={() => handleOpenEditModal(book)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      title="Edit Book Details"
                    >
                      <Edit3 size={15} />
                    </button>
                    
                    <button
                      onClick={() => handleOpenEbookModal(book)}
                      className={`p-1.5 rounded-lg transition ${
                        hasEbook 
                          ? 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/20' 
                          : 'text-slate-400 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                      title={hasEbook ? 'Update PDF E-book' : 'Upload PDF E-book'}
                    >
                      <FileText size={15} />
                    </button>

                    <button
                      onClick={() => handleDelete(book.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      title="Delete Book"
                    >
                      <Trash2 size={15} />
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
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 disabled:opacity-50 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
          >
            <ChevronLeft size={16} />
          </button>
          
          <span className="text-sm font-semibold text-slate-600 dark:text-slate-400 px-4">
            Page {page} of {pagination.totalPages}
          </span>

          <button
            onClick={() => setPage(page + 1)}
            disabled={page === pagination.totalPages}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 disabled:opacity-50 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Modal: Add/Edit Book */}
      {showBookModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-xl w-full p-6 relative max-h-[90vh] overflow-y-auto animate-toast">
            <button
              onClick={() => setShowBookModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X size={20} />
            </button>

            <h2 className="text-xl font-bold text-slate-800 dark:text-white border-b pb-3 mb-4">
              {selectedBook ? 'Edit Book Details' : 'Catalog New Book Addition'}
            </h2>

            <form onSubmit={handleBookSubmit} className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Book Title</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-150 outline-none focus:border-primary-500"
                    placeholder="E.g. A Brief History of Time"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">ISBN Number</label>
                  <input
                    type="text"
                    required
                    value={isbn}
                    onChange={(e) => setIsbn(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-150 outline-none focus:border-primary-500"
                    placeholder="9780553380163"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Publication Year</label>
                  <input
                    type="number"
                    value={publicationYear}
                    onChange={(e) => setPublicationYear(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-150 outline-none focus:border-primary-500"
                    placeholder="1998"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Category</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-150 outline-none focus:border-primary-500"
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Author</label>
                  <select
                    value={authorId}
                    onChange={(e) => setAuthorId(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-150 outline-none focus:border-primary-500"
                  >
                    <option value="">Select Author</option>
                    {authors.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Total Stock Count</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={totalCopies}
                    onChange={(e) => setTotalCopies(parseInt(e.target.value))}
                    className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-150 outline-none focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Shelf Location</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-150 outline-none focus:border-primary-500"
                    placeholder="E.g. Rack A-3"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Description / Summary</label>
                <textarea
                  rows="3"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-150 outline-none focus:border-primary-500"
                  placeholder="Enter book synopsis or summary details..."
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Book Cover Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setCoverFile(e.target.files[0])}
                  className="w-full text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowBookModal(false)}
                  className="px-4 py-2 border rounded-lg text-slate-650 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary-600 hover:bg-primary-700 rounded-lg text-white font-bold"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Upload E-book */}
      {showEbookModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 relative animate-toast">
            <button
              onClick={() => setShowEbookModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X size={20} />
            </button>

            <h2 className="text-xl font-bold text-slate-800 dark:text-white border-b pb-3 mb-4 flex items-center gap-2">
              <UploadCloud className="text-primary-500" />
              Upload PDF E-Book
            </h2>

            <p className="text-xs text-slate-500 mb-4">
              Attach a digital publication copy for <strong>"{selectedBook.title}"</strong>. Students will be able to download and view this study material online.
            </p>

            <form onSubmit={handleEbookSubmit} className="space-y-4">
              <div>
                <input
                  type="file"
                  accept="application/pdf"
                  required
                  onChange={(e) => setPdfFile(e.target.files[0])}
                  className="w-full text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowEbookModal(false)}
                  className="px-4 py-2 border rounded-lg text-slate-650 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!pdfFile}
                  className="px-5 py-2 bg-primary-600 hover:bg-primary-700 rounded-lg text-white font-bold disabled:opacity-50"
                >
                  Upload PDF
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LibrarianBooks;
