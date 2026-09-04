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
