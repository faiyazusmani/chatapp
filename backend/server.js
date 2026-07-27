const http = require('http');
const path = require('path');
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const connectDB = require('./config/db');
const { initSocket } = require('./socket/socket');
const apiRoutes = require('./routes');
const { errorHandler } = require('./middleware/errorMiddleware');

const app = express();
const server = http.createServer(app);

// Trust proxy for HTTPS load balancers on cloud hosts (Render, Railway, Heroku)
app.set('trust proxy', 1);

// Configure dynamic CORS origins
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((url) => url.trim());

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api', apiRoutes);

// Error Middleware
app.use(errorHandler);

// Initialize Socket.io
initSocket(server);

// Start Server & Connect Database
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`[Server] ChatRoom Backend running on port ${PORT}`);
  connectDB();
});
