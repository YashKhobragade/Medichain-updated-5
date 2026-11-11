import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import './mobile-fixes.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { WalletProvider } from '@/contexts/WalletContext'
import { cn } from "@/lib/utils";

const inter = Inter({
    subsets: ['latin'],
    variable: '--font-sans',
})

export const metadata: Metadata = {
    title: 'MediChain — Secure Every Medicine. Protect Every Patient.',
    description: 'Blockchain-powered medicine supply chain verification platform. Track every drug from manufacturer to pharmacy.',
    keywords: ['blockchain', 'medicine supply chain', 'pharmaceutical tracking', 'drug verification', 'counterfeit prevention', 'medichain'],
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en" className={cn("dark", inter.variable)}>
            <body className={inter.className}>
                <AuthProvider>
                    <WalletProvider>
                        {children}
                    </WalletProvider>
                </AuthProvider>
            </body>
        </html>
    )
}
