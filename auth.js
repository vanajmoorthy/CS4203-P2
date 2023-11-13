const express = require("express");
const router = express.Router()

// Registration Endpoint
router.post('/register', async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        const user = new User({
            username: req.body.username,
            password: hashedPassword
        });
        await user.save();
        res.status(201).send("User created successfully");
    } catch (error) {
        res.status(500).send(error);
    }
});

// Login Endpoint
router.post('/login', async (req, res) => {
    try {
        const user = await User.findOne({ email: req.body.email });
        if (user && await bcrypt.compare(req.body.password, user.password)) {
            const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
            res.status(200).json({ token });
        } else {
            res.status(400).send("Invalid credentials");
        }
    } catch (error) {
        res.status(500).send(error);
    }
});

module.exports = router;
