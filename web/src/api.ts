import type { AuthSession, Category, Food, FoodInput, HistoryPage, SpinFilters, SpinHistoryItem, SpinResult, User } from "./types";

// Local-first mode lets the standalone web app run without PostgreSQL. Set VITE_STORAGE_MODE=api for a deployed backend.
const STORAGE_MODE = import.meta.env.VITE_STORAGE_MODE ?? "local";
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
const STATE_KEY = "foodspin_local_state_v1";
const SESSION_KEY = "foodspin_local_session_v1";
type StoredUser = User & { password: string };
type StoredFood = Food & { ownerId: string | null };
type LocalHistory = SpinHistoryItem & { ownerId?: string };
type LocalState = { users: StoredUser[]; foods: StoredFood[]; history: LocalHistory[] };
let accessToken: string | null = null;
const now = () => new Date().toISOString();
const id = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const categories: Category[] = [
  { id: "cat-vietnamese", slug: "vietnamese", name: "Món Việt" }, { id: "cat-fast-food", slug: "fast-food", name: "Fast Food" },
  { id: "cat-healthy", slug: "healthy", name: "Healthy" }, { id: "cat-dessert", slug: "dessert", name: "Dessert" },
  { id: "cat-drink", slug: "drink", name: "Đồ uống" }, { id: "cat-other", slug: "other", name: "Khác" },
];
const seed: Array<[string, string, string, string[], string[]]> = [
  ["Phở bò", "pho-bo", "vietnamese", ["breakfast", "lunch", "dinner"], []], ["Phở gà", "pho-ga", "vietnamese", ["breakfast", "lunch", "dinner"], []],
  ["Bún bò Huế", "bun-bo-hue", "vietnamese", ["lunch", "dinner", "late-night"], ["spicy"]], ["Bún chả", "bun-cha", "vietnamese", ["lunch", "dinner"], []],
  ["Bún thịt nướng", "bun-thit-nuong", "vietnamese", ["lunch", "dinner"], []], ["Cơm tấm", "com-tam", "vietnamese", ["lunch", "dinner"], []],
  ["Cơm gà", "com-ga", "vietnamese", ["lunch", "dinner"], []], ["Cơm chiên", "com-chien", "vietnamese", ["lunch", "dinner", "late-night"], []],
  ["Bánh mì", "banh-mi", "vietnamese", ["breakfast", "lunch"], []], ["Hủ tiếu", "hu-tieu", "vietnamese", ["breakfast", "lunch", "late-night"], []],
  ["Mì Quảng", "mi-quang", "vietnamese", ["lunch", "dinner", "late-night"], []], ["Bánh xèo", "banh-xeo", "vietnamese", ["lunch", "dinner"], []],
  ["Bánh canh", "banh-canh", "vietnamese", ["lunch", "dinner"], []], ["Bún riêu", "bun-rieu", "vietnamese", ["lunch", "dinner"], []],
  ["Bún đậu mắm tôm", "bun-dau-mam-tom", "vietnamese", ["lunch", "dinner"], []], ["Gỏi cuốn", "goi-cuon", "vietnamese", ["lunch", "dinner"], ["vegetarian"]],
  ["Burger bò", "burger-bo", "fast-food", ["lunch", "dinner", "late-night"], []], ["Burger gà", "burger-ga", "fast-food", ["lunch", "dinner", "late-night"], []],
  ["Gà rán", "ga-ran", "fast-food", ["lunch", "dinner", "late-night"], []], ["Hot dog", "hot-dog", "fast-food", ["lunch", "dinner", "late-night"], []],
  ["Khoai tây chiên", "khoai-tay-chien", "fast-food", ["lunch", "dinner", "late-night"], ["vegetarian"]], ["Nuggets", "nuggets", "fast-food", ["lunch", "dinner", "late-night"], []],
  ["Salad ức gà", "salad-uc-ga", "healthy", ["lunch", "dinner"], []], ["Salad cá ngừ", "salad-ca-ngu", "healthy", ["lunch", "dinner"], []],
  ["Poke bowl", "poke-bowl", "healthy", ["lunch", "dinner"], []], ["Cơm gạo lứt ức gà", "com-gao-lut-uc-ga", "healthy", ["lunch", "dinner"], []],
  ["Granola yogurt", "granola-yogurt", "healthy", ["breakfast", "lunch"], ["vegetarian"]], ["Bánh flan", "banh-flan", "dessert", ["lunch", "dinner"], ["vegetarian"]],
  ["Tiramisu", "tiramisu", "dessert", ["lunch", "dinner"], ["vegetarian"]], ["Cheesecake", "cheesecake", "dessert", ["lunch", "dinner"], ["vegetarian"]],
  ["Donut", "donut", "dessert", ["breakfast", "late-night"], ["vegetarian"]], ["Kem", "kem", "dessert", ["lunch", "dinner", "late-night"], ["vegetarian"]],
  ["Chè", "che", "dessert", ["lunch", "dinner"], ["vegetarian"]], ["Trà sữa", "tra-sua", "drink", ["lunch", "dinner", "late-night"], ["vegetarian"]],
  ["Cà phê sữa đá", "ca-phe-sua-da", "drink", ["breakfast", "lunch", "late-night"], ["vegetarian"]], ["Matcha latte", "matcha-latte", "drink", ["breakfast", "lunch", "late-night"], ["vegetarian"]],
  ["Sinh tố", "sinh-to", "drink", ["breakfast", "lunch", "dinner"], ["vegetarian"]], ["Nước ép", "nuoc-ep", "drink", ["breakfast", "lunch", "dinner"], ["vegetarian"]],
];
const publicFood = (food: StoredFood): Food => { const { ownerId: _ownerId, ...view } = food; return view; };
const fail = (message: string, code = "LOCAL_STORAGE_ERROR") => { const issue = new Error(message) as Error & { code?: string }; issue.code = code; return issue; };
const sessionUserId = () => JSON.parse(localStorage.getItem(SESSION_KEY) ?? "null")?.userId as string | undefined;
const requireUser = () => { const userId = sessionUserId(); if (!userId) throw fail("Vui lòng đăng nhập để tiếp tục.", "AUTH_REQUIRED"); return userId; };
const userView = (user: StoredUser): User => { const { password: _password, ...safe } = user; return safe; };
const read = (): LocalState => { try { const stored = localStorage.getItem(STATE_KEY); if (stored) return JSON.parse(stored) as LocalState; } catch { /* reset corrupt local state below */ } const state: LocalState = { users: [], history: [], foods: seed.map(([name, image, slug, mealTimes, flags], index) => ({ id: `default-${index + 1}`, ownerId: null, name, imageUrl: `/foods/${image}.png`, description: null, spicy: flags.includes("spicy"), vegetarian: flags.includes("vegetarian"), category: categories.find(item => item.slug === slug) ?? null, mealTimes: mealTimes as Food["mealTimes"], isCustom: false, isEnabled: true, isFavorite: false, createdAt: now() })) }; localStorage.setItem(STATE_KEY, JSON.stringify(state)); return state; };
const write = (state: LocalState) => localStorage.setItem(STATE_KEY, JSON.stringify(state));
const visible = (state: LocalState, userId: string) => state.foods.filter(food => !food.ownerId || food.ownerId === userId);
const dataUrl = (file: File) => new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(fail("Không thể đọc ảnh.")); reader.readAsDataURL(file); });
function foodForm(input: Partial<FoodInput>, image?: File) { const form = new FormData(); if (input.name !== undefined) form.append("name", input.name); if (input.description !== undefined) form.append("description", input.description); if (input.categoryId !== undefined) form.append("categoryId", input.categoryId ?? ""); input.mealTimes?.forEach(value => form.append("mealTimes", value)); if (input.spicy !== undefined) form.append("spicy", String(input.spicy)); if (input.vegetarian !== undefined) form.append("vegetarian", String(input.vegetarian)); if (image) form.append("image", image); return form; }

