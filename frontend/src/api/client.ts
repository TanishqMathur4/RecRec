import axios from "axios";

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000",
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401 mid-session, wipe the token so the router redirects to /login.
// We don't call navigate() here (no React context) — AuthContext detects
// the missing token on next render.
client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      const isAuthEndpoint = err.config?.url?.includes("/api/auth/");
      if (!isAuthEndpoint) {
        localStorage.removeItem("access_token");
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

export default client;
