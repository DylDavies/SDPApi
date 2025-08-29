module.exports = {
  apps: [{
    name: 'api',
    script: 'dist/app/index.js', // Your main entry file
    env_production: {
      NODE_ENV: 'production'
    }
  }]
};