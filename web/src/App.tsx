import { createContext, type FormEvent, type ReactNode, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, Check, ChevronRight, Clock3, Heart, Home, ImagePlus, LogOut,
  Menu, Plus, Search, Settings2, Sparkles, Trash2, Utensils, UserRound, X,
} from "lucide-react";
import { api, tokenStore } from "./api";
import type { Category, Food, FoodInput, MealTime, SpinFilters, SpinHistoryItem, User } from "./types";
import { MEAL_TIMES, MEAL_TIME_LABELS } from "./meal-times";

type AppState = {
  user: User | null; foods: Food[]; categories: Category[]; loading: boolean; dataError: string;
  reloadFoods: () => Promise<void>; setFoods: React.Dispatch<React.SetStateAction<Food[]>>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>; signOut: () => Promise<void>;
};

const AppContext = createContext<AppState | null>(null);
const useApp = () => {
  const value = useContext(AppContext);
  if (!value) throw new Error("AppContext is missing");
  return value;
};

function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [foods, setFoods] = useState<Food[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataError, setDataError] = useState("");

  const reloadFoods = async () => { try { setFoods(await api.foods()); } catch (error) { setDataError("Không thể tải danh sách món."); throw error; } };
  useEffect(() => {
    const init = async () => {
      try { setUser(await api.restoreSession()); } catch { tokenStore.clear(); }
      finally { setLoading(false); }
    };
    void init();
  }, []);
  useEffect(() => {
    if (!user) return;
    setDataError("");
    void Promise.all([reloadFoods(), api.categories().then(setCategories)]).catch(() => setDataError("Không thể tải đầy đủ món ăn hoặc danh mục."));
  }, [user]);

  const signIn = async (email: string, password: string) => {
    const session = await api.login({ email, password }); tokenStore.save(session); setUser(session.user);
  };
  const signUp = async (displayName: string, email: string, password: string) => {
    await api.register({ displayName, email, password }); await signIn(email, password);
  };
  const signOut = async () => {
    try { await api.logout(); } catch { /* local sign-out remains available offline */ }
    tokenStore.clear(); setUser(null); setFoods([]);
  };

  return <AppContext.Provider value={{ user, foods, categories, loading, dataError, reloadFoods, setFoods, signIn, signUp, signOut }}>{children}</AppContext.Provider>;
}

function Brand() {
  return <NavLink className="brand" to="/"><span className="brand-mark"><Utensils size={20} /></span><span>FoodSpin</span></NavLink>;
}

