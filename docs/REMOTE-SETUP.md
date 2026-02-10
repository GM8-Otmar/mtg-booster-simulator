# Remote Setup Guide (Playing with Friends Over the Internet)

This guide shows you how to let friends who are **not on your local network** connect to your MTG Sealed Event server using ngrok.

## Prerequisites

- Both backend and frontend servers must be running
- You need an ngrok account (free tier works fine)

---

## Step 1: Install ngrok

**Download and install ngrok:**

Visit https://ngrok.com/download and download ngrok for Windows.

Or install via npm:
```bash
npm install -g ngrok
```

**Sign up for free account:**
1. Go to https://dashboard.ngrok.com/signup
2. Create a free account
3. Copy your authtoken from https://dashboard.ngrok.com/get-started/your-authtoken

**Authenticate ngrok:**
```bash
ngrok config add-authtoken YOUR_AUTH_TOKEN_HERE
```

---

## Step 2: Start All Servers (3 Terminals)

You need **THREE** terminal windows open:

### Terminal 1: Backend Server
```bash
npm run dev:server
```

**Expected output:**
```
🚀 MTG Sealed Event Server running on port 3001
   - API: http://localhost:3001/api
   - WebSocket: ws://localhost:3001
```

### Terminal 2: Frontend Server
```bash
npm run dev
```

**Expected output:**
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.x.x:5173/
```

### Terminal 3: ngrok Tunnel
```bash
ngrok http 5173
```

**Expected output:**
```
Session Status                online
Account                       your@email.com (Plan: Free)
Forwarding                    https://abc-xyz-123.ngrok-free.app -> http://localhost:5173

Web Interface                 http://127.0.0.1:4040
```

---

## Step 3: Share the URL

Copy the **Forwarding** URL from the ngrok terminal (e.g., `https://abc-xyz-123.ngrok-free.app`)

**Share this URL with your friend!**

---

## Step 4: Your Friend Connects

1. **Friend visits the ngrok URL** you shared
2. **Click "Visit Site"** on the ngrok warning page (free tier shows this)
3. **App loads!** They can now join your sealed event

---

## How to Use for Sealed Event

### You (Host):
1. Visit `http://localhost:5173` (faster, no ngrok delay)
2. Select "Sealed Event Mode"
3. Click "Host Event"
4. Choose set and booster type
5. **Share the 6-character event code** with your friend (NOT the ngrok URL - they already have that)
6. Wait for friend to join
7. Click "Start Event"
8. Open packs and play!

### Your Friend:
1. Visit the ngrok URL you shared (e.g., `https://abc-xyz-123.ngrok-free.app`)
2. Click "Visit Site" on ngrok warning
3. Select "Sealed Event Mode"
4. Click "Join Event"
5. Enter the **6-character event code** the host shared
6. Enter their name
7. Wait for host to start
8. Open packs and play!

---

## Important Notes

### Free Tier Limitations
- **URL changes every restart**: Each time you restart ngrok, you get a new URL
- **Warning page**: Friends see "ngrok - not found" warning first, just click "Visit Site"
- **One tunnel at a time**: Free tier only allows one active tunnel

### Paid Tier Benefits ($8/month)
- **Permanent URL**: Get a custom domain like `https://your-name.ngrok.app`
- **No warning page**: Friends go straight to your app
- **Multiple tunnels**: Run multiple ngrok tunnels simultaneously

---

## Troubleshooting

### "This site can't be reached"
- Make sure all 3 terminals are running (backend, frontend, ngrok)
- Check that ngrok shows "Session Status: online"

### "403 Forbidden" or CORS errors
- Restart the Vite dev server (Terminal 2) after starting ngrok
- Make sure `.env` file has `VITE_API_URL=` (empty)

### Friend can't connect to event
- Make sure you shared the **event code** (6 characters), not the full URL
- Check that WebSocket is connected (should see "Connected to WebSocket" in browser console)

### Slow performance
- This is normal with ngrok free tier - traffic goes through ngrok servers
- For better performance, use local network (same WiFi) instead of ngrok

### ngrok session expired
- Free tier sessions last 8 hours
- Just restart ngrok to get a new URL and share it again

---

## Quick Command Reference

```bash
# Terminal 1: Backend
npm run dev:server

# Terminal 2: Frontend
npm run dev

# Terminal 3: ngrok
ngrok http 5173
```

**Stop everything**: Press `Ctrl+C` in each terminal

---

## Alternative: Local Network Only (No ngrok)

If your friends are in the same house/building on the same WiFi:

1. Find your local IP:
   ```bash
   ipconfig
   ```
   Look for "IPv4 Address" (e.g., `192.168.1.100`)

2. Share: `http://192.168.1.100:5173`

3. No ngrok needed! ✅

This is **faster** and **easier** if everyone is on the same network.

---

## Upgrading to Permanent URLs (Optional)

**ngrok Paid Plan ($8/month):**
```bash
# After upgrading, reserve a custom domain in dashboard
ngrok http 5173 --domain=your-custom-name.ngrok.app
```

Your URL will always be `https://your-custom-name.ngrok.app` - no more sharing new URLs!

---

## Files Modified for Remote Support

These files were configured to work with ngrok:

- `vite.config.ts` - Added `allowedHosts`, `hmr.clientPort`, and proxy for backend
- `server/index.ts` - Added CORS for all origins
- `src/api/sealedApi.ts` - Uses relative URLs for API calls
- `src/contexts/SealedEventContext.tsx` - Uses relative URLs for WebSocket
- `.env` - Set `VITE_API_URL=` empty to use Vite proxy

---

## Summary

**Local network (same WiFi):**
- Run backend + frontend
- Share local IP (e.g., `http://192.168.1.100:5173`)
- Fast and free ✅

**Remote (different locations):**
- Run backend + frontend + ngrok
- Share ngrok URL (e.g., `https://abc-xyz.ngrok-free.app`)
- Slower, but works anywhere 🌍

---

Built with ❤️ for Magic players everywhere
