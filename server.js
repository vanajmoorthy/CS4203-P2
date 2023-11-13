const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const auth = require("./auth.js");

dotenv.config();
const app = express();

// Middleware
app.use(bodyParser.json());

// Define a simple route
app.get('/', (req, res) => {
    res.json({ message: "Welcome to the Secure Discussion Forum." });
});

app.use("/auth", auth);

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.log(err));

// Start the server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}.`);
});

