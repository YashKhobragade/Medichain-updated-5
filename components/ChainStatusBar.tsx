'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Clock, Link2, Link2Off, Loader2, Wallet } from 'lucide-react';
import { useWallet } from '@/contexts/WalletContext';
import { useAuth } from '@/contexts/AuthContext';
import { authFetch } from '@/lib/authFetch';
import { chainStatus, roleOnChain, CONTRACT_ROLE, type ChainStatus } from '@/lib/onchain';

const SUPPLY_ROLES: Record<string, string> = { manufacturer: 'manufacturer', distributor: 'distributor', vendor: 'pharmacy', hospital: 'hospital' };
const short = (a?: string) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '');

/** Shows whether actions will also be written to the public blockchain, with the one action needed to get there. */
export function ChainStatusBar({ onChange }: { onChange?: (s: ChainStatus) => void }) {
    const { connect, isConnecting, switchToSepolia, account, chainId } = useWallet();
    const [s, setS] = useState<ChainStatus | null>(null);

    const refresh = useCallback(async () => {
        const next = await chainStatus();
        setS(next);
        onChange?.(next);
    }, [onChange]);

    useEffect(() => { refresh(); }, [refresh, account, chainId]);

    if (!s) return null;

    return (
        <div className="space-y-2">
            <div className={`flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border px-4 py-2.5 text-sm ${s.ready ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-gray-800 bg-gray-900/40'}`}>
                {s.ready ? <Link2 className="w-4 h-4 text-emerald-400" aria-hidden /> : <Link2Off className="w-4 h-4 text-gray-500" aria-hidden />}
                <span className={s.ready ? 'text-emerald-200' : 'text-gray-300'}>
                    {s.ready ? <>Blockchain: also writing to <b className="font-medium">{s.network}</b> as {short(s.account)}</> : s.reason}
                </span>
                <span className="sm:ml-auto flex gap-2">
                    {!s.ready && !s.account && s.expectedChainId && (
                        <button onClick={async () => { await connect(); refresh(); }} disabled={isConnecting}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-orange-500/90 text-gray-950 hover:bg-orange-400 disabled:opacity-50">
                            {isConnecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Connect MetaMask'}
                        </button>
                    )}
                    {s.needsSwitch && (
                        <button onClick={async () => { await switchToSepolia(); refresh(); }}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-500/90 text-gray-950 hover:bg-sky-400">
                            Switch to Sepolia
                        </button>
                    )}
                </span>
            </div>
            {s.ready && s.account && <WalletLinkRow account={s.account} />}
        </div>
    );
}

/** The logged-in organisation's wallet: link it, then wait for the admin's approval. */
function WalletLinkRow({ account }: { account: string }) {
    const { user } = useAuth();
    const role = user ? SUPPLY_ROLES[user.role] : undefined;
    const company = user?.company ?? '';
    const [linked, setLinked] = useState<string | null | undefined>(undefined);
    const [approved, setApproved] = useState<boolean | null>(null);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!role || !company) return;
        try {
            const r = await fetch('/api/wallets', { cache: 'no-store' });
            const parties = (await r.json()).parties ?? {};
            const hit = Object.entries(parties).find(([name]) => name.toLowerCase() === company.toLowerCase())?.[1] as any;
            const addr: string | null = hit?.address ?? null;
            setLinked(addr);
            if (addr && addr.toLowerCase() === account.toLowerCase()) {
                const have = await roleOnChain(addr);
                setApproved(have === null ? null : have === CONTRACT_ROLE[role]);
            } else setApproved(null);
        } catch { setLinked(null); }
    }, [account, company, role]);

    useEffect(() => { load(); }, [load]);

    if (!role || !company || linked === undefined) return null;

    const link = async () => {
        setBusy(true); setErr(null);
        try {
            const r = await authFetch('/api/wallets', { method: 'POST', body: JSON.stringify({ address: account }) });
            const j = await r.json();
            if (!r.ok) throw new Error(j.error || 'Could not link the wallet.');
            await load();
        } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
    };

    const isThis = !!linked && linked.toLowerCase() === account.toLowerCase();
    const box = 'flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border px-4 py-2.5 text-sm';
    const button = (label: string) => (
        <button onClick={link} disabled={busy} className="sm:ml-auto px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 text-gray-950 hover:bg-emerald-400 disabled:opacity-50">
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : label}
        </button>
    );

    if (isThis && approved) {
        return (
            <div className={`${box} border-emerald-500/20 bg-emerald-500/5 text-emerald-200`}>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" aria-hidden />
                <span>{company}&apos;s wallet is approved on the blockchain as {role === 'hospital' ? 'a hospital' : `a ${role}`}.</span>
            </div>
        );
    }
    if (isThis) {
        return (
            <div className={`${box} border-amber-500/30 bg-amber-500/5 text-amber-200`}>
                <Clock className="w-4 h-4 text-amber-400" aria-hidden />
                <span>Linked to {company}. <b className="font-medium">Waiting for the admin to approve it</b>; until then actions are saved in the MediChain ledger only.</span>
            </div>
        );
    }
    return (
        <div className={`${box} border-sky-500/30 bg-sky-500/5 text-sky-100`}>
            <Wallet className="w-4 h-4 text-sky-400" aria-hidden />
            <span>
                {linked
                    ? <>{company} is linked to {short(linked)}. Switch MetaMask to that account, or link this one ({short(account)}) instead.</>
                    : <>This MetaMask account ({short(account)}) is not linked to {company} yet.</>}
            </span>
            {button(linked ? 'Link this one instead' : 'Link this wallet')}
            {err && <span className="w-full text-xs text-rose-300">{err}</span>}
        </div>
    );
}
