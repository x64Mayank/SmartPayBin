# SmartPayBin End-to-End Testing Guide

This guide walks you through perfectly simulating a physical Raspberry Pi bin connecting to your backend and communicating with your smartphone application in real-time.

## Step 1: Create a Physical Bin Entity

You need to officially register a piece of hardware into the backend database to generate its unique `Bin ID` and `API Key`.

Run this command in any terminal:
```bash
curl -X POST http://localhost:8000/api/bin/register \
-H "Content-Type: application/json" \
-H "x-admin-secret: smartpaybinadminsecret" \
-d '{"name":"Main Lobby Bin","location":"Campus Center","capacity":100}'
```

**Important:** The console will print out a JSON response. **Save** the `bin._id` string and the `apiKey` string!

---

## Step 2: Boot Up the Hardware Simulator

The backend repository contains a script (`bin-simulator.js`) that acts precisely like a physical Raspberry Pi bin. 

Open a new terminal tab and navigate into the nested worktree:
```bash
cd /home/doomlord/Desktop/SmartPayBin/smartpaybin-backend/backend
```

Export the keys you just generated into your environment so the script can read them:
```bash
export BIN_ID="paste_your_bin_id_here"
export BIN_API_KEY="paste_your_api_key_here"
```

Start the hardware loop:
```bash
node bin-simulator.js
```
*(You will see it begin aggressively polling the server every 3 seconds looking for deposits).*

---

## Step 3: Trigger the Deposit via your Phone (React App)

1. Open your React Frontend (`http://localhost:5173`) and make sure you are logged in.
2. Click the large **"Start Deposit"** card on your Dashboard.
3. You will be taken to the Scanner Simulation page. Paste the **exact same `Bin ID`** that you exported to the simulator terminal.
4. Click **Simulate Scan**.
5. Your smartphone UI will enter the yellow **"Waiting for Bin"** state, establishing a `pending` session.

---

## Step 4: Complete the Lifecycle

1. Look back at your `bin-simulator.js` terminal window. Within 3 seconds, it will detect the incoming request from your phone, print `✅ Session found!`, and instantly acknowledge the lock!
2. Look at your React app—it will instantly react to the hardware handshake, flash Green, and explicitly tell the user **"Bin Unlocked!"**.
3. In your simulator terminal, it is now awaiting sensor validation. It will ask you to simulate dropping the waste in manually. 
   - Type a valid waste type: `plastic`, `recyclable`, `biodegradable`, or `mixed` and press Enter.
   - Type a weight: `2.5` and press Enter.
4. As soon as the terminal submits the final payload, watch your mobile app! The frontend will automatically catch the state change, rain confetti, and summarize your freshly updated reward points!
