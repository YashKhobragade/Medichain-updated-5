import { query } from '@/config/db';

export interface Company {
    id: string;
    company_name: string;
    industry: string;
    registration_number?: string;
    created_at: string;
    updated_at: string;
}

export interface User {
    id: string;
    company_id?: string;
    email: string;
    password_hash: string;
    full_name: string;
    role: string;
    created_at: string;
    updated_at: string;
}

export interface Product {
    id: string;
    company_id: string;
    product_name: string;
    product_category: string;
    description?: string;
    sku: string;
    created_at: string;
    updated_at: string;
}

export interface ProductBatch {
    id: string;
    batch_id: string;
    product_id: string;
    manufacturer_address: string;
    quantity: number;
    production_date: string;
    expiry_date?: string;
    origin_location?: string;
    status: 'CREATED' | 'IN_TRANSIT' | 'DELIVERED' | 'FLAGGED';
    trust_score: number;
    blockchain_tx?: string;
    qr_code_hash?: string;
    created_at: string;
    updated_at: string;
}

export interface TrackingEvent {
    id: string;
    batch_id: string;
    event_type: 'CREATED' | 'TRANSFERRED' | 'RECEIVED' | 'SCANNED' | 'FLAGGED';
    actor_address?: string;
    actor_name?: string;
    stage: string;
    location?: string;
    timestamp: string;
    metadata?: any;
    blockchain_tx_hash?: string;
    is_anomaly: boolean;
}

export const db = {
    // ---- PRODUCTS ----
    async createProduct(product: Omit<Product, 'id' | 'created_at' | 'updated_at'>) {
        const { rows } = await query(
            `INSERT INTO products (company_id, product_name, product_category, description, sku)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [product.company_id, product.product_name, product.product_category, product.description, product.sku]
        );
        return rows[0];
    },

    async getProduct(productId: string) {
        const { rows } = await query(`SELECT * FROM products WHERE id = $1`, [productId]);
        return rows[0] || null;
    },

    async listProducts(companyId?: string) {
        if (companyId) {
            const { rows } = await query(`SELECT * FROM products WHERE company_id = $1 ORDER BY created_at DESC`, [companyId]);
            return rows;
        }
        const { rows } = await query(`SELECT * FROM products ORDER BY created_at DESC`);
        return rows;
    },

    // ---- BATCHES ----
    async createBatch(batch: Partial<ProductBatch> & { batch_id: string, product_id: string, manufacturer_address: string, quantity: number, production_date: string }) {
        const { rows } = await query(
            `INSERT INTO product_batches (batch_id, product_id, manufacturer_address, quantity, production_date, expiry_date, origin_location, status, trust_score, blockchain_tx, qr_code_hash)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             RETURNING *`,
            [
                batch.batch_id,
                batch.product_id,
                batch.manufacturer_address,
                batch.quantity,
                batch.production_date,
                batch.expiry_date || null,
                batch.origin_location || null,
                batch.status || 'CREATED',
                batch.trust_score !== undefined ? batch.trust_score : 100,
                batch.blockchain_tx || null,
                batch.qr_code_hash || null,
            ]
        );
        return rows[0];
    },

    async getBatch(batchId: string) {
        const { rows } = await query(
            `SELECT b.*, p.product_name, p.product_category, p.description as product_description, p.sku 
             FROM product_batches b 
             JOIN products p ON b.product_id = p.id 
             WHERE b.batch_id = $1`,
            [batchId]
        );
        return rows[0] || null;
    },

    async listBatches(manufacturerAddress?: string) {
        if (manufacturerAddress) {
            const { rows } = await query(
                `SELECT b.*, p.product_name, p.product_category, p.description as product_description, p.sku 
                 FROM product_batches b 
                 JOIN products p ON b.product_id = p.id 
                 WHERE b.manufacturer_address = $1 
                 ORDER BY b.created_at DESC`,
                [manufacturerAddress]
            );
            return rows;
        }
        const { rows } = await query(
            `SELECT b.*, p.product_name, p.product_category, p.description as product_description, p.sku 
             FROM product_batches b 
             JOIN products p ON b.product_id = p.id 
             ORDER BY b.created_at DESC`
        );
        return rows;
    },

    async updateBatchStatus(batchId: string, status: ProductBatch['status']) {
        const { rows } = await query(
            `UPDATE product_batches SET status = $1 WHERE batch_id = $2 RETURNING *`,
            [status, batchId]
        );
        return rows[0];
    },

    async updateTrustScore(batchId: string, trustScore: number) {
        const { rows } = await query(
            `UPDATE product_batches SET trust_score = $1 WHERE batch_id = $2 RETURNING *`,
            [trustScore, batchId]
        );
        return rows[0];
    },

    // ---- TRACKING EVENTS ----
    async recordEvent(event: Omit<TrackingEvent, 'id' | 'timestamp'>) {
        const { rows } = await query(
            `INSERT INTO tracking_events (batch_id, event_type, actor_address, actor_name, stage, location, metadata, blockchain_tx_hash, is_anomaly)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING *`,
            [
                event.batch_id,
                event.event_type,
                event.actor_address || null,
                event.actor_name || null,
                event.stage,
                event.location || null,
                event.metadata ? JSON.stringify(event.metadata) : null,
                event.blockchain_tx_hash || null,
                event.is_anomaly || false,
            ]
        );
        return rows[0];
    },

    async getTrackingHistory(batchId: string) {
        const { rows } = await query(
            `SELECT * FROM tracking_events WHERE batch_id = $1 ORDER BY timestamp ASC`,
            [batchId]
        );
        return rows;
    },

    async getScanCount(batchId: string) {
        const { rows } = await query(
            `SELECT COUNT(*) as count FROM tracking_events WHERE batch_id = $1 AND event_type = 'SCANNED' AND is_anomaly = false`,
            [batchId]
        );
        return parseInt(rows[0].count) || 0;
    },

    async getAnomalies() {
        const { rows } = await query(
            `    SELECT * FROM tracking_events WHERE is_anomaly = true ORDER BY timestamp DESC`
        );
        return rows;
    },

    // ---- EXTENDED / ALIAS METHODS ----
    async getTransferHistory(batchId: string) {
        const { rows } = await query(
            `SELECT * FROM tracking_events WHERE batch_id = $1 AND event_type IN ('TRANSFERRED', 'RECEIVED') ORDER BY timestamp ASC`,
            [batchId]
        );
        return rows;
    },

    async getScanHistory(batchId: string) {
        const { rows } = await query(
            `SELECT * FROM tracking_events WHERE batch_id = $1 AND event_type = 'SCANNED' ORDER BY timestamp ASC`,
            [batchId]
        );
        return rows;
    },

    async recordScan(scanData: any) {
        return this.recordEvent({
            batch_id: scanData.batch_id,
            event_type: 'SCANNED',
            actor_address: scanData.scanner_address,
            stage: 'Consumer',
            location: scanData.scan_location,
            metadata: {
                geo_hash: scanData.geo_hash,
                ip_address: scanData.ip_address,
                qr_nonce: scanData.qr_nonce,
                is_valid: scanData.is_valid
            },
            is_anomaly: !scanData.is_valid
        });
    },

    async logEvent(eventData: any) {
        return this.recordEvent({
            batch_id: eventData.batch_id,
            event_type: eventData.event_type || 'FLAGGED',
            stage: 'System',
            metadata: eventData.details,
            is_anomaly: eventData.severity === 'WARNING' || eventData.severity === 'CRITICAL'
        });
    },

    async getCounterfeitAttempts() {
        return this.getAnomalies();
    }
};
