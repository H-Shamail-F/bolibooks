module.exports = {
  apps: [
    {
      name: 'bolibooks-backend',
      script: './backend/src/server.js',
      cwd: '/var/www/bolibooks',
      instances: 'max', // Use all available CPU cores
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      // Restart configuration
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'uploads'],
      max_restarts: 10,
      min_uptime: '10s',
      
      // Logging
      log_file: '/var/log/pm2/bolibooks-backend.log',
      out_file: '/var/log/pm2/bolibooks-backend-out.log',
      error_file: '/var/log/pm2/bolibooks-backend-error.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Memory and CPU limits
      max_memory_restart: '512M',
      
      // Health monitoring
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 3000,
      
      // Auto restart on file changes (disable in production)
      autorestart: true,
      
      // Source map support
      source_map_support: true
    }
  ],
  
  deploy: {
    production: {
      user: 'deploy',
      host: 'your-server.com',
      ref: 'origin/main',
      repo: 'git@github.com:username/bolibooks.git',
      path: '/var/www/bolibooks',
      'pre-deploy-local': '',
      'post-deploy': 'npm install --production && pm2 reload pm2.ecosystem.js --env production',
      'pre-setup': ''
    }
  }
};
