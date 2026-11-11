'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserRole, hasPortalAccess } from '@/lib/roles';

// User type (replaces Supabase User)
export interface AuthUser {
    id: string;
    email: string;
    full_name: string;
    role: string;
    company?: string | null;
}

interface AuthContextType {
    user: AuthUser | null;
    userRole: UserRole | null;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<void>;
    signup: (name: string, email: string, password: string, role: UserRole) => Promise<void>;
    logout: () => Promise<void>;
    hasAccess: (portalPath: string) => boolean;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'medichain_auth_token';
const USER_KEY = 'medichain_auth_user';

function getStoredAuth(): { user: AuthUser | null; token: string | null } {
    if (typeof window === 'undefined') return { user: null, token: null };

    try {
        const token = localStorage.getItem(TOKEN_KEY);
        const userStr = localStorage.getItem(USER_KEY);
        const user = userStr ? JSON.parse(userStr) : null;
        return { user, token };
    } catch {
        return { user: null, token: null };
    }
}

function storeAuth(token: string, user: AuthUser) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function clearAuth() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem('medichain_wallet_auto_connect');
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [userRole, setUserRole] = useState<UserRole | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);

    // Check for existing session on mount
    useEffect(() => {
        const { user: storedUser } = getStoredAuth();
        if (storedUser) {
            setUser(storedUser);
            setUserRole(storedUser.role as UserRole);
            setIsAuthenticated(true);
        }
        setLoading(false);
    }, []);

    const login = async (email: string, password: string) => {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Login failed');
        }

        storeAuth(data.token, data.user);
        setUser(data.user);
        setUserRole(data.user.role as UserRole);
        setIsAuthenticated(true);
    };

    const signup = async (name: string, email: string, password: string, role: UserRole) => {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password, role }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Registration failed');
        }

        storeAuth(data.token, data.user);
        setUser(data.user);
        setUserRole(data.user.role as UserRole);
        setIsAuthenticated(true);
    };

    const logout = async () => {
        clearAuth();
        setUser(null);
        setIsAuthenticated(false);
        setUserRole(null);
    };

    const hasAccess = (portalPath: string): boolean => {
        return hasPortalAccess(userRole, portalPath);
    };

    return (
        <AuthContext.Provider value={{ user, userRole, isAuthenticated, login, signup, logout, hasAccess, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
