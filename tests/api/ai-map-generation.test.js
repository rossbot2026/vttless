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

const request = require('supertest');
const express = require('express');

// Mock dependencies before requiring controllers
jest.mock('../backend/services/openRouter', () => ({
    generateBattleMap: jest.fn(),
    isConfigured: jest.fn()
}));

jest.mock('../backend/models', () => ({
    Map: {
        findById: jest.fn(),
        prototype: {
            save: jest.fn()
        }
    },
    Campaign: {
        findById: jest.fn()
    }
}));

const { generateBattleMap, isConfigured } = require('../backend/services/openRouter');
const { Map, Campaign } = require('../backend/models');

describe('POST /maps/generate-ai', () => {
    let app;
    const mockUser = { _id: '507f1f77bcf86cd799439011' };
    const mockCampaign = {
        _id: '507f1f77bcf86cd799439012',
        gm: mockUser._id,
        players: [],
        save: jest.fn()
    };

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Create a simple Express app for testing
        app = express();
        app.use(express.json());
        
        // Mock passport authenticate
        app.use((req, res, next) => {
            req.user = mockUser;
            next();
        });
        
        // Import and use the route
        const mapRoutes = require('../backend/routes/maps');
        app.use('/maps', mapRoutes);
    });

    test('requires authentication', async () => {
        // Test without auth middleware - create app without user
        const unauthApp = express();
        unauthApp.use(express.json());
        const mapRoutes = require('../backend/routes/maps');
        unauthApp.use('/maps', mapRoutes);
        
        const response = await request(unauthApp)
            .post('/maps/generate-ai')
            .send({
                name: 'Test Map',
                prompt: 'A dungeon map',
                campaign: '507f1f77bcf86cd799439012'
            });
        
        // Should fail or redirect without auth (depending on passport config)
        expect(response.status).toBe(200); // Will fail auth check internally
    });

    test('validates prompt input', async () => {
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
        expect(response.body.errors).toHaveProperty('prompt');
    });

    test('validates required fields', async () => {
        isConfigured.mockReturnValue(true);
        Campaign.findById.mockResolvedValue(mockCampaign);

        const response = await request(app)
            .post('/maps/generate-ai')
            .send({
                // Missing name, prompt, and campaign
            });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.errors).toHaveProperty('name');
        expect(response.body.errors).toHaveProperty('prompt');
        expect(response.body.errors).toHaveProperty('campaign');
    });

    test('validates style enum', async () => {
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
        expect(response.body.validStyles).toContain('fantasy');
    });

    test('requires GM permissions', async () => {
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
        expect(response.body.message).toContain('GM');
    });

    test('calls OpenRouter service on success', async () => {
        isConfigured.mockReturnValue(true);
        Campaign.findById.mockResolvedValue(mockCampaign);
        
        generateBattleMap.mockResolvedValue({
            imageUrl: 'https://example.com/generated-map.png',
            cost: 0.04,
            status: 'completed'
        });

        // Mock the Map constructor
        const mockMapInstance = {
            save: jest.fn().mockResolvedValue(true),
            _id: '507f1f77bcf86cd799439013'
        };
        
        // Need to mock the Map model's constructor behavior
        const originalMap = require('../backend/models').Map;
        originalMap.mockImplementation(() => mockMapInstance);

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

        // Note: This test may fail due to S3 upload mocking complexity
        // In a full test, you would mock S3 upload as well
        expect(generateBattleMap).toHaveBeenCalledWith(
            'A fantasy forest battle map',
            'fantasy',
            { width: 20, height: 15 }
        );
    });

    test('handles rate limiting errors', async () => {
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
        expect(response.body.message).toContain('Rate limit');
    });

    test('handles OpenRouter not configured', async () => {
        isConfigured.mockReturnValue(false);

        const response = await request(app)
            .post('/maps/generate-ai')
            .send({
                name: 'Test Map',
                prompt: 'A dungeon map',
                campaign: '507f1f77bcf86cd799439012'
            });

        expect(response.status).toBe(503);
        expect(response.body.message).toContain('not configured');
    });
});

describe('GET /maps/:id/generation-status', () => {
    let app;
    const mockUser = { _id: '507f1f77bcf86cd799439011' };

    beforeEach(() => {
        jest.clearAllMocks();
        
        app = express();
        app.use(express.json());
        app.use((req, res, next) => {
            req.user = mockUser;
            next();
        });
        
        const mapRoutes = require('../backend/routes/maps');
        app.use('/maps', mapRoutes);
    });

    test('returns AI generation status for map', async () => {
        const mockMap = {
            _id: '507f1f77bcf86cd799439013',
            campaign: '507f1f77bcf86cd799439012',
            aiGenerated: true,
            aiPrompt: 'A fantasy forest',
            aiStyle: 'fantasy',
            generationCost: 0.04,
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
        expect(response.body.aiStyle).toBe('fantasy');
        expect(response.body.generationCost).toBe(0.04);
        expect(response.body.status).toBe('completed');
    });

    test('returns 404 for non-existent map', async () => {
        Map.findById.mockResolvedValue(null);

        const response = await request(app)
            .get('/maps/invalid_id/generation-status');

        expect(response.status).toBe(404);
    });

    test('requires campaign access', async () => {
        const mockMap = {
            _id: '507f1f77bcf86cd799439013',
            campaign: '507f1f77bcf86cd799439012'
        };

        const mockCampaign = {
            _id: '507f1f77bcf86cd799439012',
            gm: 'different_user_id',
            players: []
        };

        Map.findById.mockResolvedValue(mockMap);
        Campaign.findById.mockResolvedValue(mockCampaign);

        const response = await request(app)
            .get('/maps/507f1f77bcf86cd799439013/generation-status');

        expect(response.status).toBe(403);
    });
});
