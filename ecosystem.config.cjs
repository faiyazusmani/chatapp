/**
 * PM2 process config — production backend.
 *
 * Start:  pm2 start ecosystem.config.cjs
 * Logs:   pm2 logs chatroom-backend
 *
 * NOTE: Socket.io + cluster mode requires sticky sessions, which PM2
 * provides. If you scale instances, prefer 2 with sticky: true (below);
 * for very large scale-out use a Socket.io Redis adapter instead.
 */
module.exports = {
  apps: [
    {
      name: 'chatroom-backend',
      script: 'server.js',
      cwd: './backend',
      instances: 1, // set to 2 + sticky: true for socket.io clustering
      exec_mode: 'cluster',
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
      },
      // sticky: true, // PM2 sticky sessions — enable with instances > 1
      out_file: './logs/pm2-out.log',
      error_file: './logs/pm2-error.log',
      merge_logs: true,
      time: true,
    },
  ],
};
