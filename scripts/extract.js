const fs = require('fs');
const path = require('path');
const data = require('../utils/indian_medicines.json');
const manufacturers = data.sheet1.map(m => m['Company Name']);
const medicines = data.sheet2.map(m => ({
    manufacturer: m.Manufacturer,
    medicineName: m['Brand Name'],
    category: m['Therapy Area'],
    location: m['Manufacturer HQ'],
    salt: m['Salt / Generic Name'],
    form: m['Dosage Form']
}));
fs.writeFileSync(path.join(__dirname, '../utils/indianMedicinesData.ts'), 'export const MANUFACTURERS = ' + JSON.stringify(manufacturers, null, 2) + ';\n\nexport const MEDICINES = ' + JSON.stringify(medicines, null, 2) + ';');
console.log('Created utils/indianMedicinesData.ts successfully');
