# 🗑 SmartPay Bin

SmartPay Bin is an IoT-based smart waste management system built using the **MERN stack + Python**.  
It simulates a Raspberry Pi smart dustbin that sends deposit data to a backend server, calculates rewards, tracks bin capacity, and stores everything in MongoDB.

---

## 📌 Project Overview

SmartPay Bin allows users to:

- Deposit waste into a smart bin
- Earn reward points based on waste weight/type
- Track bin fill percentage
- Store deposit history in a database

Currently, the Raspberry Pi is simulated using a Python script (`mock_pi.py`).

---

## 🏗 System Architecture

```
Pi Simulator (Python)
        ↓ HTTP POST
Express Backend (Node.js)
        ↓
Business Logic (Controller)
        ↓
MongoDB (Database)
```

---

## 📂 Project Structure

### 🔹 Backend (Node.js + Express + MongoDB)

```
backend/
│
├── controllers/
│   └── depositController.js
│
├── models/
│   └── Deposit.js
│
├── routes/
│   └── depositRoutes.js
│
├── node_modules/
├── package.json
├── package-lock.json
└── server.js
```

### 🔹 Pi Simulator (Mock Raspberry Pi)

```
pi-simulator/
│
├── venv/
├── mock_pi.py
└── requirements.txt
```

---

## ⚙️ Tech Stack

### Backend
- Node.js
- Express.js
- MongoDB
- Mongoose
- CORS

### Simulator
- Python
- requests library
- Virtual Environment (venv)

---

## 🚀 How to Run the Project

### 1️⃣ Start MongoDB

Make sure MongoDB is running locally:

```
mongodb://127.0.0.1:27017/smartpaybin
```

---

### 2️⃣ Run Backend

Inside `backend/`:

```bash
npm install
npx nodemon server.js
```

Server should start on:

```
http://localhost:5000
```

---

### 3️⃣ Run Pi Simulator

Inside `pi-simulator/`:

```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python mock_pi.py
```

You should see deposit responses in terminal.

---

## 🔄 Data Flow (Working)

1. `mock_pi.py` generates deposit data
2. Sends POST request to:
   ```
   http://localhost:5000/api/deposits
   ```
3. Backend:
   - Receives data
   - Calculates reward points
   - Calculates fill percentage
   - Saves deposit in MongoDB
   - Sends response
4. Python prints response

---

## 📊 Current Project Status

| Module | Status |
|--------|--------|
| Express Server | ✅ Working |
| MongoDB Connection | ✅ Working |
| Deposit API | ✅ Working |
| Reward Calculation | ✅ Implemented |
| Fill Percentage Tracking | ✅ Implemented |
| Pi Simulation | ✅ Working |
| React Frontend | ⏳ Not Started |
| Real Raspberry Pi | ⏳ Not Integrated |
| Authentication | ⏳ Not Implemented |

---

## 🧠 Example Deposit Schema

```json
{
  "binId": "BIN001",
  "userId": "USER123",
  "wasteType": "plastic",
  "weightKg": 0.42,
  "fillLevelCm": 23,
  "capacityCm": 100,
  "rewardPoints": 8.4,
  "fillPercentage": 23,
  "timestamp": "2026-02-27T10:20:30Z"
}
```

---

## 🎯 Features Implemented

- MVC Architecture
- Modular route structure
- Controller-based business logic
- Sensor simulation via Python
- HTTP communication layer
- MongoDB persistence
- Reward point logic
- Fill capacity tracking

---

## 🔮 Future Improvements

- React Dashboard (Admin + User)
- Authentication (JWT)
- User reward ledger
- Real Raspberry Pi integration
- MQTT support for scalability
- Real-time updates (Socket.io)
- Cloud deployment (AWS / DigitalOcean)

---

## 🏆 Current Achievement

SmartPay Bin has a fully functional IoT data pipeline:

> Simulated hardware → Backend API → Database → Response system

This forms the foundation for scaling into a production-level smart waste management platform.

---

## 👨‍💻 Author

SmartPay Bin – IoT + MERN Startup Prototype  
Built as part of a B.Tech project and startup initiative.

---