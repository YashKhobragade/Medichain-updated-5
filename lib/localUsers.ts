// ============================================================
// Accounts without a database (server only)
// ------------------------------------------------------------
// Ready-made demo accounts, one per role, plus anyone who signs
// up while PostgreSQL isn't running (saved to data/users.json).
// Each account belongs to an organisation, which is the name
// recorded on the shipment ledger when they send or receive.
// ============================================================

import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { DEMO_COMPANIES } from '@/utils/demo';
import type { PartyKind } from '@/lib/shipments';

export const DEMO_PASSWORD = 'demo123';

export interface LocalUser {
    id: string;
    email: string;
    full_name: string;
    role: string;
    company: string | null;
    password_hash?: string;
}

/** Shown on the login page too, so keep it in sync with app/login/page.tsx */
export const DEMO_ACCOUNTS: LocalUser[] = [
    { id: 'demo-mfr', email: 'manufacturer@medichain.io', full_name: 'Dr. Ravi Mehta', role: 'manufacturer', company: 'PharmaCure Labs' },
    { id: 'demo-dst', email: 'distributor@medichain.io', full_name: 'Priya Sharma', role: 'distributor', company: 'MediTrust Distributors' },
    { id: 'demo-phr', email: 'pharmacy@medichain.io', full_name: 'Amit Patel', role: 'vendor', company: 'HealthPlus Pharmacy' },
    { id: 'demo-hsp', email: 'hospital@medichain.io', full_name: 'Dr. Kavya Nair', role: 'hospital', company: 'Apollo Hospital Pharmacy' },
    { id: 'demo-cus', email: 'customer@medichain.io', full_name: 'Rahul Verma', role: 'customer', company: null },
    { id: 'demo-adm', email: 'admin@medichain.io', full_name: 'Admin', role: 'admin', company: null },
];

const FILE = path.join(process.cwd(), 'data', 'users.json');

function signups(): LocalUser[] {
    try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { return []; }
}

export function findLocalUser(email: string): LocalUser | undefined {
    const e = email.trim().toLowerCase();
    return DEMO_ACCOUNTS.find(u => u.email === e) ?? signups().find(u => u.email === e);
}

export async function checkLocalLogin(email: string, password: string): Promise<LocalUser | null> {
    const u = findLocalUser(email);
    if (!u) return null;
    // The admin's password is not the demo one: it comes from ADMIN_PASSWORD in .env.local
    // (admin login is switched off until it is set)
    const adminPassword = process.env.ADMIN_PASSWORD?.trim();
    const ok = u.password_hash ? await bcrypt.compare(password, u.password_hash)
        : u.role === 'admin' ? !!adminPassword && password.trim() === adminPassword
            : password.trim() === DEMO_PASSWORD;
    if (!ok) return null;
    const { password_hash: _, ...safe } = u;
    return safe;
}

export async function addLocalUser(name: string, email: string, password: string, role: string, company?: string): Promise<LocalUser> {
    const list = signups();
    const user: LocalUser = {
        id: `local-${Date.now().toString(36)}`, email: email.trim().toLowerCase(), full_name: name, role,
        company: ['manufacturer', 'distributor', 'vendor', 'hospital'].includes(role) ? (company?.trim() || name) : null,
        password_hash: await bcrypt.hash(password, 10),
    };
    list.push(user);
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(list, null, 2));
    const { password_hash: _, ...safe } = user;
    return safe;
}

// ---------- registered organisations ----------

const ROLE_KIND: Record<string, PartyKind> = { manufacturer: 'Manufacturer', distributor: 'Distributor', vendor: 'Pharmacy', hospital: 'Hospital' };

/** Every organisation allowed on the supply chain: built-in companies plus companies of signed-up users. */
export function registeredParties(): { name: string; kind: PartyKind; city?: string }[] {
    const map = new Map<string, { name: string; kind: PartyKind; city?: string }>();
    DEMO_COMPANIES.forEach(c => map.set(c.company_name.toLowerCase(), { name: c.company_name, kind: c.company_type as PartyKind, city: c.location }));
    [...DEMO_ACCOUNTS, ...signups()].forEach(u => {
        if (u.company && ROLE_KIND[u.role] && !map.has(u.company.toLowerCase())) map.set(u.company.toLowerCase(), { name: u.company, kind: ROLE_KIND[u.role] });
    });
    return Array.from(map.values());
}

export function partyKind(name: string): PartyKind {
    return registeredParties().find(p => p.name.toLowerCase() === name.trim().toLowerCase())?.kind ?? 'Unknown';
}
