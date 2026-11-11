const fs = require('fs');
const contractData = JSON.parse(fs.readFileSync('artifacts/contracts/MediChainSupplyChain.sol/ProductSupplyChain.json', 'utf8'));
const fileContent = `export const CONTRACT_ABI = ${JSON.stringify(contractData.abi, null, 4)} as const;\n`;
fs.writeFileSync('lib/contract-abi.ts', fileContent, 'utf8');
console.log('ABI successfully updated in lib/contract-abi.ts');
