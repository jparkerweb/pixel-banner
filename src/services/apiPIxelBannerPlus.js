import { PIXEL_BANNER_PLUS } from '../resources/constants.js';
import { makeRequest } from './apiService.js';

async function verifyPixelBannerPlusCredentials(plugin) {
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
                verified: data.success,
                bannerTokens: data.banner_tokens
            };
        }
        return { verified: false, bannerTokens: 0 };
    } catch (error) {
        console.error('Failed to verify Pixel Banner Plus credentials:', error);
        return { verified: false, bannerTokens: 0 };
    }
}

export {
    verifyPixelBannerPlusCredentials
}; 