// Function to detect current theme
function getCurrentTheme() {
    return document.body.classList.contains('theme-dark') ? 'dark' : 'light';
}

export default getCurrentTheme;