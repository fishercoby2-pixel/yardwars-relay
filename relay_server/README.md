# Yard Wars v1.1 - 24/7 Cloud Relay Server

This lightweight server powers **Room Code Matchmaking** for Yard Wars. It allows friends to play together across mobile networks (4G/5G/Wi-Fi) from anywhere in the world without entering IP addresses or port forwarding.

---

### Free 24/7 Deployment Options

#### Option 1: Glitch.com (Instant, 30 Seconds, No Card Required)
1. Go to [https://glitch.com](https://glitch.com) and create a free account.
2. Click **New Project** -> **glitch-hello-node**.
3. Replace `package.json` and `server.js` with the files in this folder.
4. Glitch will instantly give you a live URL, like:
   `https://yardwars-relay.glitch.me`
5. Your WebSocket URL is:
   `wss://yardwars-relay.glitch.me`

#### Option 2: Render.com (Free Web Service)
1. Push this folder to a GitHub repository.
2. Go to [https://dashboard.render.com](https://dashboard.render.com) -> Click **New +** -> **Web Service**.
3. Select your repository.
4. Set:
   * **Runtime**: Node
   * **Build Command**: `npm install`
   * **Start Command**: `node server.js`
   * **Plan**: Free
5. Click **Create Web Service**. Render gives you a secure URL:
   `wss://<your-service-name>.onrender.com`

#### Option 3: Koyeb / Railway / Fly.io
Deploy using the included `Dockerfile`.

---

### How to Point Yard Wars to Your Cloud Relay
In `scripts/network_manager.gd`, set the default relay URL:
```gdscript
const DEFAULT_CLOUD_RELAY_URL := "wss://<your-service>.glitch.me"
```
Once deployed, anyone with the APK can tap **`CREATE ROOM CODE`**, get a code like `YARD`, and their friend taps **`ENTER ROOM`** to play instantly!
