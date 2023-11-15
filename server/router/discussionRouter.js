const express = require("express");
const router = express.Router();
const { generateGroupKey, encryptKey } = require('../utils/crypto');
const User = require('../models/User');
const Group = require('../models/Group');
const jwt = require('jsonwebtoken');


const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1]; // Assuming Bearer token

    if (!token) {
        return res.status(401).send({ message: "No token provided" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = decoded; // Set the user in the request
        next();
    } catch (error) {
        console.error(error)
        res.status(401).send({ message: "Invalid token" });
    }
};

router.post('/createGroup', async (req, res) => {
    try {
        const { groupName, userId } = req.body;
        const groupKey = generateGroupKey(); // Generate a symmetric key for the group

        // Fetch the public key of the user (group creator)
        const user = await User.findById(userId);

        const encryptedGroupKey = encryptKey(groupKey, user.publicKey); // Encrypt the group key with the user's public key
        const newGroup = new Group({
            name: groupName,
            admin: userId,
            members: [{
                userId: userId,
                encryptedGroupKey: encryptedGroupKey
            }]
        });

        await newGroup.save();
        res.status(201).json({ message: 'Group created successfully', groupId: newGroup._id });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.post('/addGroupMember', authenticate, async (req, res) => {
    try {
        const { groupId, newUserId, encryptedGroupKey } = req.body;

        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ message: 'Group not found' });
        }

        // Add the new user with the encrypted group key
        group.members.push({
            userId: newUserId,
            encryptedGroupKey: encryptedGroupKey
        });

        await group.save();
        res.status(200).json({ message: 'User added to group successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Endpoint to get a user's public key
router.get('/users/publicKey/:userId', authenticate, async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({ publicKey: user.publicKey }); // Assuming publicKey is stored in the User model
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
});

router.get('/searchUsers', async (req, res) => {
    const { username } = req.query;

    try {
        // Replace with your database query logic
        const users = await User.find({ username: new RegExp(username, 'i') }); // This is a simple regex search, adjust according to your needs

        res.json({ users });
    } catch (error) {
        res.status(500).json({ message: 'Error searching for users', error });
    }
});
// Route to get groups managed by the admin
router.get('/adminGroups', authenticate, async (req, res) => {
    try {
        const adminId = req.user.id; // Assuming the JWT token contains the user ID
        const groups = await Group.find({ admin: adminId }).populate('members.userId', 'username');

        res.json({ groups });
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
});

// Route to get encrypted group key for the admin
router.get('/groupKey/:groupId', authenticate, async (req, res) => {
    try {
        const { groupId } = req.params;
        const group = await Group.findById(groupId);
        if (!group || group.admin.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Unauthorized' });
        }
        const adminEncryptedKey = group.members.find(member => member.userId.toString() === req.user.id).encryptedGroupKey;
        res.json({ encryptedGroupKey: adminEncryptedKey });
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
});


router.post('/sendMessage', async (req, res) => {
    try {
        const { content, senderId, groupId } = req.body;
        const newMessage = new Message({
            content, // Already encrypted by the client
            sender: senderId,
            group: groupId
        });
        await newMessage.save();
        res.status(201).json({ message: 'Message sent successfully' });
    } catch (error) {
        res.status(500).send(error.message);
    }
});

module.exports = router;

