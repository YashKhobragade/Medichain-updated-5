import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'medichain-jwt-secret-change-in-production';

export interface AuthUser {
    id: string;
    email: string;
    full_name: string;
    role: string;
    /** organisation the account acts for on the shipment ledger */
    company?: string | null;
}

export interface JWTPayload {
    user: AuthUser;
    iat: number;
    exp: number;
}

/**
 * Sign a JWT token for the given user.
 */
export function signToken(user: AuthUser): string {
    return jwt.sign({ user }, JWT_SECRET, { expiresIn: '7d' });
}

/**
 * Verify and decode a JWT token.
 */
export function verifyToken(token: string): JWTPayload | null {
    try {
        return jwt.verify(token, JWT_SECRET) as JWTPayload;
    } catch {
        return null;
    }
}

/**
 * Extract the authenticated user from a NextRequest.
 * Returns null if no valid token is present.
 */
export function getAuthUser(request: NextRequest): AuthUser | null {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
        return null;
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);
    return payload?.user || null;
}

/**
 * Require authentication. Throws an error if the request is not authenticated.
 */
export function requireAuth(request: NextRequest): AuthUser {
    const user = getAuthUser(request);
    if (!user) {
        throw new Error('Unauthorized');
    }
    return user;
}
