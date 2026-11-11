'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';
import { authFetch } from '@/lib/authFetch';
import { approveOnChain, roleOnChain, friendlyChainError, explorerUrl, CONTRACT_ROLE, type ChainStatus } from '@/lib/onchain';

interface Entry { company: string; role: string; address: string; source: 'app' | 'file'; linkedAt?: string; approvedTx?: string }

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
const ROLE_LABEL: Record<string, string> = { manufacturer: 'Manufacturer', distributor: 'Distributor', pharmacy: 'Pharmacy', hospital: 'Hospital' };

/** Admin: companies that linked a wallet, and one click to approve each on the blockchain. */
export function WalletApprovals({ chain }: { chain: ChainStatus | null }) {
    const [list, setList] = useState<Entry[]>([]);
    const [roles, setRoles] = useState<Record<string, number | null>>({});
    const [busy, setBusy] = useState<string | null>(null);
    const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

    const load = useCallback(async () => {
        const r = await fetch('/api/wallets', { cache: 'no-store' });
        const entries: Entry[] = Object.values((await r.json()).parties ?? {});
        setList(entries);
        const got: Record<string, number | null> = {};
        for (const e of entries) got[e.address] = await roleOnChain(e.address);
        setRoles(got);
    }, []);

    useEffect(() => { load(); }, [load, chain?.ready, chain?.account]);

    const approve = async (e: Entry) => {
        setBusy(e.company); setMsg(null);
        try {
            const r = await approveOnChain(e.address, e.role);
            const res = await authFetch('/api/wallets/approve', { method: 'POST', body: JSON.stringify({ company: e.company, address: e.address, txHash: r.txHash }) });
            if (!res.ok) throw new Error((await res.json()).error);
            setMsg({ ok: true, text: `${e.company} is approved on the blockchain.` });
            await load();
        } catch (err: any) {
            setMsg({ ok: false, text: friendlyChainError(err) });
        } finally { setBusy(null); }
    };

    const pending = list.filter(e => roles[e.address] !== CONTRACT_ROLE[e.role]).length;

    return (
        <section className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
            <div className="flex flex-wrap items-center gap-2 mb-1">
                <ShieldCheck className="w-5 h-5 text-emerald-400" aria-hidden />
                <h2 className="text-base font-semibold text-gray-200">Wallet approvals</h2>
                {chain?.ready && list.length > 0 && <span className="text-xs text-gray-400">{pending ? `${pending} waiting` : 'all approved'}</span>}
            </div>
            <p className="text-xs text-gray-400 mb-4">
                A company links its MetaMask wallet from the bar on its Create or Transfers page. It can write to the blockchain only after you approve it here.
                Approve with the wallet that deployed the contract selected in MetaMask.
            </p>

            {!chain?.ready && <p className="text-sm text-amber-200 mb-3">Connect MetaMask to the contract&apos;s network (bar above) to see and change approvals.</p>}
            {msg && <p className={`text-sm mb-3 ${msg.ok ? 'text-emerald-300' : 'text-rose-300'}`} role="status">{msg.text}</p>}

            {list.length === 0 ? (
                <p className="text-sm text-gray-500">No company has linked a wallet yet.</p>
            ) : (
                <ul className="divide-y divide-gray-700/50 rounded-lg border border-gray-700/50">
                    {list.map(e => {
                        const have = roles[e.address];
                        const ok = have === CONTRACT_ROLE[e.role];
                        const url = e.approvedTx && chain?.chainId ? explorerUrl(chain.chainId, e.approvedTx) : null;
                        return (
                            <li key={e.company} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-sm">
                                <span className="min-w-[180px]">
                                    <span className="text-gray-100">{e.company}</span>
                                    <span className="block text-xs text-gray-500">{ROLE_LABEL[e.role] ?? e.role}{e.source === 'file' ? ' · from wallets.json' : ''}</span>
                                </span>
                                <span className="font-mono text-xs text-gray-400" title={e.address}>{short(e.address)}</span>
                                <span className="sm:ml-auto flex items-center gap-3">
                                    {have === null || have === undefined ? (
                                        <span className="text-xs text-gray-500">status unknown</span>
                                    ) : ok ? (
                                        <span className="inline-flex items-center gap-1.5 text-xs text-emerald-300">
                                            <CheckCircle2 className="w-4 h-4" aria-hidden />Approved
                                            {url && <a href={url} target="_blank" rel="noreferrer" className="underline text-emerald-400">Etherscan ↗</a>}
                                        </span>
                                    ) : (
                                        <button onClick={() => approve(e)} disabled={!!busy}
                                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 text-gray-950 hover:bg-emerald-400 disabled:opacity-50">
                                            {busy === e.company ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Approve'}
                                        </button>
                                    )}
                                </span>
                            </li>
                        );
                    })}
                </ul>
            )}
        </section>
    );
}
