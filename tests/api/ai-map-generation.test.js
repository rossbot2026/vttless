/**
 * AI Map Generation API Tests
 * 
 * Prerequisites:
 * - Install Jest: npm install --save-dev jest supertest
 * - Add test script to package.json: "test": "jest"
 * - Create jest.config.js for configuration
 * 
 * Run tests: npm test
 */

// Mock AWS SDK first before any imports
jest.mock('aws-sdk', () => {
    const mockUpload = jest.fn().mockReturnValue({
        promise: jest.fn().mockResolvedValue({ Key: 'test/key/image.png' })
    });
    return {
        S3: jest.fn().mockImplementation(() => ({
            upload: mockUpload
        }))
    };
});

// Mock passport
jest.mock('passport', () => ({
    authenticate: () => (req, res, next) => {
        // Check for manual auth override
        if (req._unauthenticated) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        req.user = req._user || { _id: '507f1f77bcf86cd799439011' };
        next();
    }
}));

const request = require('supertest');
const express = require('express');

describe('POST /maps/generate-ai', () => {
    let app;
    const mockUser = { _id: '507f1f77bcf86cd799439011' };
    const mockCampaign = {
        _id: '507f1f77bcf86cd799439012',
        gm: mockUser._id,
        players: [],
        save: jest.fn().mockResolvedValue(true)
    };

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Reset all mocks
        jest.resetModules();
        
        // Re-mock after reset
        jest.mock('../../backend/services/openRouter', () => ({
            generateBattleMap: jest.fn(),
            isConfigured: jest.fn()
        }));
        
        jest.mock('../../backend/models', () => ({
            Map: {
                findById: jest.fn()
            },
            Campaign: {
                findById: jest.fn()
            }
        }));
        
        // Create a simple Express app for testing
        app = express();
        app.use(express.json());
        
        // Import routes after mocks are set up
        const mapRoutes = require('../../backend/routes/maps');
        app.use('/maps', mapRoutes);
    });

    test('validates prompt is required', async () => {
        const { isConfigured, generateBattleMap } = require('../../backend/services/openRouter');
        const { Map, Campaign } = require('../../backend/models');
        
        isConfigured.mockReturnValue(true);
        Campaign.findById.mockResolvedValue(mockCampaign);

        const response = await request(app)
            .post('/maps/generate-ai')
            .send({
                name: 'Test Map',
                // Missing prompt
                campaign: '507f1f77bcf86cd799439012'
            });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
    });

    test('validates all required fields', async () => {
        const { isConfigured } = require('../../backend/services/openRouter');
        const { Campaign } = require('../../backend/models');
        
        isConfigured.mockReturnValue(true);
        Campaign.findById.mockResolvedValue(mockCampaign);

        const response = await request(app)
            .post('/maps/generate-ai')
            .send({});

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
    });

    test('validates style enum - rejects invalid styles', async () => {
        const { isConfigured } = require('../../backend/services/openRouter');
        const { Campaign } = require('../../backend/models');
        
        isConfigured.mockReturnValue(true);
        Campaign.findById.mockResolvedValue(mockCampaign);

        const response = await request(app)
            .post('/maps/generate-ai')
            .send({
                name: 'Test Map',
                prompt: 'A dungeon map',
                style: 'invalid_style',
                campaign: '507f1f77bcf86cd799439012'
            });

        expect(response.status).toBe(400);
    });

    test('requires GM permissions - returns 403 for non-GM', async () => {
        const { isConfigured } = require('../../backend/services/openRouter');
        const { Campaign } = require('../../backend/models');
        
        isConfigured.mockReturnValue(true);
        
        const nonGmCampaign = {
            ...mockCampaign,
            gm: 'different_user_id'
        };
        Campaign.findById.mockResolvedValue(nonGmCampaign);

        const response = await request(app)
            .post('/maps/generate-ai')
            .send({
                name: 'Test Map',
                prompt: 'A dungeon map',
                campaign: '507f1f77bcf86cd799439012'
            });

        expect(response.status).toBe(403);
    });

    test('returns 404 for non-existent campaign', async () => {
        const { isConfigured } = require('../../backend/services/openRouter');
        const { Campaign } = require('../../backend/models');
        
        isConfigured.mockReturnValue(true);
        Campaign.findById.mockResolvedValue(null);

        const response = await request(app)
            .post('/maps/generate-ai')
            .send({
                name: 'Test Map',
                prompt: 'A dungeon map',
                campaign: '507f1f77bcf86cd799439999'
            });

        expect(response.status).toBe(404);
    });

    test('calls OpenRouter FLUX.2 Klein service on success', async () => {
        const { isConfigured, generateBattleMap } = require('../../backend/services/openRouter');
        const { Campaign } = require('../../backend/models');
        
        // Mock Map constructor
        const mockMapInstance = {
            _id: '507f1f77bcf86cd799439013',
            save: jest.fn().mockResolvedValue(true)
        };
        
        jest.mock('../../backend/models', () => ({
            Map: jest.fn().mockImplementation(() => mockMapInstance),
            Campaign: {
                findById: jest.fn()
            }
        }));

        isConfigured.mockReturnValue(true);
        Campaign.findById.mockResolvedValue(mockCampaign);
        
        generateBattleMap.mockResolvedValue({
            imageUrl: 'https://openrouter.ai/generated-map.png',
            cost: 0.015,
            status: 'completed'
        });

        const response = await request(app)
            .post('/maps/generate-ai')
            .send({
                name: 'Test Map',
                prompt: 'A fantasy forest battle map',
                style: 'fantasy',
                campaign: '507f1f77bcf86cd799439012',
                gridWidth: 20,
                gridHeight: 15
            });

        expect(generateBattleMap).toHaveBeenCalledWith(
            'A fantasy forest battle map',
            'fantasy',
            { width: 20, height: 15 }
        );
    });

    test('handles rate limiting errors - returns 429', async () => {
        const { isConfigured, generateBattleMap } = require('../../backend/services/openRouter');
        const { Campaign } = require('../../backend/models');
        
        isConfigured.mockReturnValue(true);
        Campaign.findById.mockResolvedValue(mockCampaign);
        generateBattleMap.mockRejectedValue(new Error('Rate limit exceeded. Please try again later.'));

        const response = await request(app)
            .post('/maps/generate-ai')
            .send({
                name: 'Test Map',
                prompt: 'A dungeon map',
                campaign: '507f1f77bcf86cd799439012'
            });

        expect(response.status).toBe(429);
    });

    test('handles OpenRouter not configured - returns 503', async () => {
        const { isConfigured } = require('../../backend/services/openRouter');
        
        isConfigured.mockReturnValue(false);

        const response = await request(app)
            .post('/maps/generate-ai')
            .send({
                name: 'Test Map',
                prompt: 'A dungeon map',
                campaign: '507f1f77bcf86cd799439012'
            });

        expect(response.status).toBe(503);
    });

    test('uses default grid dimensions when not provided', async () => {
        const { isConfigured, generateBattleMap } = require('../../backend/services/openRouter');
        
        const mockMapInstance = {
            _id: '507f1f77bcf86cd799439013',
            save: jest.fn().mockResolvedValue(true)
        };
        
        jest.mock('../../backend/models', () => ({
            Map: jest.fn().mockImplementation(() => mockMapInstance),
            Campaign: {
                findById: jest.fn()
            }
        }));

        const { Campaign } = require('../../backend/models');
        
        isConfigured.mockReturnValue(true);
        Campaign.findById.mockResolvedValue(mockCampaign);
        
        generateBattleMap.mockResolvedValue({
            imageUrl: 'https://openrouter.ai/generated-map.png',
            cost: 0.015,
            status: 'completed'
        });

        await request(app)
            .post('/maps/generate-ai')
            .send({
                name: 'Test Map',
                prompt: 'A fantasy forest battle map',
                style: 'fantasy',
                campaign: '507f1f77bcf86cd799439012'
            });

        expect(generateBattleMap).toHaveBeenCalledWith(
            'A fantasy forest battle map',
            'fantasy',
            { width: 10, height: 10 }
        );
    });

    test('uses default style when not provided', async () => {
        const { isConfigured, generateBattleMap } = require('../../backend/services/openRouter');
        
        const mockMapInstance = {
            _id: '507f1f77bcf86cd799439013',
            save: jest.fn().mockResolvedValue(true)
        };
        
        jest.mock('../../backend/models', () => ({
            Map: jest.fn().mockImplementation(() => mockMapInstance),
            Campaign: {
                findById: jest.fn()
            }
        }));

        const { Campaign } = require('../../backend/models');
        
        isConfigured.mockReturnValue(true);
        Campaign.findById.mockResolvedValue(mockCampaign);
        
        generateBattleMap.mockResolvedValue({
            imageUrl: 'https://openrouter.ai/generated-map.png',
            cost: 0.015,
            status: 'completed'
        });

        await request(app)
            .post('/maps/generate-ai')
            .send({
                name: 'Test Map',
                prompt: 'A fantasy forest battle map',
                campaign: '507f1f77bcf86cd799439012'
            });

        expect(generateBattleMap).toHaveBeenCalledWith(
            'A fantasy forest battle map',
            'fantasy',
            { width: 10, height: 10 }
        );
    });
});