const localApi = {
  restoreSession: async () => { const user = read().users.find(item => item.id === sessionUserId()); return user ? userView(user) : null; },
  login: async ({ email, password }: { email: string; password: string }): Promise<AuthSession> => { const user = read().users.find(item => item.email.toLowerCase() === email.toLowerCase()); if (!user || user.password !== password) throw fail("Email hoặc mật khẩu không đúng.", "INVALID_CREDENTIALS"); const token = id(); localStorage.setItem(SESSION_KEY, JSON.stringify({ userId: user.id, token })); accessToken = token; return { user: userView(user), accessToken: token }; },
  register: async ({ displayName, email, password }: { displayName: string; email: string; password: string }) => { const state = read(); if (state.users.some(item => item.email.toLowerCase() === email.toLowerCase())) throw fail("Email này đã được đăng ký.", "EMAIL_EXISTS"); const user: StoredUser = { id: id(), email, password, displayName, avatarUrl: null, createdAt: now() }; state.users.push(user); write(state); return userView(user); },
  me: async () => { const user = read().users.find(item => item.id === requireUser()); if (!user) throw fail("Phiên đăng nhập đã hết hạn.", "AUTH_REQUIRED"); return userView(user); },
  logout: async () => { accessToken = null; localStorage.removeItem(SESSION_KEY); },
  foods: async () => { const state = read(); return visible(state, requireUser()).map(publicFood); },
  food: async (foodId: string) => { const state = read(); const food = visible(state, requireUser()).find(item => item.id === foodId); if (!food) throw fail("Không tìm thấy món ăn.", "FOOD_NOT_FOUND"); return publicFood(food); },
  categories: async () => categories,
  createFood: async (input: FoodInput, image: File) => { const state = read(); const food: StoredFood = { id: id(), ownerId: requireUser(), name: input.name, imageUrl: await dataUrl(image), description: input.description ?? null, spicy: input.spicy, vegetarian: input.vegetarian, category: categories.find(item => item.id === input.categoryId) ?? null, mealTimes: input.mealTimes, isCustom: true, isEnabled: true, isFavorite: false, createdAt: now() }; state.foods.unshift(food); write(state); return publicFood(food); },
  updateFood: async (foodId: string, input: Partial<FoodInput>, image?: File) => { const state = read(); const food = state.foods.find(item => item.id === foodId && item.ownerId === requireUser()); if (!food) throw fail("Bạn chỉ có thể sửa món của mình.", "FOOD_NOT_FOUND"); Object.assign(food, { ...input, category: input.categoryId === null ? null : input.categoryId !== undefined ? categories.find(item => item.id === input.categoryId) ?? null : food.category, imageUrl: image ? await dataUrl(image) : food.imageUrl, description: input.description ?? food.description }); write(state); return publicFood(food); },
  deleteFood: async (foodId: string) => { const state = read(); const index = state.foods.findIndex(item => item.id === foodId && item.ownerId === requireUser()); if (index < 0) throw fail("Bạn chỉ có thể xóa món của mình.", "FOOD_NOT_FOUND"); state.foods.splice(index, 1); write(state); return { deleted: true }; },
  favorite: async (foodId: string, isFavorite: boolean) => { const state = read(); const food = visible(state, requireUser()).find(item => item.id === foodId); if (!food) throw fail("Không tìm thấy món ăn.", "FOOD_NOT_FOUND"); food.isFavorite = isFavorite; write(state); return { isFavorite }; },
  enabled: async (foodId: string, isEnabled: boolean) => { const state = read(); const food = visible(state, requireUser()).find(item => item.id === foodId); if (!food) throw fail("Không tìm thấy món ăn.", "FOOD_NOT_FOUND"); food.isEnabled = isEnabled; write(state); return { isEnabled }; },
  spin: async (filters: SpinFilters): Promise<SpinResult> => { const state = read(); const userId = requireUser(); const eligible = visible(state, userId).filter(food => food.isEnabled && (!filters.categoryId || food.category?.id === filters.categoryId) && (!filters.mealTime || food.mealTimes.includes(filters.mealTime)) && (filters.spicy === undefined || food.spicy === filters.spicy) && (filters.vegetarian === undefined || food.vegetarian === filters.vegetarian)); if (!eligible.length) throw fail("Không có món phù hợp để quay.", "NO_ELIGIBLE_FOODS"); const winner = eligible[Math.floor(Math.random() * eligible.length)]; const result: SpinResult = { spinId: id(), winner: publicFood(winner), filters, spunAt: now() }; state.history.unshift({ id: result.spinId, ownerId: userId, food: result.winner, filters, spunAt: result.spunAt }); write(state); return result; },
  history: async (page = 1, limit = 20): Promise<HistoryPage> => { const state = read(); const userId = requireUser(); const ownIds = new Set(visible(state, userId).map(food => food.id)); const items = state.history.filter(item => item.ownerId === userId || (!item.ownerId && (ownIds.has(item.food.id) || !item.food.isCustom))); const start = (page - 1) * limit; return { items: items.slice(start, start + limit), page, limit, total: items.length, hasMore: start + limit < items.length }; },
};

