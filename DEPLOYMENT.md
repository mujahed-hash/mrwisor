# 🚀 Wisely Spent - EC2 Deployment Instructions

Follow these steps to deploy Wisely Spent to your EC2 server.

---

## 📋 Prerequisites

- Ubuntu EC2 instance running
- SSH access to your server
- Domain/IP address ready

---

## Step 1: SSH into Your EC2 Server

```bash
ssh ubuntu@YOUR_EC2_IP
```

---

## Step 2: Clone the Repository

```bash
cd /var/www
sudo git clone https://github.com/mujahed-hash/mrwisor.git
cd mrwisor
```

---

## Step 3: Create Environment Variables File

Create the `.env` file in the server directory:

```bash
cd server
sudo nano .env
```

**Paste this content:**

```env
JWT_SECRET=28a306c5ecb37124c64a2b68ab09e9041b5e197d8d1f562c8fddb3ab97993aaf359cf0424ab343072158ef536b91ad31fb5368f27ee244363baa48fbc5b7ed72
PORT=5001
GEMINI_API_KEY=AIzaSyACZPZJfnP_4VOqPvFPdMsaijukPEvHAns
```

**Save and exit:**
- Press `Ctrl+O` (WriteOut)
- Press `Enter` (Confirm)
- Press `Ctrl+X` (Exit)

---

## Step 4: Upload Firebase Service Account File

You need to transfer `service-account.json` from your local machine to EC2.

### Option A: Using SCP (Recommended)

**On your LOCAL machine** (in a new terminal):

```bash
scp /path/to/your/local/service-account.json ubuntu@YOUR_EC2_IP:/tmp/
```

**Then on EC2:**

```bash
sudo mv /tmp/service-account.json /var/www/mrwisor/server/
```

### Option B: Manual Copy-Paste

**On EC2:**

```bash
cd /var/www/mrwisor/server
sudo nano service-account.json
```

**Paste the entire JSON content:**
```json
{
  "type": "service_account",
  "project_id": "wiselyspent-xxxxx",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "...",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "...",
  "universe_domain": "googleapis.com"
}
```

**Save:** `Ctrl+O` → `Enter` → `Ctrl+X`

---

## Step 5: Set File Permissions

```bash
cd /var/www/mrwisor/server
sudo chmod 600 .env
sudo chmod 600 service-account.json
sudo chown -R ubuntu:ubuntu /var/www/mrwisor
```

---

## Step 6: Run Deployment Script

```bash
cd /var/www/mrwisor
chmod +x deploy.sh
sudo ./deploy.sh
```

**What the script does:**
1. ✅ Installs system dependencies (Node.js, Nginx, PM2)
2. ✅ Builds the backend server
3. ✅ Starts the server with PM2
4. ✅ Creates default admin user
5. ✅ Builds the frontend
6. ✅ Configures Nginx reverse proxy
7. ✅ Starts Nginx

**Expected output:**
```
--- Starting Deployment ---
--- Installing System Dependencies ---
--- Building Server ---
--- Creating Admin User ---
✅ Admin user created successfully
📧 Email: admin@wiselyspent.com
🔑 Password: Admin@123
--- Building Frontend ---
--- Deploying Static Files ---
--- Configuring Nginx ---
--- Deployment Complete! ---
Public IP: YOUR_EC2_IP
```

---

## Step 7: Verify Deployment

### Check Server Status
```bash
pm2 list
```

You should see `wiselyspent-server` with status `online`.

### Check Server Logs
```bash
pm2 logs wiselyspent-server
```

**Look for these success messages:**
```
✅ Firebase Admin initialized successfully
Database synced
Server is running on port 5001
```

### Test the API
```bash
curl http://localhost:5001/api/
```

Should return: `"Hello World!"`

### Test Frontend
```bash
curl http://localhost/
```

Should return HTML content.

---

## Step 8: Access Your Application

Open your browser and navigate to:

```
http://YOUR_EC2_IP
```

### Default Admin Login:
- **Email:** `admin@wiselyspent.com`
- **Password:** `Admin@123`

⚠️ **IMPORTANT:** Change this password immediately after first login!

---

## 🔧 Useful Commands

### Server Management
```bash
# Restart server
pm2 restart wiselyspent-server

# Stop server
pm2 stop wiselyspent-server

# View logs
pm2 logs wiselyspent-server

# Monitor in real-time
pm2 monit
```

### Nginx Management
```bash
# Restart Nginx
sudo systemctl restart nginx

# Check Nginx status
sudo systemctl status nginx

# Test Nginx configuration
sudo nginx -t

# View Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

### Update Application
```bash
cd /var/www/mrwisor
sudo git pull origin main
sudo ./deploy.sh
```

---

## 🔐 Security Checklist

- [ ] Changed default admin password
- [ ] `.env` file has `chmod 600` permissions
- [ ] `service-account.json` has `chmod 600` permissions
- [ ] Firewall configured (allow ports 80, 443, 22)
- [ ] SSL certificate installed (recommended: Let's Encrypt)

---

## 🆘 Troubleshooting

### Server won't start
```bash
# Check if port 5001 is already in use
sudo lsof -i :5001

# Check server logs
pm2 logs wiselyspent-server --lines 100
```

### Nginx returns 502 Bad Gateway
```bash
# Ensure backend is running
pm2 list

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Restart both services
pm2 restart wiselyspent-server
sudo systemctl restart nginx
```

### Database errors
```bash
# Check if database file exists
ls -la /var/www/mrwisor/server/database.sqlite

# Reset database (⚠️ DELETES ALL DATA)
cd /var/www/mrwisor/server
rm -f database.sqlite
pm2 restart wiselyspent-server
```

### Push notifications not working
```bash
# Verify service-account.json exists
ls -la /var/www/mrwisor/server/service-account.json

# Check server logs for Firebase errors
pm2 logs wiselyspent-server | grep Firebase
```

---

## 📝 File Structure on Server

```
/var/www/mrwisor/
├── server/
│   ├── .env                    ← YOU CREATE THIS
│   ├── service-account.json    ← YOU UPLOAD THIS
│   ├── database.sqlite         ← Auto-created
│   ├── uploads/                ← Auto-created
│   └── dist/                   ← Auto-built
├── dist/                       ← Auto-built (frontend)
├── deploy.sh                   ← Run this
└── README.md
```

---

## 🎉 Next Steps

1. **Set up SSL/HTTPS** using Let's Encrypt:
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d yourdomain.com
   ```

2. **Configure DNS** to point your domain to EC2 IP

3. **Set up automatic backups** for the database

4. **Monitor server health** with PM2 or CloudWatch

---

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review server logs: `pm2 logs wiselyspent-server`
3. Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`

**Happy Deploying! 🚀**
