// Client-safe demo mode utilities (no server-side imports)

export function isDemoMode() {
    return typeof window !== 'undefined' && localStorage.getItem('medichain_demo_mode') === 'true';
}

export function enableDemoMode() {
    if (typeof window !== 'undefined') {
        localStorage.setItem('medichain_demo_mode', 'true');
    }
}

export function disableDemoMode() {
    if (typeof window !== 'undefined') {
        localStorage.removeItem('medichain_demo_mode');
    }
}
