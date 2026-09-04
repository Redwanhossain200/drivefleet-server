const dns = require('node:dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { createRemoteJWKSet, jwtVerify } = require('jose-cjs');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const uri = process.env.MONGODB_URI;

const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        origin.endsWith('.vercel.app')
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-user-email',
      'x-user-name',
    ],
  }),
);

app.use(express.json());

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: false,
    deprecationErrors: true,
  },
});

const clientURL = process.env.CLIENT_URL || 'http://localhost:3000';
const JWKS = createRemoteJWKSet(new URL(`${clientURL}/api/auth/jwks`));

const verifyToken = async (req, res, next) => {
  const authHeader = req?.headers.authorization;
  const userEmailHeader = req?.headers['x-user-email'];
  const userNameHeader = req?.headers['x-user-name'];

  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : authHeader;

  if (token) {
    try {
      const { payload } = await jwtVerify(token, JWKS);
      req.user = payload;
      return next();
    } catch (error) {
      try {
        const secret = new TextEncoder().encode(process.env.BETTER_AUTH_SECRET);
        const { payload } = await jwtVerify(token, secret);
        req.user = payload;
        return next();
      } catch (fallbackError) {
        try {
          const sessionDoc = await client
            .db('drivefleet')
            .collection('session')
            .findOne({ token });
          if (sessionDoc) {
            const userDoc = await client
              .db('drivefleet')
              .collection('user')
              .findOne({
                $or: [{ _id: sessionDoc.userId }, { id: sessionDoc.userId }],
              });
            if (userDoc) {
              req.user = {
                email: userDoc.email,
                name: userDoc.name,
                id: userDoc._id,
              };
              return next();
            }
          }
        } catch (dbErr) {}
      }
    }
  }

  if (userEmailHeader) {
    req.user = {
      email: userEmailHeader,
      name: userNameHeader || userEmailHeader.split('@')[0],
    };
    return next();
  }

  return res
    .status(401)
    .json({ message: 'Unauthorized: Please log in to perform this action' });
};

async function runStableAPIConnect() {
  try {
    await client.connect();
    console.log('✅ Connected successfully to MongoDB Database (drivefleet)!');

    const db = client.db('drivefleet');
    const carsCollection = db.collection('cars');
    const bookingsCollection = db.collection('bookings');

    app.get('/cars', async (req, res) => {
      try {
        const { search, carType, sort, availability } = req.query;
        let query = {};

        if (search && search.trim() !== '') {
          query.carName = { $regex: search.trim(), $options: 'i' };
        }

        if (carType && carType !== 'All' && carType !== 'all') {
          const types = Array.isArray(carType) ? carType : carType.split(',');
          query.carType = {
            $in: types.map((t) => new RegExp(`^${t.trim()}$`, 'i')),
          };
        }

        if (availability && availability !== 'All') {
          query.availabilityStatus = availability;
        }

        let sortOption = { createdAt: -1 };
        if (sort === 'price-low') sortOption = { dailyRentPrice: 1 };
        if (sort === 'price-high') sortOption = { dailyRentPrice: -1 };
        if (sort === 'popular') sortOption = { booking_count: -1 };

        const result = await carsCollection
          .find(query)
          .sort(sortOption)
          .toArray();
        res.json(result);
      } catch (error) {
        res
          .status(500)
          .json({ message: 'Failed to fetch cars', error: error.message });
      }
    });

    app.get('/available-cars', async (req, res) => {
      try {
        const result = await carsCollection
          .find({ availabilityStatus: 'Available' })
          .sort({ booking_count: -1, createdAt: -1 })
          .limit(8)
          .toArray();

        if (result.length < 6) {
          const all = await carsCollection.find({}).limit(8).toArray();
          return res.json(all);
        }

        res.json(result);
      } catch (error) {
        res.status(500).json({ message: 'Failed to fetch available cars' });
      }
    });

    app.get('/cars/:id', async (req, res) => {
      try {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) {
          return res.status(400).json({ message: 'Invalid ID format' });
        }
        const result = await carsCollection.findOne({ _id: new ObjectId(id) });
        if (!result) {
          return res.status(404).json({ message: 'Vehicle not found' });
        }
        res.json(result);
      } catch (error) {
        res.status(500).json({ message: 'Failed to fetch vehicle details' });
      }
    });

    app.post('/cars', verifyToken, async (req, res) => {
      try {
        const carData = req.body;
        const newCar = {
          ...carData,
          dailyRentPrice: Number(carData.dailyRentPrice),
          seatCapacity: Number(carData.seatCapacity) || 5,
          booking_count: 0,
          ownerEmail: req.user?.email || carData.ownerEmail,
          ownerName: req.user?.name || carData.ownerName || 'Car Host',
          createdAt: new Date(),
        };

        const result = await carsCollection.insertOne(newCar);
        res.status(201).json({ success: true, insertedId: result.insertedId });
      } catch (error) {
        res
          .status(500)
          .json({ message: 'Failed to add car', error: error.message });
      }
    });

    app.get('/my-cars', verifyToken, async (req, res) => {
      try {
        const email = req.user?.email || req.query.email;
        const result = await carsCollection
          .find({ ownerEmail: email })
          .sort({ createdAt: -1 })
          .toArray();
        res.json(result);
      } catch (error) {
        res.status(500).json({ message: 'Failed to fetch my cars' });
      }
    });

    app.put('/cars/:id', verifyToken, async (req, res) => {
      try {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) {
          return res.status(400).json({ message: 'Invalid ID format' });
        }

        const updateData = req.body;
        const result = await carsCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { ...updateData, updatedAt: new Date() } },
        );
        res.json({ success: true, modifiedCount: result.modifiedCount });
      } catch (error) {
        res.status(500).json({ message: 'Failed to update car' });
      }
    });

    app.delete('/cars/:id', verifyToken, async (req, res) => {
      try {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) {
          return res.status(400).json({ message: 'Invalid ID format' });
        }

        const result = await carsCollection.deleteOne({
          _id: new ObjectId(id),
        });
        res.json({ success: true, deletedCount: result.deletedCount });
      } catch (error) {
        res.status(500).json({ message: 'Failed to delete car' });
      }
    });