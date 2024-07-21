import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import logger from '../logger';

// Custom request type to include the user property
interface AuthenticatedRequest extends Request {
    user?: any;
}

export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Read the token from the cookie
    const token = req.cookies.token || req.headers['token'] || req.headers['Token'];

    console.log(req.headers)
    if (!token) {
        logger.error('Logger: Token not found')
        return res.status(401).json({ redirectUrl: '/auth/login' });; // Unauthorized
    }

    jwt.verify(token, process.env.JWT_SECRET as string, (err: any, user: any) => {
        if (err) {
            return res.sendStatus(403); // Forbidden
        }

        req.user = user as { id: string; email: string };
        next();
    });
};


