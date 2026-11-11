const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ProductSupplyChain", function () {
    let contract;
    let owner, manufacturer, distributor, vendor, hospital, customer;

    beforeEach(async function () {
        // Get signers
        [owner, manufacturer, distributor, vendor, hospital, customer] = await ethers.getSigners();

        // Deploy contract
        const ProductSupplyChain = await ethers.getContractFactory("ProductSupplyChain");
        contract = await ProductSupplyChain.deploy();
        await contract.waitForDeployment();

        // Assign roles
        await contract.assignRole(manufacturer.address, 1); // MANUFACTURER
        await contract.assignRole(distributor.address, 2);  // DISTRIBUTOR
        await contract.assignRole(vendor.address, 3);     // PHARMACY
        await contract.assignRole(hospital.address, 4);     // HOSPITAL
        await contract.assignRole(customer.address, 5);     // CUSTOMER
    });

    describe("Role Management", function () {
        it("Should assign roles correctly", async function () {
            expect(await contract.getRole(manufacturer.address)).to.equal(1);
            expect(await contract.getRole(distributor.address)).to.equal(2);
            expect(await contract.getRole(vendor.address)).to.equal(3);
        });

        it("Should only allow admin to assign roles", async function () {
            await expect(
                contract.connect(customer).assignRole(customer.address, 1)
            ).to.be.revertedWith("Only admin can perform this action");
        });
    });

    describe("Batch Creation", function () {
        it("Should allow manufacturer to create batch", async function () {
            const batchId = "VRD-2024-001";
            const expiryDate = Math.floor(Date.now() / 1000) + 86400 * 365; // 1 year
            const metadataHash = ethers.id("metadata");

            await expect(
                contract.connect(manufacturer).createBatch(batchId, expiryDate, metadataHash)
            ).to.emit(contract, "BatchCreated");

            const batch = await contract.getBatch(batchId);
            expect(batch.batchId).to.equal(batchId);
            expect(batch.manufacturer).to.equal(manufacturer.address);
        });

        it("Should not allow non-manufacturer to create batch", async function () {
            const batchId = "VRD-2024-002";
            const expiryDate = Math.floor(Date.now() / 1000) + 86400 * 365;
            const metadataHash = ethers.id("metadata");

            await expect(
                contract.connect(distributor).createBatch(batchId, expiryDate, metadataHash)
            ).to.be.revertedWith("Unauthorized: Invalid role");
        });

        it("Should not allow duplicate batch IDs", async function () {
            const batchId = "VRD-2024-003";
            const expiryDate = Math.floor(Date.now() / 1000) + 86400 * 365;
            const metadataHash = ethers.id("metadata");

            await contract.connect(manufacturer).createBatch(batchId, expiryDate, metadataHash);

            await expect(
                contract.connect(manufacturer).createBatch(batchId, expiryDate, metadataHash)
            ).to.be.revertedWith("Batch already exists");
        });

        it("Should not allow expired date", async function () {
            const batchId = "VRD-2024-004";
            const expiryDate = Math.floor(Date.now() / 1000) - 86400; // Yesterday
            const metadataHash = ethers.id("metadata");

            await expect(
                contract.connect(manufacturer).createBatch(batchId, expiryDate, metadataHash)
            ).to.be.revertedWith("Expiry date must be in future");
        });
    });

    describe("Batch Transfer", function () {
        let batchId;
        let expiryDate;

        beforeEach(async function () {
            batchId = "VRD-2024-100";
            expiryDate = Math.floor(Date.now() / 1000) + 86400 * 365;
            const metadataHash = ethers.id("metadata");

            await contract.connect(manufacturer).createBatch(batchId, expiryDate, metadataHash);
        });

        it("Should allow current owner to transfer batch", async function () {
            await expect(
                contract.connect(manufacturer).transferBatch(batchId, distributor.address, "Warehouse A")
            ).to.emit(contract, "BatchTransferred");

            const batch = await contract.getBatch(batchId);
            expect(batch.currentOwner).to.equal(distributor.address);
        });

        it("Should not allow non-owner to transfer batch", async function () {
            await expect(
                contract.connect(distributor).transferBatch(batchId, vendor.address, "Vendor A")
            ).to.be.revertedWith("Only current owner can perform this action");
        });

        it("Should update supply chain on transfer", async function () {
            await contract.connect(manufacturer).transferBatch(batchId, distributor.address, "Warehouse A");

            const batch = await contract.getBatch(batchId);
            expect(batch.supplyChain.length).to.equal(2);
            expect(batch.supplyChain[1]).to.equal(distributor.address);
        });

        it("Should mark as delivered when transferred to vendor", async function () {
            await contract.connect(manufacturer).transferBatch(batchId, distributor.address, "Warehouse A");
            await contract.connect(distributor).transferBatch(batchId, vendor.address, "Vendor A");

            const batch = await contract.getBatch(batchId);
            expect(batch.status).to.equal(2); // DELIVERED
        });

        it("Should not allow transfer to invalid role", async function () {
            await expect(
                contract.connect(manufacturer).transferBatch(batchId, customer.address, "Customer")
            ).to.be.revertedWith("Recipient must be distributor or vendor");
        });
    });

    describe("Chain Integrity Verification", function () {
        let batchId;

        beforeEach(async function () {
            batchId = "VRD-2024-200";
            const expiryDate = Math.floor(Date.now() / 1000) + 86400 * 365;
            const metadataHash = ethers.id("metadata");

            await contract.connect(manufacturer).createBatch(batchId, expiryDate, metadataHash);
        });

        it("Should verify valid chain", async function () {
            const [isValid, reason] = await contract.verifyChainIntegrity(batchId);
            expect(isValid).to.be.true;
            expect(reason).to.equal("Batch is genuine");
        });

        it("Should detect expired batch", async function () {
            const expiredBatchId = "VRD-2024-201";
            // Create batch with expiry 100 seconds from now
            const expiryDate = Math.floor(Date.now() / 1000) + 100;
            const metadataHash = ethers.id("metadata");

            await contract.connect(manufacturer).createBatch(expiredBatchId, expiryDate, metadataHash);

            // Advance blockchain time by 200 seconds to make batch expired
            await ethers.provider.send("evm_increaseTime", [200]);
            await ethers.provider.send("evm_mine");

            const [isValid, reason] = await contract.verifyChainIntegrity(expiredBatchId);
            expect(isValid).to.be.false;
            expect(reason).to.equal("Batch has expired");
        });
    });

    describe("Scan Detection", function () {
        let batchId;

        beforeEach(async function () {
            batchId = "VRD-2024-300";
            const expiryDate = Math.floor(Date.now() / 1000) + 86400 * 365;
            const metadataHash = ethers.id("metadata");

            await contract.connect(manufacturer).createBatch(batchId, expiryDate, metadataHash);
        });

        it("Should record scan", async function () {
            await contract.connect(customer).recordScan(batchId);

            const scanCount = await contract.getScanCount(batchId, customer.address);
            expect(scanCount).to.equal(1);
        });

        it("Should detect multiple scans", async function () {
            // Scan 4 times to trigger suspicious activity
            for (let i = 0; i < 4; i++) {
                await contract.connect(customer).recordScan(batchId);
            }

            const scanCount = await contract.getScanCount(batchId, customer.address);
            expect(scanCount).to.equal(4);

            const batch = await contract.getBatch(batchId);
            expect(batch.status).to.equal(3); // FLAGGED
        });
    });

    describe("Transfer History", function () {
        it("Should track complete transfer history", async function () {
            const batchId = "VRD-2024-400";
            const expiryDate = Math.floor(Date.now() / 1000) + 86400 * 365;
            const metadataHash = ethers.id("metadata");

            await contract.connect(manufacturer).createBatch(batchId, expiryDate, metadataHash);
            await contract.connect(manufacturer).transferBatch(batchId, distributor.address, "Warehouse A");
            await contract.connect(distributor).transferBatch(batchId, vendor.address, "Vendor A");

            const history = await contract.getTransferHistory(batchId);
            expect(history.length).to.equal(2);
            expect(history[0].from).to.equal(manufacturer.address);
            expect(history[0].to).to.equal(distributor.address);
            expect(history[1].from).to.equal(distributor.address);
            expect(history[1].to).to.equal(vendor.address);
        });
    });
});
