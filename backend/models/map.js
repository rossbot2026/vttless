const mongoose = require('mongoose');

const mapSchema = new mongoose.Schema({
    name: { type: String, required: true },
    campaign: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign' },
    gridWidth: { type: Number, default: 10, required: true },
    gridHeight: { type: Number, default: 10, required: true},
    backgroundImage: {
        assetId: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset' },
        position: {
            x: { type: Number, default: 0 },
            y: { type: Number, default: 0 }
        },
        scale: { type: Number, default: 1 }
    },
    // Legacy tokens (for backward compatibility)
    tokens: [{
        id: String,
        assetId: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset' },
        x: Number,
        y: Number,
        width: Number,
        height: Number,
        ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        name: String,
        properties: mongoose.Schema.Types.Mixed
    }],
    
    // New character instances system
    characterInstances: [{
        characterId: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'Character',
            required: true
        },
        x: { 
            type: Number, 
            required: true 
        },
        y: { 
            type: Number, 
            required: true 
        },
        width: { 
            type: Number, 
            required: true 
        },
        height: { 
            type: Number, 
            required: true 
        },
        visible: { 
            type: Boolean, 
            default: true 
        },
        // Instance-specific properties (overrides character defaults)
        instanceProperties: mongoose.Schema.Types.Mixed
    }],
    gridSettings: {
        size: { type: Number, default: 40 },
        visible: { type: Boolean, default: true },
        color: { type: String, default: '#ccc' }
    },
    // AI Battle Map Generation
    aiGenerated: { type: Boolean, default: false },
    aiPrompt: { type: String, default: '' },
    aiStyle: { 
        type: String, 
        enum: ['fantasy', 'scifi', 'modern', 'dungeon'],
        default: 'fantasy'
    },
    generationCost: { type: Number, default: 0 },
    imageUrl: { type: String, default: '' },
    status: { 
        type: String, 
        enum: ['generating', 'completed', 'failed'], 
        default: 'completed'
    }
});

module.exports = mongoose.model('Map', mapSchema);