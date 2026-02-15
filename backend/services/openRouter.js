const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1';

/**
 * Generate a battle map image using OpenRouter's FLUX.2 Klein integration
 * @param {string} prompt - Description of the battle map to generate
 * @param {string} style - Style of the map (fantasy, scifi, modern, dungeon)
 * @param {Object} dimensions - Dimensions of the map { width, height }
 * @returns {Promise<{imageUrl: string, cost: number, status: string}>}
 */
async function generateBattleMap(prompt, style, dimensions) {
    if (!OPENROUTER_API_KEY) {
        throw new Error('OpenRouter API key not configured');
    }

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
        const response = await fetch('https://openrouter.ai/api/v1/images/generations', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': process.env.CLIENT_URL || 'https://vttless.app',
                'X-Title': 'VTTless AI Map Generator'
            },
            body: JSON.stringify({
                model: 'black-forest-labs/flux.2-klein-4b',
                prompt: enhancedPrompt,
                size: size
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
        
        if (!data.data || !data.data[0] || !data.data[0].url) {
            throw new Error('Invalid response from OpenRouter API');
        }

        // Estimate cost (FLUX.2 Klein: ~$0.015 per image)
        const estimatedCost = 0.015;

        return {
            imageUrl: data.data[0].url,
            cost: estimatedCost,
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
    isConfigured
};
