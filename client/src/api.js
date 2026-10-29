import axios from "axios";

// Production uses the same-origin Vercel rewrite: /api/* -> the server service.
// For local development, set VITE_API_URL=http://localhost:5000/api in client/.env.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
});

export default api;
