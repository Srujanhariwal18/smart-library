# Smart Library - College Management System

A premium, modern College Library Management System with rich analytics, glassmorphic dark mode styling, and dynamic user roles. The system features a robust **dual-mode architecture**: it runs automatically in local mock developer mode if database keys are unconfigured, and upgrades to live cloud serverless mode as soon as Clerk and Supabase environment variables are provided.

---

## 🏗️ Architecture & Dual-Mode System

Smart Library is engineered with a **hybrid architecture** that accommodates both sandboxed developer setups and fully integrated live serverless environments:

- **Local Mock Developer Mode (Default)**: Uses a local **SQLite** database and an Express.js backend. User authentication is managed locally with standard credential forms, and mock transactional emails are routed to an Ethereal SMTP server. Ideal for local coding and offline testing.
- **Live Cloud Serverless Mode**: Discovers Clerk and Supabase variables in the client environment, instantly shifting into a production-ready model. All transactions, books, and RLS (Row-Level Security) operations run against **Supabase (PostgreSQL)**, while login security is managed via **Clerk SSO**.

---

## 👥 Dynamic Roles & Permissions Whitelist

The application enforces fine-grained permissions and custom portals tailored to 4 academic personas:

### 1. 🛡️ Administrator
* **Access**: Full system permissions.
* **Key Capabilities**: Accesses security audit logs, manages user account statuses (active/suspended), oversees entire circulation transactions, and reviews library-wide performance analytics charts (borrow statistics, category distributions).

### 2. 📚 Librarian
* **Access**: Core library operations.
* **Key Capabilities**: Curates the catalog (adds, updates, and deletes books), uploads digital E-Books (PDFs), issues books physically to students at the circulation counter, receives and registers returns, processes overdue fines, and acts as the gatekeeper to approve/reject Teacher circulation requests (borrows, renewals, and returns).

### 3. 🎓 Teacher
* **Access**: Enhanced circulation rights.
* **Key Capabilities**: Accesses the online book catalog, rates and reviews titles, manages a personal wishlist, and borrows books by submitting online borrow, renewal, and return requests. These requests queue in the Librarian's dashboard for verification and approval.

### 4. 👤 Student
* **Access**: Standard circulation client.
* **Key Capabilities**: Searches and filters catalog books, downloads E-Book PDFs, and manages personal wishlists. If a book has 0 copies available, the student can reserve it to enter an automated waitlist queue.
* *Restriction*: Students cannot directly request or issue checkouts online; they must present themselves at the circulation counter to have a librarian issue the book.

### 🔐 Clerk SSO Whitelist & Role Picker Modal
When running in **Live Cloud Mode** with Clerk enabled, the system uses email whitelists for secure, automated role assignments during SSO sync:
- **`srujanhariwal464@gmail.com`**: Automatically flagged as administrative/library staff. Upon first login, they are greeted by a beautiful **Role Picker Modal** allowing them to select whether to enter the workspace as an **Admin** or a **Librarian** (saved permanently to the user account).
- **`srujanhariwal18@gmail.com`**: Automatically whitelisted and assigned the **Teacher** role.
- **All other emails**: Default to **Student** status, with the option to transition their role to **Teacher** via the profile settings page.

---

## ⚙️ Key Technical Features

- 🔄 **Teacher Circulation Workflow**: Complete online requests lifecycle for borrows, returns, and renewals, with real-time approvals, automated due dates calculations, and manual librarian overrides.
- 📅 **Automated Reservation Queue**: When a checked-out book is returned, the system automatically fulfills the oldest pending reservation on that book and triggers a notification.
- 📊 **Dynamic Visual Analytics**: Custom-tailored dark mode charts powered by **Chart.js** displaying real-time borrow rates, catalog category breakdowns, and audit timelines.
- 🔔 **Instant Notification System**: Built-in notifications for overdue books, reservation fulfillment alerts, return approvals, and librarian decisions.
- 🎨 **Premium Aesthetic Shell**: Styled with glassmorphism, harmonious Tailwind palettes, custom micro-animations, loading spinners, and context-dependent sidebar options.

---

## 📁 Project Structure

```text
smart-library/
├── client/                 # React frontend application
│   ├── src/
│   │   ├── components/     # UI shell, layout, navbar, sidebar, and RolePickerModal
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

## 🌐 Live Cloud Setup Guide

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

## 🛠️ Development Setup

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

### 🔑 Local Developer Demo Accounts
When running in **Local Mock Developer Mode**, you can use the following default credentials to test each portal role:

| Role | Email | Password |
| :--- | :--- | :--- |
| **Student** | `student@library.com` | `studentpassword` |
| **Teacher** | `teacher@library.com` | `teacherpassword` |
| **Librarian** | `librarian@library.com` | `librarianpassword` |
| **Admin** | `admin@library.com` | `adminpassword` |

---

## 🚀 Newly Added Features (June 2026 Additions)

We have successfully integrated **12 isolated, additive features** to improve circulation control, academic tools, and administration:

1. **Borrow History Timeline**: Review complete history of book checkouts, due dates, return timestamps, and overdue fines paid.
2. **Book Ratings & Reviews**: Students can submit 1-5 star ratings with comments for books they have previously borrowed and returned. Average ratings and review counts are rendered on each catalog card.
3. **Advanced Catalog Filters**: A client-side filter panel on the Home page allowing users to refine catalog books by availability status, publication year ranges, and minimum star ratings.
4. **Digital Library Card**: A custom printable/downloadable library pass containing a student's card details and a dynamically generated QR code encoding verified user metadata.
5. **Past Exam Paper Archive**: A repository supporting PDF question paper upload (librarians) and download (students) filtered by academic branch, subject, and publication year.
6. **Reading Stats Dashboard**: Displays user-specific metrics on the profile page, including total books completed, favorite category, and aggregate fines.
7. **Camera Barcode Scanner**: Integrates a client-side camera reader utilizing `@zxing/browser` to scan ISBN book barcodes or student library card QR codes for circulation autofills.
8. **Circulation & Audit Export**: One-click **CSV** and **PDF** report extraction for active checkouts, overdue fines (in `Reports.jsx`), and system audit records (in `Logs.jsx`).
9. **ISBN Auto-Fill Tool**: Integrates OpenLibrary catalog API query within the Add Book modal; auto-populates book titles, publication years, descriptions, and cover image URLs upon providing a valid ISBN.
10. **Advanced Charts Section**: Renders monthly circulation trends, horizontal top-10 borrowed book lists, and a 7x24 weekly peak borrowing hours heatmap grid under the admin dashboard.
11. **In-App Announcements**: Allows administrators to publish announcements targeting specific roles (or all). Displayed as dismissible dashboard banners for active sessions.
12. **Theme Persistence**: Persists user dark/light mode preference inside a JSONB column (`preferences`) in Supabase (or TEXT in SQLite) so it remains synced across browser sessions and devices.

---

## 📄 License
MIT License. Created by Srujan Hariwal.

