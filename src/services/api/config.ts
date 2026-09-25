export const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
export const API_BASE = rawApiUrl.endsWith('/api') ? rawApiUrl.slice(0, -4) : rawApiUrl;
export const API_URL = `${API_BASE}/api`;
