import { requestUrl, Notice } from 'obsidian';

// Rate limiter for API requests
const rateLimiter = {
    lastRequestTime: 0,
    minInterval: 1000 // 1 second between requests
};

// Base request handler with rate limiting
async function makeRequest(url, options = {}) {
    const now = Date.now();
    if (now - rateLimiter.lastRequestTime < rateLimiter.minInterval) {
        await new Promise(resolve => setTimeout(resolve, rateLimiter.minInterval));
    }
    rateLimiter.lastRequestTime = Date.now();

    try {
        const response = await requestUrl({
            url,
            headers: options.headers || {},
            ...options
        });
        return response;
    } catch (error) {
        console.error('Request failed:', error);
        throw new Error(`Request failed: ${error.message}`);
    }
}

async function fetchPexelsImage(plugin, keyword) {
    const apiKey = plugin.settings.pexelsApiKey;
    if (!apiKey) return null;

    const defaultKeywords = plugin.settings.defaultKeywords.split(',').map(k => k.trim());
    const fallbackKeyword = defaultKeywords[Math.floor(Math.random() * defaultKeywords.length)];
    const keywords = [keyword, fallbackKeyword];
    
    for (const currentKeyword of keywords) {
        try {
            const response = await makeRequest(
                `https://api.pexels.com/v1/search?query=${encodeURIComponent(currentKeyword)}&per_page=${plugin.settings.numberOfImages}&size=${plugin.settings.imageSize}&orientation=${plugin.settings.imageOrientation}`,
                {
                    headers: { 'Authorization': apiKey }
                }
            );

            if (response.status !== 200) {
                console.error('Failed to fetch images:', response.status, response.text);
                continue;
            }

            const data = response.json;
            if (data.photos && data.photos.length > 0) {
                const randomIndex = Math.floor(Math.random() * data.photos.length);
                if (currentKeyword !== keyword) {
                    console.log(`No image found for "${keyword}". Using image for "${currentKeyword}" instead.`);
                }
                const imageUrl = data.photos[randomIndex].src[plugin.settings.imageSize];
                return imageUrl;
            }
        } catch (error) {
            console.error(`Error fetching image from API for keyword "${currentKeyword}":`, error);
            new Notice(`Failed to fetch image: ${error.message}`);
        }
    }
    return null;
}

async function fetchPixabayImage(plugin, keyword) {
    const apiKey = plugin.settings.pixabayApiKey;
    if (!apiKey) return null;

    const defaultKeywords = plugin.settings.defaultKeywords.split(',').map(k => k.trim());
    const keywordsToTry = [keyword, ...defaultKeywords];
    const maxAttempts = 4;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const currentKeyword = attempt === 0 ? keyword : keywordsToTry[Math.floor(Math.random() * keywordsToTry.length)];
        const apiUrl = 'https://pixabay.com/api/';
        const params = new URLSearchParams({
            key: apiKey,
            q: encodeURIComponent(currentKeyword),
            image_type: 'photo',
            per_page: plugin.settings.numberOfImages,
            safesearch: true,
        });

        try {
            const response = await makeRequest(`${apiUrl}?${params}`);
            if (response.status !== 200) continue;

            const data = JSON.parse(new TextDecoder().decode(response.arrayBuffer));
            if (data.hits?.length > 0) {
                const imageUrls = data.hits.map(hit => hit.largeImageURL);
                return imageUrls[Math.floor(Math.random() * imageUrls.length)];
            }
        } catch (error) {
            console.error('Error fetching image from Pixabay:', error);
        }
    }
    new Notice('Failed to fetch an image after multiple attempts');
    return null;
}

async function fetchFlickrImage(plugin, keyword) {
    const apiKey = plugin.settings.flickrApiKey;
    if (!apiKey) return null;

    const defaultKeywords = plugin.settings.defaultKeywords.split(',').map(k => k.trim());
    const keywordsToTry = [keyword, ...defaultKeywords];
    const maxAttempts = 4;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const currentKeyword = attempt === 0 ? keyword : keywordsToTry[Math.floor(Math.random() * keywordsToTry.length)];
        try {
            const searchUrl = `https://www.flickr.com/services/rest/?method=flickr.photos.search&api_key=${apiKey}&text=${encodeURIComponent(currentKeyword)}&per_page=${plugin.settings.numberOfImages}&format=json&nojsoncallback=1&sort=relevance&content_type=1&media=photos&safe_search=1`;
            
            const response = await makeRequest(searchUrl);
            if (response.status !== 200) continue;

            const data = JSON.parse(new TextDecoder().decode(response.arrayBuffer));
            if (data.stat !== 'ok' || !data.photos?.photo?.length) continue;

            const photos = data.photos.photo;
            const photo = photos[Math.floor(Math.random() * photos.length)];
            
            let size = 'z'; // Default to medium 640
            switch (plugin.settings.imageSize) {
                case 'small': size = 'n'; break;
                case 'medium': size = 'z'; break;
                case 'large': size = 'b'; break;
            }
            
            return `https://live.staticflickr.com/${photo.server}/${photo.id}_${photo.secret}_${size}.jpg`;
        } catch (error) {
            console.error('Error fetching image from Flickr:', error);
        }
    }
    new Notice('Failed to fetch an image after multiple attempts');
    return null;
}

async function fetchUnsplashImage(plugin, keyword) {
    const apiKey = plugin.settings.unsplashApiKey;
    if (!apiKey) return null;

    const defaultKeywords = plugin.settings.defaultKeywords.split(',').map(k => k.trim());
    const keywordsToTry = [keyword, ...defaultKeywords];
    const maxAttempts = 4;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const currentKeyword = attempt === 0 ? keyword : keywordsToTry[Math.floor(Math.random() * keywordsToTry.length)];
        try {
            const apiUrl = 'https://api.unsplash.com/search/photos';
            const params = new URLSearchParams({
                query: currentKeyword,
                per_page: plugin.settings.numberOfImages,
                orientation: plugin.settings.imageOrientation
            });

            const response = await makeRequest(`${apiUrl}?${params}`, {
                headers: {
                    'Authorization': `Client-ID ${apiKey}`,
                    'Accept-Version': 'v1'
                }
            });

            if (response.status !== 200) continue;

            const data = JSON.parse(new TextDecoder().decode(response.arrayBuffer));
            if (!data.results?.length) continue;

            const photo = data.results[Math.floor(Math.random() * data.results.length)];
            return photo.urls[plugin.settings.imageSize === 'small' ? 'small' : 
                           plugin.settings.imageSize === 'medium' ? 'regular' : 'full'];
        } catch (error) {
            console.error('Error fetching image from Unsplash:', error);
        }
    }
    new Notice('Failed to fetch an image after multiple attempts');
    return null;
}

export {
    makeRequest,
    fetchPexelsImage,
    fetchPixabayImage,
    fetchFlickrImage,
    fetchUnsplashImage
}; 