#!/bin/bash

# Wisely Spent Deployment Script for Ubuntu (EC2)
# Usage: sudo ./deploy.sh

set -e

echo "--- Starting Deployment ---"

# 1. Update System & Install Dependencies
echo "--- Installing System Dependencies ---"
sudo apt-get update
sudo apt-get install -y curl git nginx build-essential

# 2. Install Node.js 20.x (LTS)
if ! command -v node &> /dev/null; then
    echo "--- Installing Node.js 20.x ---"
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo "--- Node.js already installed ---"
fi

# 3. Install PM2
if ! command -v pm2 &> /dev/null; then
    echo "--- Installing PM2 ---"
    sudo npm install -g pm2
    sudo pm2 startup systemd
else
    echo "--- PM2 already installed ---"
fi

# 4. Deployment Variables
APP_DIR=$(pwd)
SERVER_DIR="$APP_DIR/server"
CLIENT_DIR="$APP_DIR" # Root is client
DEPLOY_PATH="/var/www/wiselyspent"
SERVER_PORT=5001

echo "--- Deploying from $APP_DIR ---"

# 5. Backup SQLite Database (if exists)
if [ -f "$SERVER_DIR/database.sqlite" ]; then
    echo "--- Backing up Database ---"
    cp "$SERVER_DIR/database.sqlite" "$APP_DIR/database.sqlite.bak"
fi

# 6. Build Server
echo "--- Building Server ---"
cd "$SERVER_DIR"
npm install
npm run build

# 6.5. Copy Firebase Service Account (for push notifications)
if [ -f "service-account.json" ]; then
    echo "--- Deploying Firebase Service Account ---"
    # Keep it in server root where the code expects it
    cp service-account.json dist/service-account.json 2>/dev/null || true
else
    echo "⚠️  WARNING: service-account.json not found. Push notifications will not work."
fi

# Restore DB if backup exists but original missing (safety)
# if [ -f "$APP_DIR/database.sqlite.bak" ] && [ ! -f "database.sqlite" ]; then
#     mv "$APP_DIR/database.sqlite.bak" "database.sqlite"
# fi
cd "$APP_DIR"

# 7. Start/Restart Server with PM2
echo "--- Starting Server ---"
cd "$SERVER_DIR"
if pm2 list | grep -q "wiselyspent-server"; then
    pm2 restart wiselyspent-server
else
    pm2 start dist/src/app.js --name "wiselyspent-server"
    pm2 save
fi

# 7.5. Seed Admin User
echo "--- Creating Admin User ---"
node dist/src/seedAdmin.js || echo "⚠️  Admin seed script failed (may already exist)"

cd "$APP_DIR"

# 8. Build Frontend
echo "--- Building Frontend ---"
npm install
npm run build

# 9. Deploy Frontend Files
echo "--- Deploying Static Files ---"
sudo mkdir -p $DEPLOY_PATH
sudo cp -r dist/* $DEPLOY_PATH/
sudo chown -R www-data:www-data $DEPLOY_PATH

# 10. Configure Nginx
echo "--- Configuring Nginx ---"
cat <<EOF | sudo tee /etc/nginx/sites-available/wiselyspent
server {
    listen 80;
    server_name _;

    root $DEPLOY_PATH;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:$SERVER_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }

    # Optional: Serve Uploads
    location /uploads {
        alias $SERVER_DIR/uploads;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/wiselyspent /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

echo "--- Deployment Complete! ---"
echo "Public IP: $(curl -s http://checkip.amazonaws.com)"
