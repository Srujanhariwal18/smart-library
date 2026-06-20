import { supabase } from './supabase.js';

const BASE_URL = 'http://localhost:5000/api';

// When Clerk is enabled, we use our own Express API (which talks to SQLite).
// When neither Clerk nor Supabase is configured, we also use Express API (mock mode).
// Only use the Supabase client layer when Supabase URL is set but Clerk is NOT set.
const isClerkEnabled = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const isSupabaseEnabled = !!import.meta.env.VITE_SUPABASE_URL && !isClerkEnabled;


let tokenResolver = () => localStorage.getItem('lib_token');
let currentUser = null;

export const setTokenResolver = (resolver) => {
  tokenResolver = resolver;
};

export const setCurrentUser = (user) => {
  currentUser = user;
};

// Formats covers to either full Supabase storage links or gorgeous theme placeholders
export const getCoverUrl = (coverImage) => {
  if (!coverImage) return 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=400&q=80';
  if (coverImage.startsWith('http://') || coverImage.startsWith('https://')) {
    return coverImage;
  }
  if (coverImage.includes('brief_history')) {
    return 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=400&q=80';
  }
  if (coverImage.includes('1984')) {
    return 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=400&q=80';
  }
  if (coverImage.includes('sapiens')) {
    return 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=400&q=80';
  }
  if (coverImage.includes('wealth_nations')) {
    return 'https://images.unsplash.com/photo-1447069387593-a5de0862481e?auto=format&fit=crop&w=400&q=80';
  }
  if (coverImage.includes('harry_potter')) {
    return 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=400&q=80';
  }
  return 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=400&q=80';
};

const getHeaders = async (isMultipart = false) => {
  const token = await tokenResolver();
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (!isMultipart) {
    headers['Content-Type'] = 'application/json';
  }
  return headers;
};

const handleResponse = async (res) => {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && localStorage.getItem('lib_token')) {
      localStorage.removeItem('lib_token');
      localStorage.removeItem('lib_user');
      window.location.href = '/login';
    }
    const errorMsg = data.message || `HTTP error! status: ${res.status}`;
    throw new Error(errorMsg);
  }
  return data;
};

