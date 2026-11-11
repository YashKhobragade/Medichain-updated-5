// ============================================================
// 1. PRODUCT DATA — 12 medicines across pharmaceutical categories
// ============================================================

export const DEMO_PRODUCTS = [
    {
        id: 'PRD-001',
        product_name: 'Paracetamol 500mg',
        category: 'Analgesic',
        sku: 'MED-PCM-500',
        manufacturer: 'PharmaCure Labs',
        description: 'Paracetamol tablets 500mg, strip of 10 tablets',
    },
    {
        id: 'PRD-002',
        product_name: 'Amoxicillin 250mg',
        category: 'Antibiotic',
        sku: 'MED-AMX-250',
        manufacturer: 'PharmaCure Labs',
        description: 'Amoxicillin capsules 250mg, strip of 15 capsules',
    },
    {
        id: 'PRD-003',
        product_name: 'Metformin 500mg',
        category: 'Antidiabetic',
        sku: 'MED-MET-500',
        manufacturer: 'PharmaCure Labs',
        description: 'Metformin HCl tablets 500mg for type 2 diabetes management',
    },
    {
        id: 'PRD-004',
        product_name: 'Amoxicillin 500mg',
        category: 'Antibiotic',
        sku: 'MED-AMX-500',
        manufacturer: 'MedCore Pharmaceuticals',
        description: 'Broad-spectrum antibiotic, 30 capsule blister pack',
    },
    {
        id: 'PRD-005',
        product_name: 'InsulinPen FlexiDose',
        category: 'Antidiabetic',
        sku: 'MED-IPF-300',
        manufacturer: 'NovaMed Biotech',
        description: 'Pre-filled insulin pen, 300 IU, refrigerated transport required',
    },
    {
        id: 'PRD-006',
        product_name: 'Azithromycin 500mg',
        category: 'Antibiotic',
        sku: 'MED-AZT-500',
        manufacturer: 'PharmaCure Labs',
        description: 'Azithromycin tablets 500mg, pack of 3 tablets',
    },
    {
        id: 'PRD-007',
        product_name: 'Cetirizine 10mg',
        category: 'Antihistamine',
        sku: 'MED-CTZ-10',
        manufacturer: 'WellLife Pharmaceuticals',
        description: 'Cetirizine hydrochloride tablets 10mg for allergy relief',
    },
    {
        id: 'PRD-008',
        product_name: 'Omeprazole 20mg',
        category: 'Antacid',
        sku: 'MED-OMP-20',
        manufacturer: 'MedCore Pharmaceuticals',
        description: 'Omeprazole delayed-release capsules 20mg, 14 count',
    },
    {
        id: 'PRD-009',
        product_name: 'Ibuprofen 400mg',
        category: 'Anti-inflammatory',
        sku: 'MED-IBU-400',
        manufacturer: 'PharmaCure Labs',
        description: 'Ibuprofen coated tablets 400mg, strip of 10',
    },
    {
        id: 'PRD-010',
        product_name: 'Atorvastatin 10mg',
        category: 'Cardiovascular',
        sku: 'MED-ATV-10',
        manufacturer: 'HeartCare Pharma',
        description: 'Atorvastatin calcium tablets 10mg for cholesterol management',
    },
    {
        id: 'PRD-011',
        product_name: 'Ciprofloxacin 500mg',
        category: 'Antibiotic',
        sku: 'MED-CIP-500',
        manufacturer: 'MedCore Pharmaceuticals',
        description: 'Ciprofloxacin HCl tablets 500mg, 10 tablet strip',
    },
    {
        id: 'PRD-012',
        product_name: 'Vitamin D3 Drops',
        category: 'Supplement',
        sku: 'MED-VD3-60',
        manufacturer: 'WellLife Pharmaceuticals',
        description: 'Cholecalciferol oral drops 60,000 IU, 15ml bottle',
    },
];

// ============================================================
// 2. MEDICINE BATCHES — multiple batches per product
// ============================================================

