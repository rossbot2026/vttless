// backend/controllers/Map.js
const { Map, Campaign, Asset } = require("../models");
const { analyzeMapImage } = require("../services/mapAnalyzer");
const { generateBattleMap, isConfigured } = require("../services/openRouter");
const mongoose = require('mongoose');
const AWS = require('aws-sdk');

// Initialize S3 client
const s3 = new AWS.S3({
    region: process.env.AWS_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

/**
 * Upload an image from a URL or base64 data to S3
 * @param {string} imageUrl - The URL or base64 data of the image to upload
 * @param {string} campaignId - The campaign ID for the file path
 * @param {string} fileName - Name for the file
 * @returns {Promise<string>} - The S3 key of the uploaded file
 */
async function uploadImageFromUrlToS3(imageUrl, campaignId, fileName) {
    let buffer;
    let contentType = 'image/png';
    
    // Check if it's a base64 data URL
    if (imageUrl.startsWith('data:')) {
        // Parse base64 data URL
        const matches = imageUrl.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
            throw new Error('Invalid base64 data URL');
        }
        contentType = matches[1];
        buffer = Buffer.from(matches[2], 'base64');
    } else {
        // Fetch from URL
        const response = await fetch(imageUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.statusText}`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
        contentType = response.headers.get('content-type') || 'image/png';
    }
    
    // Create S3 key
    const environment = process.env.NODE_ENV || 'development';
    const key = `${environment}/campaigns/${campaignId}/maps/${Date.now()}-${fileName}`;
    
    // Upload to S3
    await s3.upload({
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: contentType
    }).promise();
    
    return key;
}

exports.createMap = async (req, res) => {
    try {
        const { name, gridWidth, gridHeight, gridSize, campaign } = req.body;

        // Validate required fields
        if (!name || !gridWidth || !gridHeight || !campaign) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields',
                errors: {
                    ...((!name) && { name: 'Map name is required' }),
                    ...((!gridWidth) && { gridWidth: 'Grid width is required' }),
                    ...((!gridHeight) && { gridHeight: 'Grid height is required' }),
                    ...((!campaign) && { campaign: 'Campaign ID is required' })
                }
            });
        }

        // Validate campaign ID format
        if (!mongoose.Types.ObjectId.isValid(campaign)) {
            return res.status(404).json({ message: "Campaign not found" });
        }

        // Verify campaign exists and user has permission
        const campaignDoc = await Campaign.findById(campaign);
        if (!campaignDoc) {
            return res.status(404).json({ message: "Campaign not found" });
        }

        // Check if user is GM of the campaign
        if (campaignDoc.gm.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Only the GM can create maps" });
        }

        const newMap = new Map({
            name,
            campaign,
            gridWidth,
            gridHeight,
            gridSettings: {
                size: gridSize || 40,
                visible: true,
                color: '#ccc'
            }
        });

        await newMap.save();

        // If this is the first map, set it as the active map
        if (!campaignDoc.activeMap) {
            campaignDoc.activeMap = newMap._id;
            await campaignDoc.save();
        }

        res.status(201).json(newMap);
    } catch (error) {
        console.error("Error creating map:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

exports.getMap = async (req, res) => {
    try {
        // Validate map ID format
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid map ID format" });
        }

        const map = await Map.findById(req.params.id)
            .populate({
                path: 'characterInstances.characterId',
                populate: {
                    path: 'assetId ownerId',
                    select: 'url filename username'
                }
            });
            
        if (!map) {
            return res.status(404).json({ message: "Map not found" });
        }

        // Check if user has access to the campaign
        const campaign = await Campaign.findById(map.campaign);
        if (!campaign) {
            return res.status(404).json({ message: "Campaign not found" });
        }

        const isGM = campaign.gm.toString() === req.user._id.toString();
        const isPlayer = campaign.players.some(player => 
            player.toString() === req.user._id.toString()
        );

        if (!isGM && !isPlayer) {
            return res.status(403).json({ message: "Access denied" });
        }

        res.json(map);
    } catch (error) {
        console.error("Error fetching map:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

exports.updateMap = async (req, res) => {
    try {
        // Validate map ID format
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid map ID format" });
        }

        const map = await Map.findById(req.params.id);
        if (!map) {
            return res.status(404).json({ message: "Map not found" });
        }

        // Check if user is GM of the campaign
        const campaign = await Campaign.findById(map.campaign);
        if (!campaign || campaign.gm.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Only the GM can update maps" });
        }

        const allowedUpdates = ['name', 'gridWidth', 'gridHeight', 'gridSettings', 'backgroundImage', 'tokens'];
        const updates = Object.keys(req.body)
            .filter(key => allowedUpdates.includes(key))
            .reduce((obj, key) => {
                obj[key] = req.body[key];
                return obj;
            }, {});

        Object.assign(map, updates);
        await map.save();

        res.json(map);
    } catch (error) {
        console.error("Error updating map:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

exports.deleteMap = async (req, res) => {
    try {
        // Validate map ID format
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid map ID format" });
        }

        const map = await Map.findById(req.params.id);
        if (!map) {
            return res.status(404).json({ message: "Map not found" });
        }

        // Check if user is GM of the campaign
        const campaign = await Campaign.findById(map.campaign);
        if (!campaign || campaign.gm.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Only the GM can delete maps" });
        }

        // If this is the active map, clear the activeMap reference
        if (campaign.activeMap && campaign.activeMap.toString() === map._id.toString()) {
            campaign.activeMap = null;
            await campaign.save();
        }

        await map.deleteOne();
        res.json({ message: "Map deleted successfully" });
    } catch (error) {
        console.error("Error deleting map:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

exports.getCampaignMaps = async (req, res) => {
    try {
        // Validate campaign ID format
        if (!mongoose.Types.ObjectId.isValid(req.params.campaignId)) {
            return res.status(400).json({ message: "Invalid campaign ID format" });
        }

        const campaign = await Campaign.findById(req.params.campaignId);
        if (!campaign) {
            return res.status(404).json({ message: "Campaign not found" });
        }

        const isGM = campaign.gm.toString() === req.user._id.toString();
        const isPlayer = campaign.players.some(player => 
            player.toString() === req.user._id.toString()
        );

        if (!isGM && !isPlayer) {
            return res.status(403).json({ message: "Access denied" });
        }

        const maps = await Map.find({ campaign: req.params.campaignId });
        res.json(maps);
    } catch (error) {
        console.error("Error fetching campaign maps:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Token management endpoints
exports.addToken = async (req, res) => {
    try {
        const map = await Map.findById(req.params.id);
        if (!map) {
            return res.status(404).json({ message: "Map not found" });
        }

        // Check if user has access to the campaign (either GM or player)
        const campaign = await Campaign.findById(map.campaign);
        if (!campaign) {
            return res.status(404).json({ message: "Campaign not found" });
        }

        const isGM = campaign.gm.toString() === req.user._id.toString();
        const isPlayer = campaign.players.some(player => 
            player.toString() === req.user._id.toString()
        );

        if (!isGM && !isPlayer) {
            return res.status(403).json({ message: "Access denied" });
        }

        const { token } = req.body;
        if (!token) {
            return res.status(400).json({ message: "Token data is required" });
        }

        // Validate token structure
        const requiredFields = ['id', 'assetId', 'x', 'y', 'width', 'height', 'ownerId', 'name'];
        const missingFields = requiredFields.filter(field => !token.hasOwnProperty(field));
        if (missingFields.length > 0) {
            return res.status(400).json({ 
                message: "Missing required token fields", 
                missingFields 
            });
        }

        // Check if token ID already exists on the map
        const existingToken = map.tokens.find(t => t.id === token.id);
        if (existingToken) {
            return res.status(400).json({ message: "Token with this ID already exists" });
        }

        // Add token to map
        map.tokens.push(token);
        await map.save();

        res.status(201).json({ message: "Token added successfully", token });
    } catch (error) {
        console.error("Error adding token:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

exports.updateToken = async (req, res) => {
    try {
        const map = await Map.findById(req.params.id);
        if (!map) {
            return res.status(404).json({ message: "Map not found" });
        }

        // Check if user has access to the campaign
        const campaign = await Campaign.findById(map.campaign);
        if (!campaign) {
            return res.status(404).json({ message: "Campaign not found" });
        }

        const isGM = campaign.gm.toString() === req.user._id.toString();
        const isPlayer = campaign.players.some(player => 
            player.toString() === req.user._id.toString()
        );

        if (!isGM && !isPlayer) {
            return res.status(403).json({ message: "Access denied" });
        }

        const tokenId = req.params.tokenId;
        const tokenIndex = map.tokens.findIndex(token => token.id === tokenId);
        
        if (tokenIndex === -1) {
            return res.status(404).json({ message: "Token not found" });
        }

        // Check if user owns this token (unless they're the GM)
        const token = map.tokens[tokenIndex];
        if (!isGM && token.ownerId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "You can only update your own tokens" });
        }

        // Update token properties
        const allowedUpdates = ['x', 'y', 'width', 'height', 'name', 'properties'];
        const updates = Object.keys(req.body)
            .filter(key => allowedUpdates.includes(key))
            .reduce((obj, key) => {
                obj[key] = req.body[key];
                return obj;
            }, {});

        Object.assign(map.tokens[tokenIndex], updates);
        await map.save();

        res.json({ message: "Token updated successfully", token: map.tokens[tokenIndex] });
    } catch (error) {
        console.error("Error updating token:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

exports.deleteToken = async (req, res) => {
    try {
        const map = await Map.findById(req.params.id);
        if (!map) {
            return res.status(404).json({ message: "Map not found" });
        }

        // Check if user has access to the campaign
        const campaign = await Campaign.findById(map.campaign);
        if (!campaign) {
            return res.status(404).json({ message: "Campaign not found" });
        }

        const isGM = campaign.gm.toString() === req.user._id.toString();
        const isPlayer = campaign.players.some(player => 
            player.toString() === req.user._id.toString()
        );

        if (!isGM && !isPlayer) {
            return res.status(403).json({ message: "Access denied" });
        }

        const tokenId = req.params.tokenId;
        const tokenIndex = map.tokens.findIndex(token => token.id === tokenId);
        
        if (tokenIndex === -1) {
            return res.status(404).json({ message: "Token not found" });
        }

        // Check if user owns this token (unless they're the GM)
        const token = map.tokens[tokenIndex];
        if (!isGM && token.ownerId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "You can only delete your own tokens" });
        }

        // Remove token from array
        map.tokens.splice(tokenIndex, 1);
        await map.save();

        res.json({ message: "Token deleted successfully" });
    } catch (error) {
        console.error("Error deleting token:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Get all maps for authenticated user
exports.getAllMaps = async (req, res) => {
    try {
        // Find all campaigns where user is either GM or player
        const campaigns = await Campaign.find({
            $or: [
                { gm: req.user._id },
                { players: req.user._id }
            ]
        });

        if (!campaigns || campaigns.length === 0) {
            return res.json([]); // Return empty array if user has no campaigns
        }

        // Get all maps from these campaigns
        const campaignIds = campaigns.map(campaign => campaign._id);
        const maps = await Map.find({ campaign: { $in: campaignIds } });

        res.json(maps);
    } catch (error) {
        console.error("Error fetching maps:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Map analysis endpoint
exports.analyzeMap = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ 
                success: false,
                message: "No image file provided" 
            });
        }

        console.log("Analyzing map image:", req.file.path);
        const analysisResult = await analyzeMapImage(req.file.path);
        
        // Add suggestions based on analysis
        if (analysisResult.success) {
            analysisResult.suggestions = {
                gridWidth: Math.max(1, Math.round(analysisResult.gridWidth)),
                gridHeight: Math.max(1, Math.round(analysisResult.gridHeight)),
                gridSize: Math.max(20, Math.round(analysisResult.gridSize))
            };
        }

        res.json(analysisResult);
    } catch (error) {
        console.error("Error analyzing map:", error);
        res.status(500).json({ 
            success: false,
            message: "Analysis failed",
            error: error.message,
            // Provide fallback values
            gridHeight: 10,
            gridWidth: 10,
            gridSize: 40,
            confidence: 0.0
        });
    }
};

// AI Battle Map Generation
exports.generateAIMap = async (req, res) => {
    try {
        const { 
            name, 
            prompt, 
            style, 
            gridWidth, 
            gridHeight, 
            gridSize,
            campaign 
        } = req.body;

        // Validate required fields
        if (!name || !prompt || !campaign) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields',
                errors: {
                    ...((!name) && { name: 'Map name is required' }),
                    ...((!prompt) && { prompt: 'Prompt is required' }),
                    ...((!campaign) && { campaign: 'Campaign ID is required' })
                }
            });
        }

        // Validate style
        const validStyles = ['fantasy', 'scifi', 'modern', 'dungeon'];
        if (style && !validStyles.includes(style)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid style',
                validStyles
            });
        }

        // Check if OpenRouter is configured
        if (!isConfigured()) {
            return res.status(503).json({
                success: false,
                message: 'AI map generation is not configured. Please contact the administrator.'
            });
        }

        // Verify campaign exists and user has permission
        const campaignDoc = await Campaign.findById(campaign);
        if (!campaignDoc) {
            return res.status(404).json({ message: "Campaign not found" });
        }

        // Check if user is GM of the campaign
        if (campaignDoc.gm.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Only the GM can generate AI maps" });
        }

        // Generate the map using OpenRouter
        const result = await generateBattleMap(prompt, style || 'fantasy', {
            width: gridWidth || 10,
            height: gridHeight || 10
        });

        // Upload the generated image to S3
        let s3Key;
        try {
            s3Key = await uploadImageFromUrlToS3(
                result.imageUrl,
                campaign.toString(),
                `${name.replace(/\s+/g, '-').toLowerCase()}.png`
            );
        } catch (uploadError) {
            console.error('Error uploading to S3:', uploadError);
            // Continue with the URL if S3 upload fails
        }

        // Create the map with AI-generated image
        const newMap = new Map({
            name,
            campaign,
            gridWidth: gridWidth || 10,
            gridHeight: gridHeight || 10,
            gridSettings: {
                size: gridSize || 40,
                visible: true,
                color: '#ccc'
            },
            // AI-specific fields
            aiGenerated: true,
            aiPrompt: prompt,
            aiStyle: style || 'fantasy',
            generationCost: result.cost,
            imageUrl: s3Key ? `s3://${process.env.AWS_S3_BUCKET_NAME}/${s3Key}` : result.imageUrl,
            status: 'completed'
        });

        await newMap.save();

        // If this is the first map, set it as the active map
        if (!campaignDoc.activeMap) {
            campaignDoc.activeMap = newMap._id;
            await campaignDoc.save();
        }

        res.status(201).json({
            success: true,
            message: 'AI battle map generated successfully',
            mapId: newMap._id,
            map: newMap
        });
    } catch (error) {
        console.error("Error generating AI map:", error);
        
        // Handle specific errors
        if (error.message.includes('Rate limit')) {
            return res.status(429).json({
                success: false,
                message: 'Rate limit exceeded. Please try again later.'
            });
        }
        
        if (error.message.includes('not configured')) {
            return res.status(503).json({
                success: false,
                message: 'AI map generation is not available.'
            });
        }

        res.status(500).json({
            success: false,
            message: "Failed to generate AI battle map",
            error: error.message
        });
    }
};

exports.getGenerationStatus = async (req, res) => {
    try {
        const { id } = req.params;

        const map = await Map.findById(id);
        if (!map) {
            return res.status(404).json({ message: "Map not found" });
        }

        // Check if user has access to the campaign
        const campaign = await Campaign.findById(map.campaign);
        if (!campaign) {
            return res.status(404).json({ message: "Campaign not found" });
        }

        const isGM = campaign.gm.toString() === req.user._id.toString();
        const isPlayer = campaign.players.some(player => 
            player.toString() === req.user._id.toString()
        );

        if (!isGM && !isPlayer) {
            return res.status(403).json({ message: "Access denied" });
        }

        // Return the AI generation status
        res.json({
            aiGenerated: map.aiGenerated,
            aiPrompt: map.aiPrompt,
            aiStyle: map.aiStyle,
            generationCost: map.generationCost,
            imageUrl: map.imageUrl,
            status: map.status
        });
    } catch (error) {
        console.error("Error fetching generation status:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};