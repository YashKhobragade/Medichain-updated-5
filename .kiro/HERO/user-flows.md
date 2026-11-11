# User Flows

## Flow 1: Manufacturer - Medicine Batch Creation

### Pre-conditions
- Manufacturer has authorized wallet address
- Smart contract has been deployed and manufacturer is registered
- Manufacturing process is complete and ready for packaging

### Step-by-Step Flow

1. **Access Dashboard**
   - Navigate to manufacturer dashboard
   - Connect Web3 wallet (MetaMask/WalletConnect)
   - System validates manufacturer authorization on-chain

2. **Initiate Batch Creation**
   - Click "Mint New Medicine Batch" 
   - Form loads with required fields

3. **Enter Medicine Details**
   - Input medicine name (e.g., "Paracetamol 500mg")
   - Enter manufacturer name (auto-populated from profile)
   - Set expiry date using date picker
   - Optionally enter custom Keplo tag or click "Generate"

4. **Generate Security Elements**
   - System generates unique QR code hash
   - Keplo tag generated (mock implementation for hackathon)
   - Preview QR code displayed

5. **Submit Transaction**
   - Review all details in confirmation modal
   - Click "Mint Medicine Batch"
   - Wallet prompts for transaction approval
   - User approves gas fee and transaction

6. **Transaction Processing**
   - Loading state with transaction hash
   - Smart contract mints new batch with unique ID
   - Event emitted: `MedicineMinted(batchId, name, manufacturer)`

7. **Success Confirmation**
   - Success message with batch ID
   - QR code available for download
   - Option to create another batch or view batch details

### Error Handling
- **Wallet not connected**: Prompt to connect wallet
- **Unauthorized address**: Display error and contact admin instructions
- **Transaction failed**: Show error message with retry option
- **Network issues**: Display network status and retry mechanism

---

## Flow 2: Distributor - Medicine Transfer

### Pre-conditions
- Distributor has authorized wallet address
- Medicine batch exists and is owned by current user or manufacturer
- Recipient address is known and valid

### Step-by-Step Flow

1. **Access Transfer Interface**
   - Navigate to distributor dashboard
   - Connect wallet and verify authorization

2. **Locate Batch for Transfer**
   - Enter batch ID in search field
   - System validates batch exists and user has transfer rights
   - Display current batch details and ownership

3. **Specify Transfer Details**
   - Enter recipient wallet address
   - Select transfer stage (Distributed/Sold to Pharmacy)
   - Input current location for audit trail
   - Validate recipient address format

4. **Review Transfer**
   - Confirmation modal shows:
     - Batch details
     - Current owner → New owner
     - Stage transition
     - Location update

5. **Execute Transfer**
   - Click "Transfer Medicine Batch"
   - Wallet prompts for transaction approval
   - User approves gas fee

6. **Transaction Processing**
   - Loading state with progress indicator
   - Smart contract updates ownership and stage
   - History entry added with timestamp and location
   - Event emitted: `MedicineTransferred(batchId, from, to, newStage)`

7. **Transfer Confirmation**
   - Success message with transaction hash
   - Updated batch status displayed
   - Option to transfer another batch

### Error Handling
- **Invalid batch ID**: "Batch not found" error
- **Unauthorized transfer**: "Not authorized to transfer this batch"
- **Invalid recipient**: Address format validation error
- **Batch already transferred**: Display current owner information

---

## Flow 3: Consumer - Medicine Verification

### Pre-conditions
- Consumer has medicine package with QR code
- No wallet connection required (read-only operations)
- Internet connection available

### Step-by-Step Flow

#### Option A: QR Code Scanning

1. **Access Verification Page**
   - Navigate to customer verification page
   - Choose "QR Scanner" tab

2. **Initiate Scanning**
   - Click "Use Camera" or "Upload Image"
   - Grant camera permissions if using live scan
   - Point camera at QR code or select image file

3. **QR Code Processing**
   - System extracts batch ID from QR code
   - Validates QR code format and integrity
   - Displays "QR Code Detected" with batch ID

4. **Automatic Verification**
   - Click "Verify Medicine" button
   - System queries smart contract with batch ID
   - No wallet connection required (read-only call)

#### Option B: Manual Batch ID Entry

1. **Access Manual Search**
   - Choose "Manual Search" tab
   - Enter batch ID from package

2. **Submit Verification Request**
   - Click search button
   - System validates batch ID format

### Common Verification Results Flow

5. **Display Verification Results**
   - **Medicine Details Section**:
     - Medicine name and manufacturer
     - Manufacturing and expiry dates
     - Current status (Valid/Expired/Inactive)
     - Visual status indicator (green/orange/red)

6. **Supply Chain History**
   - Chronological list of all transfers
   - Each entry shows:
     - Stage (Manufactured → Distributed → Sold)
     - Actor (wallet address, formatted)
     - Timestamp and location
     - Visual timeline with progress indicators

7. **Authenticity Assessment**
   - Clear "AUTHENTIC" or "SUSPICIOUS" status
   - Explanation of verification process
   - Recommendations for next steps

### Error Handling
- **Invalid QR code**: "QR code not recognized" with manual entry option
- **Batch not found**: "Medicine batch does not exist in system"
- **Camera access denied**: Fallback to image upload option
- **Network issues**: Retry mechanism with offline mode explanation

---

## Cross-Flow Integration Points

### Shared Components
- **Wallet Connection**: Consistent across manufacturer and distributor flows
- **Transaction Status**: Unified loading and success/error states
- **Batch Display**: Standardized medicine information presentation

### Data Flow Dependencies
1. Manufacturer minting creates batch → Enables distributor transfer
2. Distributor transfer updates ownership → Reflects in consumer verification
3. All transactions create history entries → Displayed in verification timeline

### User Experience Continuity
- Consistent visual design across all user types
- Shared terminology and status indicators
- Unified error messaging and help system

These flows were implemented with careful attention to error states and edge cases, ensuring robust user experience even when blockchain interactions fail or network connectivity is poor.