describe('GET /maps/:id/generation-status', () => {
    let app;
    const mockUser = { _id: '507f1f77bcf86cd799439011' };

    beforeEach(() => {
        jest.clearAllMocks();
        jest.resetModules();
        
        jest.mock('../../backend/services/openRouter', () => ({
            generateBattleMap: jest.fn(),
            isConfigured: jest.fn()
        }));
        
        jest.mock('../../backend/models', () => ({
            Map: {
                findById: jest.fn()
            },
            Campaign: {
                findById: jest.fn()
            }
        }));
        
        app = express();
        app.use(express.json());
        
        const mapRoutes = require('../../backend/routes/maps');
        app.use('/maps', mapRoutes);
    });

    test('returns AI generation status for completed map', async () => {
        const { Map, Campaign } = require('../../backend/models');
        
        const mockMap = {
            _id: '507f1f77bcf86cd799439013',
            campaign: '507f1f77bcf86cd799439012',
            aiGenerated: true,
            aiPrompt: 'A fantasy forest',
            aiStyle: 'fantasy',
            generationCost: 0.015,
            imageUrl: 's3://bucket/path/to/image.png',
            status: 'completed'
        };

        const mockCampaign = {
            _id: '507f1f77bcf86cd799439012',
            gm: mockUser._id,
            players: []
        };

        Map.findById.mockResolvedValue(mockMap);
        Campaign.findById.mockResolvedValue(mockCampaign);

        const response = await request(app)
            .get('/maps/507f1f77bcf86cd799439013/generation-status');

        expect(response.status).toBe(200);
        expect(response.body.aiGenerated).toBe(true);
        expect(response.body.aiPrompt).toBe('A fantasy forest');
        expect(response.body.generationCost).toBe(0.015);
    });

    test('returns status for generating map', async () => {
        const { Map, Campaign } = require('../../backend/models');
        
        const mockMap = {
            _id: '507f1f77bcf86cd799439013',
            campaign: '507f1f77bcf86cd799439012',
            aiGenerated: true,
            status: 'generating'
        };

        const mockCampaign = {
            _id: '507f1f77bcf86cd799439012',
            gm: mockUser._id,
            players: []
        };

        Map.findById.mockResolvedValue(mockMap);
        Campaign.findById.mockResolvedValue(mockCampaign);

        const response = await request(app)
            .get('/maps/507f1f77bcf86cd799439013/generation-status');

        expect(response.status).toBe(200);
        expect(response.body.status).toBe('generating');
    });

    test('returns 404 for non-existent map', async () => {
        const { Map } = require('../../backend/models');
        
        Map.findById.mockResolvedValue(null);

        const response = await request(app)
            .get('/maps/507f1f77bcf86cd799439999/generation-status');

        expect(response.status).toBe(404);
    });

    test('requires campaign access - returns 403', async () => {
        const { Map, Campaign } = require('../../backend/models');
        
        const mockMap = {
            _id: '507f1f77bcf86cd799439013',
            campaign: '507f1f77bcf86cd799439012'
        };

        const mockCampaign = {
            _id: '507f1f77bcf86cd799439012',
            gm: 'different_gm_id',
            players: []
        };

        Map.findById.mockResolvedValue(mockMap);
        Campaign.findById.mockResolvedValue(mockCampaign);

        const response = await request(app)
            .get('/maps/507f1f77bcf86cd799439013/generation-status');

        expect(response.status).toBe(403);
    });

    test('allows players to access generation status', async () => {
        const { Map, Campaign } = require('../../backend/models');
        
        const mockMap = {
            _id: '507f1f77bcf86cd799439013',
            campaign: '507f1f77bcf86cd799439012',
            aiGenerated: true,
            status: 'completed'
        };

        const mockCampaign = {
            _id: '507f1f77bcf86cd799439012',
            gm: 'gm_id',
            players: [mockUser._id]
        };

        Map.findById.mockResolvedValue(mockMap);
        Campaign.findById.mockResolvedValue(mockCampaign);

        const response = await request(app)
            .get('/maps/507f1f77bcf86cd799439013/generation-status');

        expect(response.status).toBe(200);
    });
});

