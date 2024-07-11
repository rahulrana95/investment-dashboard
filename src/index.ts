import express from 'express';
import path from 'path';
import { Sequelize } from 'sequelize';
import networthMockData from './mockdata/networth.json';
require('dotenv').config();
import { Pool } from 'pg';

const app = express();
const port = process.env.PORT || 4001;

// Create a PostgreSQL pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Use only in development, not recommended for production
  }
});

// // Serve static files from the React app in production
// if (process.env.NODE_ENV === 'production') {
//   app.use(express.static(path.join(__dirname, '../frontend/build')));
// }

app.get('/api/v1/', (req, res) => {
  res.json({ message: 'Hello from server!' });
});


app.get('/api/v1/getTotalInvestments', async (req, res) => {
    try {
    // Calculate start date for last 1 month
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 1);

    // Construct SQL query to fetch all columns from smallcaseinvestment table
    const query = {
      text: 'SELECT * FROM smallcaseinvestment WHERE date >= $1',
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

app.get('/api/v1/chart-data', async (req, res) => {
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
