# Smart Library - College Management System

A premium, modern College Library Management System with rich analytics, glassmorphic dark mode styling, and dynamic user roles. The system has been fully migrated to a **serverless cloud architecture** utilizing **Supabase** for database/storage and **Clerk** for user authentication.

Additionally, the codebase features a robust **dual-mode architecture**: it runs automatically in local mock developer mode if database keys are unconfigured, and upgrades to live cloud mode as soon as Clerk and Supabase environment variables are provided.

---

## Key Features

- 👤 **Dynamic Authentication & Role-Based Control**: Powered by Clerk. Supports `student`, `librarian`, and `admin` portals.
- 📚 **Book Catalog**: Browse, search, filter, and review library books.
- 📖 **E-Books & Reading**: Direct PDF uploads and downloads served via Supabase Storage.
- 🔄 **Issue & Borrow System**: Request, renew, and return processes with automated fine calculations and limits.
- 📅 **Reservations & Waitlist**: Automated queue system for books currently borrowed.
- 📊 **Rich Admin Analytics**: Dynamic visual charts for borrow stats, categories, and audit logs.
- 🔔 **Instant Alerts**: In-app notifications for overdue notices, reservation fulfillments, and borrow confirmations.

---

## Technology Stack

- **Frontend**: React (v19), Vite, TailwindCSS, React Router (v7)
- **State & Routing**: Context API, React Hooks, Lucide Icons, Chart.js
- **Auth Provider**: Clerk React (v5)
- **Database & Storage**: Supabase (PostgreSQL with RLS and Storage Buckets)
- **Original Fallback Backend**: Node.js, Express, SQLite, Nodemailer (Ethereal email mock)

---

## Project Structure

```text
smart-library/
├── client/                 # React frontend application
│   ├── src/
│   │   ├── components/     # UI shell, layout, navbar, and sidebar
│   │   ├── context/        # Auth, notifications, theme, and toast providers
│   │   ├── pages/          # Admin, Librarian, Student, and Auth screens
│   │   ├── utils/          # Supabase client setup and custom api.js translation layer
│   │   └── main.jsx        # Clerk provider wrapping & app mount
│   └── .env                # Client-side env variables
├── server/                 # Express backend server (retained as local developer fallback)
├── database/               # Local SQLite database files (fallback mode)
├── supabase_schema.sql     # Full SQL script to instantiate cloud tables and seed data
└── .gitignore              # Repository file exclusion configuration
```

---

## Live Cloud Setup Guide

To run the application connected to your live **Clerk** and **Supabase** accounts:

### 1. Database Schema Initialization
1. Go to your **Supabase Dashboard**.
2. Open the **SQL Editor** on your project.
3. Copy the contents of the root [supabase_schema.sql](supabase_schema.sql) file and run it to create the tables, relationships, and populate seed data.

### 2. Configure Clerk JWT Template (For Row-Level Security)
1. Go to your **Clerk Dashboard** and choose your project.
2. Select **JWT Templates** in the sidebar.
3. Click **New Template** and choose **Supabase**.
4. Save the template with the name `supabase` (the client is configured to request this specific template).

### 3. Setup Environment Variables
Create a `.env` file in the `client/` folder:

```env
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

*Note: If these variables are not found in `client/.env`, the system automatically runs in Developer Mode, fetching mock data from the local SQLite/Express backend.*

---

## Development Setup

To run the project locally:

### 1. Install Dependencies
Navigate to the folders and install dependencies:

```bash
# Install root dependencies
npm install

# Install client dependencies
cd client
npm install

# Install server dependencies (if running local fallback backend)
cd ../server
npm install
```

### 2. Start the Servers

Run the frontend client:
```bash
cd client
npm run dev
```

Run the backend server (only required if running in local mock fallback mode):
```bash
cd server
npm run dev
```

Open [http://localhost:5173/](http://localhost:5173/) in your browser to view the application!

---

## License
MIT License. Created by Srujan Hariwal.