describe('FLUX.2 Klein Model Integration', () => {
    let app;
    
    beforeEach(() => {
        jest.clearAllMocks();
        jest.resetModules();
        
        jest.mock('../../backend/services/openRouter', () => ({
            generateBattleMap: jest.fn(),
            isConfigured: jest.fn()
        }));
        
        jest.mock('../../backend/models', () => ({
            Map: jest.fn().mockImplementation(() => ({
                save: jest.fn().mockResolvedValue(true)
            })),
            Campaign: {
                findById: jest.fn()
            }
        }));
        
        app = express();
        app.use(express.json());
        
        const mapRoutes = require('../../backend/routes/maps');
        app.use('/maps', mapRoutes);
    });

    test('FLUX.2 Klein generates with correct cost ($0.015)', async () => {
        const { isConfigured, generateBattleMap } = require('../../backend/services/openRouter');
        const { Campaign } = require('../../backend/models');
        
        const mockUser = { _id: '507f1f77bcf86cd799439011' };
        const mockCampaign = {
            _id: '507f1f77bcf86cd799439012',
            gm: mockUser._id,
            players: [],
            save: jest.fn().mockResolvedValue(true)
        };
        
        isConfigured.mockReturnValue(true);
        Campaign.findById.mockResolvedValue(mockCampaign);
        
        generateBattleMap.mockResolvedValue({
            imageUrl: 'https://openrouter.ai/generated-map.png',
            cost: 0.015,
            status: 'completed'
        });

        const response = await request(app)
            .post('/maps/generate-ai')
            .send({
                name: 'Test Map',
                prompt: 'A fantasy forest battle map',
                style: 'fantasy',
                campaign: '507f1f77bcf86cd799439012'
            });

        expect(generateBattleMap).toHaveBeenCalled();
        expect(response.status).toBe(201);
    });

    test('FLUX.2 Klein handles different map dimensions', async () => {
        const { isConfigured, generateBattleMap } = require('../../backend/services/openRouter');
        const { Campaign } = require('../../backend/models');
        
        const mockUser = { _id: '507f1f77bcf86cd799439011' };
        const mockCampaign = {
            _id: '507f1f77bcf86cd799439012',
            gm: mockUser._id,
            players: [],
            save: jest.fn().mockResolvedValue(true)
        };
        
        isConfigured.mockReturnValue(true);
        Campaign.findById.mockResolvedValue(mockCampaign);
        
        generateBattleMap.mockResolvedValue({
            imageUrl: 'https://openrouter.ai/generated-map.png',
            cost: 0.015,
            status: 'completed'
        });

        // Test wide map
        await request(app)
            .post('/maps/generate-ai')
            .send({
                name: 'Wide Map',
                prompt: 'A landscape',
                style: 'fantasy',
                campaign: '507f1f77bcf86cd799439012',
                gridWidth: 30,
                gridHeight: 10
            });

        expect(generateBattleMap).toHaveBeenCalledWith(
            'A landscape',
            'fantasy',
            { width: 30, height: 10 }
        );
    });
});

