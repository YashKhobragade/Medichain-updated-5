// Gives each organisation's wallet its role on the deployed contract.
//   1. Fill in public/wallets.json with your MetaMask addresses
//   2. npm run chain:roles:sepolia
// Must be run with the same wallet that deployed the contract (it is the admin).
const hre = require("hardhat");
const fs = require("fs");

const ROLE = { manufacturer: 1, distributor: 2, pharmacy: 3, hospital: 3 }; // contract: VENDOR = 3
const NAMES = ["NONE", "MANUFACTURER", "DISTRIBUTOR", "VENDOR", "BULK_VERIFIER", "CUSTOMER"];

async function main() {
    const dep = JSON.parse(fs.readFileSync("./public/contract-address.json", "utf8"));
    if (dep.network !== hre.network.name) {
        throw new Error(`The contract in public/contract-address.json was deployed to "${dep.network}", but you are running on "${hre.network.name}". Deploy first: npm run chain:deploy:sepolia`);
    }
    const wallets = JSON.parse(fs.readFileSync("./public/wallets.json", "utf8")).parties;
    const contract = await hre.ethers.getContractAt("ProductSupplyChain", dep.address);
    const [admin] = await hre.ethers.getSigners();
    if ((await contract.admin()).toLowerCase() !== admin.address.toLowerCase()) {
        throw new Error(`Only the wallet that deployed the contract can assign roles. PRIVATE_KEY in .env.local belongs to ${admin.address}.`);
    }

    let changed = 0;
    for (const [org, { role, address }] of Object.entries(wallets)) {
        if (!address) { console.log(`- ${org}: no address in wallets.json, skipped`); continue; }
        if (!hre.ethers.isAddress(address)) { console.log(`✗ ${org}: "${address}" is not a valid address`); continue; }
        const want = ROLE[role];
        if (!want) { console.log(`✗ ${org}: unknown role "${role}"`); continue; }
        const have = Number(await contract.getRole(address));
        if (have === want) { console.log(`✓ ${org}: already ${NAMES[want]}`); continue; }
        const tx = await contract.assignRole(address, want);
        await tx.wait();
        changed++;
        console.log(`✓ ${org}: ${address} → ${NAMES[want]}  (tx ${tx.hash})`);
    }
    console.log(changed ? `\nDone: ${changed} role(s) assigned.` : "\nNothing to change.");
}

main().then(() => process.exit(0)).catch(e => { console.error("\n" + (e.shortMessage || e.message)); process.exit(1); });