export const DEMO_BATCHES = [
    {
        batch_id: 'BAT-MED-001',
        product_id: 'PRD-001',
        production_date: '2025-10-15',
        expiry_date: '2028-10-15',
        origin_location: 'Mumbai, India',
        current_stage: 'Pharmacy',
        qr_code_id: 'QR-BAT-MED-001',
        quantity: 240, // units packed in the batch's box
        status: 'Delivered',
    },
    {
        batch_id: 'BAT-MED-002',
        product_id: 'PRD-001',
        production_date: '2025-12-01',
        expiry_date: '2028-12-01',
        origin_location: 'Mumbai, India',
        current_stage: 'Distributor',
        qr_code_id: 'QR-BAT-MED-002',
        quantity: 300, // units packed in the batch's box
        status: 'In Transit',
    },
    {
        batch_id: 'BAT-MED-003',
        product_id: 'PRD-002',
        production_date: '2025-11-20',
        expiry_date: '2028-11-20',
        origin_location: 'Hyderabad, India',
        current_stage: 'Warehouse',
        qr_code_id: 'QR-BAT-MED-003',
        quantity: 180, // units packed in the batch's box
        status: 'In Transit',
    },
    {
        batch_id: 'BAT-MED-004',
        product_id: 'PRD-003',
        production_date: '2026-01-05',
        expiry_date: '2029-01-05',
        origin_location: 'Ahmedabad, India',
        current_stage: 'Logistics',
        qr_code_id: 'QR-BAT-MED-004',
        quantity: 400, // units packed in the batch's box
        status: 'In Transit',
    },
    {
        batch_id: 'BAT-MED-005',
        product_id: 'PRD-004',
        production_date: '2025-09-01',
        expiry_date: '2027-09-01',
        origin_location: 'Hyderabad, India',
        current_stage: 'Pharmacy',
        qr_code_id: 'QR-BAT-MED-005',
        quantity: 200, // units packed in the batch's box
        status: 'Delivered',
    },
    {
        batch_id: 'BAT-MED-006',
        product_id: 'PRD-004',
        production_date: '2026-01-10',
        expiry_date: '2028-01-10',
        origin_location: 'Hyderabad, India',
        current_stage: 'Warehouse',
        qr_code_id: 'QR-BAT-MED-006',
        quantity: 150, // units packed in the batch's box
        status: 'In Transit',
    },
    {
        batch_id: 'BAT-MED-007',
        product_id: 'PRD-005',
        production_date: '2026-02-01',
        expiry_date: '2026-08-01',
        origin_location: 'Basel, Switzerland',
        current_stage: 'Logistics',
        qr_code_id: 'QR-BAT-MED-007',
        quantity: 60, // units packed in the batch's box
        status: 'In Transit',
    },
    {
        batch_id: 'BAT-MED-008',
        product_id: 'PRD-006',
        production_date: '2025-08-15',
        expiry_date: '2027-08-15',
        origin_location: 'Mumbai, India',
        current_stage: 'Pharmacy',
        qr_code_id: 'QR-BAT-MED-008',
        quantity: 120, // units packed in the batch's box
        status: 'Delivered',
    },
    {
        batch_id: 'BAT-MED-009',
        product_id: 'PRD-007',
        production_date: '2026-01-20',
        expiry_date: '2029-01-20',
        origin_location: 'Pune, India',
        current_stage: 'Distributor',
        qr_code_id: 'QR-BAT-MED-009',
        quantity: 500, // units packed in the batch's box
        status: 'In Transit',
    },
    {
        batch_id: 'BAT-MED-010',
        product_id: 'PRD-008',
        production_date: '2025-11-01',
        expiry_date: '2027-11-01',
        origin_location: 'Hyderabad, India',
        current_stage: 'Pharmacy',
        qr_code_id: 'QR-BAT-MED-010',
        quantity: 600, // units packed in the batch's box
        status: 'Delivered',
    },
    {
        batch_id: 'BAT-MED-011',
        product_id: 'PRD-009',
        production_date: '2025-06-01',
        expiry_date: '2028-06-01',
        origin_location: 'Mumbai, India',
        current_stage: 'Pharmacy',
        qr_code_id: 'QR-BAT-MED-011',
        quantity: 250, // units packed in the batch's box
        status: 'Delivered',
    },
    {
        batch_id: 'BAT-MED-012',
        product_id: 'PRD-010',
        production_date: '2025-12-10',
        expiry_date: '2028-12-10',
        origin_location: 'Chennai, India',
        current_stage: 'Logistics',
        qr_code_id: 'QR-BAT-MED-012',
        quantity: 320, // units packed in the batch's box
        status: 'In Transit',
    },
    {
        batch_id: 'BAT-MED-013',
        product_id: 'PRD-011',
        production_date: '2025-10-20',
        expiry_date: '2027-10-20',
        origin_location: 'Hyderabad, India',
        current_stage: 'Distributor',
        qr_code_id: 'QR-BAT-MED-013',
        quantity: 200, // units packed in the batch's box
        status: 'In Transit',
    },
    {
        batch_id: 'BAT-MED-014',
        product_id: 'PRD-012',
        production_date: '2026-02-15',
        expiry_date: '2028-02-15',
        origin_location: 'Pune, India',
        current_stage: 'Manufacturer',
        qr_code_id: 'QR-BAT-MED-014',
        quantity: 100, // units packed in the batch's box
        status: 'Processing',
    },
    {
        batch_id: 'BAT-MED-015',
        product_id: 'PRD-012',
        production_date: '2026-01-25',
        expiry_date: '2028-01-25',
        origin_location: 'Pune, India',
        current_stage: 'Warehouse',
        qr_code_id: 'QR-BAT-MED-015',
        quantity: 80, // units packed in the batch's box
        status: 'In Transit',
    },
    {
        batch_id: 'BAT-MED-016',
        product_id: 'PRD-007',
        production_date: '2024-12-15',
        expiry_date: '2026-12-15',
        origin_location: 'Pune, India',
        current_stage: 'Pharmacy',
        qr_code_id: 'QR-BAT-MED-016',
        quantity: 150, // units packed in the batch's box
        status: 'Delivered',
    },
    // Fresh batches still at PharmaCure Labs: ready for the manufacturer to ship in a demo
    {
        batch_id: 'BAT-MED-017',
        product_id: 'PRD-001',
        production_date: '2026-09-20',
        expiry_date: '2029-09-20',
        origin_location: 'Mumbai, India',
        current_stage: 'Manufacturer',
        qr_code_id: 'QR-BAT-MED-017',
        quantity: 250, // units packed in the batch's box
        status: 'Processing',
    },
    {
        batch_id: 'BAT-MED-018',
        product_id: 'PRD-006',
        production_date: '2026-09-25',
        expiry_date: '2028-09-25',
        origin_location: 'Mumbai, India',
        current_stage: 'Manufacturer',
        qr_code_id: 'QR-BAT-MED-018',
        quantity: 120, // units packed in the batch's box
        status: 'Processing',
    },
    {
        batch_id: 'BAT-MED-SUS-001',
        product_id: 'PRD-006',
        production_date: '2025-08-15',
        expiry_date: '2027-08-15',
        origin_location: 'Unknown',
        current_stage: 'Flagged',
        qr_code_id: 'QR-BAT-MED-SUS-001',
        quantity: 100, // units packed in the batch's box
        status: 'Flagged',
    },
];