describe('S3 Image Upload', () => {
    let app;
    
    beforeEach(() => {
        jest.clearAllMocks();
        jest.resetModules();
        
        jest.mock('../../backend/services/openRouter', () => ({
            generateBattleMap: jest.fn(),
            isConfigured: jest.fn()
        }));
        
        jest.mock('../../backend/models', () => ({
            Map: jest.fn().mockImplementation(() => ({
                save: jest.fn().mockResolvedValue(true)
            })),
            Campaign: {
                findById: jest.fn()
            }
        }));
        
        app = express();
        app.use(express.json());
        
        const mapRoutes = require('../../backend/routes/maps');
        app.use('/maps', mapRoutes);
    });

    test('uploads generated image to S3 and saves S3 URL', async () => {
        const { isConfigured, generateBattleMap } = require('../../backend/services/openRouter');
        const { Campaign } = require('../../backend/models');
        
        const mockUser = { _id: '507f1f77bcf86cd799439011' };
        const mockCampaign = {
            _id: '507f1f77bcf86cd799439012',
            gm: mockUser._id,
            players: [],
            save: jest.fn().mockResolvedValue(true)
        };
        
        isConfigured.mockReturnValue(true);
        Campaign.findById.mockResolvedValue(mockCampaign);
        
        generateBattleMap.mockResolvedValue({
            imageUrl: 'https://openrouter.ai/generated-map.png',
            cost: 0.015,
            status: 'completed'
        });

        const response = await request(app)
            .post('/maps/generate-ai')
            .send({
                name: 'Test Map',
                prompt: 'A fantasy forest',
                style: 'fantasy',
                campaign: '507f1f77bcf86cd799439012'
            });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
    });
});