export const apiGet = async (endpoint) => {
  if (!isSupabaseEnabled) {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: await getHeaders()
    });
    return handleResponse(res);
  }

  try {
    if (endpoint === '/books/meta') {
      const { data: categories } = await supabase.from('categories').select('*').order('name');
      const { data: authors } = await supabase.from('authors').select('*').order('name');
      return { categories, authors };
    }

    if (endpoint.startsWith('/books/autocomplete')) {
      const query = new URLSearchParams(endpoint.split('?')[1]).get('query') || '';
      const { data: books } = await supabase.from('books').select('id, title').ilike('title', `%${query}%`).limit(5);
      const { data: authors } = await supabase.from('authors').select('id, name').ilike('name', `%${query}%`).limit(5);
      return [
        ...(books || []).map(b => ({ id: b.id, title: b.title, type: 'book' })),
        ...(authors || []).map(a => ({ id: a.id, title: a.name, type: 'author' }))
      ];
    }

    if (endpoint.startsWith('/books/')) {
      const parts = endpoint.split('/');
      const bookId = parseInt(parts[2]);
      
      const { data: book, error: bookErr } = await supabase
        .from('books')
        .select(`
          *,
          authors (name),
          categories (name),
          ebooks (file_path)
        `)
        .eq('id', bookId)
        .single();
        
      if (bookErr || !book) throw new Error('Book not found');

      const formattedBook = {
        ...book,
        author_name: book.authors?.name || null,
        category_name: book.categories?.name || null,
        ebook_path: book.ebooks?.file_path || null
      };

      const { data: reviews } = await supabase
        .from('reviews')
        .select(`
          *,
          users (name)
        `)
        .eq('book_id', bookId)
        .order('created_at', { ascending: false });

      const formattedReviews = (reviews || []).map(r => ({
        ...r,
        user_name: r.users?.name || 'Unknown Student'
      }));

      return { book: formattedBook, reviews: formattedReviews };
    }

    if (endpoint.startsWith('/books')) {
      const urlParams = new URLSearchParams(endpoint.split('?')[1] || '');
      const search = urlParams.get('search');
      const category = urlParams.get('category');
      const author = urlParams.get('author');
      const status = urlParams.get('status');
      const page = parseInt(urlParams.get('page') || '1');
      const limit = parseInt(urlParams.get('limit') || '6');
      const offset = (page - 1) * limit;

      let queryBuilder = supabase.from('books').select(`
        *,
        authors (name),
        categories (name),
        ebooks (file_path)
      `, { count: 'exact' });

      if (search) {
        queryBuilder = queryBuilder.or(`title.ilike.%${search}%,isbn.ilike.%${search}%`);
      }
      if (category) {
        queryBuilder = queryBuilder.eq('category_id', category);
      }
      if (author) {
        queryBuilder = queryBuilder.eq('author_id', author);
      }
      if (status === 'available') {
        queryBuilder = queryBuilder.gt('available_copies', 0);
      } else if (status === 'unavailable') {
        queryBuilder = queryBuilder.eq('available_copies', 0);
      }

      const { data: books, count } = await queryBuilder
        .order('title', { ascending: true })
        .range(offset, offset + limit - 1);

      const formattedBooks = (books || []).map(b => ({
        ...b,
        author_name: b.authors?.name || null,
        category_name: b.categories?.name || null,
        ebook_path: b.ebooks?.file_path || null
      }));

      return {
        books: formattedBooks,
        pagination: {
          page,
          limit,
          totalItems: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        }
      };
    }

    if (endpoint === '/wishlist') {
      if (!currentUser) return [];
      const { data: items } = await supabase.from('wishlists').select(`
        id,
        books (
          *,
          authors (name),
          categories (name)
        )
      `).eq('user_id', currentUser.id).order('id', { ascending: false });

      return (items || []).map(item => ({
        wishlist_id: item.id,
        ...item.books,
        author_name: item.books.authors?.name || null,
        category_name: item.books.categories?.name || null
      }));
    }

    if (endpoint === '/reservations') {
      if (!currentUser) return [];
      let query = supabase.from('reservations').select(`
        *,
        books (title, cover_image),
        users (name, email)
      `);
      if (currentUser.role === 'student' || currentUser.role === 'teacher') {
        query = query.eq('user_id', currentUser.id);
      }
      const { data: reservations } = await query.order('reservation_date', { ascending: false });
      return (reservations || []).map(r => ({
        ...r,
        title: r.books?.title || null,
        cover_image: r.books?.cover_image || null,
        user_name: r.users?.name || null,
        user_email: r.users?.email || null
      }));
    }

    if (endpoint === '/borrows/history') {
      if (!currentUser) return [];
      let query = supabase.from('borrows').select(`
        *,
        books (title, cover_image),
        users (name, email)
      `);
      if (currentUser.role === 'student' || currentUser.role === 'teacher') {
        query = query.eq('user_id', currentUser.id);
      }
      const { data: history } = await query.order('borrow_date', { ascending: false });
      return (history || []).map(b => ({
        ...b,
        title: b.books?.title || null,
        cover_image: b.books?.cover_image || null,
        user_name: b.users?.name || null,
        user_email: b.users?.email || null
      }));
    }

    if (endpoint === '/notifications') {
      if (!currentUser) return [];
      const { data: notifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })
        .limit(50);
      return notifications || [];
    }

    if (endpoint === '/admin/dashboard') {
      const { data: books } = await supabase.from('books').select('total_copies');
      const totalBooks = (books || []).reduce((sum, b) => sum + (b.total_copies || 0), 0);

      const { count: activeBorrows } = await supabase.from('borrows').select('*', { count: 'exact', head: true }).in('status', ['borrowed', 'overdue']);
      const { data: borrowsFines } = await supabase.from('borrows').select('fine_amount');
      const finesCollected = (borrowsFines || []).reduce((sum, b) => sum + (b.fine_amount || 0), 0);

      const { count: registeredUsers } = await supabase.from('users').select('*', { count: 'exact', head: true });

      // Charts: Borrows by Category
      const { data: categoryStats } = await supabase.from('borrows').select(`
        id,
        books (
          categories (name)
        )
      `);
      const catMap = {};
      for (const b of (categoryStats || [])) {
        const catName = b.books?.categories?.name || 'Uncategorized';
        catMap[catName] = (catMap[catName] || 0) + 1;
      }
      const categoriesList = Object.keys(catMap).map(k => ({ category: k, borrow_count: catMap[k] }));

      // Borrow Status Dist
      const { data: statusStats } = await supabase.from('borrows').select('status');
      const statusMap = {};
      for (const s of (statusStats || [])) {
        statusMap[s.status] = (statusMap[s.status] || 0) + 1;
      }
      const statusDistList = Object.keys(statusMap).map(k => ({ status: k, count: statusMap[k] }));

      // Popular books
      const { data: popularBooksRaw } = await supabase.from('borrows').select(`
        books (title)
      `);
      const popMap = {};
      for (const pb of (popularBooksRaw || [])) {
        if (pb.books?.title) {
          popMap[pb.books.title] = (popMap[pb.books.title] || 0) + 1;
        }
      }
      const popularBooksList = Object.keys(popMap)
        .map(k => ({ title: k, borrow_count: popMap[k] }))
        .sort((a,b) => b.borrow_count - a.borrow_count)
        .slice(0, 5);

      // Recent activities
      const { data: recentLogsRaw } = await supabase.from('user_activity_logs').select(`
        *,
        users (name, role)
      `).order('timestamp', { ascending: false }).limit(5);
      const recentLogs = (recentLogsRaw || []).map(l => ({
        ...l,
        user_name: l.users?.name || 'System',
        user_role: l.users?.role || null
      }));

      return {
        stats: {
          totalBooks,
          activeBorrows,
          finesCollected,
          registeredUsers
        },
        charts: {
          categories: categoriesList,
          statusDist: statusDistList,
          popularBooks: popularBooksList
        },
        recentLogs
      };
    }

    if (endpoint === '/admin/users') {
      const { data: users } = await supabase.from('users').select('*').order('name');
      return users || [];
    }

    if (endpoint.startsWith('/admin/reports/borrows')) {
      const urlParams = new URLSearchParams(endpoint.split('?')[1] || '');
      const startDate = urlParams.get('startDate');
      const endDate = urlParams.get('endDate');

      let query = supabase.from('borrows').select(`
        *,
        books (title, isbn),
        users (name, email)
      `);
      if (startDate) query = query.gte('borrow_date', `${startDate}T00:00:00Z`);
      if (endDate) query = query.lte('borrow_date', `${endDate}T23:59:59Z`);

      const { data: report } = await query.order('borrow_date', { ascending: false });
      return (report || []).map(r => ({
        ...r,
        title: r.books?.title || null,
        isbn: r.books?.isbn || null,
        user_name: r.users?.name || null,
        user_email: r.users?.email || null
      }));
    }

    if (endpoint.startsWith('/admin/reports/fines')) {
      const urlParams = new URLSearchParams(endpoint.split('?')[1] || '');
      const startDate = urlParams.get('startDate');
      const endDate = urlParams.get('endDate');

      let query = supabase.from('borrows').select(`
        *,
        books (title),
        users (name, email)
      `).gt('fine_amount', 0).eq('status', 'returned');

      if (startDate) query = query.gte('return_date', `${startDate}T00:00:00Z`);
      if (endDate) query = query.lte('return_date', `${endDate}T23:59:59Z`);

      const { data: report } = await query.order('return_date', { ascending: false });
      return (report || []).map(r => ({
        ...r,
        title: r.books?.title || null,
        user_name: r.users?.name || null,
        user_email: r.users?.email || null
      }));
    }

    if (endpoint === '/admin/logs') {
      const { data: logs } = await supabase.from('user_activity_logs').select(`
        *,
        users (name, email, role)
      `).order('timestamp', { ascending: false }).limit(100);

      return (logs || []).map(l => ({
        ...l,
        user_name: l.users?.name || 'System',
        user_email: l.users?.email || null,
        user_role: l.users?.role || null
      }));
    }

    throw new Error(`Endpoint GET ${endpoint} not simulated in Supabase layer.`);
  } catch (err) {
    console.error('Supabase Emulation GET Error:', err);
    throw err;
  }
};

