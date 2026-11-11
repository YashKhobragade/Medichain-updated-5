// Demo data generator for MediChain platform
import { db } from '@/lib/database';

export const DEMO_PRODUCTS = [
    {
        company_id: 'c2000000-0000-0000-0000-000000000000',
        product_name: 'Paracetamol 500mg',
        product_category: 'Analgesic',
        description: 'Paracetamol tablets 500mg, strip of 10 tablets',
        sku: 'SKU-PCM-500',
    },
    {
        company_id: 'c2000000-0000-0000-0000-000000000000',
        product_name: 'Amoxicillin 250mg',
        product_category: 'Antibiotic',
        description: 'Amoxicillin capsules 250mg, strip of 15 capsules',
        sku: 'SKU-AMX-250',
    }
];

export const DEMO_BATCHES = [
    {
        batch_id: 'MED-PCM-001',
        manufacturer_address: '0xA1B2C3D4E5F6A7B8C9D0E1F2A3B4C5D6E7F8A9B0',
        quantity: 5000,
        production_date: new Date('2024-11-01').toISOString(),
        expiry_date: new Date('2027-11-01').toISOString(),
        origin_location: 'Mumbai, India',
        status: 'DELIVERED' as const,
        trust_score: 98,
        sku: 'SKU-PCM-500', // Helper field to find product id
    },
    {
        batch_id: 'MED-AMX-001',
        manufacturer_address: '0xA1B2C3D4E5F6A7B8C9D0E1F2A3B4C5D6E7F8A9B0',
        quantity: 10000,
        production_date: new Date('2024-08-01').toISOString(),
        expiry_date: new Date('2025-08-01').toISOString(),
        origin_location: 'Hyderabad, India',
        status: 'IN_TRANSIT' as const,
        trust_score: 88,
        sku: 'SKU-AMX-250',
    },
    {
        batch_id: 'MED-AMX-002-COUNTERFEIT',
        manufacturer_address: '0xFAKE_MANUFACTURER',
        quantity: 5000,
        production_date: new Date('2024-08-01').toISOString(),
        expiry_date: new Date('2025-08-01').toISOString(),
        origin_location: 'Unknown Location',
        status: 'FLAGGED' as const,
        trust_score: 23,
        sku: 'SKU-AMX-250',
    }
];

export const DEMO_EVENTS = [
    // Paracetamol Flow
    {
        batch_id: 'MED-PCM-001',
        event_type: 'CREATED' as const,
        actor_address: '0xA1B2C3D4E5F6A7B8C9D0E1F2A3B4C5D6E7F8A9B0',
        actor_name: 'PharmaCure Labs',
        stage: 'PRODUCER',
        location: 'Mumbai, India',
        is_anomaly: false,
        metadata: { qa_passed: true },
    },
    {
        batch_id: 'MED-PCM-001',
        event_type: 'TRANSFERRED' as const,
        actor_address: '0xA1B2C3D4E5F6A7B8C9D0E1F2A3B4C5D6E7F8A9B0',
        actor_name: 'PharmaCure Labs',
        stage: 'LOGISTICS',
        location: 'Mumbai Warehouse',
        is_anomaly: false,
        metadata: { container: 'C-1002', destination: 'Delhi' },
    },
    {
        batch_id: 'MED-PCM-001',
        event_type: 'RECEIVED' as const,
        actor_address: '0x1111AAAA2222BBBB3333CCCC4444DDDD5555EEEE',
        actor_name: 'MediTrust Distributors',
        stage: 'LOGISTICS',
        location: 'Delhi Distribution Center',
        is_anomaly: false,
        metadata: { condition: 'Good', temperature: '25°C' },
    },
    {
        batch_id: 'MED-PCM-001',
        event_type: 'TRANSFERRED' as const,
        actor_address: '0x1111AAAA2222BBBB3333CCCC4444DDDD5555EEEE',
        actor_name: 'MediTrust Distributors',
        stage: 'VENDOR',
        location: 'Delhi Distribution Center',
        is_anomaly: false,
        metadata: { carrier: 'Local Trucking' },
    },
    {
        batch_id: 'MED-PCM-001',
        event_type: 'RECEIVED' as const,
        actor_address: '0x6666FFFF7777AAAA8888BBBB9999CCCC0000DDDD',
        actor_name: 'HealthPlus Pharmacy',
        stage: 'VENDOR',
        location: 'Delhi, Connaught Place',
        is_anomaly: false,
        metadata: { condition: 'Good' },
    },
    // Amoxicillin Flow
    {
        batch_id: 'MED-AMX-001',
        event_type: 'CREATED' as const,
        actor_address: '0xA1B2C3D4E5F6A7B8C9D0E1F2A3B4C5D6E7F8A9B0',
        actor_name: 'PharmaCure Labs',
        stage: 'PRODUCER',
        location: 'Hyderabad, India',
        is_anomaly: false,
        metadata: { fda_approved: true },
    },
    {
        batch_id: 'MED-AMX-001',
        event_type: 'TRANSFERRED' as const,
        actor_address: '0xA1B2C3D4E5F6A7B8C9D0E1F2A3B4C5D6E7F8A9B0',
        actor_name: 'PharmaCure Labs',
        stage: 'LOGISTICS',
        location: 'Hyderabad, India',
        is_anomaly: false,
        metadata: { temperature_controlled: true },
    },
    // Counterfeit Anomaly
    {
        batch_id: 'MED-AMX-002-COUNTERFEIT',
        event_type: 'SCANNED' as const,
        actor_address: '0xSCANNER01',
        actor_name: 'Unknown',
        stage: 'CONSUMER',
        location: 'Remote Location',
        is_anomaly: true,
        metadata: { ip: '192.168.1.1' },
    }
];

