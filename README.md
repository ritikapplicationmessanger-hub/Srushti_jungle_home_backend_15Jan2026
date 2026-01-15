# Hotel Management API

A comprehensive backend API for hotel management operations including bookings, room management, payments, maintenance scheduling, and more.

## 🚀 Features

- **Authentication & Authorization**
  - OTP-based staff authentication
  - JWT access/refresh token system
  - Role-based access control (Admin, Manager, Staff)
  - Audit logging for all operations

- **Room & Booking Management**
  - Real-time room availability tracking
  - Overlap prevention for bookings
  - Check-in/check-out workflows
  - Automated room occupancy updates
  - Seasonal pricing support

- **Payment Processing**
  - Advance and balance payment tracking
  - Auto-creation of balance payments
  - Payment history and reporting

- **Maintenance Management**
  - Scheduled maintenance tasks
  - Priority levels and frequency tracking
  - Assignment to staff members
  - Overdue task detection

- **Inventory Management**
  - Supply tracking with low-stock alerts
  - Category-based organization
  - Usage tracking

- **Dashboard & Analytics**
  - Real-time occupancy metrics
  - Revenue tracking
  - Today's check-ins/check-outs
  - Low stock alerts
  - Daily notification digests

- **Email Notifications**
  - Booking confirmations
  - Check-in/check-out notifications
  - OTP delivery
  - Rich HTML templates

## 📋 Prerequisites

