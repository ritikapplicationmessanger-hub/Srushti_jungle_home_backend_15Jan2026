# Production Deployment Checklist

Use this checklist before deploying to production to ensure everything is configured correctly.

## Pre-Deployment

### Environment Configuration
- [ ] Copy `.env.example` to `.env`
- [ ] Set `NODE_ENV=production`
- [ ] Configure `MONGODB_URI` with production database
- [ ] Generate and set secure `JWT_SECRET` (64+ characters)
  ```bash
  node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
  ```
- [ ] Set `FRONTEND_URL` to production frontend URL
- [ ] Configure `API_BASE_URL` to production API URL
- [ ] Set `ALLOWED_ORIGINS` with all allowed domains
- [ ] Configure Gmail credentials (`EMAIL_USER`, `EMAIL_APP_PASSWORD`)
- [ ] Set `LOG_LEVEL=info` (or `warn` for less verbose)
- [ ] Enable `DETAILED_HEALTH_CHECK=true`
- [ ] Verify all required environment variables are set

### Security
- [ ] JWT_SECRET is NOT the default value
- [ ] JWT_SECRET is at least 32 characters (64+ recommended)
- [ ] No hardcoded secrets in code
- [ ] `.env` file has proper permissions (600)
- [ ] `.gitignore` includes `.env`
- [ ] CORS is configured with actual domains (not wildcard)
- [ ] Rate limiting is enabled and properly configured

### Database
- [ ] MongoDB is accessible from production server
- [ ] Database authentication is enabled
- [ ] Database user has appropriate permissions
- [ ] Database backups are configured
- [ ] Connection string uses SSL/TLS (`mongodb+srv://` for Atlas)
- [ ] IP whitelist includes production server IP (if using Atlas)
- [ ] Test connection: `mongosh "your-connection-string"`

### Email Configuration
- [ ] Gmail 2-Step Verification is enabled
- [ ] App Password is generated and configured
- [ ] Test email sending works
- [ ] Verify email templates are production-ready

### Server Setup
- [ ] Node.js v18+ is installed
- [ ] npm packages are installed: `npm install --production`
- [ ] PM2 is installed globally: `npm install -g pm2`
- [ ] Firewall is configured (ports 80, 443, SSH only)
- [ ] System packages are updated: `sudo apt update && sudo apt upgrade`

## Validation

### Run Validation Script
```bash
node validate-startup.js
```

- [ ] All environment variables validated ✓
- [ ] MongoDB connection successful ✓
- [ ] Email configuration working ✓
- [ ] System requirements met ✓
- [ ] Required directories exist ✓
- [ ] Required files present ✓

### Manual Tests
- [ ] Health check responds: `curl http://localhost:5000/health`
- [ ] Welcome endpoint works: `curl http://localhost:5000/`
- [ ] 404 handling works: `curl http://localhost:5000/invalid`
- [ ] API routes are accessible: `curl http://localhost:5000/api/v1/...`

## Deployment

### Application Deployment
- [ ] Code is pulled from correct branch (main/production)
- [ ] Dependencies installed: `npm install --production`
- [ ] PM2 ecosystem config reviewed: `ecosystem.config.js`
- [ ] Application starts successfully: `npm run pm2:start`
- [ ] PM2 auto-start configured: `pm2 startup && pm2 save`
- [ ] Application accessible on configured port
- [ ] Logs are being written: `pm2 logs hotel-management-api`

### Web Server (Nginx)
- [ ] Nginx is installed and running
- [ ] Site configuration created in `/etc/nginx/sites-available/`
- [ ] Site enabled: `ln -s /etc/nginx/sites-available/... /etc/nginx/sites-enabled/`
- [ ] Configuration tested: `sudo nginx -t`
- [ ] Nginx reloaded: `sudo systemctl reload nginx`
- [ ] Reverse proxy is working
- [ ] Static files (/uploads) are served correctly

