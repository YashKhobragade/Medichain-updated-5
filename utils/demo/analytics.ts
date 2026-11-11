// ============================================================
// 7. ALERTS DATA — system alerts for the dashboard
// ============================================================

export const DEMO_ALERTS = [
    {
        alert_id: 'ALT-001',
        alert_type: 'Suspicious Transfer',
        description: 'Batch BAT-MED-SUS-001 transferred from unregistered origin to unknown vendor. Blockchain hash mismatch detected.',
        severity: 'Critical',
        timestamp: '2026-03-01T03:12:00Z',
    },
    {
        alert_id: 'ALT-002',
        alert_type: 'Duplicate QR Scan',
        description: 'QR code for Paracetamol 500mg (BAT-MED-001) scanned from unauthorized location Lucknow — possible counterfeit.',
        severity: 'High',
        timestamp: '2026-03-05T22:10:00Z',
    },
    {
        alert_id: 'ALT-003',
        alert_type: 'Missing Supply Chain Stage',
        description: 'Ciprofloxacin 500mg (BAT-MED-013) scanned by patient in Kolkata, but batch has not reached pharmacy stage.',
        severity: 'High',
        timestamp: '2026-03-08T20:15:00Z',
    },
    {
        alert_id: 'ALT-004',
        alert_type: 'Low Inventory Warning',
        description: 'Amoxicillin 500mg stock at MediPlus Pharmacy Chain dropped below 200 units. Replenishment recommended.',
        severity: 'Medium',
        timestamp: '2026-03-07T09:00:00Z',
    },
    {
        alert_id: 'ALT-005',
        alert_type: 'Temperature Excursion',
        description: 'InsulinPen FlexiDose (BAT-MED-007) cold chain temperature exceeded 8°C for 27 minutes during Delhi transit.',
        severity: 'High',
        timestamp: '2026-03-05T14:30:00Z',
    },
    {
        alert_id: 'ALT-006',
        alert_type: 'Counterfeit Alert',
        description: 'Azithromycin 500mg batch BAT-MED-SUS-001 flagged as counterfeit. QR code cloned from legitimate batch.',
        severity: 'Critical',
        timestamp: '2026-03-01T04:00:00Z',
    },
    {
        alert_id: 'ALT-007',
        alert_type: 'Delayed Shipment',
        description: 'Amoxicillin 250mg (BAT-MED-003) shipment delayed 48+ hours at Hyderabad warehouse. Clearance pending.',
        severity: 'Medium',
        timestamp: '2026-03-08T10:00:00Z',
    },
    {
        alert_id: 'ALT-008',
        alert_type: 'Low Inventory Warning',
        description: 'Cetirizine 10mg warehouse stock at MediStore Warehousing is at 15% capacity.',
        severity: 'Low',
        timestamp: '2026-03-06T11:30:00Z',
    },
    {
        alert_id: 'ALT-009',
        alert_type: 'Suspicious Transfer',
        description: 'Unusual transfer velocity detected: Vitamin D3 Drops batch moved through 3 checkpoints in under 2 hours.',
        severity: 'Medium',
        timestamp: '2026-03-08T07:45:00Z',
    },
    {
        alert_id: 'ALT-010',
        alert_type: 'Blockchain Sync Failure',
        description: 'Failed to record transfer TRF-020 on blockchain. Retry scheduled. Manual verification recommended.',
        severity: 'High',
        timestamp: '2026-03-05T10:15:00Z',
    },
];

// ============================================================
// 8. DASHBOARD KPI METRICS
// ============================================================

export const DEMO_KPI_METRICS = {
    totalProducts: 12,
    activeShipments: 10,
    verifiedProducts: 847,
    pendingTransfers: 6,
    counterfeitAlerts: 3,
    inventoryBatches: 16,
    totalTransfers: 25,
    totalCompanies: 18,
    avgTrustScore: 94.2,
    totalQrScans: 1_284,
};

// ============================================================
// 9. ANALYTICS DATA — chart-ready datasets
// ============================================================