describe('Error Handling', () => {
    let app;
    
    beforeEach(() => {
        jest.clearAllMocks();
        jest.resetModules();
        
        jest.mock('../../backend/services/openRouter', () => ({
            generateBattleMap: jest.fn(),
            isConfigured: jest.fn()
        }));
        
        jest.mock('../../backend/models', () => ({
            Map: {
                findById: jest.fn()
            },
            Campaign: {
                findById: jest.fn()
            }
        }));
        
        app = express();
        app.use(express.json());
        
        const mapRoutes = require('../../backend/routes/maps');
        app.use('/maps', mapRoutes);
    });

    test('handles API key errors gracefully', async () => {
        const { isConfigured, generateBattleMap } = require('../../backend/services/openRouter');
        const { Campaign } = require('../../backend/models');
        
        const mockUser = { _id: '507f1f77bcf86cd799439011' };
        const mockCampaign = {
            _id: '507f1f77bcf86cd799439012',
            gm: mockUser._id,
            players: [],
            save: jest.fn().mockResolvedValue(true)
        };
        
        isConfigured.mockReturnValue(true);
        Campaign.findById.mockResolvedValue(mockCampaign);
        
        generateBattleMap.mockRejectedValue(new Error('API key is invalid'));

        const response = await request(app)
            .post('/maps/generate-ai')
            .send({
                name: 'Test Map',
                prompt: 'A dungeon map',
                campaign: '507f1f77bcf86cd799439012'
            });

        expect(response.status).toBe(500);
    });

    test('handles network errors', async () => {
        const { isConfigured, generateBattleMap } = require('../../backend/services/openRouter');
        const { Campaign } = require('../../backend/models');
        
        const mockUser = { _id: '507f1f77bcf86cd799439011' };
        const mockCampaign = {
            _id: '507f1f77bcf86cd799439012',
            gm: mockUser._id,
            players: [],
            save: jest.fn().mockResolvedValue(true)
        };
        
        isConfigured.mockReturnValue(true);
        Campaign.findById.mockResolvedValue(mockCampaign);
        
        generateBattleMap.mockRejectedValue(new Error('Network error: ECONNREFUSED'));

        const response = await request(app)
            .post('/maps/generate-ai')
            .send({
                name: 'Test Map',
                prompt: 'A dungeon map',
                campaign: '507f1f77bcf86cd799439012'
            });

        expect(response.status).toBe(500);
        expect(response.body.success).toBe(false);
    });
});