export const apiPost = async (endpoint, body) => {
  if (!isSupabaseEnabled) {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify(body)
    });
    return handleResponse(res);
  }

  try {
    if (endpoint.startsWith('/books/') && endpoint.endsWith('/review')) {
      const parts = endpoint.split('/');
      const bookId = parseInt(parts[2]);
      const { rating, comment } = body;

      const { data: book } = await supabase.from('books').select('title').eq('id', bookId).single();
      const { data: existingReview } = await supabase.from('reviews').select('id').eq('user_id', currentUser.id).eq('book_id', bookId).maybeSingle();

      if (existingReview) {
        await supabase.from('reviews').update({ rating, comment, created_at: new Date().toISOString() }).eq('id', existingReview.id);
        await supabase.from('user_activity_logs').insert({
          user_id: currentUser.id,
          action: 'UPDATE_REVIEW',
          details: `Updated review for "${book.title}" (Rating: ${rating})`
        });
        return { message: 'Review updated successfully' };
      } else {
        await supabase.from('reviews').insert({ user_id: currentUser.id, book_id: bookId, rating, comment });
        await supabase.from('user_activity_logs').insert({
          user_id: currentUser.id,
          action: 'ADD_REVIEW',
          details: `Reviewed book "${book.title}" (Rating: ${rating})`
        });
        return { message: 'Review added successfully' };
      }
    }

    if (endpoint === '/wishlist/toggle') {
      const { bookId } = body;
      const { data: book } = await supabase.from('books').select('title').eq('id', bookId).single();
      const { data: existing } = await supabase.from('wishlists').select('id').eq('user_id', currentUser.id).eq('book_id', bookId).maybeSingle();

      if (existing) {
        await supabase.from('wishlists').delete().eq('id', existing.id);
        await supabase.from('user_activity_logs').insert({
          user_id: currentUser.id,
          action: 'REMOVE_WISHLIST',
          details: `Removed "${book.title}" from wishlist`
        });
        return { message: 'Removed from wishlist', inWishlist: false };
      } else {
        await supabase.from('wishlists').insert({ user_id: currentUser.id, book_id: bookId });
        await supabase.from('user_activity_logs').insert({
          user_id: currentUser.id,
          action: 'ADD_WISHLIST',
          details: `Added "${book.title}" to wishlist`
        });
        return { message: 'Added to wishlist', inWishlist: true };
      }
    }

    if (endpoint === '/reservations/reserve') {
      const { bookId } = body;
      const { data: book } = await supabase.from('books').select('title, available_copies').eq('id', bookId).single();
      if (book.available_copies > 0) {
        throw new Error('Book is currently available for borrowing, no reservation needed.');
      }
      const { data: existingRes } = await supabase.from('reservations').select('id').eq('user_id', currentUser.id).eq('book_id', bookId).eq('status', 'pending').maybeSingle();
      if (existingRes) {
        throw new Error('You already have a pending reservation for this book.');
      }
      const { data: existingBorrow } = await supabase.from('borrows').select('id').eq('user_id', currentUser.id).eq('book_id', bookId).eq('status', 'borrowed').maybeSingle();
      if (existingBorrow) {
        throw new Error('You currently have this book borrowed.');
      }

      const { count } = await supabase.from('reservations').select('*', { count: 'exact', head: true }).eq('book_id', bookId).eq('status', 'pending');
      const waitlist_position = (count || 0) + 1;

      await supabase.from('reservations').insert({
        user_id: currentUser.id,
        book_id: bookId,
        status: 'pending',
        waitlist_position
      });

      await supabase.from('notifications').insert({
        user_id: currentUser.id,
        message: `You have successfully reserved "${book.title}". Your waitlist position is ${waitlist_position}.`
      });

      await supabase.from('user_activity_logs').insert({
        user_id: currentUser.id,
        action: 'RESERVE_BOOK',
        details: `Reserved book "${book.title}" at queue position ${waitlist_position}`
      });

      return { message: 'Book reserved successfully', waitlist_position };
    }

    if (endpoint.startsWith('/reservations/cancel/')) {
      const parts = endpoint.split('/');
      const reservationId = parseInt(parts[3]);
      const { data: resDetail } = await supabase.from('reservations').select('*, books(title)').eq('id', reservationId).single();
      
      await supabase.from('reservations').update({ status: 'cancelled', waitlist_position: 0 }).eq('id', reservationId);
      
      const { data: others } = await supabase.from('reservations')
        .select('id, waitlist_position')
        .eq('book_id', resDetail.book_id)
        .eq('status', 'pending')
        .gt('waitlist_position', resDetail.waitlist_position);
        
      for (const other of (others || [])) {
        await supabase.from('reservations').update({ waitlist_position: other.waitlist_position - 1 }).eq('id', other.id);
      }

      await supabase.from('notifications').insert({
        user_id: resDetail.user_id,
        message: `Your reservation for "${resDetail.books?.title}" has been cancelled.`
      });

      await supabase.from('user_activity_logs').insert({
        user_id: currentUser.id,
        action: 'CANCEL_RESERVATION',
        details: `Cancelled reservation for "${resDetail.books?.title}"`
      });
      return { message: 'Reservation cancelled successfully' };
    }

    if (endpoint === '/borrows/issue') {
      const { email, bookId } = body;
      const { data: user } = await supabase.from('users').select('*').eq('email', email).maybeSingle();
      if (!user) throw new Error('User with this email not found');
      if (user.role !== 'student' && user.role !== 'teacher') throw new Error('Books can only be issued to students/teachers');
      if (user.status === 'suspended') throw new Error('Cannot issue books to a suspended user');

      const { data: book } = await supabase.from('books').select('*').eq('id', bookId).single();
      if (book.available_copies <= 0) throw new Error('No available copies of this book');

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 14);

      await supabase.from('borrows').insert({
        user_id: user.id,
        book_id: bookId,
        due_date: dueDate.toISOString(),
        status: 'borrowed',
        fine_amount: 0,
        renewal_count: 0
      });

      await supabase.from('books').update({ available_copies: book.available_copies - 1 }).eq('id', bookId);

      await supabase.from('notifications').insert({
        user_id: user.id,
        message: `Book "${book.title}" has been issued to you. Please return it by ${dueDate.toLocaleDateString()}.`
      });

      await supabase.from('user_activity_logs').insert({
        user_id: currentUser.id,
        action: 'ISSUE_BOOK',
        details: `Issued book "${book.title}" (ID: ${bookId}) to user (ID: ${user.id})`
      });

      return { message: 'Book issued successfully' };
    }

    if (endpoint.startsWith('/borrows/renew/')) {
      const parts = endpoint.split('/');
      const borrowId = parseInt(parts[3]);
      const { data: borrow } = await supabase.from('borrows').select('*, books(title)').eq('id', borrowId).single();
      
      const RENEWAL_LIMIT = 2;
      if (borrow.renewal_count >= RENEWAL_LIMIT) {
        throw new Error(`Renewal limit of ${RENEWAL_LIMIT} reached for this book.`);
      }

      const { count } = await supabase.from('reservations').select('*', { count: 'exact', head: true }).eq('book_id', borrow.book_id).eq('status', 'pending');
      if (count > 0) {
        throw new Error('This book has been reserved by another student and cannot be renewed.');
      }

      const newDueDate = new Date(borrow.due_date);
      newDueDate.setDate(newDueDate.getDate() + 14);

      await supabase.from('borrows').update({
        due_date: newDueDate.toISOString(),
        renewal_count: borrow.renewal_count + 1
      }).eq('id', borrowId);

      await supabase.from('notifications').insert({
        user_id: borrow.user_id,
        message: `Your borrow for "${borrow.books?.title}" has been renewed. New due date: ${newDueDate.toLocaleDateString()}.`
      });

      await supabase.from('user_activity_logs').insert({
        user_id: currentUser.id,
        action: 'RENEW_BOOK',
        details: `Renewed book "${borrow.books?.title}" (Borrow ID: ${borrowId})`
      });

      return { message: 'Book renewed successfully', newDueDate: newDueDate.toISOString() };
    }

    if (endpoint === '/borrows/request-borrow') {
      const { bookId } = body;
      const { data: book } = await supabase.from('books').select('*').eq('id', bookId).single();
      if (!book) throw new Error('Book not found');
      if (book.available_copies <= 0) throw new Error('No available copies of this book');

      // Check existing active or pending
      const { data: existing } = await supabase.from('borrows')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('book_id', bookId)
        .in('status', ['pending_borrow', 'borrowed', 'overdue', 'pending_return', 'pending_renewal'])
        .maybeSingle();

      if (existing) throw new Error('You already have an active checkout or pending request for this book.');

      await supabase.from('borrows').insert({
        user_id: currentUser.id,
        book_id: bookId,
        due_date: new Date().toISOString(), // placeholder
        status: 'pending_borrow',
        fine_amount: 0,
        renewal_count: 0
      });

      await supabase.from('notifications').insert({
        user_id: currentUser.id,
        message: `Your request to borrow "${book.title}" has been submitted for librarian approval.`
      });

      await supabase.from('user_activity_logs').insert({
        user_id: currentUser.id,
        action: 'REQUEST_BORROW',
        details: `Requested to borrow book "${book.title}" (ID: ${bookId})`
      });

      return { message: 'Borrow request submitted successfully' };
    }

    if (endpoint.startsWith('/borrows/request-renewal/')) {
      const parts = endpoint.split('/');
      const borrowId = parseInt(parts[3]);
      const { data: borrow } = await supabase.from('borrows').select('*, books(title)').eq('id', borrowId).single();
      if (!borrow) throw new Error('Active borrow record not found');

      if (borrow.renewal_count >= 2) {
        throw new Error('Renewal limit of 2 reached.');
      }

      await supabase.from('borrows').update({ status: 'pending_renewal' }).eq('id', borrowId);

      await supabase.from('notifications').insert({
        user_id: currentUser.id,
        message: `Your renewal request for "${borrow.books?.title}" has been submitted for librarian approval.`
      });

      await supabase.from('user_activity_logs').insert({
        user_id: currentUser.id,
        action: 'REQUEST_RENEWAL',
        details: `Requested renewal for book "${borrow.books?.title}" (Borrow ID: ${borrowId})`
      });

      return { message: 'Renewal request submitted successfully' };
    }

    if (endpoint.startsWith('/borrows/request-return/')) {
      const parts = endpoint.split('/');
      const borrowId = parseInt(parts[3]);
      const { data: borrow } = await supabase.from('borrows').select('*, books(title)').eq('id', borrowId).single();
      if (!borrow) throw new Error('Active borrow record not found');

      await supabase.from('borrows').update({ status: 'pending_return' }).eq('id', borrowId);

      await supabase.from('notifications').insert({
        user_id: currentUser.id,
        message: `Your return request for "${borrow.books?.title}" has been submitted for librarian verification.`
      });

      await supabase.from('user_activity_logs').insert({
        user_id: currentUser.id,
        action: 'REQUEST_RETURN',
        details: `Requested return for book "${borrow.books?.title}" (Borrow ID: ${borrowId})`
      });

      return { message: 'Return request submitted successfully' };
    }

    if (endpoint.startsWith('/borrows/approve/')) {
      const parts = endpoint.split('/');
      const borrowId = parseInt(parts[3]);
      const { data: borrow } = await supabase.from('borrows').select('*, books(*)').eq('id', borrowId).single();
      if (!borrow) throw new Error('Request record not found');

      if (borrow.status === 'pending_borrow') {
        if (borrow.books.available_copies <= 0) throw new Error('No copies available to issue');
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 14);

        await supabase.from('borrows').update({
          status: 'borrowed',
          borrow_date: new Date().toISOString(),
          due_date: dueDate.toISOString()
        }).eq('id', borrowId);

        await supabase.from('books').update({ available_copies: borrow.books.available_copies - 1 }).eq('id', borrow.book_id);

        await supabase.from('notifications').insert({
          user_id: borrow.user_id,
          message: `Your request to borrow "${borrow.books.title}" has been approved! Due date: ${dueDate.toLocaleDateString()}.`
        });

        await supabase.from('user_activity_logs').insert({
          user_id: currentUser.id,
          action: 'APPROVE_BORROW',
          details: `Approved borrow request for "${borrow.books.title}" (User ID: ${borrow.user_id})`
        });

        return { message: 'Borrow request approved successfully' };
      }

      if (borrow.status === 'pending_return') {
        const now = new Date();
        const dueDate = new Date(borrow.due_date);
        let fineAmount = 0.0;
        if (now > dueDate) {
          const diffTime = Math.abs(now - dueDate);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          fineAmount = diffDays * 5.0;
        }

        await supabase.from('borrows').update({
          status: 'returned',
          return_date: now.toISOString(),
          fine_amount: fineAmount
        }).eq('id', borrowId);

        await supabase.from('books').update({ available_copies: borrow.books.available_copies + 1 }).eq('id', borrow.book_id);

        await supabase.from('notifications').insert({
          user_id: borrow.user_id,
          message: `Your return for "${borrow.books.title}" has been approved. Overdue fine: $${fineAmount.toFixed(2)}`
        });

        await supabase.from('user_activity_logs').insert({
          user_id: currentUser.id,
          action: 'APPROVE_RETURN',
          details: `Approved return for "${borrow.books.title}". Fine: $${fineAmount}`
        });

        return { message: 'Return request approved successfully', fineAmount };
      }

      if (borrow.status === 'pending_renewal') {
        const newDueDate = new Date(borrow.due_date);
        newDueDate.setDate(newDueDate.getDate() + 14);

        await supabase.from('borrows').update({
          status: 'borrowed',
          due_date: newDueDate.toISOString(),
          renewal_count: borrow.renewal_count + 1
        }).eq('id', borrowId);

        await supabase.from('notifications').insert({
          user_id: borrow.user_id,
          message: `Your renewal request for "${borrow.books.title}" has been approved! New due date: ${newDueDate.toLocaleDateString()}.`
        });

        await supabase.from('user_activity_logs').insert({
          user_id: currentUser.id,
          action: 'APPROVE_RENEWAL',
          details: `Approved renewal for "${borrow.books.title}"`
        });

        return { message: 'Renewal request approved successfully', newDueDate: newDueDate.toISOString() };
      }
    }

    if (endpoint.startsWith('/borrows/reject/')) {
      const parts = endpoint.split('/');
      const borrowId = parseInt(parts[3]);
      const { data: borrow } = await supabase.from('borrows').select('*, books(title)').eq('id', borrowId).single();
      if (!borrow) throw new Error('Request record not found');

      if (borrow.status === 'pending_borrow') {
        await supabase.from('borrows').update({ status: 'rejected' }).eq('id', borrowId);
        await supabase.from('notifications').insert({
          user_id: borrow.user_id,
          message: `Your request to borrow "${borrow.books.title}" has been rejected.`
        });
        await supabase.from('user_activity_logs').insert({
          user_id: currentUser.id,
          action: 'REJECT_BORROW',
          details: `Rejected borrow request for "${borrow.books.title}" (User ID: ${borrow.user_id})`
        });
        return { message: 'Borrow request rejected successfully' };
      }

      if (borrow.status === 'pending_return' || borrow.status === 'pending_renewal') {
        const now = new Date();
        const dueDate = new Date(borrow.due_date);
        const targetStatus = now > dueDate ? 'overdue' : 'borrowed';

        await supabase.from('borrows').update({ status: targetStatus }).eq('id', borrowId);
        await supabase.from('notifications').insert({
          user_id: borrow.user_id,
          message: `Your request for "${borrow.books.title}" has been rejected.`
        });
        await supabase.from('user_activity_logs').insert({
          user_id: currentUser.id,
          action: 'REJECT_REQUEST',
          details: `Rejected request for "${borrow.books.title}" (User ID: ${borrow.user_id})`
        });
        return { message: 'Request rejected successfully' };
      }
    }

    if (endpoint.startsWith('/borrows/return/')) {
      const parts = endpoint.split('/');
      const borrowId = parseInt(parts[3]);
      const { data: borrow } = await supabase.from('borrows').select('*, books(*)').eq('id', borrowId).single();

      const now = new Date();
      const dueDate = new Date(borrow.due_date);
      let fineAmount = 0.0;
      if (now > dueDate) {
        const diffTime = Math.abs(now - dueDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        fineAmount = diffDays * 5.0; // $5 fine per day
      }

      await supabase.from('borrows').update({
        return_date: now.toISOString(),
        status: 'returned',
        fine_amount: fineAmount
      }).eq('id', borrowId);

      await supabase.from('books').update({ available_copies: borrow.books.available_copies + 1 }).eq('id', borrow.book_id);

      const { data: nextRes } = await supabase.from('reservations')
        .select('*')
        .eq('book_id', borrow.book_id)
        .eq('status', 'pending')
        .order('waitlist_position', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (nextRes) {
        await supabase.from('reservations').update({ status: 'fulfilled' }).eq('id', nextRes.id);
        await supabase.from('notifications').insert({
          user_id: nextRes.user_id,
          message: `The book "${borrow.books.title}" you reserved is now available! Your reservation has been fulfilled. Please borrow it soon.`
        });
      }

      await supabase.from('notifications').insert({
        user_id: borrow.user_id,
        message: `Book "${borrow.books.title}" returned successfully. ${fineAmount > 0 ? `Fine issued: $${fineAmount.toFixed(2)}` : 'No fines.'}`
      });

      await supabase.from('user_activity_logs').insert({
        user_id: currentUser.id,
        action: 'RETURN_BOOK',
        details: `Returned book "${borrow.books.title}". Fine: $${fineAmount}`
      });

      return { message: 'Book returned successfully', fineAmount };
    }

    if (endpoint === '/admin/users') {
      const { name, email, role } = body;
      const { data: existing } = await supabase.from('users').select('id').eq('email', email).maybeSingle();
      if (existing) throw new Error('Email is already registered');

      const { data: newUser } = await supabase.from('users').insert({
        name,
        email,
        role,
        status: 'active'
      }).select().single();

      await supabase.from('user_activity_logs').insert({
        user_id: currentUser.id,
        action: 'CREATE_USER',
        details: `Created user: ${name} (${email}) as ${role}`
      });
      return newUser;
    }

    if (endpoint === '/books/categories') {
      const { name, description } = body;
      const { data: existing } = await supabase.from('categories').select('id').eq('name', name).maybeSingle();
      if (existing) throw new Error('Category already exists');

      const { data: category } = await supabase.from('categories').insert({ name, description }).select().single();
      await supabase.from('user_activity_logs').insert({
        user_id: currentUser.id,
        action: 'ADD_CATEGORY',
        details: `Created category: ${name}`
      });
      return category;
    }

    if (endpoint === '/books/authors') {
      const { name, biography } = body;
      const { data: author } = await supabase.from('authors').insert({ name, biography }).select().single();
      await supabase.from('user_activity_logs').insert({
        user_id: currentUser.id,
        action: 'ADD_AUTHOR',
        details: `Created author: ${name}`
      });
      return author;
    }

    throw new Error(`Endpoint POST ${endpoint} not simulated in Supabase layer.`);
  } catch (err) {
    console.error('Supabase Emulation POST Error:', err);
    throw err;
  }
};

