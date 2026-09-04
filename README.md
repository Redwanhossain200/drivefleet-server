# ?? DriveFleet � Server

> The RESTful API backend for the DriveFleet car rental platform. Built with **Node.js**, **Express**, and **MongoDB**. Handles cars, bookings, authentication verification, and Vercel deployment.

---

## ?? Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [API Endpoints](#-api-endpoints)
- [Authentication](#-authentication)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Scripts](#-scripts)
- [Deployment](#-deployment)

---

## ? Features

- ?? **JWT Authentication** � Verifies Better Auth tokens via JWKS + fallback session lookup
- ?? **Cars API** � Full CRUD for car listings with search, filter, and sort
- ?? **Bookings API** � Create, list, and cancel bookings per user
- ?? **Booking Count** � Auto-increments booking count on every successful reservation
- ?? **CORS Ready** � Configured for localhost development and Vercel production
- ? **Vercel Deployable** � Ships with `vercel.json` for zero-config deployment

---

## ?? Tech Stack

| Technology | Version | Purpose                 |
| ---------- | ------- | ----------------------- |
| Node.js    | >= 18   | Runtime                 |
| Express    | ^4.19.2 | Web framework           |
| MongoDB    | ^6.8.0  | Database (Atlas)        |
| jose-cjs   | ^6.2.3  | JWT & JWKS verification |
| dotenv     | ^16.4.5 | Environment variables   |
| cors       | ^2.8.5  | Cross-origin requests   |
| nodemon    | ^3.1.4  | Dev auto-restart        |

---

## ?? Project Structure

```
server/
+-- index.js        # Main Express app � all routes & DB logic
+-- vercel.json     # Vercel deployment configuration
+-- package.json    # Dependencies & scripts
+-- .env            # Environment variables (not committed)
+-- .gitignore
```

All routes are defined in `index.js` inside the `runStableAPIConnect()` function that establishes the MongoDB connection.

---

## ?? API Endpoints

### Base URL

- **Local:** `http://localhost:5000`
- **Production:** your Vercel deployment URL

---

### ?? Public Endpoints

| Method | Endpoint          | Description                       |
| ------ | ----------------- | --------------------------------- |
| `GET`  | `/`               | Health check � server status      |
| `GET`  | `/cars`           | List all cars (with filters)      |
| `GET`  | `/cars/:id`       | Get single car details            |
| `GET`  | `/available-cars` | Top 8 available cars for homepage |

#### `GET /cars` Query Parameters

| Parameter      | Type   | Description                                                       |
| -------------- | ------ | ----------------------------------------------------------------- |
| `search`       | string | Search by car name (case-insensitive regex)                       |
| `carType`      | string | Filter by type: `SUV`, `Sedan`, `Luxury`, `Electric`, `Hatchback` |
| `availability` | string | Filter by `Available` or `Unavailable`                            |
| `sort`         | string | Sort: `price-low`, `price-high`, `popular` (default: newest)      |

---

### ?? Protected Endpoints (Require Auth Token)

> All protected endpoints require an `Authorization: Bearer <token>` header.

#### Cars

| Method   | Endpoint    | Description                          |
| -------- | ----------- | ------------------------------------ |
| `POST`   | `/cars`     | Create new car listing               |
| `GET`    | `/my-cars`  | Get cars owned by authenticated user |
| `PUT`    | `/cars/:id` | Update a car listing                 |
| `DELETE` | `/cars/:id` | Delete a car listing                 |

#### Bookings

| Method   | Endpoint        | Description                         |
| -------- | --------------- | ----------------------------------- |
| `POST`   | `/bookings`     | Create a new booking                |
| `GET`    | `/my-bookings`  | Get bookings for authenticated user |
| `DELETE` | `/bookings/:id` | Cancel/delete a booking             |

---

### ?? Request / Response Examples

#### `POST /cars`

```json
{
  "carName": "2024 BMW X5",
  "carType": "SUV",
  "dailyRentPrice": 120,
  "seatCapacity": 5,
  "pickupLocation": "Airport Terminal 1",
  "description": "Luxury SUV with all amenities.",
  "image": "https://example.com/bmw-x5.jpg",
  "availabilityStatus": "Available",
  "transmission": "Automatic",
  "fuelType": "Petrol"
}
```

Response: `{ "success": true, "insertedId": "..." }`

#### `POST /bookings`

```json
{
  "carId": "64f2c...",
  "rentalDays": 3,
  "driverNeeded": "No",
  "specialNote": "Airport pickup at 10:00 AM",
  "totalPrice": 360,
  "userEmail": "user@example.com",
  "userName": "John Doe"
}
```

Response: `{ "success": true, "insertedId": "..." }`

---

## ?? Authentication

The `verifyToken` middleware supports **three fallback strategies**:

1. **JWKS Verification** � Fetches public keys from `{CLIENT_URL}/api/auth/jwks` and verifies the Bearer token (primary method used by Better Auth)
2. **Symmetric Secret** � Falls back to verifying the token using `BETTER_AUTH_SECRET` as a symmetric key
3. **Session Lookup** � If JWT verification fails, looks up the raw token in the `drivefleet.session` MongoDB collection and loads the associated user

If all JWT strategies fail but an `x-user-email` header is present, that is used as a fallback identity (for debug/dev purposes).

The verified user is attached to `req.user` with `{ email, name, id }`.

---

## ?? Getting Started

### Prerequisites

- Node.js >= 18
- MongoDB Atlas account (or local MongoDB)
- The [DriveFleet Client](#) running at `http://localhost:3000`

### Installation

```bash
# 1. Install dependencies
npm install

# 2. Create environment file
cp .env.example .env
# Edit .env with your values (see below)

# 3. Start development server (with auto-restart)
npm run dev

# OR start without nodemon
npm start
```

Server runs on [http://localhost:5000](http://localhost:5000).

---

## ?? Environment Variables

Create a `.env` file in the `server/` root:

```env
# MongoDB Atlas connection string
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/drivefleet?retryWrites=true&w=majority

# Better Auth secret (must match client BETTER_AUTH_SECRET)
BETTER_AUTH_SECRET=your_long_random_secret_here

# Client URL for JWKS endpoint and CORS
CLIENT_URL=http://localhost:3000

# Server port (optional, defaults to 5000)
PORT=5000
```

> ?? `BETTER_AUTH_SECRET` must be **identical** on both client and server.

---

## ?? Scripts

```bash
npm run dev    # Start with nodemon (auto-restart on file changes)
npm start      # Start with plain Node.js
```

---

## ?? Database Schema

All data is stored in the `drivefleet` MongoDB database.

### `cars` Collection

| Field                | Type   | Description                                 |
| -------------------- | ------ | ------------------------------------------- |
| `carName`            | String | Vehicle name & model                        |
| `carType`            | String | SUV / Sedan / Luxury / Electric / Hatchback |
| `dailyRentPrice`     | Number | Price per day (USD)                         |
| `seatCapacity`       | Number | Number of seats                             |
| `transmission`       | String | Automatic / Manual                          |
| `fuelType`           | String | Petrol / Electric / Hybrid / Diesel         |
| `pickupLocation`     | String | Pickup station name                         |
| `description`        | String | Vehicle description                         |
| `image`              | String | Image URL (user-provided)                   |
| `availabilityStatus` | String | Available / Unavailable / In Maintenance    |
| `ownerEmail`         | String | Host email                                  |
| `ownerName`          | String | Host name                                   |
| `booking_count`      | Number | Total confirmed bookings                    |
| `createdAt`          | Date   | Listing creation timestamp                  |

### `bookings` Collection

| Field            | Type   | Description                      |
| ---------------- | ------ | -------------------------------- |
| `carId`          | String | Reference to car `_id`           |
| `carName`        | String | Snapshot of car name             |
| `carImage`       | String | Snapshot of car image URL        |
| `carType`        | String | Snapshot of car type             |
| `rentalDays`     | Number | Number of rental days            |
| `dailyRentPrice` | Number | Price per day at time of booking |
| `driverNeeded`   | String | Yes / No                         |
| `totalPrice`     | Number | Total amount charged             |
| `specialNote`    | String | User's special instructions      |
| `userEmail`      | String | Renter email                     |
| `userName`       | String | Renter name                      |
| `status`         | String | Confirmed (default)              |
| `bookingDate`    | Date   | Booking creation timestamp       |

---

## ?? Deployment

The server is configured for **Vercel** deployment via `vercel.json`:

```json
{
  "builds": [{ "src": "index.js", "use": "@vercel/node" }],
  "routes": [{ "src": "/(.*)", "dest": "index.js" }]
}
```

### Deploy to Vercel

```bash
vercel deploy
```

Set all environment variables (`MONGODB_URI`, `BETTER_AUTH_SECRET`, `CLIENT_URL`) in the Vercel project dashboard under **Settings ? Environment Variables**.

> ?? Update `CLIENT_URL` to your production client domain (e.g. `https://drivefleet.vercel.app`) so JWKS verification and CORS work correctly in production.
