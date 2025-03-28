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
        const errorMessage = error.message.toLowerCase();
        const errorName = error.name.toLowerCase();
        const isConnectionError = errorName === 'typeerror' || 
                                  errorName === 'error' ||
                                  errorMessage.includes('network error') ||
                                  errorMessage.includes('failed to fetch') ||
                                  errorMessage.includes('network') ||
                                  errorMessage.startsWith('err_') ||
                                  !navigator.onLine;

        console.log(`pixel banner plus error.message: ${error.message}`);
        console.log(`pixel banner plus isConnectionError: ${isConnectionError}`);
        
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
    try {
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
    } catch (error) {
        console.error('Failed to get Pixel Banner Plus info:', error);
    }
    return { version: '0.0.0' };
}

export {
    verifyPixelBannerPlusCredentials,
    getPixelBannerInfo
}; 