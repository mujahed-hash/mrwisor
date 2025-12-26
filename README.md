# Wisely Spent

A modern expense tracking and splitting app built with React, TypeScript, and Capacitor.

## 🚀 Features

- **Expense Tracking**: Track personal and group expenses
- **Smart Splitting**: Flexible expense splitting (equal, percentage, custom)
- **Group Management**: Create and manage expense groups
- **Smart Insights**: Algorithmic analysis of spending patterns
- **Receipt Scanning**: OCR-powered receipt processing
- **Push Notifications**: Real-time notifications for expenses and payments
- **Mobile Apps**: Native iOS and Android apps via Capacitor
- **Admin Portal**: Full administrative dashboard

## 🛠️ Tech Stack

### Frontend
- React + TypeScript
- Vite
- TailwindCSS + shadcn/ui
- Recharts for analytics
- Capacitor for mobile

### Backend
- Node.js + Express
- TypeScript
- SQLite with Sequelize ORM
- Firebase Admin (Push Notifications)
- Tesseract.js (OCR)

## 📦 Installation

### Prerequisites
- Node.js 20.x or higher
- npm or yarn

### Local Development

1. Clone the repository
```bash
git clone <your-repo-url>
cd wisely-spent
```

2. Install dependencies
```bash
# Install frontend dependencies
npm install

# Install server dependencies
cd server
npm install
cd ..
```

3. Set up environment variables
```bash
# Create .env file in server directory
cp server/.env.example server/.env
# Edit server/.env with your configuration
```

4. Start development servers
```bash
# Terminal 1: Start backend (from server directory)
cd server
npm run dev

# Terminal 2: Start frontend (from root)
npm run dev
```

5. Access the app
- Frontend: http://localhost:5173
- Backend API: http://localhost:5001

## 📱 Mobile Development

### Setup
```bash
# Sync Capacitor
npx cap sync

# Open in IDE
npx cap open ios     # For iOS
npx cap open android # For Android
```

### Firebase Setup (Push Notifications)
See [PUSH_NOTIFICATIONS_SETUP.md](./PUSH_NOTIFICATIONS_SETUP.md) for detailed instructions.

## 🚢 Deployment

### EC2 Deployment

1. SSH into your EC2 instance
2. Clone the repository
3. Add Firebase credentials (`service-account.json`) to `server/`
4. Run deployment script:
```bash
chmod +x deploy.sh
sudo ./deploy.sh
```

### Default Admin Account
After first deployment, use these credentials to access admin portal:
- Email: `admin@wiselyspent.com`
- Password: `Admin@123`

**⚠️ Change this password immediately after first login!**

## 📝 Environment Variables

### Backend (.env)
```
JWT_SECRET=your-secret-key
PORT=5001
```

## 🔐 Security Notes

**NEVER commit these files:**
- `service-account.json` (Firebase credentials)
- `google-services.json` (Android Firebase config)
- `GoogleService-Info.plist` (iOS Firebase config)
- `.env` files
- Database files (`*.sqlite`)

## 📄 License

Proprietary - All rights reserved

## 🆘 Support

For issues and questions, contact the development team.
