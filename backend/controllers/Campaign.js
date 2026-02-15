const Campaign = require('../models/campaign');
const User = require('../models/user');
const mongoose = require('mongoose');
const Friend = require('../models/friend');


exports.list = async (req, res) => {
    try {
        console.log("Starting list users...");
        console.log("User: " + req.user._id);

        // First get the user's friends list
        const user = await User.findById(req.user._id).populate('friends');

        const friendships = await Friend.find({
            $and: [
                {
                    $or: [
                        { requestor: req.user._id },
                        { requestee: req.user._id }
                    ]
                },
                { confirmed: true }
            ]
        });

        // Extract friend IDs from the friendships
        const friendIds = friendships.map(friendship =>
            friendship.requestor.toString() === req.user._id.toString()
                ? friendship.requestee.toString()
                : friendship.requestor.toString()
        );

        console.log("Friends IDs:", friendIds);

        // Find campaigns where:
        // 1. User is GM
        // 2. User is a player
        // 3. GM is a friend and user is not already a player
        const campaigns = await Campaign.find({
            $or: [
                { gm: req.user._id },
                { players: req.user._id },
                {
                    gm: { $in: friendIds },
                    players: { $ne: req.user._id }
                }
            ]
        })
        .populate('gm', 'username')
        .populate('players', 'username')
        .populate('maps')
        .sort({ created: -1 }); // Most recent first

        console.log("Campaigns: " + campaigns);

        // Add a flag to indicate if this is a friend's campaign
        const campaignsWithMetadata = campaigns.map(campaign => {
            const gmId = campaign.gm._id.toString();
            console.log("Campaign GM ID: " + gmId);
            const isFriendsCampaign = friendIds.includes(gmId);
            return {
                ...campaign.toObject(),
                isFriendsCampaign
            };
        });
        console.log(campaignsWithMetadata[1]);
        res.json(campaignsWithMetadata);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.add = async (req, res) => {
    try {
        const campaign = new Campaign({
            name: req.body.name,
            description: req.body.description,
            gm: req.user._id,
            players: [req.user._id] // GM is also a player
        });
        await campaign.save();
        res.status(201).json({ campaign });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.update = async (req, res) => {
    try {
        const campaign = await Campaign.findById(req.body.campaignId);
        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }
        if (campaign.gm.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        // Update fields that are provided
        if (req.body.name !== undefined) {
            campaign.name = req.body.name;
        }
        if (req.body.description !== undefined) {
            campaign.description = req.body.description;
        }
        if (req.body.activeMap !== undefined) {
            campaign.activeMap = req.body.activeMap;
        }
        campaign.lastModified = Date.now();

        await campaign.save();
        res.json(campaign);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.delete = async (req, res) => {
    try {
        const campaign = await Campaign.findById(req.body.campaignId);
        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }
        if (campaign.gm.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        await campaign.deleteOne();
        res.json({ message: 'Campaign deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.join = async (req, res) => {
    try {
        const campaign = await Campaign.findById(req.body.campaignId);
        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }

        if (campaign.players.includes(req.user._id)) {
            return res.status(400).json({ message: 'Already a member' });
        }

        campaign.players.push(req.user._id);
        await campaign.save();
        res.json(campaign);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.get = async (req, res) => {
    try {
        console.log("Trying to find campaign with ID: " + req.params.id);
        
        // Check if the ID is a valid ObjectId format
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(404).json({ message: 'Campaign not found' });
        }
        
        const campaign = await Campaign.findById(req.params.id)
            .populate('gm', 'username email')
            .populate('players', 'username email')
            .populate({
                path: 'activeMap',
                populate: {
                    path: 'tokens.ownerId',
                    select: 'username email'
                }
            });

        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }

        // Check if user has permission to access this campaign
        const isGM = campaign.gm._id.toString() === req.user.id.toString();
        const isPlayer = campaign.players.some(player =>
            player._id.toString() === req.user.id.toString()
        );

        if (!isGM && !isPlayer) {
            return res.status(403).json({ message: 'Access denied' });
        }

        res.json(campaign);
    } catch (error) {
        console.error('Error fetching campaign:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.addMap = async (req, res) => {
    try {
        const campaign = await Campaign.findById(req.params.campaignId);
        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }

        // Check if the user is the GM
        if (campaign.gm.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Only the GM can add maps' });
        }

        // Add the new map ID to the campaign's maps array
        campaign.maps.push(req.body.mapId);

        // If this is the first map, set it as active
        if (!campaign.activeMap) {
            campaign.activeMap = req.body.mapId;
        }

        await campaign.save();
        res.status(201).json(campaign);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};