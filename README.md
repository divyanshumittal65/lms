# Library Management System

A full-stack Library Management System built with React, Express, TypeScript, and MySQL.

## Features

- Admin and student login with JWT authentication
- Student self-registration
- Role-based access control
- Book, category, and author management
- Physical book-copy tracking
- Direct borrow and return workflow
- Automatic fine calculation at Rs. 10 per late day
- Server-side book search by title, author, category, and ISBN
- Admin dashboard with books, categories, users, borrowed, and available counts
- Toast notifications in the frontend

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create backend environment file:

```bash
copy backend\.env.example backend\.env
```

3. Update `backend\.env` with your MySQL credentials.

4. Create tables and seed demo data:

```bash
npm run seed
```

5. Start both apps:

```bash
npm run dev
```

Frontend: `http://localhost:5173`

Backend: `http://localhost:4000`

Seed admin login:

```text
admin@library.test
Admin@12345
```

## Useful Scripts

- `npm run dev` - start backend and frontend
- `npm run build` - compile backend and build frontend
- `npm run seed` - create MySQL schema and seed initial data
