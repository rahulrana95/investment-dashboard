import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '..';

const router = express.Router();

router.post('/signup', async (req, res) => {
    const { username, password } = req.body;

    try {
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert new user into database
        const query = {
            text: 'INSERT INTO users(username, password) VALUES($1, $2) RETURNING *',
            values: [username, hashedPassword],
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
    const { username, password } = req.body;

    try {
        // Find user by username
        const query = {
            text: 'SELECT * FROM users WHERE username = $1',
            values: [username],
        };
        const client = await pool.connect();
        const result = await client.query(query);
        const user = result.rows[0];

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid password' });
        }

        // Generate JWT token
        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET as string, { expiresIn: '1h' });

        client.release();
        res.json({ token });
    } catch (error) {
        console.error('Error logging in:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
