const express = require("express");
const router = express.Router();
const { generateGroupKey, encryptKey } = require('../utils/crypto');
const User = require('../models/User');
const Group = require('../models/Group');


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

