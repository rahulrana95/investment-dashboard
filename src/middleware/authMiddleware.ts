import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Custom request type to include the user property
interface AuthenticatedRequest extends Request {
    user?: any;
}

export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Read the token from the cookie
    const token = req.headers['token'] || req.cookies.token;
    console.log('cookies')
    console.log(token);

    if (!token) {
        console.log('token not found');
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


