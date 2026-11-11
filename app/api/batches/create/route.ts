import { addLocalBatch } from '@/lib/localBatches';
import { getAuthUser } from '@/middleware/auth';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const {
            batch_id,
            manufacturer_address,
            product_name,
            product_category,
            sku,
            quantity,
            manufacturing_date,
            production_date,
            expiry_date,
            origin_location,
            manufacturer_name,
            blockchain_tx,
            qr_code_hash
        } = body;

        const prodDate = manufacturing_date || production_date;
        // The create form sends a product name; older callers send a product_id
        const product_id = body.product_id || product_name;

        // Validate required fields
        if (!batch_id || !manufacturer_address || !product_id || !quantity || !prodDate) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Create batch in database
        let batch;
        try {
            batch = await db.createBatch({
                batch_id,
                product_id,
                manufacturer_address,
                quantity: parseInt(quantity),
                production_date: prodDate,
                expiry_date,
                origin_location,
                status: 'CREATED',
                trust_score: 100,
                blockchain_tx,
                qr_code_hash,
            });
        } catch (dbError: any) {
            console.warn('DB createBatch failed, proceeding in demo mode:', dbError.message);
            // Simulated batch object for demo continuity
            batch = {
                batch_id, product_id, product_name, product_category, sku, manufacturer_name, manufacturer_address, quantity,
                production_date: prodDate, expiry_date, origin_location,
                status: 'CREATED', trust_score: 100, created_at: new Date().toISOString(),
                // who created it: that account may make the first shipment
                created_by: getAuthUser(request)?.email ?? null,
            };
            
            // Save to global in-memory cache so Verify can find it immediately
            const globalObj = global as any;
            addLocalBatch(batch);
        }

        // Log tracking event for creation
        try {
            if (db.recordEvent) {
                await db.recordEvent({
                    event_type: 'CREATED',
                    batch_id,
                    actor_address: manufacturer_address,
                    actor_name: 'Manufacturer',
                    stage: 'Manufacturer',
                    location: origin_location || 'Unknown',
                    metadata: { quantity, production_date: manufacturing_date },
                    is_anomaly: false
                });
            }
        } catch (eventError: any) {
            console.warn('Failed to log tracking event:', eventError.message);
        }

        return NextResponse.json(
            { success: true, batch },
            { status: 201 }
        );
    } catch (error: any) {
        console.error('Error creating batch:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to create batch' },
            { status: 500 }
        );
    }
}
