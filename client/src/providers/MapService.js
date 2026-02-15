import { api } from '../common/axiosPrivate';

/**
 * Generate an AI battle map
 * @param {string} name - Map name
 * @param {string} prompt - Description of the map
 * @param {string} style - Style (fantasy, scifi, modern, dungeon)
 * @param {number} gridWidth - Grid width in squares
 * @param {number} gridHeight - Grid height in squares
 * @param {number} gridSize - Size of each grid cell in pixels
 * @param {string} campaignId - Campaign ID
 * @returns {Promise} API response
 */
export const generateAIMap = async (name, prompt, style, gridWidth, gridHeight, gridSize, campaignId) => {
    const response = await api.post('/maps/generate-ai', {
        name,
        prompt,
        style,
        gridWidth,
        gridHeight,
        gridSize,
        campaign: campaignId
    });
    return response.data;
};

/**
 * Check the generation status of an AI map
 * @param {string} mapId - Map ID
 * @returns {Promise} Generation status
 */
export const checkGenerationStatus = async (mapId) => {
    const response = await api.get(`/maps/${mapId}/generation-status`);
    return response.data;
};

export default {
    generateAIMap,
    checkGenerationStatus
};