export const apiPut = async (endpoint, body) => {
  if (!isSupabaseEnabled) {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: await getHeaders(),
      body: JSON.stringify(body)
    });
    return handleResponse(res);
  }

  try {
    if (endpoint.startsWith('/admin/users/')) {
      const parts = endpoint.split('/');
      const userId = parseInt(parts[3]);
      const { name, email, role, status } = body;
      
      await supabase.from('users').update({
        name,
        email,
        role,
        status
      }).eq('id', userId);

      await supabase.from('user_activity_logs').insert({
        user_id: currentUser.id,
        action: 'EDIT_USER',
        details: `Updated user ID ${userId}: Name=${name}, Email=${email}, Role=${role}, Status=${status}`
      });
      return { message: 'User updated successfully' };
    }

    if (endpoint.startsWith('/notifications/') && endpoint.endsWith('/read')) {
      const parts = endpoint.split('/');
      const notificationId = parseInt(parts[2]);
      await supabase.from('notifications').update({ is_read: 1 }).eq('id', notificationId).eq('user_id', currentUser.id);
      return { message: 'Notification marked as read' };
    }

     if (endpoint === '/auth/profile') {
      const { name, role } = body;
      let targetRole = currentUser.role;
      if (role && ['student', 'teacher'].includes(role) && ['student', 'teacher'].includes(currentUser.role)) {
        targetRole = role;
      }
      const updateName = name || currentUser.name;
      
      await supabase.from('users').update({
        name: updateName,
        role: targetRole
      }).eq('id', currentUser.id);

      currentUser.name = updateName;
      currentUser.role = targetRole;

      localStorage.setItem('lib_user', JSON.stringify(currentUser));

      await supabase.from('user_activity_logs').insert({
        user_id: currentUser.id,
        action: 'UPDATE_PROFILE',
        details: `User updated name to "${updateName}" and role to "${targetRole}"`
      });

      return {
        message: 'Profile updated successfully',
        user: {
          id: currentUser.id,
          name: updateName,
          email: currentUser.email,
          role: targetRole
        }
      };
    }

    if (endpoint === '/notifications/read-all') {
      await supabase.from('notifications').update({ is_read: 1 }).eq('user_id', currentUser.id);
      return { message: 'All notifications marked as read' };
    }

    throw new Error(`Endpoint PUT ${endpoint} not simulated in Supabase layer.`);
  } catch (err) {
    console.error('Supabase Emulation PUT Error:', err);
    throw err;
  }
};

