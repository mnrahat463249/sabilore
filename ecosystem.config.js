module.exports = {
  apps: [
    {
      name: "sabilore",
      script: "backend/app.js",
      instances: "max",       // Automatically scale to all available CPU cores
      exec_mode: "cluster",   // Enable PM2 cluster mode
      autorestart: true,      // Auto-restart on crash
      watch: false,           // Disable watch in production to avoid restart loops
      max_memory_restart: '1G', // Restart if process memory exceeds 1GB
      env: {
        NODE_ENV: "production",
      },
      env_development: {
        NODE_ENV: "development",
      }
    }
  ]
};
