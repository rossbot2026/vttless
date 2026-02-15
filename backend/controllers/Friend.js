const { Friend, User } = require('../models');
const mongoose = require('mongoose');


exports.add = async (req, res) => {
    try {
        const { friendId } = req.body;
        
        if (!friendId) {
            return res.status(400).json({ message: 'friendId is required' });
        }

        // Validate friendId is a valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(friendId)) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Find user by ID
        const requestee = await User.findById(friendId);
        
        if (!requestee) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if friend request already exists
        const existingRequest = await Friend.findOne({
            $or: [
                { requestor: req.user._id, requestee: requestee._id },
                { requestor: requestee._id, requestee: req.user._id }
            ]
        });

        if (existingRequest) {
            return res.status(409).json({ message: 'Friend request already exists' });
        }

        // Create new friend request
        const friendRequest = new Friend({
            requestor: req.user._id,
            requestee: requestee._id
        });

        await friendRequest.save();
        
        res.status(201).json({ 
            success: true, 
            message: 'Friend request sent'
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.list = async (req, res) => {
    try {
        // Find all confirmed friendships where user is either requestor or requestee
        const friends = await Friend.find({
            $and: [
                {
                    $or: [
                        { requestor: req.user._id },
                        { requestee: req.user._id }
                    ]
                },
                { confirmed: true }
            ]
        })
        .populate('requestor', 'username email')
        .populate('requestee', 'username email');

        // Format the response to only include friend's information
        const formattedFriends = friends.map(friendship => {
            const friend = friendship.requestor._id.equals(req.user._id) 
                ? friendship.requestee 
                : friendship.requestor;
            return {
                _id: friend._id,
                username: friend.username,
                email: friend.email
            };
        });

        res.json(formattedFriends);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.pending = async (req, res) => {
    try {
        // Find pending friend requests sent to the user
        const pendingRequests = await Friend.find({
            requestee: req.user._id,
            confirmed: false
        })
        .populate('requestor', 'username email');

        res.json(pendingRequests);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.confirm = async (req, res) => {
    try {
        const { friendId } = req.body;
        
        if (!friendId) {
            return res.status(400).json({ message: 'friendId is required' });
        }

        // Validate friendId is a valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(friendId)) {
            return res.status(404).json({ message: 'Friend request not found' });
        }

        // Find the pending friend request where the current user is the requestee
        // and the friendId is the requestor
        const friendRequest = await Friend.findOne({
            requestor: friendId,
            requestee: req.user._id,
            confirmed: false
        });

        if (!friendRequest) {
            return res.status(404).json({ message: 'Friend request not found' });
        }

        friendRequest.confirmed = true;
        friendRequest.lastModified = Date.now();
        await friendRequest.save();

        res.json({ 
            success: true, 
            message: 'Friend request confirmed'
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.reject = async (req, res) => {
    try {
        const { friendId } = req.body;
        
        if (!friendId) {
            return res.status(400).json({ message: 'friendId is required' });
        }

        // Find and delete the pending friend request where the current user is the requestee
        // and the friendId is the requestor
        const result = await Friend.deleteOne({
            requestor: friendId,
            requestee: req.user._id,
            confirmed: false
        });

        if (result.deletedCount === 0) {
            return res.status(404).json({ message: 'Friend request not found' });
        }

        res.json({ 
            success: true, 
            message: 'Friend request rejected'
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.remove = async (req, res) => {
    try {
        const { friendId } = req.body;
        
        if (!friendId) {
            return res.status(400).json({ message: 'friendId is required' });
        }

        // Validate friendId is a valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(friendId)) {
            return res.status(404).json({ message: 'Friendship not found' });
        }

        const result = await Friend.deleteOne({
            $or: [
                { requestor: req.user._id, requestee: friendId },
                { requestor: friendId, requestee: req.user._id }
            ],
            confirmed: true
        });

        if (result.deletedCount === 0) {
            return res.status(404).json({ message: 'Friendship not found' });
        }

        res.json({ message: 'Friend removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};