import {
  BookOpen,
  Boxes,
  CheckCircle2,
  CircleUserRound,
  Pencil,
  LayoutDashboard,
  Library,
  LogOut,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings,
  Shield,
  Trash2,
  UserPlus,
  Users,
  X
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { api, User } from "./api";

type Book = {
  id: number;
  title: string;
  isbn: string;
  publisher: string;
  published_year: number;
  description?: string | null;
  author_id: number;
  category_id: number;
  author: string;
  category: string;
  total_copies: number;
  available_copies: number;
};

type Category = { id: number; name: string; description?: string | null };
type Author = { id: number; name: string; bio?: string | null };
type BookCopy = { id: number; accession_no: string; status: "available" | "borrowed" | "maintenance" | "lost" };
type BookDetail = Book & { copies: BookCopy[] };
type Borrow = {
  id: number;
  title: string;
  student: string;
  issue_date: string;
  due_date: string;
  return_date: string | null;
  fine: number;
  status: "borrowed" | "returned" | "overdue";
};

type Dashboard = {
  stats: { books: number; categories: number; users: number; borrowed: number; available: number };
  activity: { id: number; action: string; entity_type: string; actor: string | null; created_at: string }[];
};

type ToastType = "success" | "error";
type Toast = { type: ToastType; message: string } | null;

const nav: { key: string; label: string; icon: LucideIcon; adminOnly?: boolean }[] = [
  { key: "dashboard", label: "Home", icon: LayoutDashboard, adminOnly: true },
  { key: "books", label: "Books", icon: BookOpen },
  { key: "categories", label: "Categories", icon: Boxes, adminOnly: true },
  { key: "users", label: "Users", icon: Users, adminOnly: true },
  { key: "borrows", label: "Borrowed", icon: Library },
  { key: "settings", label: "Settings", icon: Settings, adminOnly: true }
] as const;

export default function App() {
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem("lms_user");
    return raw ? JSON.parse(raw) : null;
  });
  const [view, setView] = useState("dashboard");
  const [toast, setToast] = useState<Toast>(null);

  useEffect(() => {
    if (user?.role === "student" && view === "dashboard") {
      setView("books");
    }
  }, [user, view]);

  function showToast(type: ToastType, message: string) {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 2600);
  }

  function logout() {
    localStorage.removeItem("lms_token");
    localStorage.removeItem("lms_user");
    setUser(null);
  }

  if (!user) {
    return <AuthScreen onAuth={setUser} showToast={showToast} />;
  }

  const visibleNav = nav.filter((item) => !item.adminOnly || user.role === "admin");

  return (
    <div className="app-shell">
      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <Library size={24} />
          </div>
          <div>
            <strong>LMS</strong>
            <span>{user.role === "admin" ? "Admin Console" : "Student Portal"}</span>
          </div>
        </div>
        <nav>
          {visibleNav.map((item) => {
            const Icon = item.icon;
            return (
              <button
                className={view === item.key ? "active" : ""}
                key={item.key}
                onClick={() => setView(item.key)}
                title={item.label}
              >
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>
        <button className="logout" onClick={logout} title="Logout">
          <LogOut size={18} />
          Logout
        </button>
      </aside>
      <main>
        <header className="topbar">
          <div>
            <p>{new Date().toLocaleDateString()}</p>
            <h1>{viewTitle(view, user.role)}</h1>
          </div>
          <div className="profile-chip">
            {user.role === "admin" ? <Shield size={18} /> : <CircleUserRound size={18} />}
            <span>{user.name}</span>
          </div>
        </header>
        {view === "dashboard" && user.role === "admin" && <DashboardView />}
        {view === "books" && <BooksView user={user} showToast={showToast} />}
        {view === "categories" && user.role === "admin" && <CategoriesView showToast={showToast} />}
        {view === "users" && user.role === "admin" && <UsersView showToast={showToast} />}
        {view === "borrows" && <BorrowsView user={user} showToast={showToast} />}
        {view === "settings" && user.role === "admin" && <SettingsView showToast={showToast} />}
      </main>
    </div>
  );
}

function viewTitle(view: string, role: User["role"]) {
  if (view === "dashboard") return "Dashboard";
  if (view === "books") return role === "admin" ? "Book Inventory" : "Search Books";
  if (view === "categories") return "Categories";
  if (view === "users") return "Student Users";
  if (view === "settings") return "Settings";
  return role === "admin" ? "Borrowing Records" : "My Borrowing History";
}

function AuthScreen({ onAuth, showToast }: { onAuth: (user: User) => void; showToast: (type: ToastType, message: string) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [role, setRole] = useState<"admin" | "student">("student");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const data = new FormData(event.currentTarget);
    try {
      const payload =
        mode === "register"
          ? { name: data.get("name"), email: data.get("email"), password: data.get("password"), phone: data.get("phone") }
          : { email: data.get("email"), password: data.get("password"), role };
      const response = await api<{ token: string; user: User }>(mode === "register" ? "/auth/register" : "/auth/login", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      localStorage.setItem("lms_token", response.data.token);
      localStorage.setItem("lms_user", JSON.stringify(response.data.user));
      showToast("success", response.message);
      onAuth(response.data.user);
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <section className="auth-visual">
        <div className="shelf">
          {["#2e7d6f", "#c25b52", "#f0b64d", "#5d6fa8", "#8e6b4e", "#4f8f46"].map((color, index) => (
            <span key={color} style={{ background: color, height: `${120 + index * 14}px` }} />
          ))}
        </div>
        <h1>Library Management System</h1>
        <p>Manage books, students, copies, borrowing, returns, and fines from one clean workspace.</p>
      </section>
      <form className="auth-card" onSubmit={submit}>
        <div className="segmented">
          <button type="button" className={mode === "login" ? "selected" : ""} onClick={() => setMode("login")}>
            Login
          </button>
          <button type="button" className={mode === "register" ? "selected" : ""} onClick={() => setMode("register")}>
            Sign up
          </button>
        </div>
        {mode === "login" && (
          <div className="segmented role">
            <button type="button" className={role === "student" ? "selected" : ""} onClick={() => setRole("student")}>
              Student
            </button>
            <button type="button" className={role === "admin" ? "selected" : ""} onClick={() => setRole("admin")}>
              Admin
            </button>
          </div>
        )}
        {mode === "register" && <input name="name" placeholder="Full name" required minLength={2} />}
        <input name="email" placeholder="Email address" type="email" required />
        {mode === "register" && <input name="phone" placeholder="Phone optional" />}
        <input name="password" placeholder="Password" type="password" required minLength={mode === "register" ? 8 : 1} />
        <button className="primary" disabled={loading}>
          {mode === "register" ? <UserPlus size={18} /> : <Shield size={18} />}
          {loading ? "Please wait" : mode === "register" ? "Create student account" : "Login"}
        </button>
        <p className="hint">Seed admin: admin@library.test / Admin@12345</p>
      </form>
    </div>
  );
}

function DashboardView() {
  const [data, setData] = useState<Dashboard | null>(null);

  useEffect(() => {
    api<Dashboard>("/dashboard").then((res) => setData(res.data));
  }, []);

  const stats = data?.stats;
  return (
    <section className="stack">
      <div className="metric-grid">
        {([
          ["Books", stats?.books ?? 0, BookOpen],
          ["Categories", stats?.categories ?? 0, Boxes],
          ["Users", stats?.users ?? 0, Users],
          ["Borrowed", stats?.borrowed ?? 0, Library],
          ["Available", stats?.available ?? 0, CheckCircle2]
        ] as [string, number, LucideIcon][]).map(([label, value, Icon]) => (
          <div className="metric" key={String(label)}>
            <Icon size={22} />
            <span>{String(label)}</span>
            <strong>{String(value)}</strong>
          </div>
        ))}
      </div>
      <Table
        columns={["Action", "Entity", "Actor", "Date"]}
        rows={(data?.activity ?? []).map((item) => [item.action, item.entity_type, item.actor ?? "System", new Date(item.created_at).toLocaleString()])}
        empty="No activity yet"
      />
    </section>
  );
}

function BooksView({ user, showToast }: { user: User; showToast: (type: ToastType, message: string) => void }) {
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [authors, setAuthors] = useState<Author[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [editing, setEditing] = useState<Book | null>(null);
  const [selectedBook, setSelectedBook] = useState<BookDetail | null>(null);
  const [issueUserId, setIssueUserId] = useState("");

  useEffect(() => {
    api<{ items: Book[] }>(`/books?search=${encodeURIComponent(search)}&limit=20`).then((res) => setBooks(res.data.items));
  }, [search, refresh]);

  useEffect(() => {
    if (user.role === "admin") {
      api<Category[]>("/categories").then((res) => setCategories(res.data));
      api<Author[]>("/authors").then((res) => setAuthors(res.data));
      api<{ items: User[] }>("/users?limit=100").then((res) => setStudents(res.data.items));
    }
  }, [user.role]);

  async function borrow(bookId: number, studentId?: number) {
    try {
      const res = await api<{ dueDate: string }>("/borrows", {
        method: "POST",
        body: JSON.stringify({ bookId, ...(studentId ? { userId: studentId } : {}) })
      });
      showToast("success", `${res.message}. Due ${res.data.dueDate}`);
      setRefresh((value) => value + 1);
      if (selectedBook?.id === bookId) {
        void openBook(bookId);
      }
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Borrow failed");
    }
  }

  function bookPayload(form: HTMLFormElement) {
    const data = new FormData(form);
    const publishedYear = Number(data.get("publishedYear"));
    return {
      title: data.get("title"),
      isbn: data.get("isbn"),
      authorId: Number(data.get("authorId")),
      categoryId: Number(data.get("categoryId")),
      publisher: data.get("publisher"),
      publishedYear: publishedYear || null,
      description: data.get("description") || null,
      copies: Number(data.get("copies") || 1)
    };
  }

  async function saveBook(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = bookPayload(event.currentTarget);
    try {
      const path = editing ? `/books/${editing.id}` : "/books";
      const method = editing ? "PUT" : "POST";
      const body = editing ? { ...payload, copies: undefined } : payload;
      const res = await api(path, { method, body: JSON.stringify(body) });
      showToast("success", res.message);
      event.currentTarget.reset();
      setEditing(null);
      setRefresh((value) => value + 1);
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Book save failed");
    }
  }

  async function deleteBook(book: Book) {
    if (!window.confirm(`Delete "${book.title}"?`)) return;
    try {
      const res = await api(`/books/${book.id}`, { method: "DELETE" });
      showToast("success", res.message);
      setSelectedBook((current) => (current?.id === book.id ? null : current));
      setRefresh((value) => value + 1);
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Delete failed");
    }
  }

  async function openBook(bookId: number) {
    try {
      const res = await api<BookDetail>(`/books/${bookId}`);
      setSelectedBook(res.data);
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Could not load book copies");
    }
  }

  async function updateCopy(copyId: number, status: BookCopy["status"]) {
    try {
      const res = await api(`/books/copies/${copyId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      });
      showToast("success", res.message);
      if (selectedBook) void openBook(selectedBook.id);
      setRefresh((value) => value + 1);
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Copy update failed");
    }
  }

  return (
    <section className="grid-layout">
      <div className="stack">
        <label className="searchbox">
          <Search size={18} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search title, author, category, ISBN" />
        </label>
        <Table
          columns={["Title", "Author", "Category", "ISBN", "Available", "Actions"]}
          rows={books.map((book) => [
            book.title,
            book.author,
            book.category,
            book.isbn,
            `${book.available_copies}/${book.total_copies}`,
            <div className="row-actions">
              <button className="icon-action" disabled={!book.available_copies} onClick={() => borrow(book.id)} title={user.role === "admin" ? "Quick issue to yourself" : "Borrow book"}>
                <Plus size={16} />
              </button>
              {user.role === "admin" && (
                <>
                  <button className="icon-action muted" onClick={() => openBook(book.id)} title="Manage copies">
                    <Boxes size={16} />
                  </button>
                  <button className="icon-action muted" onClick={() => setEditing(book)} title="Edit book">
                    <Pencil size={16} />
                  </button>
                  <button className="icon-action danger" onClick={() => deleteBook(book)} title="Delete book">
                    <Trash2 size={16} />
                  </button>
                </>
              )}
            </div>
          ])}
          empty="No books found"
        />
        {user.role === "admin" && selectedBook && (
          <div className="panel">
            <div className="panel-heading">
              <h2>{selectedBook.title} Copies</h2>
              <button className="icon-action muted" onClick={() => setSelectedBook(null)} title="Close copies">
                <X size={16} />
              </button>
            </div>
            <Table
              columns={["Accession", "Status", "Change Status"]}
              rows={selectedBook.copies.map((copy) => [
                copy.accession_no,
                <span className={`status ${copy.status}`}>{copy.status}</span>,
                <select value={copy.status} onChange={(event) => updateCopy(copy.id, event.target.value as BookCopy["status"])} disabled={copy.status === "borrowed"}>
                  <option value="available">Available</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="lost">Lost</option>
                  <option value="borrowed">Borrowed</option>
                </select>
              ])}
              empty="No copies"
            />
          </div>
        )}
      </div>
      {user.role === "admin" && (
        <div className="side-stack">
          <form className="panel-form" onSubmit={saveBook}>
          <div className="panel-heading">
            <h2>{editing ? "Edit Book" : "Add Book"}</h2>
            {editing && (
              <button type="button" className="icon-action muted" onClick={() => setEditing(null)} title="Cancel edit">
                <X size={16} />
              </button>
            )}
          </div>
          <input name="title" placeholder="Title" required defaultValue={editing?.title ?? ""} />
          <input name="isbn" placeholder="ISBN" required defaultValue={editing?.isbn ?? ""} />
          <select name="authorId" required defaultValue={editing?.author_id ?? ""} key={`author-${editing?.id ?? "new"}`}>
            <option value="">Author</option>
            {authors.map((author) => (
              <option key={author.id} value={author.id}>{author.name}</option>
            ))}
          </select>
          <select name="categoryId" required defaultValue={editing?.category_id ?? ""} key={`category-${editing?.id ?? "new"}`}>
            <option value="">Category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
          <input name="publisher" placeholder="Publisher" required defaultValue={editing?.publisher ?? ""} />
          <input name="publishedYear" placeholder="Published year" type="number" min="1000" max="2100" defaultValue={editing?.published_year ?? ""} />
          <input name="description" placeholder="Description optional" defaultValue={editing?.description ?? ""} />
          {!editing && <input name="copies" placeholder="Copies" type="number" min="1" defaultValue={1} />}
          <button className="primary">{editing ? <Save size={18} /> : <Plus size={18} />} {editing ? "Save book" : "Add book"}</button>
        </form>
          <form
            className="panel-form"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              const bookId = Number(form.get("bookId"));
              const studentId = Number(form.get("studentId"));
              if (bookId && studentId) void borrow(bookId, studentId);
            }}
          >
            <h2>Issue To Student</h2>
            <select name="bookId" required>
              <option value="">Book</option>
              {books.filter((book) => Number(book.available_copies) > 0).map((book) => (
                <option key={book.id} value={book.id}>{book.title}</option>
              ))}
            </select>
            <select name="studentId" required value={issueUserId} onChange={(event) => setIssueUserId(event.target.value)}>
              <option value="">Student</option>
              {students.filter((student) => student.status === "active").map((student) => (
                <option key={student.id} value={student.id}>{student.name}</option>
              ))}
            </select>
            <button className="primary"><Library size={18} /> Issue book</button>
          </form>
        </div>
      )}
    </section>
  );
}

function CategoriesView({ showToast }: { showToast: (type: ToastType, message: string) => void }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [authors, setAuthors] = useState<Author[]>([]);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingAuthor, setEditingAuthor] = useState<Author | null>(null);
  const load = () => {
    api<Category[]>("/categories").then((res) => setCategories(res.data));
    api<Author[]>("/authors").then((res) => setAuthors(res.data));
  };
  useEffect(() => {
    load();
  }, []);

  async function saveResource(path: string, event: FormEvent<HTMLFormElement>, editingId?: number) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try {
      const res = await api(editingId ? `${path}/${editingId}` : path, {
        method: editingId ? "PUT" : "POST",
        body: JSON.stringify({ name: data.get("name") })
      });
      showToast("success", res.message);
      event.currentTarget.reset();
      setEditingCategory(null);
      setEditingAuthor(null);
      load();
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Save failed");
    }
  }

  async function deleteResource(path: string, id: number, label: string) {
    if (!window.confirm(`Delete "${label}"?`)) return;
    try {
      const res = await api(`${path}/${id}`, { method: "DELETE" });
      showToast("success", res.message);
      load();
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Delete failed");
    }
  }

  return (
    <section className="split">
      <ResourceBox
        title="Categories"
        items={categories}
        editing={editingCategory}
        onEdit={setEditingCategory}
        onDelete={(item) => deleteResource("/categories", item.id, item.name)}
        onCancel={() => setEditingCategory(null)}
        onSubmit={(event) => saveResource("/categories", event, editingCategory?.id)}
      />
      <ResourceBox
        title="Authors"
        items={authors}
        editing={editingAuthor}
        onEdit={setEditingAuthor}
        onDelete={(item) => deleteResource("/authors", item.id, item.name)}
        onCancel={() => setEditingAuthor(null)}
        onSubmit={(event) => saveResource("/authors", event, editingAuthor?.id)}
      />
    </section>
  );
}

function ResourceBox({
  title,
  items,
  editing,
  onEdit,
  onDelete,
  onCancel,
  onSubmit
}: {
  title: string;
  items: { id: number; name: string }[];
  editing: { id: number; name: string } | null;
  onEdit: (item: { id: number; name: string }) => void;
  onDelete: (item: { id: number; name: string }) => void;
  onCancel: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="panel">
      <div className="panel-heading">
        <h2>{title}</h2>
        {editing && (
          <button className="icon-action muted" onClick={onCancel} title="Cancel edit">
            <X size={16} />
          </button>
        )}
      </div>
      <form className="inline-form" onSubmit={onSubmit} key={editing?.id ?? "new"}>
        <input name="name" placeholder={`New ${title.slice(0, -1).toLowerCase()}`} required defaultValue={editing?.name ?? ""} />
        <button className="icon-action" title={editing ? `Save ${title}` : `Add ${title}`}>
          {editing ? <Save size={16} /> : <Plus size={16} />}
        </button>
      </form>
      <div className="resource-list">
        {items.map((item) => (
          <div className="resource-row" key={item.id}>
            <span>{item.name}</span>
            <div className="row-actions">
              <button className="icon-action muted" onClick={() => onEdit(item)} title="Edit">
                <Pencil size={16} />
              </button>
              <button className="icon-action danger" onClick={() => onDelete(item)} title="Delete">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function UsersView({ showToast }: { showToast: (type: ToastType, message: string) => void }) {
  const [users, setUsers] = useState<User[]>([]);
  const load = () => api<{ items: User[] }>("/users?limit=30").then((res) => setUsers(res.data.items));
  useEffect(() => {
    load();
  }, []);

  async function setStatus(userId: number, status: "active" | "blocked") {
    try {
      const res = await api(`/users/${userId}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
      showToast("success", res.message);
      load();
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Update failed");
    }
  }

  return (
    <Table
      columns={["Name", "Email", "Status", ""]}
      rows={users.map((item) => [
        item.name,
        item.email,
        <span className={`status ${item.status}`}>{item.status}</span>,
        <button className="text-button" onClick={() => setStatus(item.id, item.status === "active" ? "blocked" : "active")}>
          {item.status === "active" ? "Block" : "Activate"}
        </button>
      ])}
      empty="No students yet"
    />
  );
}

function BorrowsView({ user, showToast }: { user: User; showToast: (type: ToastType, message: string) => void }) {
  const [borrows, setBorrows] = useState<Borrow[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const load = async () => {
    setRefreshing(true);
    const res = await api<{ items: Borrow[] }>("/borrows?limit=30");
    setBorrows(res.data.items);
    setRefreshing(false);
  };
  useEffect(() => {
    load();
  }, []);

  async function returnBook(id: number) {
    try {
      const res = await api<{ fine: number }>(`/borrows/${id}/return`, { method: "PATCH" });
      showToast("success", `${res.message}. Fine Rs. ${res.data.fine}`);
      load();
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Return failed");
    }
  }

  return (
    <section className="stack">
      <button className="secondary self-start" onClick={load}><RefreshCw size={16} className={refreshing ? "spin" : ""} /> Refresh</button>
      <Table
        columns={[user.role === "admin" ? "Student" : "Book", "Title", "Issue", "Due", "Returned", "Fine", "Status", "Actions"]}
        rows={borrows.map((item) => [
          user.role === "admin" ? item.student : item.title,
          item.title,
          item.issue_date,
          item.due_date,
          item.return_date ?? "-",
          `Rs. ${item.fine}`,
          <span className={`status ${item.status}`}>{item.status}</span>,
          item.status !== "returned" ? <button className="text-button" onClick={() => returnBook(item.id)}>Return</button> : ""
        ])}
        empty="No borrowing records"
      />
    </section>
  );
}

function SettingsView({ showToast }: { showToast: (type: ToastType, message: string) => void }) {
  const [borrowDurationDays, setBorrowDurationDays] = useState(14);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ setting_key: string; setting_value: string }[]>("/settings")
      .then((res) => {
        const setting = res.data.find((item) => item.setting_key === "borrow_duration_days");
        setBorrowDurationDays(Number(setting?.setting_value ?? 14));
      })
      .finally(() => setLoading(false));
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const res = await api("/settings", {
        method: "PUT",
        body: JSON.stringify({ borrowDurationDays })
      });
      showToast("success", res.message);
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Settings update failed");
    }
  }

  return (
    <section className="split">
      <form className="panel-form" onSubmit={save}>
        <h2>Borrow Rules</h2>
        <label className="field-label">
          Borrow duration
          <input
            type="number"
            min="1"
            max="90"
            value={borrowDurationDays}
            disabled={loading}
            onChange={(event) => setBorrowDurationDays(Number(event.target.value))}
          />
        </label>
        <button className="primary" disabled={loading}>
          <Save size={18} />
          Save settings
        </button>
      </form>
      <div className="panel">
        <h2>Fine Rule</h2>
        <p className="muted-copy">Late returns are calculated automatically at Rs. 10 per day when a borrowed book is returned.</p>
      </div>
    </section>
  );
}

function Table({ columns, rows, empty }: { columns: string[]; rows: (React.ReactNode[])[]; empty: string }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr>
        </thead>
        <tbody>
          {rows.length ? rows.map((row, index) => (
            <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>
          )) : (
            <tr><td colSpan={columns.length} className="empty">{empty}</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