- Node.js v18+ 
- MongoDB v6+ (local or MongoDB Atlas)
- Gmail account with App Password (for email features)
- npm or yarn

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd hotel-management-api
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and configure all required variables (see [Configuration](#-configuration))

4. **Validate your setup**
   ```bash
   node validate-startup.js
   ```

5. **Start the server**
   ```bash
   # Development
   npm run dev

   # Production
   npm start
   ```

## ⚙️ Configuration

All configuration is done through environment variables in the `.env` file. See `.env.example` for a complete list of available options.

### Critical Environment Variables

```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/hotel_db
JWT_SECRET=your-64-character-secret-here
FRONTEND_URL=https://yourdomain.com
EMAIL_USER=your-email@gmail.com
EMAIL_APP_PASSWORD=your-gmail-app-password
```

### Generate Secure Secrets

```bash
# Generate JWT_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## 🚀 Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
# or
npm run prod
```

### Using PM2 (Recommended for Production)
```bash
# Start with PM2
npm run pm2:start

# View logs
npm run pm2:logs

# Monitor resources
npm run pm2:monit

# Reload (zero downtime)
npm run pm2:reload

# Stop
npm run pm2:stop
```

## 📁 Project Structure

```
hotel-management-api/
├── server.js                 # Application entry point
├── ecosystem.config.js       # PM2 configuration
├── validate-startup.js       # Pre-deployment validation script
├── .env.example             # Environment variables template
├── DEPLOYMENT.md            # Deployment guide
├── src/
│   ├── app.js              # Express app configuration
│   ├── config/
│   │   ├── database.js     # MongoDB connection
│   │   ├── email.js        # Email configuration
│   │   ├── jwt.js          # JWT configuration
│   │   └── startup.js      # Startup validation
│   ├── controllers/        # Request handlers
│   ├── middleware/
│   │   ├── auth.js         # JWT authentication
│   │   ├── roleAuth.js     # Role-based authorization
│   │   ├── rateLimiter.js  # Rate limiting
│   │   ├── requestTimeout.js # Request timeout handling
│   │   ├── requestId.js    # Request ID tracking
│   │   └── errorHandler.js # Global error handling
│   ├── models/             # Mongoose schemas
│   ├── routes/             # API routes
│   ├── services/           # Business logic
│   ├── utils/
│   │   ├── logger.js       # Winston logger
│   │   ├── validation.js   # Input validation
│   │   └── helpers.js      # Utility functions
│   └── logs/               # Application logs
└── uploads/                # File uploads
```

## 🔒 Security Features

- Helmet.js for security headers
- CORS configuration
- Rate limiting (API-wide and route-specific)
- JWT-based authentication
- Request timeout protection
- Input validation and sanitization
- Audit logging
- Secure password hashing with bcrypt
- Environment-based configuration
- X-Frame-Options, CSP, and other security headers

## 📊 API Endpoints

### Health Check
- `GET /health` - Application health status (with optional detailed checks)

### Authentication
- `POST /api/v1/auth/send-otp` - Send OTP to email
- `POST /api/v1/auth/verify-otp` - Verify OTP and get access token
- `POST /api/v1/auth/refresh` - Refresh access token

### Users
- `GET /api/v1/users` - Get all users (Admin only)
- `POST /api/v1/users` - Create new user (Admin only)
- `PATCH /api/v1/users/:id` - Update user
- `DELETE /api/v1/users/:id` - Delete user (Admin only)

### Rooms
- `GET /api/v1/rooms` - Get all rooms
- `GET /api/v1/rooms/:id` - Get room by ID
- `POST /api/v1/rooms` - Create new room
- `PATCH /api/v1/rooms/:id` - Update room
- `DELETE /api/v1/rooms/:id` - Delete room

### Bookings
- `GET /api/v1/bookings` - Get all bookings
- `GET /api/v1/bookings/:id` - Get booking by ID
- `POST /api/v1/bookings` - Create new booking
- `PATCH /api/v1/bookings/:id` - Update booking
- `POST /api/v1/bookings/:id/checkin` - Check-in guest
- `POST /api/v1/bookings/:id/checkout` - Check-out guest
- `DELETE /api/v1/bookings/:id` - Cancel booking

### Payments
- `GET /api/v1/payments` - Get all payments
- `POST /api/v1/payments` - Record payment

### Settings
- `GET /api/v1/settings` - Get all settings
- `PATCH /api/v1/settings/:type` - Update settings

### Maintenance
- `GET /api/v1/maintenance` - Get all maintenance tasks
- `POST /api/v1/maintenance` - Create maintenance task
- `PATCH /api/v1/maintenance/:id` - Update task
- `DELETE /api/v1/maintenance/:id` - Delete task

### Supplies
- `GET /api/v1/supplies` - Get all supplies
- `POST /api/v1/supplies` - Add supply item
- `PATCH /api/v1/supplies/:id` - Update supply
- `DELETE /api/v1/supplies/:id` - Delete supply

### Dashboard
- `GET /api/v1/dashboard/stats` - Get dashboard statistics

## 🧪 Testing

```bash
# Validate environment and configuration
node validate-startup.js

# Run tests (when implemented)
npm test
```

## 📝 Logging

Application logs are stored in `src/logs/`:
- `error.log` - Error level logs
- `combined.log` - All logs
- `pm2-*.log` - PM2 process logs

View logs in real-time:
```bash
# Application logs
tail -f src/logs/combined.log

# PM2 logs
pm2 logs hotel-management-api
```

## 🔧 Monitoring

### Health Check Endpoint
```bash
# Basic health check
curl http://localhost:5000/health

# Detailed health check (set DETAILED_HEALTH_CHECK=true in .env)
curl http://localhost:5000/health | jq
```

Response includes:
- Server status and uptime
- MongoDB connection status
- Email service status
- Memory usage

### PM2 Monitoring
```bash
pm2 monit
```

## 🚀 Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for comprehensive deployment instructions including:
- Server setup and configuration
- PM2 process management
- Nginx reverse proxy setup
- SSL/TLS configuration with Let's Encrypt
- Database setup (MongoDB Atlas or self-hosted)
- Backup and recovery procedures
- Monitoring and logging
- Security best practices

## 🔄 Updates and Maintenance

### Updating the Application
```bash
git pull origin main
npm install --production
pm2 reload ecosystem.config.js --env production
```

### Database Backup
```bash
# MongoDB backup
mongodump --uri="your-mongodb-uri" --out=/path/to/backup
```

### Log Rotation
Logs are automatically rotated using logrotate (see DEPLOYMENT.md)

## 🐛 Troubleshooting

### Application won't start
1. Check logs: `pm2 logs hotel-management-api`
2. Validate environment: `node validate-startup.js`
3. Verify MongoDB connection
4. Check port availability: `sudo netstat -tulpn | grep 5000`

### High memory usage
```bash
pm2 monit
pm2 restart hotel-management-api --max-memory-restart 500M
```

### Database connection issues
1. Verify MONGODB_URI in .env
2. Check MongoDB is running
3. Verify network connectivity
4. For MongoDB Atlas, check IP whitelist

## 📚 Documentation

- [Deployment Guide](./DEPLOYMENT.md) - Complete production deployment guide
- [Environment Variables](./.env.example) - All configuration options
- API Documentation - (Coming soon / Use Postman collection)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License.

## 👥 Team

**The Core Pench Hotel Management Team**

## 📧 Support

For issues and questions:
- Create an issue in the repository
- Contact the development team
- Check logs: `pm2 logs hotel-management-api`

## 🔐 Security

To report security vulnerabilities, please email security@corepench.com

---

**Version**: 1.0.0  
**Last Updated**: January 2024
