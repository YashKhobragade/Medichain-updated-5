-- MediChain PostgreSQL Database Schema
-- Medicine Supply Chain Tracking Platform
-- Run: psql -U postgres -d medichain -f config/schema.sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop old tables if they exist
DROP TABLE IF EXISTS analytics CASCADE;
DROP TABLE IF EXISTS scans CASCADE;
DROP TABLE IF EXISTS transfers CASCADE;
DROP TABLE IF EXISTS batches CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS companies CASCADE;

-- Companies (Tenants)
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name TEXT UNIQUE NOT NULL,
  industry TEXT NOT NULL,
  registration_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'customer',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products (Master Data)
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  product_category TEXT NOT NULL,
  description TEXT,
  sku TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product Batches (Instances)
CREATE TABLE product_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id TEXT UNIQUE NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE RESTRICT,
  manufacturer_address TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  production_date TIMESTAMPTZ NOT NULL,
  expiry_date TIMESTAMPTZ,
  origin_location TEXT,
  status TEXT NOT NULL DEFAULT 'CREATED',
  trust_score INTEGER DEFAULT 100,
  blockchain_tx TEXT,
  qr_code_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tracking Events (Unified Log)
CREATE TABLE tracking_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id TEXT NOT NULL REFERENCES product_batches(batch_id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'CREATED', 'TRANSFERRED', 'RECEIVED', 'SCANNED', 'FLAGGED'
  actor_address TEXT,
  actor_name TEXT,
  stage TEXT NOT NULL, -- e.g. Manufacturer, Distributor, Pharmacy, Hospital, Patient
  location TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB, -- Dynamic attributes (gps, temperature, notes, etc)
  blockchain_tx_hash TEXT,
  is_anomaly BOOLEAN DEFAULT FALSE
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_product_batches_batch_id ON product_batches(batch_id);
CREATE INDEX idx_product_batches_product_id ON product_batches(product_id);
CREATE INDEX idx_tracking_events_batch_id ON tracking_events(batch_id);
CREATE INDEX idx_tracking_events_type ON tracking_events(event_type);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_product_batches_updated_at BEFORE UPDATE ON product_batches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- DUMMY DATA FOR PRESENTATION
-- =============================================

-- Demo Companies
INSERT INTO companies (id, company_name, industry) VALUES
('c1000000-0000-0000-0000-000000000000', 'MediChain Admin', 'Healthcare Technology'),
('c2000000-0000-0000-0000-000000000000', 'PharmaCure Labs', 'Pharmaceutical Manufacturing'),
('c3000000-0000-0000-0000-000000000000', 'MediTrust Distributors', 'Pharmaceutical Distribution'),
('c4000000-0000-0000-0000-000000000000', 'HealthPlus Pharmacy', 'Retail Pharmacy')
ON CONFLICT DO NOTHING;

-- Demo Users
INSERT INTO users (email, password_hash, full_name, role, company_id) VALUES
('admin@medichain.io', '$2a$10$rQhVx5UvRqSYq8OxQqmCJOJw3kVxjZ5yzV8hGj/L6F5Y5lPxD9Ede', 'Admin User', 'admin', 'c1000000-0000-0000-0000-000000000000'),
('manufacturer@medichain.io', '$2a$10$rQhVx5UvRqSYq8OxQqmCJOJw3kVxjZ5yzV8hGj/L6F5Y5lPxD9Ede', 'Dr. Ravi Mehta', 'manufacturer', 'c2000000-0000-0000-0000-000000000000'),
('distributor@medichain.io', '$2a$10$rQhVx5UvRqSYq8OxQqmCJOJw3kVxjZ5yzV8hGj/L6F5Y5lPxD9Ede', 'Priya Sharma', 'distributor', 'c3000000-0000-0000-0000-000000000000'),
('pharmacy@medichain.io', '$2a$10$rQhVx5UvRqSYq8OxQqmCJOJw3kVxjZ5yzV8hGj/L6F5Y5lPxD9Ede', 'Amit Patel', 'vendor', 'c4000000-0000-0000-0000-000000000000')
ON CONFLICT (email) DO NOTHING;

-- Demo Products (Medicines)
INSERT INTO products (id, company_id, product_name, product_category, sku, description) VALUES
('d1000000-0000-0000-0000-000000000000', 'c2000000-0000-0000-0000-000000000000', 'Paracetamol 500mg', 'Analgesic', 'SKU-PCM-500', 'Paracetamol tablets 500mg, strip of 10 tablets'),
('d2000000-0000-0000-0000-000000000000', 'c2000000-0000-0000-0000-000000000000', 'Amoxicillin 250mg', 'Antibiotic', 'SKU-AMX-250', 'Amoxicillin capsules 250mg, strip of 15 capsules')
ON CONFLICT (sku) DO NOTHING;

-- Demo Product Batches
INSERT INTO product_batches (batch_id, product_id, manufacturer_address, quantity, production_date, expiry_date, origin_location, status, trust_score) VALUES
('MED-PCM-001', 'd1000000-0000-0000-0000-000000000000', '0xA1B2C3D4E5F6A7B8C9D0E1F2A3B4C5D6E7F8A9B0', 5000, '2024-11-01', '2027-11-01', 'Mumbai, India', 'DELIVERED', 98),
('MED-AMX-001', 'd2000000-0000-0000-0000-000000000000', '0xA1B2C3D4E5F6A7B8C9D0E1F2A3B4C5D6E7F8A9B0', 10000, '2024-08-01', '2025-08-01', 'Hyderabad, India', 'IN_TRANSIT', 88),
('MED-AMX-002-COUNTERFEIT', 'd2000000-0000-0000-0000-000000000000', '0xFAKE_MANUFACTURER', 5000, '2024-08-01', '2025-08-01', 'Unknown', 'FLAGGED', 23)
ON CONFLICT (batch_id) DO NOTHING;

-- Demo Tracking Events
INSERT INTO tracking_events (batch_id, event_type, actor_address, actor_name, stage, location, metadata, is_anomaly) VALUES
-- Normal flow for Paracetamol
('MED-PCM-001', 'CREATED', '0xA1B2C3D4E5F6A7B8C9D0E1F2A3B4C5D6E7F8A9B0', 'PharmaCure Labs', 'Manufacturer', 'Mumbai, India', '{"qa_passed": true}', false),
('MED-PCM-001', 'TRANSFERRED', '0xA1B2C3D4E5F6A7B8C9D0E1F2A3B4C5D6E7F8A9B0', 'PharmaCure Labs', 'Logistics', 'Mumbai Warehouse', '{"container": "C-1002", "destination": "Delhi"}', false),
('MED-PCM-001', 'RECEIVED', '0x1111AAAA2222BBBB3333CCCC4444DDDD5555EEEE', 'MediTrust Distributors', 'Logistics', 'Delhi Distribution Center', '{"condition": "Good"}', false),
('MED-PCM-001', 'TRANSFERRED', '0x1111AAAA2222BBBB3333CCCC4444DDDD5555EEEE', 'MediTrust Distributors', 'Pharmacy', 'Delhi Distribution Center', '{"carrier": "Local Trucking"}', false),
('MED-PCM-001', 'RECEIVED', '0x6666FFFF7777AAAA8888BBBB9999CCCC0000DDDD', 'HealthPlus Pharmacy', 'Pharmacy', 'Delhi, Connaught Place', '{"condition": "Good"}', false),
-- Amoxicillin flow (incomplete)
('MED-AMX-001', 'CREATED', '0xA1B2C3D4E5F6A7B8C9D0E1F2A3B4C5D6E7F8A9B0', 'PharmaCure Labs', 'Manufacturer', 'Hyderabad, India', '{"fda_approved": true}', false),
('MED-AMX-001', 'TRANSFERRED', '0xA1B2C3D4E5F6A7B8C9D0E1F2A3B4C5D6E7F8A9B0', 'PharmaCure Labs', 'Logistics', 'Hyderabad, India', '{"temperature_controlled": true}', false),
-- Counterfeit (anomaly)
('MED-AMX-002-COUNTERFEIT', 'SCANNED', '0xSCANNER01', 'Unknown', 'Consumer', 'Remote Location', '{"ip": "192.168.1.1"}', true);
