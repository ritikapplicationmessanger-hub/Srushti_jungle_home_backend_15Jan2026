module.exports = {
  apps: [
    {
      name: 'hotel-management-api',
      script: './server.js',
      
      // Instances
      instances: process.env.NODE_ENV === 'production' ? 'max' : 1,
      exec_mode: 'cluster',
      
      // Environment variables
      env: {
        NODE_ENV: 'development',
        PORT: 5000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 5000
      },
      
      // Logging
      error_file: './src/logs/pm2-error.log',
      out_file: './src/logs/pm2-out.log',
      log_file: './src/logs/pm2-combined.log',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Process management
      watch: false, // Set to true in development if you want auto-restart on file changes
      ignore_watch: [
        'node_modules',
        'logs',
        'uploads',
        '.git',
        '*.log'
      ],
      watch_options: {
        followSymlinks: false
      },
      
      // Advanced features
      max_memory_restart: '500M', // Restart if app uses more than 500MB
      min_uptime: '10s', // Minimum uptime before considering app as stable
      max_restarts: 10, // Max number of unstable restarts
      restart_delay: 4000, // Delay between restarts
      autorestart: true, // Auto restart if app crashes
      
      // Graceful shutdown
      kill_timeout: 5000, // Time to wait for graceful shutdown before force kill
      wait_ready: true, // Wait for app to be ready before considering it online
      listen_timeout: 10000, // Time to wait for app to listen
      
      // Source map support (for better error tracking)
      source_map_support: true,
      
      // Monitoring
      instance_var: 'INSTANCE_ID',
      
      // cron restart (optional - restart app at 3 AM every day)
      // cron_restart: '0 3 * * *',
      
      // Health check
      // PM2 Plus (monitoring service) configuration
      // pmx: true,
      
      // Post-deployment hooks
      // Uncomment if you want PM2 to run commands after deployment
      // post_update: ['npm install', 'echo Deployment successful'],
      
      // Exponential backoff restart delay
      exp_backoff_restart_delay: 100,
      
      // Node.js args
      node_args: '--max-old-space-size=2048', // Max heap size for Node.js
      
      // Interpreter args
      // interpreter_args: '--harmony',
      
      // Shutdown with message
      shutdown_with_message: true
    }
  ],

  // Deployment configuration (optional)
  deploy: {
    production: {
      user: 'node',
      host: ['your-production-server.com'], // Replace with actual server
      ref: 'origin/main',
      repo: 'git@github.com:username/repo.git', // Replace with actual repo
      path: '/var/www/hotel-management-api',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
      'pre-setup': '',
      env: {
        NODE_ENV: 'production'
      }
    },
    staging: {
      user: 'node',
      host: ['your-staging-server.com'], // Replace with actual server
      ref: 'origin/develop',
      repo: 'git@github.com:username/repo.git', // Replace with actual repo
      path: '/var/www/hotel-management-api-staging',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env staging',
      env: {
        NODE_ENV: 'staging'
      }
    }
  }
};
