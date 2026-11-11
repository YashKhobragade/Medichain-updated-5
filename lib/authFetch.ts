'use client';

/** fetch() that sends the logged-in user's token, so the server knows who is acting. */
export function authFetch(url: string, init: RequestInit = {}) {
    let token: string | null = null;
    try { token = localStorage.getItem('medichain_auth_token'); } catch { /* storage blocked */ }
    const headers = new Headers(init.headers);
    if (token) headers.set('Authorization', `Bearer ${token}`);
    if (init.body && typeof init.body === 'string' && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    return fetch(url, { ...init, headers });
}
