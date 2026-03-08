import { requestUrl, Notice } from 'obsidian';


// Rate limiter for API requests
const rateLimiter = {
    lastRequestTime: 0,
    // Use shorter interval in test environment to speed up tests
    minInterval: typeof globalThis.vitest !== 'undefined' ? 10 : 1000 // 10ms in tests, 1s in production
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

async function fetchPexelsImage(plugin, keyword, disableInternalFallback = false) {
    const apiKey = plugin.settings.pexelsApiKey;
    if (!apiKey) return null;

    // Only use internal fallback if explicitly enabled and not disabled by caller
    const useInternalFallback = !disableInternalFallback;
    const defaultKeywords = useInternalFallback && plugin.settings.defaultKeywords ? plugin.settings.defaultKeywords.split(',').map(k => k.trim()) : [];
    const fallbackKeyword = defaultKeywords.length > 0 ? defaultKeywords[Math.floor(Math.random() * defaultKeywords.length)] : null;
    const keywords = useInternalFallback && fallbackKeyword ? [keyword, fallbackKeyword] : [keyword];
    
    for (const currentKeyword of keywords) {
        try {
            const response = await makeRequest(
                `https://api.pexels.com/v1/search?query=${encodeURIComponent(currentKeyword)}&per_page=${plugin.settings.numberOfImages}`,
                {
                    headers: {
                        'Authorization': apiKey
                    }
                }
            );

            if (response.status !== 200) {
                console.error('Failed to fetch images:', response.status, response.text);
                continue;
            }

            const data = response.json;
            if (data.photos && data.photos.length > 0) {
                const randomIndex = Math.floor(Math.random() * data.photos.length);
                const imageUrl = data.photos[randomIndex].src[plugin.settings.imageSize];
                return imageUrl;
            }
        } catch (error) {
            console.error(`Error fetching image from Pexels for keyword "${currentKeyword}":`, error);
        }
    }
    return null;
}

async function fetchPixabayImage(plugin, keyword) {
    const apiKey = plugin.settings.pixabayApiKey;
    if (!apiKey) return null;

    const apiUrl = 'https://pixabay.com/api/';
    const params = new URLSearchParams({
        key: apiKey,
        q: encodeURIComponent(keyword),
        image_type: 'photo',
        per_page: plugin.settings.numberOfImages,
        safesearch: true,
    });

    try {
        const response = await makeRequest(`${apiUrl}?${params}`);
        if (response.status !== 200) {
            return null;
        }

        // Handle different response formats for tests vs production
        let data;
        if (response.json) {
            data = response.json;
        } else if (response.arrayBuffer) {
            data = JSON.parse(new TextDecoder().decode(response.arrayBuffer));
        } else {
            return null;
        }
        
        if (data.hits?.length > 0) {
            const imageUrls = data.hits.map(hit => hit.largeImageURL);
            return imageUrls[Math.floor(Math.random() * imageUrls.length)];
        }
        return null;
    } catch (error) {
        console.error(`Error fetching image from Pixabay for keyword "${keyword}":`, error);
        return null;
    }
}

async function fetchFlickrImage(plugin, keyword) {
    const apiKey = plugin.settings.flickrApiKey;
    if (!apiKey) return null;

    try {
        const searchUrl = `https://www.flickr.com/services/rest/?method=flickr.photos.search&api_key=${apiKey}&text=${encodeURIComponent(keyword)}&per_page=${plugin.settings.numberOfImages}&format=json&nojsoncallback=1&sort=relevance&content_type=1&media=photos&safe_search=1`;
        
        const response = await makeRequest(searchUrl);
        if (response.status !== 200) {
            return null;
        }

        let data;
        
        // For debugging - log the response structure
        // console.log('Flickr response:', { 
        //     hasText: !!response.text, 
        //     hasJson: !!response.json, 
        //     hasArrayBuffer: !!response.arrayBuffer,
        //     textContent: response.text ? response.text.substring(0, 100) : 'none'
        // });
        
        // Handle JSONP response if present
        if (response.text && response.text.includes('jsonFlickrApi(')) {
            // Extract JSON from JSONP wrapper
            const jsonpMatch = response.text.match(/jsonFlickrApi\((.*)\)/);
            if (jsonpMatch && jsonpMatch[1]) {
                try {
                    data = JSON.parse(jsonpMatch[1]);
                } catch (e) {
                    console.error('Error parsing JSONP response:', e);
                    return null;
                }
            } else {
                console.error('Invalid JSONP format');
                return null;
            }
        } else {
            // Handle regular JSON response
            try {
                if (response.json) {
                    data = response.json;
                } else if (response.arrayBuffer) {
                    data = JSON.parse(new TextDecoder().decode(response.arrayBuffer));
                } else {
                    return null;
                }
            } catch (e) {
                console.error('Error parsing JSON response:', e);
                return null;
            }
        }
        
        if ((data.stat && data.stat !== 'ok') || !data.photos?.photo?.length) {
            return null;
        }

        const photos = data.photos.photo;
        const photo = photos[Math.floor(Math.random() * photos.length)];
        
        let size = 'z'; // Default to medium (matches DEFAULT_SETTINGS)
        if (plugin.settings && plugin.settings.imageSize) {
            switch (plugin.settings.imageSize) {
                case 'small': size = 'n'; break;
                case 'medium': size = 'z'; break;
                case 'large': size = 'b'; break;
                default: size = 'z'; break;
            }
        }
        
        return `https://live.staticflickr.com/${photo.server}/${photo.id}_${photo.secret}_${size}.jpg`;
    } catch (error) {
        console.error(`Error fetching image from Flickr for keyword "${keyword}":`, error);
        return null;
    }
}

async function fetchUnsplashImage(plugin, keyword) {
    const apiKey = plugin.settings.unsplashApiKey;
    if (!apiKey) return null;

    try {
        const apiUrl = 'https://api.unsplash.com/search/photos';
        const params = new URLSearchParams({
            query: keyword,
            per_page: plugin.settings.numberOfImages,
            orientation: plugin.settings.imageOrientation
        });

        const response = await makeRequest(`${apiUrl}?${params}`, {
            headers: {
                'Authorization': `Client-ID ${apiKey}`,
                'Accept-Version': 'v1'
            }
        });

        if (response.status !== 200) {
            return null;
        }

        // Handle different response formats for tests vs production
        let data;
        if (response.json) {
            data = response.json;
        } else if (response.arrayBuffer) {
            data = JSON.parse(new TextDecoder().decode(response.arrayBuffer));
        } else {
            return null;
        }
        
        if (!data.results?.length) {
            return null;
        }

        const photo = data.results[Math.floor(Math.random() * data.results.length)];
        return photo.urls[plugin.settings.imageSize === 'small' ? 'small' : 
                       plugin.settings.imageSize === 'medium' ? 'regular' : 'full'];
    } catch (error) {
        console.error(`Error fetching image from Unsplash for keyword "${keyword}":`, error);
        return null;
    }
}

export {
    makeRequest,
    fetchPexelsImage,
    fetchPixabayImage,
    fetchFlickrImage,
    fetchUnsplashImage
}; 