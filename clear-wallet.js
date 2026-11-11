// Run this in browser console to clear wallet data
// Or execute this script

if (typeof window !== 'undefined') {
    // Clear wallet auto-connect flag
    localStorage.removeItem('medichain_wallet_auto_connect');

    // Clear any other wallet-related data
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('wallet') || key.includes('metamask') || key.includes('ethereum'))) {
            keysToRemove.push(key);
        }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key));

    console.log('✅ Cleared wallet data from localStorage');
    console.log('Removed keys:', ['medichain_wallet_auto_connect', ...keysToRemove]);

    // Reload the page to reset state
    window.location.reload();
} else {
    console.log('Run this in the browser console');
}