export const apiDelete = async (endpoint) => {
  if (!isSupabaseEnabled) {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: await getHeaders()
    });
    return handleResponse(res);
  }

  try {
    if (endpoint.startsWith('/books/')) {
      const parts = endpoint.split('/');
      const bookId = parseInt(parts[2]);
      const { data: book } = await supabase.from('books').select('title').eq('id', bookId).single();

      await supabase.from('books').delete().eq('id', bookId);

      await supabase.from('user_activity_logs').insert({
        user_id: currentUser.id,
        action: 'DELETE_BOOK',
        details: `Deleted book: "${book.title}" (ID: ${bookId})`
      });

      return { message: 'Book deleted successfully' };
    }

    if (endpoint.startsWith('/admin/users/')) {
      const parts = endpoint.split('/');
      const userId = parseInt(parts[3]);
      if (userId === currentUser.id) throw new Error('You cannot delete your own account');
      
      const { data: targetUser } = await supabase.from('users').select('name, email').eq('id', userId).single();
      await supabase.from('users').delete().eq('id', userId);

      await supabase.from('user_activity_logs').insert({
        user_id: currentUser.id,
        action: 'DELETE_USER',
        details: `Deleted user: ${targetUser.name} (${targetUser.email})`
      });
      return { message: 'User deleted successfully' };
    }

    throw new Error(`Endpoint DELETE ${endpoint} not simulated in Supabase layer.`);
  } catch (err) {
    console.error('Supabase Emulation DELETE Error:', err);
    throw err;
  }
};