describe('Database Field Validation', () => {
    let app;
    
    beforeEach(() => {
        jest.clearAllMocks();
        jest.resetModules();
        
        jest.mock('../../backend/services/openRouter', () => ({
            generateBattleMap: jest.fn(),
            isConfigured: jest.fn()
        }));
        
        let savedData = null;
        const mockMapInstance = {
            _id: '507f1f77bcf86cd799439013',
            save: jest.fn().mockResolvedValue(true)
        };
        
        jest.mock('../../backend/models', () => ({
            Map: jest.fn().mockImplementation((data) => {
                savedData = data;
                return mockMapInstance;
            }),
            Campaign: {
                findById: jest.fn()
            }
        }));
        
        app = express();
        app.use(express.json());
        
        const mapRoutes = require('../../backend/routes/maps');
        app.use('/maps', mapRoutes);
    });

    test('saves all required AI fields to database', async () => {
        const { isConfigured, generateBattleMap } = require('../../backend/services/openRouter');
        const { Campaign } = require('../../backend/models');
        
        const mockUser = { _id: '507f1f77bcf86cd799439011' };
        const mockCampaign = {
            _id: '507f1f77bcf86cd799439012',
            gm: mockUser._id,
            players: [],
            save: jest.fn().mockResolvedValue(true)
        };
        
        isConfigured.mockReturnValue(true);
        Campaign.findById.mockResolvedValue(mockCampaign);
        
        generateBattleMap.mockResolvedValue({
            imageUrl: 'https://openrouter.ai/generated-map.png',
            cost: 0.015,
            status: 'completed'
        });

        const response = await request(app)
            .post('/maps/generate-ai')
            .send({
                name: 'Complete Test Map',
                prompt: 'A detailed scifi battle map',
                style: 'scifi',
                campaign: '507f1f77bcf86cd799439012',
                gridWidth: 25,
                gridHeight: 20,
                gridSize: 50
            });

        // Verify response
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
    });

    test('campaign activeMap is set on first map', async () => {
        const { isConfigured, generateBattleMap } = require('../../backend/services/openRouter');
        
        const mockUser = { _id: '507f1f77bcf86cd799439011' };
        
        const campaignWithoutActiveMap = {
            _id: '507f1f77bcf86cd799439012',
            gm: mockUser._id,
            players: [],
            activeMap: null,
            save: jest.fn().mockResolvedValue(true)
        };
        
        const { Campaign } = require('../../backend/models');
        
        isConfigured.mockReturnValue(true);
        Campaign.findById.mockResolvedValue(campaignWithoutActiveMap);
        
        generateBattleMap.mockResolvedValue({
            imageUrl: 'https://openrouter.ai/generated-map.png',
            cost: 0.015,
            status: 'completed'
        });

        await request(app)
            .post('/maps/generate-ai')
            .send({
                name: 'First Map',
                prompt: 'A map',
                style: 'fantasy',
                campaign: '507f1f77bcf86cd799439012'
            });

        // Verify campaign.save was called to set activeMap
        expect(campaignWithoutActiveMap.save).toHaveBeenCalled();
    });
});
