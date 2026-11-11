# System Architecture

## High-Level Architecture Overview

The Medicine Supply Chain DApp follows a decentralized architecture with three primary layers: Blockchain (data & logic), Frontend (user interface), and Integration (external services). This design ensures data immutability while maintaining user experience standards.

## Smart Contract Architecture

### Core Contract: SupplyChain.sol

**Design Principles Applied:**
- **Single Responsibility**: One contract handles entire medicine lifecycle
- **Role-Based Access Control**: On-chain authorization for different actors
- **Event-Driven**: Comprehensive event emission for off-chain indexing
- **Gas Optimization**: Efficient data structures and minimal storage

**Key Data Structures:**
```solidity
struct Medicine {
    uint256 batchId;           // Unique identifier
    string name;               // Medicine name
    string manufacturer;       // Manufacturer name
    uint256 manufactureDate;   // Block timestamp
    uint256 expiryDate;        // Expiry timestamp
    address currentOwner;      // Current owner address
    Stage currentStage;        // Current supply chain stage
    string qrCodeHash;         // QR code hash for verification
    string keploTag;           // Hardware tag identifier
    bool isActive;             // Active status flag
}

struct StageHistory {
    Stage stage;               // Supply chain stage
    address actor;             // Actor performing action
    uint256 timestamp;         // Block timestamp
    string location;           // Physical location
}
```

**Access Control Model:**
- **Owner**: Contract deployer, manages authorizations
- **Manufacturers**: Can mint new medicine batches
- **Distributors**: Can transfer batches between parties
- **Pharmacies**: Can receive and mark as sold
- **Public**: Can verify medicine authenticity (read-only)

## Frontend Architecture

### Technology Stack Rationale

**Next.js 14 with App Router:**
- **Server Components**: Improved performance for static content
- **Client Components**: Interactive Web3 functionality
- **File-based Routing**: Intuitive URL structure (/manufacturer, /distributor, /customer)
- **Built-in Optimization**: Image optimization, code splitting, SEO

**Web3 Integration Stack:**
- **RainbowKit**: Best-in-class wallet connection UX
- **Wagmi**: React hooks for Ethereum interactions
- **Viem**: TypeScript-first Ethereum library
- **Ethers.js**: Contract interaction and transaction handling

### Component Architecture

**Shared Components:**
- `QRCodeGenerator`: Generates downloadable QR codes
- `QRScanner`: Camera and image-based QR scanning
- `TransactionStatus`: Unified transaction state management

**Role-Specific Components:**
- `MintMedicineForm`: Manufacturer batch creation
- `TransferMedicineForm`: Distributor batch transfer
- `VerifyMedicineForm`: Consumer verification interface

**State Management Strategy:**
- **Local State**: React useState for form data and UI state
- **Web3 State**: Wagmi hooks for blockchain state
- **Global State**: React Context for user authentication
- **Server State**: Next.js server components for static data

## Data Flow Architecture

### Write Operations (State Changes)

1. **User Interaction** → Form submission with validation
2. **Web3 Transaction** → Wallet approval and gas estimation
3. **Smart Contract** → On-chain state update and event emission
4. **UI Update** → Transaction confirmation and state refresh

### Read Operations (Verification)

1. **User Input** → Batch ID or QR code scan
2. **Contract Query** → Direct smart contract read (no gas cost)
3. **Data Processing** → Format timestamps, addresses, and status
4. **UI Rendering** → Display verification results and history

## Integration Layer Design

### QR Code System

**Architecture Decision**: Hybrid on-chain/off-chain approach
- **On-chain**: QR code hash for integrity verification
- **Off-chain**: Full QR code data for rich metadata
- **Security**: Cryptographic linking between physical and digital

**Implementation:**
```typescript
interface QRData {
  batchId: string;      // Links to blockchain record
  name: string;         // Medicine name for quick identification
  manufacturer: string; // Manufacturer for trust verification
  timestamp: number;    // Generation timestamp
}
```

### Keplo Hardware Integration

**Current Implementation**: Mock API for hackathon demonstration
**Production Design**: RESTful API integration with secure authentication

```typescript
interface KeploTag {
  id: string;           // Unique hardware tag identifier
  timestamp: number;    // Tag creation timestamp
  signature: string;    // Cryptographic signature
  deviceId: string;     // Physical device identifier
}
```

## Security Architecture

### Smart Contract Security

**Access Control Patterns:**
- Modifier-based authorization checks
- Role-based function restrictions
- Owner-only administrative functions

**Data Integrity:**
- Immutable batch creation timestamps
- Append-only history tracking
- Event-based audit trails

**Gas Optimization:**
- Efficient data packing in structs
- Minimal storage operations
- Batch operations where possible

### Frontend Security

**Web3 Security:**
- Transaction simulation before execution
- Gas limit estimation and validation
- User confirmation for all state changes

**Data Validation:**
- Client-side input validation
- Server-side validation in API routes
- Type safety with TypeScript

## Scalability Considerations

### Current Limitations (Hackathon Scope)
- Single smart contract deployment
- No off-chain indexing
- Limited batch operations
- Basic error handling

### Production Scalability Plan
- **Layer 2 Deployment**: Polygon for reduced gas costs
- **Event Indexing**: The Graph Protocol for efficient queries
- **IPFS Integration**: Decentralized metadata storage
- **Microservice Architecture**: Separate services for different integrations

## Deployment Architecture

### Development Environment
- **Local Blockchain**: Hardhat network for development
- **Frontend**: Next.js development server
- **Testing**: Hardhat test suite with Chai assertions

### Production Deployment
- **Smart Contract**: Polygon mainnet deployment
- **Frontend**: Vercel deployment with environment variables
- **Monitoring**: Blockchain event monitoring and alerting

## Architecture Trade-offs Made

### Centralization vs. Decentralization
**Decision**: Hybrid approach with on-chain core logic, off-chain UI
**Trade-off**: Some centralization in frontend hosting vs. pure decentralization
**Rationale**: Better user experience while maintaining core security guarantees

### Gas Costs vs. Functionality
**Decision**: Store essential data on-chain, metadata off-chain
**Trade-off**: Some features require off-chain components
**Rationale**: Balance between decentralization and cost efficiency

### Complexity vs. Time Constraints
**Decision**: Single contract with multiple roles vs. contract factory pattern
**Trade-off**: Less modularity but faster development
**Rationale**: Hackathon time constraints required focused scope

This architecture successfully balances decentralization, user experience, and development velocity within hackathon constraints while maintaining a clear path for production scaling.