### SSL/TLS Configuration
- [ ] SSL certificate installed (Let's Encrypt recommended)
- [ ] Certbot configured: `sudo certbot --nginx -d yourdomain.com`
- [ ] HTTPS is working
- [ ] HTTP redirects to HTTPS
- [ ] Certificate auto-renewal is configured
- [ ] Test renewal: `sudo certbot renew --dry-run`
- [ ] HSTS header is set (check in browser DevTools)

## Monitoring & Logging

### Logging
- [ ] Application logs directory exists: `src/logs/`
- [ ] Logs are being written: `ls -lh src/logs/`
- [ ] Log rotation is configured
- [ ] PM2 logs are accessible: `pm2 logs hotel-management-api`
- [ ] Nginx logs are accessible: `/var/log/nginx/`

### Monitoring
- [ ] Health endpoint is accessible: `/health`
- [ ] Detailed health check works (if enabled)
- [ ] PM2 monitoring: `pm2 monit`
- [ ] Server resources are adequate (CPU, memory, disk)
- [ ] Consider setting up:
  - [ ] PM2 Plus for monitoring
  - [ ] New Relic or DataDog
  - [ ] Uptime monitoring (UptimeRobot, Pingdom)

## Backup & Recovery

### Database Backups
- [ ] Backup script created
- [ ] Backup schedule configured (cron job)
- [ ] Backup location is secure
- [ ] Backup restoration tested
- [ ] Automated backups for MongoDB (Atlas automatic, or custom script)

### Application Backups
- [ ] Uploads directory backed up
- [ ] Configuration files backed up (.env, ecosystem.config.js)
- [ ] Recovery procedure documented

## Performance

### Optimization
- [ ] PM2 cluster mode enabled (instances: 'max')
- [ ] MongoDB indexes created for frequently queried fields
- [ ] Static files cached properly
- [ ] Compression enabled (in Nginx)
- [ ] Connection pooling configured

### Load Testing (Optional)
- [ ] Basic load testing performed
- [ ] Response times acceptable
- [ ] No memory leaks detected
- [ ] Error rates are acceptable

## Post-Deployment

### Verification
- [ ] Application is running: `pm2 status`
- [ ] Health check returns 200: `curl https://yourdomain.com/health`
- [ ] API endpoints respond correctly
- [ ] Frontend can connect to API
- [ ] CORS is working for frontend
- [ ] Email notifications work
- [ ] Authentication flow works (OTP sending and verification)
- [ ] Check logs for errors: `pm2 logs hotel-management-api --lines 50`

### Testing
- [ ] Create test booking
- [ ] Test user authentication
- [ ] Test room management
- [ ] Test payment recording
- [ ] Test dashboard endpoints
- [ ] Verify email delivery

### Documentation
- [ ] Deployment documented
- [ ] Server credentials saved securely (password manager)
- [ ] Team notified of deployment
- [ ] Rollback procedure documented
- [ ] Support contacts updated

## Ongoing Maintenance

### Daily
- [ ] Check application status: `pm2 status`
- [ ] Review error logs: `tail -f src/logs/error.log`
- [ ] Check health endpoint

### Weekly
- [ ] Review all logs
- [ ] Check disk space: `df -h`
- [ ] Monitor memory usage: `pm2 monit`
- [ ] Check for application errors
- [ ] Review API usage patterns

### Monthly
- [ ] Update dependencies: `npm audit fix && npm update`
- [ ] Security audit: `npm audit`
- [ ] Review and rotate logs
- [ ] Database optimization
- [ ] Performance review
- [ ] Backup verification (test restore)
- [ ] SSL certificate check (30 days before expiry)

### Quarterly
- [ ] Security review
- [ ] Performance optimization
- [ ] Load testing
- [ ] Disaster recovery test
- [ ] Documentation update

## Emergency Procedures

### Application Issues
```bash
# Check status
pm2 status

# View logs
pm2 logs hotel-management-api --lines 100

# Restart application
pm2 restart hotel-management-api

# Reload with zero downtime
pm2 reload hotel-management-api

# If completely broken, restore previous version
git checkout <previous-commit>
npm install --production
pm2 reload hotel-management-api
```

### Database Issues
```bash
# Check MongoDB status
sudo systemctl status mongod

# Restart MongoDB
sudo systemctl restart mongod

# Check connection
mongosh "your-connection-string"

# Restore from backup
mongorestore --uri="connection-string" --dir=/path/to/backup
```

### Server Issues
```bash
# Check disk space
df -h

# Check memory
free -h

# Check processes
top

# Restart server (last resort)
sudo reboot
```

## Rollback Plan

If deployment fails:

1. **Identify the issue**
   ```bash
   pm2 logs hotel-management-api --lines 100
   ```

2. **Stop current deployment**
   ```bash
   pm2 stop hotel-management-api
   ```

3. **Revert to previous version**
   ```bash
   git log --oneline -10  # Find previous stable commit
   git checkout <previous-commit>
   npm install --production
   ```

4. **Start application**
   ```bash
   pm2 start ecosystem.config.js --env production
   ```

5. **Verify rollback**
   ```bash
   curl https://yourdomain.com/health
   pm2 logs hotel-management-api
   ```

6. **Notify team**

## Support Contacts

- **System Administrator**: [contact]
- **Database Administrator**: [contact]
- **Development Team**: [contact]
- **Hosting Provider Support**: [contact]
- **MongoDB Atlas Support**: https://support.mongodb.com/

## Additional Resources

- [DEPLOYMENT.md](./DEPLOYMENT.md) - Detailed deployment guide
- [README.md](./README.md) - Application documentation
- [QUICKSTART.md](./QUICKSTART.md) - Quick start guide
- [CHANGES.md](./CHANGES.md) - Recent changes documentation

---

## Sign-off

Deployment completed by: _______________
Date: _______________
Production URL: _______________
Database: _______________
Version deployed: _______________

All checks passed: ☐ Yes ☐ No

If No, list issues: _______________

---

**Last Updated**: January 2024
**Checklist Version**: 1.0.0
