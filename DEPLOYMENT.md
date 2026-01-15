# Deployment Guide - Hotel Management API

This guide provides detailed instructions for deploying the Hotel Management API to a production server.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Server Requirements](#server-requirements)
- [Initial Server Setup](#initial-server-setup)
- [Application Deployment](#application-deployment)
- [Environment Configuration](#environment-configuration)
- [Process Management with PM2](#process-management-with-pm2)
- [Database Setup](#database-setup)
- [SSL/TLS Configuration](#ssltls-configuration)
- [Monitoring and Logging](#monitoring-and-logging)
- [Backup and Recovery](#backup-and-recovery)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before deploying, ensure you have:

- Node.js v18+ installed on the server
- MongoDB instance (local or cloud like MongoDB Atlas)
- Gmail account with App Password for email functionality
- Domain name (optional but recommended)
- SSL certificate (Let's Encrypt recommended)
- SSH access to the server

---

## Server Requirements

### Minimum Requirements

- **OS**: Ubuntu 20.04 LTS or later (recommended), CentOS 8+, or Debian 11+
- **CPU**: 2 cores
- **RAM**: 2GB (4GB recommended)
- **Storage**: 20GB SSD
- **Node.js**: v18.x or v20.x
- **MongoDB**: v6.x or v7.x

### Recommended Stack

- **Web Server**: Nginx (reverse proxy)
- **Process Manager**: PM2
- **Firewall**: UFW or iptables
- **Monitoring**: PM2 Plus (optional), New Relic, or DataDog

---

## Initial Server Setup

### 1. Update System Packages

```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Install Node.js (using NodeSource)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node --version  # Should show v20.x.x
npm --version
```

### 3. Install PM2 Globally

```bash
sudo npm install -g pm2
pm2 --version
```

### 4. Configure Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

### 5. Create Application User (Security Best Practice)

```bash
sudo adduser --disabled-password --gecos "" nodeapp
sudo usermod -aG sudo nodeapp
```

---

## Application Deployment

### 1. Clone the Repository

```bash
# As nodeapp user
su - nodeapp
cd /var/www
git clone <your-repository-url> hotel-management-api
cd hotel-management-api
```

### 2. Install Dependencies

```bash
npm install --production
```

### 3. Create Required Directories

```bash
mkdir -p src/logs uploads
chmod 755 src/logs uploads
```

---

## Environment Configuration

### 1. Create .env File

```bash
cp .env.example .env
nano .env  # or use vim, vi, etc.
```

### 2. Configure Environment Variables

**Critical Variables for Production:**

```env
# Application
NODE_ENV=production
PORT=5000
API_BASE_URL=https://api.yourdomain.com
FRONTEND_URL=https://yourdomain.com

# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/hotel_management

# JWT (Generate secure secrets)
JWT_SECRET=<generate-64-char-random-string>
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# Email
EMAIL_USER=your-email@gmail.com
EMAIL_APP_PASSWORD=<gmail-app-password>
EMAIL_FROM_NAME=The Core Pench Hotel
EMAIL_FROM=your-email@gmail.com

# Security
ALLOWED_ORIGINS=https://admin.yourdomain.com,https://app.yourdomain.com

# Monitoring
DETAILED_HEALTH_CHECK=true
LOG_LEVEL=info
```

**Generate Secure Secrets:**

```bash
# Generate JWT_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate SESSION_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Secure .env File

```bash
chmod 600 .env
chown nodeapp:nodeapp .env
```

---

## Process Management with PM2

### 1. Start Application with PM2

```bash
# Production mode
pm2 start ecosystem.config.js --env production

# Or start directly
pm2 start server.js --name hotel-management-api -i max
```

### 2. Configure PM2 Auto-Start on Server Reboot

```bash
pm2 startup systemd -u nodeapp --hp /home/nodeapp
# Follow the command it outputs

pm2 save
```

### 3. Useful PM2 Commands

```bash
# View logs
pm2 logs hotel-management-api

# Monitor resources
pm2 monit

# Restart application
pm2 restart hotel-management-api

# Reload with zero downtime
pm2 reload hotel-management-api

# Stop application
pm2 stop hotel-management-api

# Delete from PM2
pm2 delete hotel-management-api

# List all processes
pm2 list

# View detailed info
pm2 info hotel-management-api

# Flush logs
pm2 flush
```

### 4. Update Application

```bash
cd /var/www/hotel-management-api
git pull origin main
npm install --production
pm2 reload ecosystem.config.js --env production
```

---

## Database Setup

### Option 1: MongoDB Atlas (Cloud - Recommended)

1. Create account at https://www.mongodb.com/cloud/atlas
2. Create a new cluster
3. Create database user
4. Whitelist server IP address
5. Get connection string and update `MONGODB_URI` in .env

### Option 2: Self-Hosted MongoDB

#### Install MongoDB

```bash
# Ubuntu/Debian
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update
sudo apt install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
sudo systemctl status mongod
```

#### Secure MongoDB

```bash
# Connect to MongoDB
mongosh

# Create admin user
use admin
db.createUser({
  user: "admin",
  pwd: "secure-password",
  roles: ["userAdminAnyDatabase", "dbAdminAnyDatabase", "readWriteAnyDatabase"]
})

# Create application database and user
use hotel_management
db.createUser({
  user: "hotel_app",
  pwd: "secure-password",
  roles: ["readWrite", "dbAdmin"]
})
```

Update MONGODB_URI:
```env
MONGODB_URI=mongodb://hotel_app:secure-password@localhost:27017/hotel_management
```

---

## SSL/TLS Configuration

### Using Nginx as Reverse Proxy with Let's Encrypt

#### 1. Install Nginx

```bash
sudo apt install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx
```

#### 2. Configure Nginx

Create configuration file:

```bash
sudo nano /etc/nginx/sites-available/hotel-api
```

Add configuration:

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    # SSL Configuration (will be added by Certbot)
    # ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

    # Security Headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Proxy settings
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static files (uploads)
    location /uploads {
        alias /var/www/hotel-management-api/uploads;
        expires 1d;
        add_header Cache-Control "public, immutable";
    }

    # Health check endpoint (no logging)
    location /health {
        proxy_pass http://localhost:5000/health;
        access_log off;
    }

    # Logging
    access_log /var/log/nginx/hotel-api-access.log;
    error_log /var/log/nginx/hotel-api-error.log;
}
```

Enable site:

```bash
sudo ln -s /etc/nginx/sites-available/hotel-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### 3. Install SSL Certificate with Certbot

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d api.yourdomain.com
```

#### 4. Auto-Renew SSL Certificate

Certbot automatically sets up renewal. Test it:

```bash
sudo certbot renew --dry-run
```

---

## Monitoring and Logging

### Application Logs

```bash
# PM2 logs
pm2 logs hotel-management-api

# Application logs
tail -f /var/www/hotel-management-api/src/logs/combined.log
tail -f /var/www/hotel-management-api/src/logs/error.log

# Nginx logs
sudo tail -f /var/log/nginx/hotel-api-access.log
sudo tail -f /var/log/nginx/hotel-api-error.log
```

### Health Monitoring

```bash
# Check application health
curl http://localhost:5000/health

# Or with detailed checks
curl http://localhost:5000/health | jq
```

### Log Rotation

Create log rotation config:

```bash
sudo nano /etc/logrotate.d/hotel-api
```

Add:

```
/var/www/hotel-management-api/src/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 nodeapp nodeapp
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
```

### PM2 Monitoring (Optional)

```bash
# Install PM2 Plus (free tier available)
pm2 link <secret> <public>

# Or use PM2 web dashboard
pm2 web
```

---

## Backup and Recovery

### Database Backup

Create backup script:

```bash
#!/bin/bash
# backup-db.sh

BACKUP_DIR="/var/backups/mongodb"
DATE=$(date +%Y%m%d_%H%M%S)
MONGODB_URI="your-mongodb-connection-string"

mkdir -p $BACKUP_DIR

mongodump --uri="$MONGODB_URI" --out="$BACKUP_DIR/backup_$DATE"

# Keep only last 7 days of backups
find $BACKUP_DIR -type d -mtime +7 -exec rm -rf {} +

echo "Backup completed: $BACKUP_DIR/backup_$DATE"
```

Schedule daily backups:

```bash
chmod +x backup-db.sh
crontab -e

# Add line (runs daily at 2 AM)
0 2 * * * /var/www/hotel-management-api/backup-db.sh
```

### Restore Database

```bash
mongorestore --uri="mongodb-connection-string" --dir="/var/backups/mongodb/backup_20240115_020000"
```

---

## Troubleshooting

### Application Won't Start

1. Check logs:
   ```bash
   pm2 logs hotel-management-api --lines 50
   ```

2. Verify environment variables:
   ```bash
   cat .env
   ```

3. Test MongoDB connection:
   ```bash
   mongosh "your-mongodb-uri"
   ```

4. Check port availability:
   ```bash
   sudo netstat -tulpn | grep 5000
   ```

### High Memory Usage

```bash
# Check memory usage
pm2 monit

# Restart with memory limit
pm2 restart hotel-management-api --max-memory-restart 500M
```

### 502 Bad Gateway (Nginx)

1. Check if application is running:
   ```bash
   pm2 status
   ```

2. Check application is listening on correct port:
   ```bash
   sudo netstat -tulpn | grep 5000
   ```

3. Check Nginx error logs:
   ```bash
   sudo tail -f /var/log/nginx/error.log
   ```

### Email Not Working

1. Verify Gmail App Password is correct
2. Check email credentials in .env
3. Test email connectivity:
   ```bash
   curl -v https://smtp.gmail.com:587
   ```

### Database Connection Issues

1. Check MongoDB is running:
   ```bash
   sudo systemctl status mongod
   ```

2. Verify connection string in .env
3. Check firewall rules
4. For MongoDB Atlas, verify IP whitelist

---

## Security Checklist

- [ ] Change all default passwords and secrets
- [ ] Enable firewall and allow only necessary ports
- [ ] Use SSL/TLS for all connections
- [ ] Keep Node.js and dependencies updated
- [ ] Restrict MongoDB access (IP whitelist, authentication)
- [ ] Use environment variables for sensitive data
- [ ] Enable rate limiting
- [ ] Configure CORS properly
- [ ] Regular security audits: `npm audit`
- [ ] Set up automated backups
- [ ] Monitor application logs
- [ ] Use strong JWT secrets
- [ ] Implement log rotation

---

## Performance Optimization

1. **Enable Clustering**: PM2 automatically uses cluster mode with `instances: 'max'`
2. **Database Indexing**: Ensure MongoDB indexes are created for frequently queried fields
3. **Caching**: Consider Redis for session management and caching
4. **CDN**: Use CDN for static assets
5. **Compression**: Enable gzip in Nginx
6. **Connection Pooling**: MongoDB connection pooling is enabled by default

---

## Support and Maintenance

### Regular Maintenance Tasks

- **Daily**: Check application logs and health endpoint
- **Weekly**: Review error logs, check disk space, monitor memory usage
- **Monthly**: Update dependencies, review security audits, verify backups
- **Quarterly**: Security review, performance optimization, load testing

### Updating the Application

```bash
# 1. Pull latest changes
git pull origin main

# 2. Install dependencies
npm install --production

# 3. Run migrations (if any)
# npm run migrate

# 4. Reload application with zero downtime
pm2 reload ecosystem.config.js --env production

# 5. Verify deployment
curl http://localhost:5000/health
pm2 logs hotel-management-api --lines 20
```

---

## Additional Resources

- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

---

## Getting Help

If you encounter issues:

1. Check the logs: `pm2 logs hotel-management-api`
2. Verify environment configuration
3. Check system resources: `pm2 monit`
4. Review this documentation
5. Contact the development team

---

**Last Updated**: January 2024
**Version**: 1.0.0
