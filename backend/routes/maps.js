const express = require("express");
const router = express.Router();
const passport = require('passport');
const mapController = require("../controllers/Map");
const { getSupportedModels } = require("../services/openRouter");
const multer = require('multer');

// Configure multer for temporary file storage
const upload = multer({ 
    dest: 'uploads/temp/',
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        // Accept only image files
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'), false);
        }
    }
});


// Public endpoint - Get available AI models with pricing (no auth required)
// MUST be before /:id route to avoid being caught as an ID
router.get('/ai-models', (req, res) => {
    try {
        const models = getSupportedModels();
        res.json({
            success: true,
            models: models
        });
    } catch (error) {
        console.error("Error fetching AI models:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch AI models"
        });
    }
});

// Map routes
router.get('/', passport.authenticate('jwt', {session: false}), mapController.getAllMaps);
router.post('/', passport.authenticate('jwt', {session: false}), mapController.createMap);
router.get('/:id', passport.authenticate('jwt', {session: false}), mapController.getMap);
router.put('/:id', passport.authenticate('jwt', {session: false}), mapController.updateMap);
router.delete('/:id', passport.authenticate('jwt', {session: false}), mapController.deleteMap);
router.get('/campaign/:campaignId', passport.authenticate('jwt', {session: false}), mapController.getCampaignMaps);
router.patch('/:id', passport.authenticate('jwt', {session: false}), mapController.updateMap);

// Token management routes
router.patch('/:id/tokens', passport.authenticate('jwt', {session: false}), mapController.addToken);
router.patch('/:id/tokens/:tokenId', passport.authenticate('jwt', {session: false}), mapController.updateToken);
router.delete('/:id/tokens/:tokenId', passport.authenticate('jwt', {session: false}), mapController.deleteToken);

// Map analysis route
router.post('/analyze', 
    passport.authenticate('jwt', {session: false}), 
    upload.single('image'), 
    mapController.analyzeMap
);

// AI Battle Map Generation routes
router.post('/generate-ai', 
    passport.authenticate('jwt', {session: false}), 
    mapController.generateAIMap
);

router.get('/:id/generation-status', 
    passport.authenticate('jwt', {session: false}), 
    mapController.getGenerationStatus
);

router.get('/:id/download-url', 
    passport.authenticate('jwt', {session: false}), 
    mapController.getMapDownloadUrl
);

module.exports = router;