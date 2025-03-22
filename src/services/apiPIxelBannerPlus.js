import { PIXEL_BANNER_PLUS } from '../resources/constants.js';
import { makeRequest } from './apiService.js';


// --------------------------------------------------------- //
// -- Verify Pixel Banner Plus Connection and Credentials -- //
// --------------------------------------------------------- //
async function verifyPixelBannerPlusCredentials(plugin) {
    if (!plugin.settings.pixelBannerPlusEmail || !plugin.settings.pixelBannerPlusApiKey ) {
        return { serverOnline: true, verified: false, bannerTokens: 0 };
    }

    try {
        const response = await makeRequest(
            `${PIXEL_BANNER_PLUS.API_URL}${PIXEL_BANNER_PLUS.ENDPOINTS.VERIFY}`,
            {
                method: 'GET',
                headers: {
                    'X-User-Email': plugin.settings.pixelBannerPlusEmail,
                    'X-API-Key': plugin.settings.pixelBannerPlusApiKey,
                    'Accept': 'application/json'
                }
            }
        );

        if (response.status === 200) {
            const data = response.json;
            return {
                serverOnline: true,
                verified: data.success,
                bannerTokens: data.banner_tokens
            };
        }
        return { serverOnline: true, verified: false, bannerTokens: 0 };
    } catch (error) {
        console.error('Failed to verify Pixel Banner Plus credentials:', error);
        
        // Check for connection/network errors specifically
        const isConnectionError = error.name === 'TypeError' || 
                                  error.message.includes('Network Error') ||
                                  error.message.includes('Failed to fetch') ||
                                  error.message.includes('network') ||
                                  !navigator.onLine;

        // console.log(`error.message: ${error.message}`);
        // console.log(`isConnectionError: ${isConnectionError}`);
        
        return { 
            serverOnline: !isConnectionError, 
            verified: false, 
            bannerTokens: 0
        };
    }
}

// -------------------------------- //
// -- Get Pixel Banner Plus Info -- //
// -------------------------------- //
async function getPixelBannerInfo() {
    const response = await makeRequest(
        `${PIXEL_BANNER_PLUS.API_URL}${PIXEL_BANNER_PLUS.ENDPOINTS.INFO}`,
        {
            method: 'GET',
        }
    );

    if (response.status === 200) {
        const data = response.json;
        return {
            version: data.version,
        };
    }
    return { version: '0.0.0' };
}

export {
    verifyPixelBannerPlusCredentials,
    getPixelBannerInfo
}; 