function Button({ children, variant = "primary", className = "", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger" }) {
  return <button className={`button button-${variant} ${className}`} {...props}>{children}</button>;
}

function Spinner() { return <div className="loading"><span className="loader" /><span>Đang chuẩn bị món ngon...</span></div>; }

function Protected({ children }: { children: ReactNode }) {
  const { user, loading } = useApp();
  if (loading) return <Spinner />;
  return user ? children : <Navigate to="/login" replace />;
}

const navItems = [
  { to: "/", label: "Trang chủ", icon: Home },
  { to: "/foods/new", label: "Thêm món", icon: Plus },
  { to: "/history", label: "Lịch sử", icon: Clock3 },
  { to: "/profile", label: "Hồ sơ", icon: UserRound },
];

function Shell({ children }: { children: ReactNode }) {
  const { user } = useApp();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  useEffect(() => setOpen(false), [location.pathname]);
  return <div className="app-shell">
    <header className="topbar">
      <Brand />
      <nav className="desktop-nav" aria-label="Điều hướng chính">
        {navItems.map(({ to, label, icon: Icon }) => <NavLink key={to} end={to === "/"} to={to}><Icon size={18} />{label}</NavLink>)}
      </nav>
      <div className="topbar-actions">
        <NavLink className="spin-shortcut" to="/spin"><Sparkles size={17} /> Quay món</NavLink>
        <span className="avatar" aria-label={user?.displayName ?? "Tài khoản"}>{(user?.displayName ?? user?.email ?? "F").charAt(0).toUpperCase()}</span>
        <button className="menu-button" onClick={() => setOpen(!open)} aria-label="Mở menu" aria-expanded={open}>{open ? <X /> : <Menu />}</button>
      </div>
      {open && <nav className="mobile-nav" aria-label="Điều hướng di động">
        {navItems.map(({ to, label, icon: Icon }) => <NavLink key={to} end={to === "/"} to={to}><Icon size={19} />{label}</NavLink>)}
        <NavLink to="/spin"><Sparkles size={19} />Quay món</NavLink>
      </nav>}
    </header>
    <main className="page">{children}</main>
    <footer><Brand /><span>Chọn món nhẹ đầu, ăn ngon mỗi ngày.</span></footer>
  </div>;
}

function AuthPage({ register = false }: { register?: boolean }) {
  const { user, signIn, signUp } = useApp();
  const navigate = useNavigate();
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState(""); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  if (user) return <Navigate to="/" replace />;
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError("");
    if (!email.includes("@")) return setError("Email không hợp lệ.");
    if (register && name.trim().length < 2) return setError("Tên hiển thị cần ít nhất 2 ký tự.");
    if (register && password.length < 8) return setError("Mật khẩu cần ít nhất 8 ký tự.");
    if (register && password !== confirm) return setError("Mật khẩu xác nhận chưa khớp.");
    setBusy(true);
    try { register ? await signUp(name.trim(), email.trim(), password) : await signIn(email.trim(), password); navigate("/"); }
    catch (err) { setError(err instanceof Error ? err.message : "Không thể đăng nhập."); }
    finally { setBusy(false); }
  };
  return <div className="auth-page">
    <div className="auth-brand"><Brand /></div>
    <section className="auth-story">
      <span className="eyebrow"><Sparkles size={15} /> BỮA ĂN BỚT ĐAU ĐẦU</span>
      <h1>Mỗi vòng quay,<br /><em>một món ngon.</em></h1>
      <p>Không còn mất thời gian hỏi “hôm nay ăn gì?”. FoodSpin chọn giúp bạn trong vài giây.</p>
      <div className="mini-reel"><span>Phở bò</span><span className="selected">Bún chả</span><span>Cơm tấm</span></div>
    </section>
    <section className="auth-panel">
      <form onSubmit={submit} className="auth-form">
        <span className="eyebrow">{register ? "BẮT ĐẦU NGAY" : "CHÀO MỪNG TRỞ LẠI"}</span>
        <h2>{register ? "Tạo tài khoản" : "Đăng nhập"}</h2>
        <p>{register ? "Lưu món yêu thích và lịch sử của riêng bạn." : "Tiếp tục hành trình khám phá món ngon."}</p>
        {register && <Field label="Tên hiển thị"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tên của bạn" autoComplete="name" /></Field>}
        <Field label="Email"><input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" type="email" autoComplete="email" /></Field>
        <Field label="Mật khẩu"><input value={password} onChange={(e) => setPassword(e.target.value)} placeholder={register ? "Ít nhất 8 ký tự" : "••••••••"} type="password" autoComplete={register ? "new-password" : "current-password"} /></Field>
        {register && <Field label="Xác nhận mật khẩu"><input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Nhập lại mật khẩu" type="password" autoComplete="new-password" /></Field>}
        {error && <p className="form-error" role="alert">{error}</p>}
        <Button disabled={busy} type="submit">{busy ? "ĐANG XỬ LÝ..." : register ? "TẠO TÀI KHOẢN" : "ĐĂNG NHẬP"}<ArrowRight size={18} /></Button>
        <p className="auth-switch">{register ? "Đã có tài khoản?" : "Chưa có tài khoản?"} <NavLink to={register ? "/login" : "/register"}>{register ? "Đăng nhập" : "Đăng ký miễn phí"}</NavLink></p>
      </form>
    </section>
  </div>;
}

function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="field"><span>{label}</span>{children}</label>; }

function Dashboard() {
  const { user, foods } = useApp();
  const navigate = useNavigate();
  const enabled = foods.filter((food) => food.isEnabled);
  const favorites = foods.filter((food) => food.isFavorite).slice(0, 3);
  return <>
    <section className="hero-section">
      <div className="hero-copy">
        <span className="eyebrow"><Sparkles size={15} /> XIN CHÀO, {user?.displayName?.toUpperCase() ?? "BẠN"}</span>
        <h1>Hôm nay<br /><em>ăn gì nhỉ?</em></h1>
        <p>Để FoodSpin chọn một món thật ngon cho bạn. Nhanh, vui và không phải suy nghĩ.</p>
        <div className="hero-actions"><Button onClick={() => navigate("/spin")}><Sparkles size={18} /> QUAY MÓN NGAY</Button><Button variant="secondary" onClick={() => navigate("/foods/new")}><Plus size={18} /> THÊM MÓN</Button></div>
        <div className="stats"><div><strong>{enabled.length}</strong><span>Món đang bật</span></div><div><strong>{foods.filter(f => f.isFavorite).length}</strong><span>Món yêu thích</span></div><div><strong>{foods.filter(f => f.isCustom).length}</strong><span>Món của bạn</span></div></div>
      </div>
      <div className="hero-visual" aria-hidden="true">
        <div className="orbit orbit-one" /><div className="orbit orbit-two" />
        <div className="dish-card dish-back"><span>🍜</span><b>Phở bò</b></div>
        <div className="dish-card dish-front"><span>🍚</span><b>Cơm tấm</b><small>LỰA CHỌN HÔM NAY</small></div>
        <div className="spark spark-one">✦</div><div className="spark spark-two">✦</div>
      </div>
    </section>
    <section className="section-block">
      <div className="section-heading"><div><span className="eyebrow">GỢI Ý CHO BẠN</span><h2>Món yêu thích</h2></div><NavLink to="/foods/new">Thêm món <Plus size={16} /></NavLink></div>
      {favorites.length ? <div className="food-grid">{favorites.map(food => <FoodCard key={food.id} food={food} compact />)}</div> : <EmptyState title="Chưa có món yêu thích" text="Thả tim các món bạn muốn nhìn thấy ở đây." action="Thêm món mới" onClick={() => navigate("/foods/new")} />}
    </section>
  </>;
}

function FoodCard({ food, compact = false, onUpdate }: { food: Food; compact?: boolean; onUpdate?: (food: Food) => void }) {
  const { setFoods } = useApp(); const [actionError, setActionError] = useState("");
  const patch = (next: Food) => { setFoods(items => items.map(item => item.id === next.id ? next : item)); onUpdate?.(next); };
  const favorite = async () => { setActionError(""); try { const result = await api.favorite(food.id, !food.isFavorite); patch({ ...food, isFavorite: result.isFavorite }); } catch { setActionError("Không thể cập nhật yêu thích."); } };
  const toggle = async () => { setActionError(""); try { const result = await api.enabled(food.id, !food.isEnabled); patch({ ...food, isEnabled: result.isEnabled }); } catch { setActionError("Không thể cập nhật vòng quay."); } };
  return <article className={`food-card ${compact ? "compact" : ""}`}>
    <div className="food-image"><NavLink to={`/foods/${food.id}`} aria-label={`Xem ${food.name}`}>{food.imageUrl ? <img src={food.imageUrl} alt={`Món ${food.name}`} loading="lazy" /> : <span>🍜</span>}</NavLink>
      <button className={`heart ${food.isFavorite ? "active" : ""}`} onClick={() => void favorite()} aria-label={food.isFavorite ? "Bỏ yêu thích" : "Thêm yêu thích"}><Heart size={19} fill={food.isFavorite ? "currentColor" : "none"} /></button>
      {food.isCustom && <span className="food-badge">CỦA BẠN</span>}
    </div>
    <div className="food-content"><NavLink to={`/foods/${food.id}`}><span className="food-category">{food.category?.name ?? "Món ngon"}</span><h3>{food.name}</h3></NavLink>
      {!compact && <button className={`toggle ${food.isEnabled ? "on" : ""}`} onClick={() => void toggle()} aria-label={`${food.isEnabled ? "Tắt" : "Bật"} ${food.name}`}><span />{food.isEnabled ? "Đang bật" : "Đã tắt"}</button>}
    </div>
    {actionError && <p className="card-error" role="alert">{actionError}</p>}
  </article>;
}

function FoodsPage() {
  const { foods, categories, dataError, reloadFoods } = useApp(); const navigate = useNavigate();
  const [query, setQuery] = useState(""); const [filter, setFilter] = useState("all"); const [category, setCategory] = useState("all"); const [error, setError] = useState("");
  useEffect(() => { void reloadFoods().catch(() => setError("Không thể tải kho món. Vui lòng thử lại.")); }, []);
  const shown = foods.filter(food => food.name.toLowerCase().includes(query.toLowerCase()) && (category === "all" || food.category?.id === category) && (filter === "all" || filter === "favorite" && food.isFavorite || filter === "custom" && food.isCustom || filter === "enabled" && food.isEnabled));
  return <section className="section-block foods-page">
    <div className="page-heading"><div><span className="eyebrow">BỘ SƯU TẬP CỦA BẠN</span><h1>Kho món ngon</h1><p>Bật những món bạn muốn đưa vào vòng quay hôm nay.</p></div><Button onClick={() => navigate("/foods/new")}><Plus size={18} /> THÊM MÓN</Button></div>
    <div className="toolbar"><label className="search-box"><Search size={19} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Tìm món ăn..." /></label></div>
    <div className="filter-group"><b>Danh mục</b><div className="filter-tabs"><button className={category === "all" ? "active" : ""} onClick={() => setCategory("all")}>Tất cả</button>{categories.map(item => <button key={item.id} className={category === item.id ? "active" : ""} onClick={() => setCategory(item.id)}>{item.name}</button>)}</div></div>
    <div className="filter-group"><b>Trạng thái</b><div className="filter-tabs">{[["all","Tất cả"],["enabled","Đang bật"],["favorite","Yêu thích"],["custom","Của bạn"]].map(([value,label]) => <button key={value} className={filter === value ? "active" : ""} onClick={() => setFilter(value)}>{label}</button>)}</div></div>
    {(error || dataError) && <p className="form-error" role="alert">{error || dataError}</p>}
    <div className="result-count">{shown.length} món phù hợp</div>
    {shown.length ? <div className="food-grid">{shown.map(food => <FoodCard key={food.id} food={food} />)}</div> : <EmptyState title="Không tìm thấy món" text="Thử một từ khóa hoặc bộ lọc khác nhé." />}
  </section>;
}

function EmptyState({ title, text, action, onClick }: { title: string; text: string; action?: string; onClick?: () => void }) {
  return <div className="empty-state"><span>🍽️</span><h3>{title}</h3><p>{text}</p>{action && <Button variant="secondary" onClick={onClick}>{action}</Button>}</div>;
}

function FoodDetail() {
  const { id } = useParams(); const navigate = useNavigate(); const { setFoods } = useApp();
  const [food, setFood] = useState<Food | null>(null); const [error, setError] = useState("");
  useEffect(() => { if (id) void api.food(id).then(setFood).catch(err => setError(err.message)); }, [id]);
  if (error && !food) return <EmptyState title="Không tải được món" text={error} />;
  if (!food) return <Spinner />;
  const updateLocal = (next: Food) => { setFood(next); setFoods(items => items.map(item => item.id === next.id ? next : item)); };
  const favorite = async () => { setError(""); try { const result = await api.favorite(food.id, !food.isFavorite); updateLocal({ ...food, isFavorite: result.isFavorite }); } catch { setError("Không thể cập nhật món yêu thích."); } };
  const toggle = async () => { setError(""); try { const result = await api.enabled(food.id, !food.isEnabled); updateLocal({ ...food, isEnabled: result.isEnabled }); } catch { setError("Không thể cập nhật vòng quay."); } };
  const remove = async () => { if (!confirm(`Xóa “${food.name}”?`)) return; setError(""); try { await api.deleteFood(food.id); setFoods(items => items.filter(item => item.id !== food.id)); navigate("/foods"); } catch { setError("Không thể xóa món. Vui lòng thử lại."); } };
  return <section className="detail-page">
    <button className="back-link" onClick={() => navigate(-1)}><ArrowLeft size={18} /> Quay lại</button>
    <div className="detail-layout"><div className="detail-image">{food.imageUrl ? <img src={food.imageUrl} alt={food.name} /> : <span>🍜</span>}</div><div className="detail-copy">
      <span className="eyebrow">{food.category?.name ?? "MÓN NGON"}</span><h1>{food.name}</h1><p>{food.description || "Một lựa chọn hấp dẫn cho bữa ăn của bạn."}</p>
      <div className="tag-list">{food.mealTimes.map(time => <span key={time}>{MEAL_TIME_LABELS[time]}</span>)}{food.spicy && <span>🌶 Có cay</span>}{food.vegetarian && <span>🌿 Món chay</span>}</div>
      <div className="preference-actions"><Button variant="secondary" onClick={() => void favorite()}><Heart size={18} fill={food.isFavorite ? "currentColor" : "none"} />{food.isFavorite ? "BỎ YÊU THÍCH" : "YÊU THÍCH"}</Button><Button variant="secondary" onClick={() => void toggle()}>{food.isEnabled ? <Check size={18} /> : <X size={18} />}{food.isEnabled ? "ĐANG TRONG VÒNG QUAY" : "CHO VÀO VÒNG QUAY"}</Button></div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="detail-actions">{food.isCustom && <Button onClick={() => navigate(`/foods/${food.id}/edit`)}><Settings2 size={18} /> CHỈNH SỬA</Button>}{food.isCustom && <Button variant="danger" onClick={() => void remove()}><Trash2 size={18} /> XÓA MÓN</Button>}</div>
    </div></div>
  </section>;
}

function FoodForm({ edit = false }: { edit?: boolean }) {
  const { id } = useParams(); const navigate = useNavigate(); const { categories, setFoods } = useApp();
  const [name, setName] = useState(""); const [description, setDescription] = useState(""); const [categoryId, setCategoryId] = useState("");
  const [spicy, setSpicy] = useState(false); const [vegetarian, setVegetarian] = useState(false); const [mealTimes, setMealTimes] = useState<MealTime[]>([]);
  const [image, setImage] = useState<File | null>(null); const [preview, setPreview] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  useEffect(() => { if (!edit || !id) return; void api.food(id).then(food => { setName(food.name); setDescription(food.description ?? ""); setCategoryId(food.category?.id ?? ""); setSpicy(food.spicy); setVegetarian(food.vegetarian); setMealTimes(food.mealTimes); setPreview(food.imageUrl); }); }, [edit, id]);
  useEffect(() => () => { if (preview.startsWith("blob:")) URL.revokeObjectURL(preview); }, [preview]);
  const chooseImage = (file?: File) => { if (!file) return; setError(""); if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return setError("Ảnh phải là JPG, PNG hoặc WEBP."); if (file.size > 5 * 1024 * 1024) return setError("Ảnh không được lớn hơn 5 MB."); setImage(file); setPreview(URL.createObjectURL(file)); };
  const submit = async (event: FormEvent) => { event.preventDefault(); setError(""); if (!name.trim()) return setError("Vui lòng nhập tên món."); if (!edit && !image) return setError("Vui lòng chọn ảnh món ăn."); setBusy(true);
    const input: FoodInput = { name: name.trim(), description: description.trim(), categoryId: categoryId || (edit ? null : undefined), spicy, vegetarian, mealTimes };
    try { const saved = edit && id ? await api.updateFood(id, input, image ?? undefined) : await api.createFood(input, image!); setFoods(items => edit ? items.map(item => item.id === saved.id ? saved : item) : [saved, ...items]); navigate(`/foods/${saved.id}`); }
    catch (err) { setError(err instanceof Error ? err.message : "Không thể lưu món."); } finally { setBusy(false); }
  };
  const toggleMeal = (value: MealTime) => setMealTimes(items => items.includes(value) ? items.filter(i => i !== value) : [...items, value]);
  return <section className="form-page"><button className="back-link" onClick={() => navigate(-1)}><ArrowLeft size={18} /> Quay lại</button><div className="form-heading"><span className="eyebrow">MÓN CỦA RIÊNG BẠN</span><h1>{edit ? "Chỉnh sửa món" : "Thêm món mới"}</h1><p>Điền vài thông tin để món ăn xuất hiện trong vòng quay.</p></div>
    <form className="food-form" onSubmit={submit}><div className="form-main">
      <Field label="Tên món *"><input value={name} onChange={e => setName(e.target.value)} placeholder="Ví dụ: Bún bò Huế" /></Field>
      <Field label="Mô tả"><textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Mô tả ngắn về món ăn..." rows={4} /></Field>
      <Field label="Danh mục"><select value={categoryId} onChange={e => setCategoryId(e.target.value)}><option value="">Chưa phân loại</option>{categories.map(c => <option value={c.id} key={c.id}>{c.name}</option>)}</select></Field>
      <div className="field"><span>Bữa ăn phù hợp</span><div className="check-grid">{MEAL_TIMES.map(([value,label]) => <button type="button" key={value} className={mealTimes.includes(value) ? "checked" : ""} onClick={() => toggleMeal(value)}><Check size={16} />{label}</button>)}</div></div>
      <div className="switch-row"><label><input type="checkbox" checked={spicy} onChange={e => setSpicy(e.target.checked)} />🌶 Món cay</label><label><input type="checkbox" checked={vegetarian} onChange={e => setVegetarian(e.target.checked)} />🌿 Món chay</label></div>
    </div><aside><span className="label-text">Ảnh món ăn *</span><label className="image-picker">{preview ? <img src={preview} alt="Ảnh xem trước" /> : <><ImagePlus size={32} /><b>Chọn ảnh món ăn</b><small>JPG, PNG hoặc WEBP · tối đa 5 MB</small></>}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => chooseImage(e.target.files?.[0])} /></label></aside>
    {error && <p className="form-error wide" role="alert">{error}</p>}<div className="form-footer"><Button type="button" variant="ghost" onClick={() => navigate(-1)}>HỦY</Button><Button type="submit" disabled={busy}>{busy ? "ĐANG LƯU..." : edit ? "LƯU THAY ĐỔI" : "THÊM MÓN"}<ArrowRight size={18} /></Button></div></form>
  </section>;
}

