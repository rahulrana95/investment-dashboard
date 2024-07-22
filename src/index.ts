import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { Sequelize } from 'sequelize';
import networthMockData from './mockdata/networth.json';
require('dotenv').config();
import { Pool } from 'pg';
import authRouter from './controllers/authController';
import { authenticateToken } from './middleware/authMiddleware';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import logger from './logger';
import Redis from 'ioredis';
import { RateLimiterRedis } from 'rate-limiter-flexible';

const { mode } = process.env;

// Parse the Redis URL
const redisUrl = process.env.REDIS_URL;
if (!redisUrl) {
  throw new Error('REDIS_URL environment variable is not set');
}








let redisClient;

if (mode === 'DEVELOPMENT') {
  redisClient = redisClient = new Redis(redisUrl);
} else {
  redisClient = new Redis({
    host: process.env.REDIS_SERVICE_NAME, // Render Redis service name, red-xxxxxxxxxxxxxxxxxxxx
    port: 6379, // Redis port
  });
}




redisClient.on('error', (err) => {
  logger.error('Redis connection error:', err);
});

redisClient.set("animal", "cat");

redisClient.get("animal").then((result) => {
  logger.info(result)
});

const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'middleware',
  points: Number(process.env.RATE_LIMIT_POINTS) || 1000,
  duration: Number(process.env.RATE_LIMIT_DURATION) || 10,
});

const rateLimiterMiddleware = (req: Request, res: Response, next: NextFunction) => {
  rateLimiter.consume(req.ip || "")
    .then(() => {
      next();
    })
    .catch(() => {
      res.status(429).send('Too Many Requests');
    });
};

const app = express();

app.use(rateLimiterMiddleware);

// Middleware to log requests
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

const port = process.env.PORT || 4001;

// Allow requests from localhost and specific URLs
const allowedOrigins = [
  'http://localhost:3000',
  'https://investment-dashboard-egx8.onrender.com',
  'https://investment-dashboard-ui.onrender.com',
  'https://jswarrior.com',
];

const corsOptions: cors.CorsOptions = {
  // @ts-expect-error
  origin: (origin: string, callback: (a: any, b?: any) => void) => {
    if (!origin || allowedOrigins.includes(origin)) {
      console.log(`origin ${origin} is allowed by cors`);
      callback(null, true);
    } else {
      logger.error(origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow credentials (cookies) to be sent
};

app.use(cors(corsOptions));

app.use(express.json());
app.use(cookieParser());

app.use('/auth', authRouter);

// Create a PostgreSQL pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Use only in development, not recommended for production
  }
});

export { pool };



app.get('/api/v1/', (req, res) => {
  res.json({ message: 'Hello from server!' });
});


app.get('/api/v1/getTotalInvestments', authenticateToken, async (req, res) => {
  try {
    // Calculate start date for last 1 month
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 1);

    // Construct SQL query to fetch all columns from smallcaseinvestment table
    const query = {
      text: 'SELECT * FROM smallcaseinvestment WHERE date >= $1 ORDER BY date ASC',
      values: [startDate],
    };

    // Execute query
    const client = await pool.connect();
    const result = await client.query(query);
    const totalInvestments = result.rows;

    // Release client
    client.release();

    // Send response with fetched data
    res.json({ totalInvestments });
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/v1/chart-data', authenticateToken, async (req, res) => {
  res.json(networthMockData);
});

// // Handles any requests that don't match the ones above in production
// if (process.env.NODE_ENV === 'production') {
//   app.get('*', (req, res) => {
//     res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
//   });
// }

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
