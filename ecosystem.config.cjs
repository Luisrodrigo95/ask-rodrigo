module.exports = {
  apps: [
    {
      name: "ask-rodrigo",
      script: "server/src/server.js",
      cwd: "/var/www/ask-rodrigo",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "350M",
      env: {
        NODE_ENV: "production",
        PORT: 3005,
        HOME: "/home/bombi",
        PATH: "/usr/local/bin:/usr/bin:/bin:/usr/local/games:/usr/games"
      },
      env_development: {
        NODE_ENV: "development",
        PORT: 3005,
        HOME: "/home/bombi",
        PATH: "/usr/local/bin:/usr/bin:/bin:/usr/local/games:/usr/games"
      }
    }
  ]
};