/** Transfer volume per day (last 14 days) */
export const ANALYTICS_TRANSFER_VOLUME = [
    { date: '2026-02-24', volume: 8 },
    { date: '2026-02-25', volume: 12 },
    { date: '2026-02-26', volume: 15 },
    { date: '2026-02-27', volume: 10 },
    { date: '2026-02-28', volume: 18 },
    { date: '2026-03-01', volume: 22 },
    { date: '2026-03-02', volume: 14 },
    { date: '2026-03-03', volume: 19 },
    { date: '2026-03-04', volume: 25 },
    { date: '2026-03-05', volume: 30 },
    { date: '2026-03-06', volume: 17 },
    { date: '2026-03-07', volume: 21 },
    { date: '2026-03-08', volume: 28 },
    { date: '2026-03-09', volume: 11 },
];

/** Verification activity per day (last 14 days) */
export const ANALYTICS_VERIFICATION_ACTIVITY = [
    { date: '2026-02-24', scans: 42, valid: 40, suspicious: 2 },
    { date: '2026-02-25', scans: 55, valid: 53, suspicious: 2 },
    { date: '2026-02-26', scans: 38, valid: 37, suspicious: 1 },
    { date: '2026-02-27', scans: 61, valid: 58, suspicious: 3 },
    { date: '2026-02-28', scans: 74, valid: 71, suspicious: 3 },
    { date: '2026-03-01', scans: 89, valid: 84, suspicious: 5 },
    { date: '2026-03-02', scans: 52, valid: 51, suspicious: 1 },
    { date: '2026-03-03', scans: 66, valid: 64, suspicious: 2 },
    { date: '2026-03-04', scans: 78, valid: 75, suspicious: 3 },
    { date: '2026-03-05', scans: 93, valid: 88, suspicious: 5 },
    { date: '2026-03-06', scans: 71, valid: 69, suspicious: 2 },
    { date: '2026-03-07', scans: 84, valid: 81, suspicious: 3 },
    { date: '2026-03-08', scans: 102, valid: 97, suspicious: 5 },
    { date: '2026-03-09', scans: 45, valid: 43, suspicious: 2 },
];

/** Inventory distribution by category */
export const ANALYTICS_INVENTORY_BY_CATEGORY = [
    { category: 'Antibiotics', batches: 5, units: 30_000 },
    { category: 'Analgesics', batches: 3, units: 18_500 },
    { category: 'Antidiabetics', batches: 3, units: 12_000 },
    { category: 'Cardiovascular', batches: 2, units: 8_200 },
    { category: 'Supplements', batches: 3, units: 15_000 },
];

/** Counterfeit detection events (last 30 days) */
export const ANALYTICS_COUNTERFEIT_EVENTS = [
    { date: '2026-02-10', events: 1, category: 'Antibiotics' },
    { date: '2026-02-14', events: 0, category: null },
    { date: '2026-02-18', events: 2, category: 'Analgesics' },
    { date: '2026-02-22', events: 1, category: 'Antidiabetics' },
    { date: '2026-02-26', events: 0, category: null },
    { date: '2026-03-01', events: 3, category: 'Antibiotics' },
    { date: '2026-03-05', events: 2, category: 'Cardiovascular' },
    { date: '2026-03-08', events: 1, category: 'Supplements' },
];

/** Monthly transfer trend (last 6 months) */
export const ANALYTICS_MONTHLY_TRANSFERS = [
    { month: 'Oct 2025', transfers: 142, completed: 138, failed: 4 },
    { month: 'Nov 2025', transfers: 178, completed: 171, failed: 7 },
    { month: 'Dec 2025', transfers: 156, completed: 150, failed: 6 },
    { month: 'Jan 2026', transfers: 204, completed: 198, failed: 6 },
    { month: 'Feb 2026', transfers: 231, completed: 222, failed: 9 },
    { month: 'Mar 2026', transfers: 87, completed: 83, failed: 4 },
];

/** Top routes by volume */
export const ANALYTICS_TOP_ROUTES = [
    { route: 'Mumbai → Delhi', volume: 52, category: 'Analgesics' },
    { route: 'Hyderabad → Delhi', volume: 45, category: 'Antibiotics' },
    { route: 'Hyderabad → Mumbai', volume: 38, category: 'Antibiotics' },
    { route: 'Chennai → Bangalore', volume: 32, category: 'Cardiovascular' },
    { route: 'Basel → Delhi', volume: 28, category: 'Antidiabetics' },
    { route: 'Pune → Mumbai', volume: 24, category: 'Supplements' },
    { route: 'Mumbai → Bangalore', volume: 21, category: 'Analgesics' },
    { route: 'Delhi → Mumbai', volume: 31, category: 'Antibiotics' },
];
