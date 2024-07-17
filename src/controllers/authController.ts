import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '..';
import { authenticateToken } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/signup', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert new user into database
        const query = {
            text: `INSERT INTO users_login (
                email, password, created_at, updated_at, last_login, password_reset_token, password_reset_expires, account_status
            ) VALUES ($1, $2, NOW(), NOW(), NULL, NULL, NULL, 'active') RETURNING *`,
            values: [email, hashedPassword],
        };
        const client = await pool.connect();
        const result = await client.query(query);
        const newUser = result.rows[0];

        // Generate JWT token
        const token = jwt.sign({ id: newUser.id }, process.env.JWT_SECRET as string, { expiresIn: '1h' });

        client.release();
        res.json({ token });
    } catch (error) {
        console.error('Error signing up:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Find user by email
        const query = {
            text: 'SELECT * FROM users_login WHERE email = $1',
            values: [email],
        };
        const client = await pool.connect();
        const result = await client.query(query);
        const user = result.rows[0];

        if (!user) {
            client.release();
            return res.status(404).json({ error: 'User not found' });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            client.release();
            return res.status(401).json({ error: 'Invalid password' });
        }

        // Update last login timestamp
        const updateQuery = {
            text: 'UPDATE users_login SET last_login = NOW() WHERE email = $1',
            values: [email],
        };
        await client.query(updateQuery);

        // Generate JWT token
        const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET as string, { expiresIn: '48h' });

        client.release();
        res.cookie('token', token, { httpOnly: true, secure: true });

        res.json({ token });
    } catch (error) {
        console.error('Error logging in:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.get('/verify-token', authenticateToken, (req, res) => {
    // @ts-expect-error
  if (req.user) {
       // @ts-expect-error
    res.json({ valid: true, email: req?.user?.email });
  } else {
    res.sendStatus(401); // Unauthorized
  }
});

export default router;
