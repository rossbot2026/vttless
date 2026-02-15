const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1';

/**
 * Generate a battle map image using OpenRouter's DALL-E integration
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

    // Map grid dimensions to DALL-E size
    // DALL-E sizes: 1024x1024, 1024x1792, 1792x1024
    // We'll use 1024x1024 for standard maps, and adjust based on aspect ratio
    let size = '1024x1024';
    const aspectRatio = dimensions.width / dimensions.height;
    
    if (aspectRatio > 1.5) {
        size = '1792x1024'; // Wide maps
    } else if (aspectRatio < 0.67) {
        size = '1024x1792'; // Tall maps
    }

    try {
        const response = await fetch(`${OPENROUTER_API_URL}/images/generations`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': process.env.CLIENT_URL || 'http://localhost:3000',
                'X-Title': 'VTTLess'
            },
            body: JSON.stringify({
                model: 'openai/dall-e-3',
                prompt: enhancedPrompt,
                size: size,
                quality: 'standard',
                n: 1
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

        // Estimate cost (DALL-E 3 standard quality: $0.04 per image for 1024x1024)
        let estimatedCost = 0.04;
        if (size === '1792x1024' || size === '1024x1792') {
            estimatedCost = 0.08; // $0.08 for portrait/landscape
        }

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
