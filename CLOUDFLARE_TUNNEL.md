# Cloudflare Tunnel Setup Guide - Permanent Free URL

This guide shows how to expose your local Taboo backend to the internet with a permanent URL using Cloudflare Tunnel (completely free).

## Step 1: Install Cloudflared

### Windows (PowerShell as Administrator):

**Option A: Download Installer**
1. Go to https://github.com/cloudflare/cloudflared/releases
2. Download `cloudflared-windows-amd64.msi`
3. Run the installer
4. Verify: `cloudflared --version`

**Option B: Using Chocolatey**
```powershell
choco install cloudflared
```

**Option C: Using Scoop**
```powershell
scoop install cloudflared
```

## Step 2: Login to Cloudflare

```powershell
cloudflared tunnel login
```

This will:
- Open your browser
- Ask you to login to Cloudflare (create free account if needed)
- Select a domain (or use the free `*.trycloudflare.com` domain)
- Download a certificate to your machine

## Step 3: Create a Named Tunnel (Permanent URL)

```powershell
cloudflared tunnel create taboo-backend
```

This creates a permanent tunnel and gives you a **Tunnel ID**.

**Save the Tunnel ID** - it looks like: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`

## Step 4: Configure the Tunnel

Create a config file at: `C:\Users\YOUR_USERNAME\.cloudflared\config.yml`

```yaml
tunnel: taboo-backend
credentials-file: C:\Users\YOUR_USERNAME\.cloudflared\a1b2c3d4-e5f6-7890-abcd-ef1234567890.json

ingress:
  - hostname: taboo-backend.YOUR_DOMAIN.com
    service: http://localhost:3000
  - service: http_status:404
```

**Replace:**
- `taboo-backend` with your tunnel name
- `a1b2c3d4-e5f6-7890-abcd-ef1234567890.json` with your actual credentials file
- `taboo-backend.YOUR_DOMAIN.com` with your desired subdomain

## Step 5: Create DNS Record

```powershell
cloudflared tunnel route dns taboo-backend taboo-backend.YOUR_DOMAIN.com
```

Or manually in Cloudflare dashboard:
1. Go to cloudflare.com → Your domain → DNS
2. Add CNAME record:
   - Name: `taboo-backend`
   - Target: `a1b2c3d4-e5f6-7890-abcd-ef1234567890.cfargotunnel.com`
   - Proxy status: Proxied (orange cloud)

## Step 6: Run Your Backend

```powershell
# Start your Taboo server
node server.js
```

## Step 7: Start the Tunnel

In a new terminal:

```powershell
cloudflared tunnel run taboo-backend
```

You should see:
```
2025-11-16 ... INF Connection registered connIndex=0
2025-11-16 ... INF Tunnel running successfully
```

Your backend is now accessible at: `https://taboo-backend.YOUR_DOMAIN.com`

## Step 8: Update Vercel

1. Go to your Vercel project
2. Settings → Environment Variables
3. Update `NEXT_PUBLIC_SERVER_URL` = `https://taboo-backend.YOUR_DOMAIN.com`
4. Redeploy your frontend

## Alternative: Quick Temporary URL (No Configuration)

If you just want to test quickly without setup:

```powershell
cloudflared tunnel --url http://localhost:3000
```

This gives you a random `*.trycloudflare.com` URL that works immediately but changes each time.

## Run Tunnel as Windows Service (Auto-start)

To keep the tunnel running permanently:

```powershell
# Install as service
cloudflared service install

# Start the service
cloudflared service start

# Check status
Get-Service cloudflared
```

Now your tunnel starts automatically when Windows boots!

## Troubleshooting

### "tunnel credentials file not found"
- Make sure the path in `config.yml` matches your actual credentials file
- Check: `dir C:\Users\YOUR_USERNAME\.cloudflared\`

### "failed to connect to the edge"
- Check your internet connection
- Verify firewall isn't blocking cloudflared

### "connection refused"
- Make sure your backend is running on port 3000
- Test locally: `curl http://localhost:3000`

### DNS not resolving
- Wait 2-5 minutes for DNS propagation
- Clear DNS cache: `ipconfig /flushdns`
- Check on https://dnschecker.org

## Quick Reference

```powershell
# Start tunnel
cloudflared tunnel run taboo-backend

# Stop tunnel
Ctrl + C

# List tunnels
cloudflared tunnel list

# Delete tunnel
cloudflared tunnel delete taboo-backend

# View tunnel info
cloudflared tunnel info taboo-backend

# View logs
cloudflared tunnel logs taboo-backend
```

## File Locations

- **Config:** `C:\Users\YOUR_USERNAME\.cloudflared\config.yml`
- **Credentials:** `C:\Users\YOUR_USERNAME\.cloudflared\TUNNEL_ID.json`
- **Cert:** `C:\Users\YOUR_USERNAME\.cloudflared\cert.pem`

## Free vs Paid

**Free (Zero Trust):**
- ✅ Unlimited tunnels
- ✅ Unlimited bandwidth
- ✅ Custom domains
- ✅ HTTPS automatically
- ✅ DDoS protection

**No paid plan needed!** Everything is free.

## Your Setup

Once configured, your workflow is:

1. Start backend: `node server.js`
2. Start tunnel: `cloudflared tunnel run taboo-backend` (or let service auto-start)
3. Your URL: `https://taboo-backend.YOUR_DOMAIN.com` (permanent, never changes!)
4. Update Vercel once, forget about it

## Don't Have a Domain?

**Option 1: Use Free Cloudflare Pages Domain**
- Deploy a dummy page on Cloudflare Pages
- Get free `*.pages.dev` domain
- Use that domain for tunnel

**Option 2: Use trycloudflare.com (Not Permanent)**
```powershell
cloudflared tunnel --url http://localhost:3000
```
- No setup needed
- URL changes each time
- Good for testing only

**Option 3: Buy Cheap Domain**
- Namecheap, Porkbun: ~$1-5/year for `.xyz` `.online` domains
- Add to Cloudflare (free)
- Use for permanent tunnel

## Next Steps

After setup works:
1. Test the URL: `https://taboo-backend.YOUR_DOMAIN.com`
2. Update Vercel environment variable
3. Deploy and test full app
4. Optionally install as Windows service for auto-start