function SpinPage() {
  const { foods, dataError } = useApp(); const navigate = useNavigate(); const active = foods.filter(food => food.isEnabled);
  const [reel, setReel] = useState<Food[]>([]); const [winner, setWinner] = useState<Food | null>(null); const [spinning, setSpinning] = useState(false); const [error, setError] = useState("");
  const stripRef = useRef<HTMLDivElement>(null);
  const filters: SpinFilters = {};
  const eligible = active;
  const spin = async () => {
    if (!eligible.length || spinning) return setError("Không có món phù hợp để quay.");
    setError(""); setWinner(null); setSpinning(true);
    try {
      const result = await api.spin(filters);
      const selected = result.winner;
      const items = Array.from({ length: 28 }, (_, index) => index === 24 ? selected : eligible[Math.floor(Math.random() * eligible.length)] ?? selected);
      if (stripRef.current) { stripRef.current.style.transition = "none"; stripRef.current.style.transform = "translateX(0)"; }
      setReel(items);
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (!stripRef.current) return;
        const target = stripRef.current.parentElement!.clientWidth / 2 - (24 * 176 + 82);
        stripRef.current.style.transition = "transform 4.5s cubic-bezier(.12,.72,.08,1)";
        stripRef.current.style.transform = `translateX(${target}px)`;
      }));
      window.setTimeout(() => { setWinner(selected); setSpinning(false); }, 4600);
    } catch (requestError) {
      const code = (requestError as Error & { code?: string }).code;
      setError(code === "NO_ELIGIBLE_FOODS" ? "Không có món phù hợp để quay." : "Không thể quay món. Vui lòng thử lại."); setSpinning(false);
    }
  };
  useEffect(() => { if (!active.length) return; setReel(active.slice(0, 6)); }, [foods.length]);
  return <section className="spin-page"><button className="back-link" onClick={() => navigate(-1)}><ArrowLeft size={18} /> Quay lại</button><div className="spin-heading"><span className="eyebrow"><Sparkles size={15} /> VÒNG QUAY MAY MẮN</span><h1>Hôm nay ăn gì?</h1><p>{eligible.length} món đang sẵn sàng — để FoodSpin chọn giúp bạn.</p></div>
    <div className="reel-window"><div className="reel-pointer" /><div ref={stripRef} className={`reel-strip ${spinning ? "spinning" : ""}`}>{reel.map((food, index) => <div className={`reel-card ${winner?.id === food.id && index === 24 ? "winner" : ""}`} key={`${food.id}-${index}`}>{food.imageUrl ? <img src={food.imageUrl} alt="" /> : <span>🍜</span>}<b>{food.name}</b><small>{food.category?.name ?? "Món ngon"}</small></div>)}</div></div>
    {winner && <div className="winner-callout"><span>HÔM NAY ĂN</span><strong>{winner.name}</strong><p>Chúc bạn ngon miệng!</p></div>}
    {(error || dataError || !eligible.length) && <div className="spin-empty" role="alert"><p className="form-error center">{error || dataError || "Chưa có món để quay."}</p>{!eligible.length && <div><Button variant="secondary" onClick={() => navigate("/foods/new")}><Plus size={18} /> THÊM MÓN</Button></div>}</div>}<Button className="spin-button" onClick={() => void spin()} disabled={spinning || !eligible.length}>{spinning ? "ĐANG CHỌN MÓN..." : <><Sparkles size={20} /> QUAY MÓN</>}</Button>
  </section>;
}