async function remote<T>(path: string, init: RequestInit = {}, auth = false): Promise<T> { const headers = new Headers(init.headers); headers.set("Accept", "application/json"); if (auth && accessToken) headers.set("Authorization", `Bearer ${accessToken}`); if (init.body && !(init.body instanceof FormData)) headers.set("Content-Type", "application/json"); const response = await fetch(`${API_URL}${path}`, { ...init, headers, credentials: "include" }); const payload = await response.json().catch(() => null) as { success: boolean; data: T; message?: string; code?: string } | null; if (!response.ok || !payload?.success) throw fail(payload?.message ?? "Không thể kết nối đến máy chủ.", payload?.code); return payload.data; }
async function remoteRestore() { if (!accessToken) { const session = await remote<AuthSession>("/api/auth/refresh", { method: "POST" }); accessToken = session.accessToken; } return remote<User>("/api/auth/me", {}, true); }

export const tokenStore = { hasSession: () => Boolean(accessToken || localStorage.getItem(SESSION_KEY)), getAccessToken: () => accessToken, save: (session: AuthSession) => { accessToken = session.accessToken; localStorage.setItem(SESSION_KEY, JSON.stringify({ userId: session.user.id, token: session.accessToken })); }, clear: () => { accessToken = null; localStorage.removeItem(SESSION_KEY); } };
export const api = STORAGE_MODE === "api" ? {
  restoreSession: remoteRestore, login: (body: { email: string; password: string }) => remote<AuthSession>("/api/auth/login", { method: "POST", body: JSON.stringify(body) }), register: (body: { displayName: string; email: string; password: string }) => remote<User>("/api/auth/register", { method: "POST", body: JSON.stringify(body) }), me: () => remote<User>("/api/auth/me", {}, true), logout: () => remote<unknown>("/api/auth/logout", { method: "POST", body: "{}" }, true), foods: () => remote<Food[]>("/api/foods", {}, true), food: (id: string) => remote<Food>(`/api/foods/${id}`, {}, true), categories: () => remote<Category[]>("/api/categories", {}, true), createFood: (input: FoodInput, image: File) => remote<Food>("/api/foods", { method: "POST", body: foodForm(input, image) }, true), updateFood: (foodId: string, input: Partial<FoodInput>, image?: File) => remote<Food>(`/api/foods/${foodId}`, { method: "PATCH", body: foodForm(input, image) }, true), deleteFood: (id: string) => remote<{ deleted: boolean }>(`/api/foods/${id}`, { method: "DELETE" }, true), favorite: (id: string, value: boolean) => remote<{ isFavorite: boolean }>(`/api/foods/${id}/favorite`, { method: "PATCH", body: JSON.stringify({ isFavorite: value }) }, true), enabled: (id: string, value: boolean) => remote<{ isEnabled: boolean }>(`/api/foods/${id}/enabled`, { method: "PATCH", body: JSON.stringify({ isEnabled: value }) }, true), spin: (filters: SpinFilters) => remote<SpinResult>("/api/spins", { method: "POST", body: JSON.stringify({ filters }) }, true), history: (page = 1, limit = 20) => remote<HistoryPage>(`/api/spins/history?page=${page}&limit=${limit}`, {}, true),
} : localApi;
