const http = require('http');
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const connectDB = require('./config/db');
const { initSocket } = require('./socket/socket');
const apiRoutes = require('./routes');
const { errorHandler } = require('./middleware/errorMiddleware');

const app = express();
const server = http.createServer(app);

// Trust proxy for HTTPS load balancers on cloud hosts (Render, Railway, Heroku, Vercel)
app.set('trust proxy', 1);

// Configure dynamic CORS origins safely
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((url) => url.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Allow server-to-server requests (!origin), explicit allowed origins, and Vercel deployments
    if (!origin || allowedOrigins.includes(origin) || (typeof origin === 'string' && origin.endsWith('.vercel.app'))) {
      callback(null, true);
    } else {
      callback(new Error(`[CORS Error] Request from origin ${origin} blocked.`));
    }
  },
  credentials: true
}));

// Security Headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per `window` (here, per 15 minutes)
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', apiLimiter);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const callRoutes = require('./routes/callRoutes');

// API Routes
app.use('/api', apiRoutes);
app.use('/api/calls', callRoutes);

// Error Middleware
app.use(errorHandler);

// Initialize Socket.io
initSocket(server);

// Start Server & Connect Database (Uses process.env.PORT provided by cloud host)
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`[Server] ChatRoom Backend running on port ${PORT}`);
  connectDB();
});
