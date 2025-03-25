// -------------------------------
// -- debounce function utility --
// -------------------------------
export function debounceFunction(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ---------------------------------
// -- debounce immediate function --
// ---------------------------------
export function debounceImmediate(func, wait) {
    let timeout;
    let isFirstCall = true;
    
    return function executedFunction(...args) {
        if (isFirstCall) {
            isFirstCall = false;
            func(...args);
            return;
        }
        
        const later = () => {
            clearTimeout(timeout);
            isFirstCall = true;
            func(...args);
        };
        
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// -----------------------------------
// -- debounce and swallow function --
// -----------------------------------
export function debounceAndSwallow(func, wait) {
    let lastCallTime = 0;
    
    return function executedFunction(...args) {
        const now = Date.now();
        
        if (now - lastCallTime >= wait) {
            lastCallTime = now;
            return func(...args);
        }
    };
}