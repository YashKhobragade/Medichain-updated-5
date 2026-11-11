import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { query } from '@/config/db';
import { signToken, AuthUser } from '@/middleware/auth';
import { checkLocalLogin } from '@/lib/localUsers';

export async function POST(request: NextRequest) {
    try {
        const { email, password } = await request.json();

        // Validate required fields
        if (!email || !password) {
            return NextResponse.json(
                { error: 'Email and password are required' },
                { status: 400 }
            );
        }

        // Built-in demo accounts and local sign-ups always work, with or without PostgreSQL
        const local = await checkLocalLogin(email, password);
        if (local) return NextResponse.json({ success: true, user: local, token: signToken(local) });

        // Otherwise look in PostgreSQL (only when USE_DATABASE=true)
        let rows: any[];
        try {
            ({ rows } = await query(
                'SELECT id, email, password_hash, full_name, role FROM users WHERE email = $1',
                [email]
            ));
        } catch {
            const user = await checkLocalLogin(email, password);
            if (!user) return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
            return NextResponse.json({ success: true, user, token: signToken(user) });
        }

        if (rows.length === 0) {
            return NextResponse.json(
                { error: 'Invalid email or password' },
                { status: 401 }
            );
        }

        const dbUser = rows[0];

        // Verify password
        const isValid = await bcrypt.compare(password, dbUser.password_hash);
        if (!isValid) {
            return NextResponse.json(
                { error: 'Invalid email or password' },
                { status: 401 }
            );
        }

        // Create token
        const user: AuthUser = {
            id: dbUser.id,
            email: dbUser.email,
            full_name: dbUser.full_name,
            role: dbUser.role,
        };
        const token = signToken(user);

        return NextResponse.json({
            success: true,
            user,
            token,
        });
    } catch (error: any) {
        console.error('Error logging in:', error);
        return NextResponse.json(
            { error: error.message || 'Login failed' },
            { status: 500 }
        );
    }
}
