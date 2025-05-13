const express = require('express');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const app = express();
const IP = process.env.IP || "172.16.2.6";
const PORT = process.env.PORT || 5000;
const MongoPort = process.env.MONGOPORT || 27017;
const DB_NAME = "food-ordering";
const JWT_SECRET = 'shh... this is a secret';
const SALT_ROUNDS = 10;

const client = new MongoClient(`mongodb://${IP}:${MongoPort}`);
let db;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// MongoDB connection
client.connect()
    .then(() => {
        db = client.db(DB_NAME);
        console.log("✅ Connected to MongoDB");
    })
    .catch((error) => {
        console.error("❌ Failed to connect to MongoDB", error);
    });

app.post('/place-order', async (req, res) => {
    console.log('📦 place-order endpoint called');

    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ msg: 'Unauthorized: No token provided', status: false });
        }

        const token = authHeader.split(' ')[1];
        let decoded;
        try {
            decoded = jwt.verify(token, JWT_SECRET);
        } catch (err) {
            return res.status(403).json({ msg: 'Forbidden: Invalid token', status: false });
        }

        const { address, items } = req.body;

        if (!address || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ msg: 'Address and cart items are required', status: false });
        }

        const order = {
            userId: decoded.userId,
            email: decoded.email,
            address,
            items,
            placedAt: new Date()
        };

        const result = await db.collection('orders').insertOne(order);
        console.log('✅ Order inserted:', result.insertedId);

        res.json({ msg: 'Order placed successfully', status: true });
    } catch (error) {
        console.error('❌ Error placing order:', error);
        res.status(500).json({ msg: 'Failed to place order', status: false });
    }
});

app.post('/signup', async (req, res) => {
    console.log('👤 Signup endpoint called');

    try {
        const { name, password, email } = req.body;
        if (!name || !password || !email) {
            return res.status(400).json({ msg: 'All fields are required', status: false });
        }

        const usersCollection = db.collection('users');

        const existingUser = await usersCollection.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ msg: 'Email already exists', status: false });
        }

        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
        const newUser = { name, email, password: hashedPassword };

        const result = await usersCollection.insertOne(newUser);
        console.log('✅ User inserted:', result.insertedId);

        const accessToken = jwt.sign({ userId: result.insertedId, email }, JWT_SECRET, { expiresIn: '6h' });
        res.json({ msg: 'User created successfully', status: true, accessToken });

    } catch (error) {
        console.error('❌ Error in signup:', error);
        res.status(500).json({ msg: 'Failed to signup', status: false });
    }
});

app.post('/login', async (req, res) => {
    console.log('🔐 Login endpoint called');

    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ msg: 'Email and password are required', status: false });
        }

        const usersCollection = db.collection('users');
        const user = await usersCollection.findOne({ email });

        if (!user) {
            return res.status(400).json({ msg: 'Invalid credentials', status: false });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid credentials', status: false });
        }

        const accessToken = jwt.sign({ userId: user._id, email }, JWT_SECRET, { expiresIn: '6h' });
        res.json({ msg: 'Login successful', status: true, accessToken });

    } catch (error) {
        console.error('❌ Error in login:', error);
        res.status(500).json({ msg: 'Failed to login', status: false });
    }
});

// Start server
app.listen(PORT, IP, () => {
    console.log(`🚀 Server running at http://${IP}:${PORT}`);
});
