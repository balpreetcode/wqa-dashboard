module.exports = {
  apps: [
    {
      name: 'wqa-backend',
      script: 'server.js',
      cwd: '/home/usr1/code2/wqa-dashboard/backend',
      env: {
        NODE_ENV: 'production',
        PORT: 7021,
        REDIS_URL: 'redis://127.0.0.1:6379',
        DATABASE_PATH: './db/wqa.db',
        UPLOADS_DIR: './uploads',
        REPORTS_DIR: '/var/www/files.winds-os.com',
        REPORTS_URL: 'https://files.winds-os.com',
        CLAUDE_PATH: '/home/usr1/.local/bin/claude',
        OPENCODE_PATH: '/home/usr1/.opencode/bin/opencode'
      }
    },
    {
      name: 'wqa-frontend',
      script: 'npx',
      args: 'serve -s dist -l 7020',
      cwd: '/home/usr1/code2/wqa-dashboard/frontend',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
