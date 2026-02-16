const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1';
const DEFAULT_AI_MODEL = process.env.DEFAULT_AI_MODEL || 'black-forest-labs/flux.2-klein-4b';

// Supported AI models for battle map generation with pricing
const SUPPORTED_MODELS = {
    'black-forest-labs/flux.2-klein-4b': {
        name: 'FLUX.2 Klein',
        provider: 'Black Forest Labs',
        pricePerImage: 0.015,
        description: 'Fast, high-quality image generation'
    },
    'google/gemini-2.5-flash-image': {
        name: 'Gemini 2.5 Flash Image',
        provider: 'Google',
        pricePerImage: 0.003,
        description: 'Google\'s fast image generation model'
    }
};

/**
 * Get list of supported models with pricing
 * @returns {Array<{id: string, name: string, provider: string, pricePerImage: number, description: string}>}
 */
function getSupportedModels() {
    return Object.entries(SUPPORTED_MODELS).map(([id, model]) => ({
        id,
        ...model
    }));
}

/**
 * Validate if a model is supported
 * @param {string} modelId - Model identifier
 * @returns {boolean}
 */
function isModelSupported(modelId) {
    return modelId in SUPPORTED_MODELS;
}

/**
 * Get model info by ID
 * @param {string} modelId - Model identifier
 * @returns {Object|null}
 */
function getModelInfo(modelId) {
    return SUPPORTED_MODELS[modelId] || null;
}

/**
 * Generate a battle map image using OpenRouter's image generation
 * @param {string} prompt - Description of the battle map to generate
 * @param {string} style - Style of the map (fantasy, scifi, modern, dungeon)
 * @param {Object} dimensions - Dimensions of the map { width, height }
 * @param {string} model - Model ID to use (optional, defaults to DEFAULT_AI_MODEL)
 * @returns {Promise<{imageUrl: string, cost: number, status: string}>}
 */
async function generateBattleMap(prompt, style, dimensions, model = null) {
    if (!OPENROUTER_API_KEY) {
        throw new Error('OpenRouter API key not configured');
    }

    // Determine which model to use (parameter or default from env)
    const selectedModel = model && isModelSupported(model) ? model : DEFAULT_AI_MODEL;
    const modelInfo = getModelInfo(selectedModel);

    // Enhance prompt with style
    const enhancedPrompt = `${prompt}, ${style} style battle map, tabletop RPG, grid-based, clean lines, detailed terrain, professional quality`;

    // Map grid dimensions to FLUX.2 Klein size
    // FLUX.2 Klein supports: 512x512, 768x768, 1024x1024
    // Use 1024x1024 for standard maps, adjust based on aspect ratio
    let size = '1024x1024';
    const aspectRatio = dimensions.width / dimensions.height;
    
    if (aspectRatio > 1.5) {
        size = '1024x1024'; // Wide maps - use square and crop/fit as needed
    } else if (aspectRatio < 0.67) {
        size = '1024x1024'; // Tall maps - use square and crop/fit as needed
    }

    try {
        const response = await fetch(`${OPENROUTER_API_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': process.env.CLIENT_URL || 'https://vttless.app',
                'X-Title': 'VTTless AI Map Generator'
            },
            body: JSON.stringify({
                model: selectedModel,
                messages: [
                    {
                        role: 'user',
                        content: enhancedPrompt
                    }
                ],
                modalities: ['image'],
                image_config: {
                    aspect_ratio: '1:1'
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            
            // Handle rate limiting
            if (response.status === 429) {
                throw new Error('Rate limit exceeded. Please try again later.');
            }
            
            // Handle other errors
            const errorMessage = errorData.error?.message || `API error: ${response.status}`;
            throw new Error(errorMessage);
        }

        const data = await response.json();
        
        // Extract image from response (base64 data URL in message.images)
        const message = data.choices?.[0]?.message;
        if (!message || !message.images || !message.images[0]) {
            throw new Error('No image generated from OpenRouter API');
        }

        // The image is returned as a base64 data URL
        // Structure: { index: 0, type: 'image_url', image_url: { url: 'data:image/png;base64,...' } }
        const imageData = message.images[0];
        const imageUrl = imageData.image_url?.url || imageData.imageUrl?.url || imageData;

        // Get cost from API response or use model pricing as fallback
        // OpenRouter returns usage data in data.usage
        let cost = modelInfo?.pricePerImage || 0.015;
        if (data.usage) {
            // Try to get actual cost from OpenRouter usage data
            // OpenRouter provides cost in USD via usage
            const promptCost = (data.usage.prompt_tokens || 0) * (data.usage.prompt_token_price || 0);
            const completionCost = (data.usage.completion_tokens || 0) * (data.usage.completion_token_price || 0);
            const imageCost = data.usage.image_tokens || 0;
            if (promptCost > 0 || completionCost > 0 || imageCost > 0) {
                cost = promptCost + completionCost + (imageCost * 0.001); // Approximate image cost
            }
        }

        return {
            imageUrl: imageUrl,
            cost: cost,
            model: selectedModel,
            status: 'completed'
        };
    } catch (error) {
        console.error('OpenRouter service error:', error.message);
        
        // Re-throw known errors
        if (error.message.includes('Rate limit') || 
            error.message.includes('API key') ||
            error.message.includes('not configured')) {
            throw error;
        }
        
        // Wrap unknown errors
        throw new Error(`Failed to generate battle map: ${error.message}`);
    }
}

/**
 * Check if OpenRouter is properly configured
 * @returns {boolean}
 */
function isConfigured() {
    return Boolean(OPENROUTER_API_KEY);
}

module.exports = {
    generateBattleMap,
    isConfigured,
    getSupportedModels,
    isModelSupported,
    getModelInfo
};
