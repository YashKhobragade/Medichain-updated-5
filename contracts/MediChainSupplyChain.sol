// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ProductSupplyChain
 * @dev Tamper-proof medicine supply chain verification system
 * @notice This contract tracks medicine batches from manufacturer to pharmacy
 * 
 * KEY FEATURES:
 * - Role-based access control (RBAC)
 * - Immutable batch tracking
 * - Supply chain integrity verification
 * - Missing link detection
 * - Duplicate scan detection
 * - Event emissions for frontend tracking
 */
contract ProductSupplyChain {
    
    // ============ ENUMS ============
    
    /**
     * @dev Role definitions for access control
     * NONE: Default, no permissions
     * MANUFACTURER: Can create batches
     * DISTRIBUTOR: Can receive and forward batches
     * PHARMACY: Can receive batches (end of supply chain)
     * HOSPITAL: Read-only bulk verification
     * CUSTOMER: Read-only verification
     */
    enum Role {
        NONE,
        MANUFACTURER,
        DISTRIBUTOR,
        VENDOR,
        BULK_VERIFIER,
        CUSTOMER
    }
    
    /**
     * @dev Batch status tracking
     */
    enum BatchStatus {
        CREATED,        // Just created by manufacturer
        IN_TRANSIT,     // Being transferred
        DELIVERED,      // Reached vendor
        FLAGGED         // Suspicious activity detected
    }
    
    // ============ STRUCTS ============
    
    /**
     * @dev Main batch data structure
     */
    struct Batch {
        string batchId;              // Unique identifier (e.g., "MED-PCM-001")
        address manufacturer;        // Creator's wallet address
        address currentOwner;        // Current holder's wallet address
        BatchStatus status;          // Current status
        uint256 createdAt;           // Creation timestamp
        uint256 expiryDate;          // Product expiry timestamp
        bytes32 metadataHash;        // IPFS hash of product details
        address[] supplyChain;       // Array of all owners (history)
        bool exists;                 // Check if batch exists
    }
    
    /**
     * @dev Transfer record for history tracking
     */
    struct Transfer {
        address from;
        address to;
        uint256 timestamp;
        string location;             // Optional: GPS or facility name
    }
    
    // ============ STATE VARIABLES ============
    
    // Contract owner (admin)
    address public admin;
    
    // Mappings
    mapping(string => Batch) public batches;                           // batchId => Batch
    mapping(address => Role) public roles;                             // address => Role
    mapping(string => Transfer[]) public transferHistory;              // batchId => Transfer[]
    mapping(string => mapping(address => uint256)) public scanHistory; // batchId => address => scanCount
    
    // ============ EVENTS ============
    
    event BatchCreated(
        string indexed batchId,
        address indexed manufacturer,
        uint256 timestamp,
        uint256 expiryDate
    );
    
    event BatchTransferred(
        string indexed batchId,
        address indexed from,
        address indexed to,
        uint256 timestamp
    );
    
    event SuspiciousActivity(
        string indexed batchId,
        address indexed scanner,
        uint256 scanCount,
        string reason
    );
    
    event RoleAssigned(
        address indexed account,
        Role role
    );
    
    event BatchFlagged(
        string indexed batchId,
        string reason
    );
    
    // ============ MODIFIERS ============
    
    /**
     * @dev Restricts function to admin only
     */
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }
    
    /**
     * @dev Restricts function to specific role
     */
    modifier onlyRole(Role _role) {
        require(roles[msg.sender] == _role, "Unauthorized: Invalid role");
        _;
    }
    
    /**
     * @dev Restricts function to current owner of batch
     */
    modifier onlyCurrentOwner(string memory _batchId) {
        require(batches[_batchId].exists, "Batch does not exist");
        require(
            batches[_batchId].currentOwner == msg.sender,
            "Only current owner can perform this action"
        );
        _;
    }
    
    /**
     * @dev Checks if batch exists
     */
    modifier batchExists(string memory _batchId) {
        require(batches[_batchId].exists, "Batch does not exist");
        _;
    }
    
    // ============ CONSTRUCTOR ============
    
    constructor() {
        // The deployer is the admin (the regulator). It gets no supply-chain role:
        // companies, including manufacturers, are approved by the admin.
        admin = msg.sender;
    }
    
    // ============ ADMIN FUNCTIONS ============
    
    /**
     * @dev Assign role to an address
     * @param _account Address to assign role to
     * @param _role Role to assign
     */
    function assignRole(address _account, Role _role) external onlyAdmin {
        require(_account != address(0), "Invalid address");
        roles[_account] = _role;
        emit RoleAssigned(_account, _role);
    }
    
    /**
     * @dev Batch assign roles (for testing/demo)
     * @param _accounts Array of addresses
     * @param _roles Array of roles
     */
    function batchAssignRoles(
        address[] memory _accounts,
        Role[] memory _roles
    ) external onlyAdmin {
        require(_accounts.length == _roles.length, "Arrays length mismatch");
        for (uint256 i = 0; i < _accounts.length; i++) {
            roles[_accounts[i]] = _roles[i];
            emit RoleAssigned(_accounts[i], _roles[i]);
        }
    }
    
    // ============ MANUFACTURER FUNCTIONS ============
    
    /**
     * @dev Create a new product batch
     * @param _batchId Unique batch identifier
     * @param _expiryDate Expiry timestamp
     * @param _metadataHash IPFS hash of product details
     */
    function createBatch(
        string memory _batchId,
        uint256 _expiryDate,
        bytes32 _metadataHash
    ) external onlyRole(Role.MANUFACTURER) {
        require(!batches[_batchId].exists, "Batch already exists");
        require(_expiryDate > block.timestamp, "Expiry date must be in future");
        require(bytes(_batchId).length > 0, "Batch ID cannot be empty");
        
        // Initialize supply chain with manufacturer
        address[] memory initialChain = new address[](1);
        initialChain[0] = msg.sender;
        
        // Create batch
        batches[_batchId] = Batch({
            batchId: _batchId,
            manufacturer: msg.sender,
            currentOwner: msg.sender,
            status: BatchStatus.CREATED,
            createdAt: block.timestamp,
            expiryDate: _expiryDate,
            metadataHash: _metadataHash,
            supplyChain: initialChain,
            exists: true
        });
        
        emit BatchCreated(_batchId, msg.sender, block.timestamp, _expiryDate);
    }
    
    // ============ TRANSFER FUNCTIONS ============
    
    /**
     * @dev Transfer batch to next actor in supply chain
     * @param _batchId Batch to transfer
     * @param _to Recipient address
     * @param _location Optional location info
     */
    function transferBatch(
        string memory _batchId,
        address _to,
        string memory _location
    ) external onlyCurrentOwner(_batchId) {
        require(_to != address(0), "Invalid recipient address");
        require(_to != msg.sender, "Cannot transfer to yourself");
        require(roles[_to] != Role.NONE, "Recipient has no role assigned");
        require(
            roles[_to] == Role.DISTRIBUTOR || 
            roles[_to] == Role.VENDOR,
            "Recipient must be distributor or vendor"
        );
        
        Batch storage batch = batches[_batchId];
        
        // Check if batch is expired
        if (block.timestamp > batch.expiryDate) {
            batch.status = BatchStatus.FLAGGED;
            emit BatchFlagged(_batchId, "Batch expired");
            revert("Cannot transfer expired batch");
        }
        
        // Update batch
        batch.currentOwner = _to;
        batch.status = BatchStatus.IN_TRANSIT;
        batch.supplyChain.push(_to);
        
        // If transferred to vendor, mark as delivered
        if (roles[_to] == Role.VENDOR) {
            batch.status = BatchStatus.DELIVERED;
        }
        
        // Record transfer
        transferHistory[_batchId].push(Transfer({
            from: msg.sender,
            to: _to,
            timestamp: block.timestamp,
            location: _location
        }));
        
        emit BatchTransferred(_batchId, msg.sender, _to, block.timestamp);
    }
    
    // ============ VERIFICATION FUNCTIONS ============
    
    /**
     * @dev Verify supply chain integrity
     * @param _batchId Batch to verify
     * @return isValid Whether chain is valid
     * @return reason Reason if invalid
     */
    function verifyChainIntegrity(string memory _batchId)
        public
        view
        batchExists(_batchId)
        returns (bool isValid, string memory reason)
    {
        Batch memory batch = batches[_batchId];
        
        // Check if batch is flagged
        if (batch.status == BatchStatus.FLAGGED) {
            return (false, "Batch is flagged as suspicious");
        }
        
        // Check if expired
        if (block.timestamp > batch.expiryDate) {
            return (false, "Batch has expired");
        }
        
        // Check supply chain length
        if (batch.supplyChain.length < 1) {
            return (false, "Invalid supply chain");
        }
        
        // Check if manufacturer is first in chain
        if (batch.supplyChain[0] != batch.manufacturer) {
            return (false, "Manufacturer mismatch in supply chain");
        }
        
        // Verify each actor has valid role
        for (uint256 i = 0; i < batch.supplyChain.length; i++) {
            if (roles[batch.supplyChain[i]] == Role.NONE) {
                return (false, "Invalid actor in supply chain");
            }
        }
        
        // Check for proper supply chain order
        // Expected: Manufacturer -> (Distributor) -> Vendor
        if (batch.supplyChain.length > 1) {
            // If there's more than manufacturer, check roles
            for (uint256 i = 1; i < batch.supplyChain.length; i++) {
                Role currentRole = roles[batch.supplyChain[i]];
                if (currentRole != Role.DISTRIBUTOR && currentRole != Role.VENDOR) {
                    return (false, "Invalid role in supply chain");
                }
            }
        }
        
        return (true, "Batch is genuine");
    }
    
    /**
     * @dev Record a QR code scan
     * @param _batchId Batch being scanned
     */
    function recordScan(string memory _batchId) external batchExists(_batchId) {
        scanHistory[_batchId][msg.sender]++;
        uint256 scanCount = scanHistory[_batchId][msg.sender];
        
        // Flag if same address scans multiple times (potential counterfeit)
        if (scanCount > 3) {
            batches[_batchId].status = BatchStatus.FLAGGED;
            emit SuspiciousActivity(
                _batchId,
                msg.sender,
                scanCount,
                "Multiple scans from same address"
            );
            emit BatchFlagged(_batchId, "Multiple scans detected");
        }
    }
    
    /**
     * @dev Get complete batch information
     * @param _batchId Batch to query
     */
    function getBatch(string memory _batchId)
        external
        view
        batchExists(_batchId)
        returns (
            string memory batchId,
            address manufacturer,
            address currentOwner,
            BatchStatus status,
            uint256 createdAt,
            uint256 expiryDate,
            bytes32 metadataHash,
            address[] memory supplyChain
        )
    {
        Batch memory batch = batches[_batchId];
        return (
            batch.batchId,
            batch.manufacturer,
            batch.currentOwner,
            batch.status,
            batch.createdAt,
            batch.expiryDate,
            batch.metadataHash,
            batch.supplyChain
        );
    }
    
    /**
     * @dev Get transfer history for a batch
     * @param _batchId Batch to query
     */
    function getTransferHistory(string memory _batchId)
        external
        view
        batchExists(_batchId)
        returns (Transfer[] memory)
    {
        return transferHistory[_batchId];
    }
    
    /**
     * @dev Get scan count for an address
     * @param _batchId Batch to query
     * @param _scanner Address to check
     */
    function getScanCount(string memory _batchId, address _scanner)
        external
        view
        batchExists(_batchId)
        returns (uint256)
    {
        return scanHistory[_batchId][_scanner];
    }
    
    /**
     * @dev Get role of an address
     * @param _account Address to check
     */
    function getRole(address _account) external view returns (Role) {
        return roles[_account];
    }
}