// Custom upload handler supporting Supabase Storage bucket uploads
export const apiUpload = async (endpoint, formData, method = 'POST') => {
  if (!isSupabaseEnabled) {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method,
      headers: await getHeaders(true),
      body: formData
    });
    return handleResponse(res);
  }

  try {
    const fields = {};
    for (const [key, value] of formData.entries()) {
      fields[key] = value;
    }

    const coverFile = formData.get('cover');
    const pdfFile = formData.get('pdf');
    let coverUrl = '/uploads/covers/placeholder.jpg';
    let pdfUrl = null;

    const bucket = 'library';

    // 1. Handle Cover Upload if exists
    if (coverFile && coverFile instanceof File) {
      const filename = `${Date.now()}-${coverFile.name.replace(/\s+/g, '_')}`;
      const filePath = `covers/${filename}`;
      const { error: uploadErr } = await supabase.storage.from(bucket).upload(filePath, coverFile, { cacheControl: '3600', upsert: true });
      if (uploadErr) throw new Error('Cover upload failed: ' + uploadErr.message);
      
      const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(filePath);
      coverUrl = publicUrlData.publicUrl;
    }

    // 2. Handle PDF Ebook Upload if exists
    if (pdfFile && pdfFile instanceof File) {
      const filename = `${Date.now()}-${pdfFile.name.replace(/\s+/g, '_')}`;
      const filePath = `ebooks/${filename}`;
      const { error: uploadErr } = await supabase.storage.from(bucket).upload(filePath, pdfFile, { cacheControl: '3600', upsert: true });
      if (uploadErr) throw new Error('E-book upload failed: ' + uploadErr.message);

      const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(filePath);
      pdfUrl = publicUrlData.publicUrl;
    }

    // A. Add Book: POST /books
    if (endpoint === '/books' && method === 'POST') {
      const { data: newBook } = await supabase.from('books').insert({
        title: fields.title,
        isbn: fields.isbn,
        category_id: fields.category_id ? parseInt(fields.category_id) : null,
        author_id: fields.author_id ? parseInt(fields.author_id) : null,
        publication_year: fields.publication_year ? parseInt(fields.publication_year) : null,
        description: fields.description || '',
        total_copies: parseInt(fields.total_copies),
        available_copies: parseInt(fields.total_copies),
        location: fields.location || '',
        cover_image: coverUrl
      }).select().single();

      await supabase.from('user_activity_logs').insert({
        user_id: currentUser.id,
        action: 'ADD_BOOK',
        details: `Added book: "${fields.title}"`
      });

      return { id: newBook.id, message: 'Book added successfully' };
    }

    // B. Edit Book: PUT /books/:id
    if (endpoint.startsWith('/books/') && method === 'PUT') {
      const parts = endpoint.split('/');
      const bookId = parseInt(parts[2]);

      const updateData = {
        title: fields.title,
        isbn: fields.isbn,
        category_id: fields.category_id ? parseInt(fields.category_id) : null,
        author_id: fields.author_id ? parseInt(fields.author_id) : null,
        publication_year: fields.publication_year ? parseInt(fields.publication_year) : null,
        description: fields.description || '',
        total_copies: parseInt(fields.total_copies),
        location: fields.location || ''
      };

      if (coverFile instanceof File) {
        updateData.cover_image = coverUrl;
      }

      const { data: oldBook } = await supabase.from('books').select('total_copies, available_copies').eq('id', bookId).single();
      const diff = updateData.total_copies - oldBook.total_copies;
      updateData.available_copies = Math.max(0, oldBook.available_copies + diff);

      await supabase.from('books').update(updateData).eq('id', bookId);

      await supabase.from('user_activity_logs').insert({
        user_id: currentUser.id,
        action: 'EDIT_BOOK',
        details: `Updated book: "${fields.title}"`
      });

      return { message: 'Book updated successfully' };
    }

    // C. Upload Ebook PDF: POST /books/:id/ebook
    if (endpoint.startsWith('/books/') && endpoint.endsWith('/ebook') && method === 'POST') {
      const parts = endpoint.split('/');
      const bookId = parseInt(parts[2]);

      const { data: existing } = await supabase.from('ebooks').select('id').eq('book_id', bookId).maybeSingle();
      if (existing) {
        await supabase.from('ebooks').update({ file_path: pdfUrl }).eq('id', existing.id);
      } else {
        await supabase.from('ebooks').insert({ book_id: bookId, file_path: pdfUrl });
      }

      await supabase.from('user_activity_logs').insert({
        user_id: currentUser.id,
        action: 'UPLOAD_EBOOK',
        details: `Uploaded ebook for book ID ${bookId}`
      });

      return { message: 'E-book PDF uploaded successfully' };
    }

    throw new Error(`Endpoint UPLOAD ${endpoint} not simulated in Supabase layer.`);
  } catch (err) {
    console.error('Supabase Emulation UPLOAD Error:', err);
    throw err;
  }
};
