# 🚘 DriveFleet — Server

The RESTful API backend for the **DriveFleet** car rental platform. Built with **Node.js**, **Express**, and **MongoDB Atlas**.

🌐 **Live API:** [https://drivefleet-server-ivory.vercel.app](https://drivefleet-server-ivory.vercel.app)

---

## ✨ Features

- 🔐 **JWT Authentication** — Verifies Better Auth tokens via JWKS with session-based fallback
- 🚗 **Cars API** — Full CRUD with search by name (`$regex`), filter by type (`$in`), and price/popularity sort
- 📅 **Bookings API** — Create, fetch, and cancel bookings per authenticated user
- 📊 **Booking Count** — Auto-increments `booking_count` using MongoDB `$inc` on every confirmed booking
- 🌐 **CORS Configured** — Supports localhost dev and Vercel production domains out of the box

---

## 🚀 API Endpoints

### 🔓 Public Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | Health check |
| `GET` | `/cars` | All cars (search, filter, sort) |
| `GET` | `/cars/:id` | Single car details |
| `GET` | `/available-cars` | Top 8 available cars |

### 🔒 Protected Endpoints (Require `Authorization: Bearer <token>`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/cars` | Add new car listing |
| `GET` | `/my-cars` | Owner's listed cars |
| `PUT` | `/cars/:id` | Update a car |
| `DELETE` | `/cars/:id` | Delete a car |
| `POST` | `/bookings` | Create a booking |
| `GET` | `/my-bookings` | User's bookings |
| `DELETE` | `/bookings/:id` | Cancel a booking |

---

## 🛠️ Tech Stack

| Component | Technology |
| :--- | :--- |
| **Runtime** | Node.js >= 18 |
| **Framework** | Express ^4.19.2 |
| **Database** | MongoDB Atlas |
| **Auth** | jose-cjs (JWKS + JWT verify) |
| **Config** | dotenv |
| **Dev Tool** | nodemon |

---

## 💻 Run Locally

```bash
git clone [https://github.com/Redwanhossain200/drivefleet-server.git](https://github.com/Redwanhossain200/drivefleet-server.git)
cd drivefleet-server
npm install
```

Create a `.env` file:

```env
MONGODB_URI=your_mongodb_connection_string
BETTER_AUTH_SECRET=your_secret_here
CLIENT_URL=http://localhost:3000
PORT=5000
```

```bash
npm run dev
```

Server runs on [http://localhost:5000](http://localhost:5000)
