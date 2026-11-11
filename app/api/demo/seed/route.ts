import { NextRequest, NextResponse } from 'next/server';
import { seedDemoData } from '@/utils/demoData';

export async function POST(request: NextRequest) {
    try {
        const result = await seedDemoData();

        if (!result.success) {
            return NextResponse.json(
                { error: result.error || 'Failed to seed demo data' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Demo data seeded successfully',
        });
    } catch (error: any) {
        console.error('Error in demo seed:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to seed demo data' },
            { status: 500 }
        );
    }
}