function HistoryPage() {
  const [history, setHistory] = useState<SpinHistoryItem[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [page, setPage] = useState(1); const [hasMore, setHasMore] = useState(false); const navigate = useNavigate();
  const load = async (nextPage: number, append = false) => { setLoading(true); setError(""); try { const result = await api.history(nextPage); setHistory(items => append ? [...items, ...result.items] : result.items); setHasMore(result.hasMore); setPage(result.page); } catch { setError("Không thể tải lịch sử quay."); } finally { setLoading(false); } };
  useEffect(() => { void load(1); }, []);
  return <section className="section-block"><div className="page-heading"><div><span className="eyebrow">NHỮNG LẦN ĐÃ QUAY</span><h1>Lịch sử chọn món</h1><p>Nhìn lại những bữa ăn FoodSpin đã chọn giúp bạn.</p></div><Button onClick={() => navigate("/spin")}><Sparkles size={18} /> QUAY MÓN</Button></div>
    {error && <p className="form-error" role="alert">{error} <button onClick={() => void load(page)}>Thử lại</button></p>}
    {loading && !history.length ? <Spinner /> : history.length ? <><div className="history-list">{history.map((item, index) => <article key={item.id}><div className="history-index">{String(index + 1).padStart(2, "0")}</div><div className="history-image">{item.food.imageUrl ? <img src={item.food.imageUrl} alt={`Món ${item.food.name}`} /> : "🍜"}</div><div><span>{item.food.category?.name ?? "Món ngon"}</span><h3>{item.food.name}</h3></div><time>{new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.spunAt))}</time><ChevronRight /></article>)}</div>{hasMore && <div className="load-more"><Button variant="secondary" disabled={loading} onClick={() => void load(page + 1, true)}>{loading ? "ĐANG TẢI..." : "XEM THÊM"}</Button></div>}</> : <EmptyState title="Chưa có lịch sử" text="Vòng quay đầu tiên đang chờ bạn." action="Quay món ngay" onClick={() => navigate("/spin")} />}
  </section>;
}

