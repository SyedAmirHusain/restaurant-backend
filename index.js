const express = require('express');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');

const app = express();
const IP = process.env.IP || "192.168.7.54";
const PORT = process.env.PORT || 5000;
const MongoPort = process.env.MONGOPORT || 27017;
const DB_NAME = "food-ordering";

const client = new MongoClient(`mongodb://${IP}:${MongoPort}`);

// Middleware
app.use(cors());
app.use(bodyParser.json());

app.post('/place-order', async (req, res) => {
  console.log('place-order endpoint called');

  try {
    const reqBody = req.body;

    await client.connect();
    const db = client.db(DB_NAME);

    const order = {
      name: reqBody.name,
      phone: reqBody.phone,
      email: reqBody.email,
      address: reqBody.address,
    };

    const result = await db.collection('orders').insertOne(order);
    console.log('Order inserted:', result.insertedId);

    res.json({ msg: 'Order placed successfully', status: true });

  } catch (error) {
    console.error('Error placing order:', error);
    res.status(500).json({ msg: 'Failed to place order', status: false });
  } finally {
    await client.close();
  }
});

app.listen(PORT, IP, () => {
  console.log(`Server running on http://${IP}:${PORT}`);
});
