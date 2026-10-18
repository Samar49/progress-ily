import axios from "axios";
import { toDateString } from "./utils/date.js";

const TOKEN_KEY = "progressily_token";
const USER_KEY = "progressily_user";

const api = axios.create({
  baseURL:
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "http://localhost:5000/api" : ""),
  timeout: 20000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || "";
    const isAuthAttempt = url.includes("/auth/login") || url.includes("/auth/register");

    if (error.response?.status === 401 && !isAuthAttempt) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      window.dispatchEvent(new Event("progressily:unauthorized"));
    }
    return Promise.reject(error);
  }
);

export function getErrorMessage(error, fallback = "Something went wrong. Please try again.") {
  if (error?.response?.data?.message) return error.response.data.message;
  if (error?.code === "ECONNABORTED") return "The server took too long to respond.";
  if (error?.message === "Network Error") {
    return "Cannot reach the server. Check your connection and try again.";
  }
  return error?.message || fallback;
}

const list = (data, key) => (Array.isArray(data) ? data : Array.isArray(data?.[key]) ? data[key] : []);
const item = (data, key) => data?.[key] ?? data;

// ---------- Authentication ----------
function storeUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export async function signIn(email, password) {
  const { data } = await api.post("/auth/login", { email, password });
  if (!data?.token || !data?.user) {
    throw new Error("The server returned an invalid login response.");
  }
  localStorage.setItem(TOKEN_KEY, data.token);
  storeUser(data.user);
  return data.user;
}

export async function signUp(name, email, password) {
  const { data } = await api.post("/auth/register", { name, email, password });
  return data;
}

export function getStoredUser() {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const user = localStorage.getItem(USER_KEY);
    if (!token || !user) return null;
    return JSON.parse(user);
  } catch {
    signOut();
    return null;
  }
}

export function signOut() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function updateProfile(payload) {
  const { data } = await api.put("/auth/profile", payload);
  storeUser(data.user);
  return data.user;
}

export async function changePassword(currentPassword, newPassword) {
  const { data } = await api.put("/auth/password", { currentPassword, newPassword });
  return data;
}

export async function deleteAccount(password) {
  const { data } = await api.delete("/auth/account", { data: { password } });
  return data;
}

// ---------- Tasks ----------
export async function getTasks(filters = {}) {
  const params = typeof filters === "string" ? { date: filters } : filters;
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== "")
  );
  const { data } = await api.get("/tasks", { params: clean });
  return list(data, "tasks");
}

export async function addTask(task) {
  const { data } = await api.post("/tasks", task);
  return item(data, "task");
}

export async function editTask(id, task) {
  const { data } = await api.put(`/tasks/${id}`, task);
  return item(data, "task");
}

export async function removeTask(id) {
  const { data } = await api.delete(`/tasks/${id}`);
  return data;
}

// ---------- Goals ----------
export async function getGoals(params = {}) {
  const { data } = await api.get("/goals", { params });
  return list(data, "goals");
}

export async function addGoal(goal) {
  const { data } = await api.post("/goals", goal);
  return item(data, "goal");
}

export async function editGoal(id, goal) {
  const { data } = await api.put(`/goals/${id}`, goal);
  return item(data, "goal");
}

export async function removeGoal(id) {
  const { data } = await api.delete(`/goals/${id}`);
  return data;
}

// ---------- Analytics ----------
export async function getAnalyticsSummary(filters = {}) {
  const params = { today: toDateString() };
  if (filters.startDate) params.startDate = filters.startDate;
  if (filters.endDate) params.endDate = filters.endDate;
  const { data } = await api.get("/analytics/summary", { params });
  return data?.summary ?? data;
}

// ---------- Focus sessions ----------
export async function logFocusSession(session) {
  const { data } = await api.post("/focus", session);
  return item(data, "session");
}

export async function getFocusSessions(params = {}) {
  const { data } = await api.get("/focus", { params });
  return list(data, "sessions");
}

export async function getFocusSummary(params = {}) {
  const { data } = await api.get("/focus/summary", { params });
  return data?.summary ?? data;
}

export async function removeFocusSession(id) {
  const { data } = await api.delete(`/focus/${id}`);
  return data;
}

export default api;