function ProfilePage() {
  const { user, foods, signOut } = useApp(); const navigate = useNavigate();
  const logout = async () => { await signOut(); navigate("/login"); };
  return <section className="profile-page"><div className="profile-card"><div className="profile-avatar">{(user?.displayName ?? user?.email ?? "F").charAt(0).toUpperCase()}</div><span className="eyebrow">THÀNH VIÊN FOODSPIN</span><h1>{user?.displayName ?? "FoodSpin user"}</h1><p>{user?.email}</p><div className="profile-stats"><div><strong>{foods.length}</strong><span>Tổng món</span></div><div><strong>{foods.filter(f => f.isFavorite).length}</strong><span>Yêu thích</span></div><div><strong>{foods.filter(f => f.isCustom).length}</strong><span>Tự thêm</span></div></div><Button variant="secondary" onClick={() => void logout()}><LogOut size={18} /> ĐĂNG XUẤT</Button></div></section>;
}

function AppRoutes() {
  return <Routes>
    <Route path="/login" element={<AuthPage />} /><Route path="/register" element={<AuthPage register />} />
    <Route path="*" element={<Protected><Shell><Routes>
      <Route path="/" element={<Dashboard />} /><Route path="/foods" element={<FoodsPage />} /><Route path="/foods/new" element={<FoodForm />} />
      <Route path="/foods/:id/edit" element={<FoodForm edit />} /><Route path="/foods/:id" element={<FoodDetail />} /><Route path="/spin" element={<SpinPage />} />
      <Route path="/history" element={<HistoryPage />} /><Route path="/profile" element={<ProfilePage />} /><Route path="*" element={<Navigate to="/" replace />} />
    </Routes></Shell></Protected>} />
  </Routes>;
}

export default function App() { return <AppProvider><AppRoutes /></AppProvider>; }
