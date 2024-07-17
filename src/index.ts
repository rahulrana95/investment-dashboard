import express from 'express';
import path from 'path';
import { Sequelize } from 'sequelize';
import networthMockData from './mockdata/networth.json';
require('dotenv').config();
import { Pool } from 'pg';
import authRouter from './controllers/authController';
import { authenticateToken } from './middleware/authMiddleware';
import cookieParser from 'cookie-parser';

const app = express();
const port = process.env.PORT || 4001;

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

export {pool};



app.get('/api/v1/', (req, res) => {
  res.json({ message: 'Hello from server!' });
});


app.get('/api/v1/getTotalInvestments', authenticateToken,async (req, res) => {
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

app.get('/api/v1/chart-data',authenticateToken,  async (req, res) => {
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
