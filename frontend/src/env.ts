export const APP_ENV = {
  api: {
    baseUrl: import.meta.env.VITE_API_BASE_URL || "http://localhost:3000",
  },
} as const; 