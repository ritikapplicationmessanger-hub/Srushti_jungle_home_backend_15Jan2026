# Quick Start Guide

Get the Hotel Management API up and running in 5 minutes!

## 🚀 Quick Setup

### 1. Prerequisites Check

Ensure you have:
- Node.js v18+ installed: `node --version`
- MongoDB running (local or cloud)
- Git installed

### 2. Clone and Install

```bash
git clone <repository-url>
cd hotel-management-api
npm install
```

### 3. Configure Environment

```bash
# Copy the example environment file
cp .env.example .env

# Edit with your favorite editor
nano .env
```

**Minimum required configuration:**

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/hotel_management
JWT_SECRET=change-this-to-a-long-random-string
FRONTEND_URL=http://localhost:3000
```

**Generate a secure JWT secret:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 4. Start the Server

```bash
npm run dev
```

You should see:
```
✓ Server is running on port 5000
✓ MongoDB Connected
✓ API Base URL: http://localhost:5000
```

### 5. Test the API

Open your browser or use curl:

```bash
# Health check
curl http://localhost:5000/health

# Welcome message
curl http://localhost:5000/
```

## 🎯 Quick Test

The system automatically creates a super admin on first startup:

**Default Credentials:**
- Email: `admin@corepench.com`
- Login method: OTP (sent to email if configured)

### Send OTP

```bash
curl -X POST http://localhost:5000/api/v1/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@corepench.com"}'
```

## 📧 Email Configuration (Optional)

For OTP and notifications to work, configure Gmail:

1. **Enable 2-Step Verification** in your Google Account
2. **Generate App Password**: https://myaccount.google.com/apppasswords
3. **Add to .env:**

```env
EMAIL_USER=your-email@gmail.com
EMAIL_APP_PASSWORD=your-16-char-app-password
EMAIL_FROM_NAME=The Core Pench Hotel
EMAIL_FROM=your-email@gmail.com
```

## 🗄️ Database Options

### Option 1: Local MongoDB (Quick Start)

```bash
# Install MongoDB (Ubuntu/Debian)
sudo apt install mongodb
sudo systemctl start mongodb

# Use in .env
MONGODB_URI=mongodb://localhost:27017/hotel_management
```

### Option 2: MongoDB Atlas (Cloud - Recommended)

1. Create free account: https://www.mongodb.com/cloud/atlas
2. Create a cluster
3. Get connection string
4. Add to .env:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/hotel_management
```

## ✅ Validate Setup

Run the validation script to check everything:

```bash
node validate-startup.js
```

This checks:
- ✓ Environment variables
- ✓ MongoDB connection
- ✓ Email configuration
- ✓ Required directories
- ✓ System requirements

## 🔧 Development Commands

```bash
# Start in development mode
npm run dev

# Start in production mode
npm start

# Start with PM2 (production)
npm run pm2:start

# View PM2 logs
npm run pm2:logs
```

## 📊 API Endpoints

Once running, access:

- **Health Check**: http://localhost:5000/health
- **API Base**: http://localhost:5000/api/v1
- **Documentation**: Coming soon

### Key Endpoints

```bash
# Authentication
POST /api/v1/auth/send-otp
POST /api/v1/auth/verify-otp

# Rooms
GET /api/v1/rooms
POST /api/v1/rooms

# Bookings
GET /api/v1/bookings
POST /api/v1/bookings

# Dashboard
GET /api/v1/dashboard/stats
```

## 🛠️ Troubleshooting

### Port Already in Use

```bash
# Find process using port 5000
sudo lsof -i :5000

# Kill it
kill -9 <PID>

# Or change port in .env
PORT=8000
```

### MongoDB Connection Failed

```bash
# Check MongoDB is running
sudo systemctl status mongodb

# Or test connection
mongosh "mongodb://localhost:27017"
```

### Module Not Found

```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

## 📚 Next Steps

1. ✅ Read the full [README.md](./README.md)
2. ✅ Check [DEPLOYMENT.md](./DEPLOYMENT.md) for production setup
3. ✅ Configure email for OTP functionality
4. ✅ Set up proper MongoDB with authentication
5. ✅ Generate secure JWT secrets for production
6. ✅ Configure CORS for your frontend

## 🎉 You're Ready!

Your API is now running! Start building your hotel management system.

For detailed documentation, see:
- [README.md](./README.md) - Full documentation
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Production deployment
- [.env.example](./.env.example) - All configuration options

## 💡 Quick Tips

1. **Use detailed health checks**: Set `DETAILED_HEALTH_CHECK=true` in .env
2. **Enable debug logging**: Set `LOG_LEVEL=debug` in .env
3. **Watch logs**: `tail -f src/logs/combined.log`
4. **Use Postman**: Import API endpoints for easier testing
5. **Enable CORS**: Update `FRONTEND_URL` to match your frontend

## 🆘 Need Help?

- Check logs: `tail -f src/logs/combined.log`
- Run validation: `node validate-startup.js`
- Check health: `curl http://localhost:5000/health`
- Review [README.md](./README.md) troubleshooting section

---

**Happy Coding! 🚀**