export async function seedDemoData() {
    try {
        console.log('🌱 Seeding medicine demo data...');

        // 1. Create Products
        const productMap = new Map<string, string>(); // sku -> id
        const existingProducts = await db.listProducts();

        for (const prod of DEMO_PRODUCTS) {
            const existing = existingProducts.find(p => p.sku === prod.sku);
            if (!existing) {
                const created = await db.createProduct(prod);
                productMap.set(prod.sku, created.id);
                console.log(`✅ Created product: ${prod.product_name}`);
            } else {
                productMap.set(prod.sku, existing.id);
                console.log(`ℹ️  Product exists: ${prod.product_name}`);
            }
        }

        // 2. Create Batches
        for (const batch of DEMO_BATCHES) {
            try {
                const existing = await db.getBatch(batch.batch_id).catch(() => null);
                if (!existing) {
                    const productId = productMap.get(batch.sku);
                    if (!productId) {
                        console.warn(`⚠️  Cannot create batch without product ID for SKU: ${batch.sku}`);
                        continue;
                    }

                    // Remove sku before passing to db create
                    const { sku, ...batchData } = batch;

                    await db.createBatch({
                        ...batchData,
                        product_id: productId
                    });
                    console.log(`✅ Created batch: ${batch.batch_id}`);
                } else {
                    console.log(`ℹ️  Batch exists: ${batch.batch_id}`);
                }
            } catch (err: any) {
                if (err.code !== '23505') throw err;
            }
        }

        // 3. Create Tracking Events
        for (const event of DEMO_EVENTS) {
            try {
                // Since events don't have natural composite unique keys without complex setup, 
                // we'll just insert and rely on manual cleanup if dupes are an issue in dev.
                await db.recordEvent(event);
                console.log(`✅ Logged event [${event.event_type}] for: ${event.batch_id}`);
            } catch (err: any) {
                console.warn(`⚠️  Error logging event:`, err.message);
            }
        }

        console.log('🎉 Medicine Demo data seeded successfully!');
        return { success: true };
    } catch (error: any) {
        console.error('❌ Error seeding demo data:', error);
        return { success: false, error: error.message };
    }
}

export function isDemoMode() {
    return typeof window !== 'undefined' && localStorage.getItem('medichain_demo_mode') === 'true';
}

export function enableDemoMode() {
    if (typeof window !== 'undefined') {
        localStorage.setItem('medichain_demo_mode', 'true');
    }
}

export function disableDemoMode() {
    if (typeof window !== 'undefined') {
        localStorage.removeItem('medichain_demo_mode');
    }
}
