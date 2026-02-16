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
 * @param {string} model - AI model ID to use (optional)
 * @returns {Promise} API response
 */
export const generateAIMap = async (name, prompt, style, gridWidth, gridHeight, gridSize, campaignId, model = null) => {
    const response = await api.post('/maps/generate-ai', {
        name,
        prompt,
        style,
        gridWidth,
        gridHeight,
        gridSize,
        campaign: campaignId,
        ...(model && { model })
    });
    return response.data;
};

/**
 * Get available AI models with pricing
 * @returns {Promise} List of available models
 */
export const getAIModels = async () => {
    const response = await api.get('/maps/ai-models');
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