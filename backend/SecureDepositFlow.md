# SmartPayBin Backend

## Architecture Overview: Secure Deposit Flow

This backend powers the SmartPayBin system, handling user authentication, bin management, and the secure processing of waste deposit transactions to award users with points.

### The Security Challenge: Why We Redesigned the Flow

In a typical reward-based waste system, the biggest vulnerability is **data forgery**. If the mobile application is solely responsible for telling the server, *"User A deposited 5kg of plastic,"* a malicious user could easily mimic or intercept that API call and give themselves unlimited reward points without ever visiting a bin. 

To solve this, the architecture enforces a strict trust boundary:
- **Users (Mobile App)** can declare *intent* (e.g., "I want to start a deposit session at Bin X").
- **Bins (IoT Devices)** provide the *ground truth* (e.g., "I physically weighed 2.5kg of plastic").

The server only awards points when an authenticated physical bin provides the verified numbers.

---

### The Session-Based Solution: How It Works

To bridge the gap between a user standing in front of a bin and the bin classifying the waste, we use a **Session-Based Deposit Flow**.

#### 1. Registration (`Bin -> Server`)
Before a bin can participate in the network, an administrator registers it. This generates a unique, one-time `API Key` for that specific Raspberry Pi. The server stores a hashed version of this key, and the physical bin uses it to authenticate all future communication to the server, completely independent of user accounts.

#### 2. Intent & Discovery (`User -> Server`)
When a user wants to deposit waste, they scan a QR code on the physical bin using their app. This QR code contains the bin's ID. The user's app sends a request to the server: *"Start a session for me at this specific bin."* 

The server creates a **Pending Session** bound to both that user and that bin, starting a short countdown timer.

#### 3. Handshake (`Bin -> Server`)
The physical bin constantly polls the server, asking, *"Does anyone want to use me right now?"* 

When it sees the pending session, it acknowledges it using its own secret API key. The server marks the session as **Active**. The bin then unlocks its lid and activates its sensors. At this point, the bin is locked to that specific user's session—no one else can start a session on that bin until it finishes.

#### 4. Deposit & Verification (`User -> Bin -> Server`)
The user deposits their waste. The hardware sensors classify the type (plastic, recyclable, etc.) and measure the weight. 

Once the user is done, they press an "End" button on the bin. The bin packages the final sensor readings and securely posts them to the server, authenticating with its `API Key`.

#### 5. Resolution & Rewards (`Server`)
The server receives the verified data from the trusted bin hardware. It finds the active session, calculates the appropriate reward points based on the waste type and weight, updates the bin's internal capacity level, and finally credits the points to the user's account. The session is marked as **Completed**. 

Meanwhile, the user's app, which has been checking the session status, sees the completion and displays the earned rewards.

---

### API Authentication Summary

This architecture results in two distinct API surfaces:
1. **User Routes (`/api/users/*`, `/api/deposits/*`)**: Protected by standard **JWT (JSON Web Tokens)**. Used by the mobile app to manage user accounts and start/monitor deposit sessions.
2. **Bin Routes (`/api/bin/*`)**: Protected by **Machine-to-Machine API Keys**. Used exclusively by the physical IoT devices to securely report ground truth data. User tokens are never accepted here.
