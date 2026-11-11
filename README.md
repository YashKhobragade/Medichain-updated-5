# 💊 MediChain - Medicine Supply Chain Platform

> **Status:** ✅ Production Ready  
> **Tagline:** Secure Every Medicine. Protect Every Patient.  
> **Tech Stack:** Next.js 14, TypeScript, Ethereum (Sepolia), Python + OpenCV (ML)

> 📘 **New here? Read [GUIDE.md](GUIDE.md)**: how to run it, how it works, putting it on Sepolia, a 5-minute demo script and viva questions.

A production-grade, tamper-proof medicine supply chain tracking and verification platform powered by blockchain technology. MediChain tracks pharmaceutical products from manufacturer to pharmacy, featuring advanced anti-counterfeit detection, trust scoring, and real-time analytics.

## 🎯 Key Features

✅ **Medicine Supply Chain Tracking** - End-to-end tracking of pharmaceutical products  
✅ **Missing Link Detection** - Automatically identifies skipped supply chain steps  
✅ **Trust Score Engine** - 0-100 scoring algorithm for medicine batch authenticity  
✅ **Bulk Verification** - CSV upload for verifying hundreds of medicine batches at once  
✅ **Analytics Dashboard** - Real-time metrics and manufacturer rankings  
✅ **Dark Theme** - Modern, premium UI across all pages  
✅ **Dynamic QR Codes** - Scan tracking with duplicate detection  
✅ **PostgreSQL Database** - Self-hosted with connection pooling and JWT auth  
✅ **Blockchain Verification** - Immutable history of medicine origin and ownership transfers

## 🚚 Transfers between organisations (`/distributor`)
Log in as an organisation (one-click demo accounts on the login page, password `demo123`):
- **Incoming:** *Confirm received* for batches shipped to you.
- **Batches you can ship:** *Send* to the next registered organisation, or **ship by batch ID**.
- **History:** every hand-off with its ledger hash and, when written on-chain, an **Etherscan** link.

Every shipment is an entry in a **SHA-256 hash-linked ledger** (`data/ledger.json`); editing any past entry is detected and the affected batches become *suspicious*. The server enforces the rules: only the **current holder** can ship, recipients must be registered, a batch in transit must be received first, and counterfeit or expired batches can't move. The verify page shows the real journey from these records, and flags a **missing distributor**.

**On Ethereum Sepolia (optional):** when MetaMask is connected to the network the contract is deployed on, creating a batch and each shipment are **also** written to the smart contract and linked on Etherscan. Without it, everything still works on the ledger alone. Setup: [GUIDE.md → Part 3](GUIDE.md#part-3--put-it-on-the-sepolia-blockchain-optional-free) (`npm run chain:deploy:sepolia`, then `npm run chain:roles:sepolia`).

## 📷 QR codes & inventory scan

### One batch = one box = one QR
When a manufacturer creates a batch they enter the **quantity inside the box**. MediChain then gives them **one QR code** for that batch (download or print it). The QR holds just a short link:

```
https://<your-app>/verify/BAT-MED-001
```

Anyone can scan it with a phone camera to check the medicine. Short links make simple QR codes that the inventory camera can read from further away. Older long-format MediChain QR codes still scan.

### Inventory scan (`/inventory`), uses machine learning
Point a camera at a shelf or a delivery, either **live** or from a photo. MediChain:

1. **reads the QR on every box** with a machine-learning model,
2. **checks each batch on the blockchain** (genuine, expired, counterfeit, gap in custody, not on the ledger),
3. **shows what's inside each box** and the total units on the shelf, from the blockchain record,
4. **catches copied labels**: each batch has only one real box, so **the same QR on two boxes means one is a copy**.

**Live camera.** Press *Start camera* and move slowly along the shelf. Boxes are added to the tally as their QR is read, and each box is counted once however many times the camera sees it. Press *Finish* for the full results. **Upload photo** does the same from a single picture; two sample photos are included (`public/samples/`).

**Export** produces a CSV that Bulk Verify accepts as-is.

**The ML model.** `ml-service/` is a small Python service using OpenCV's **WeChat QR** engine, which has two trained neural networks (in `ml-service/models/`):
- a **detector** CNN that finds where QR codes are in the picture,
- a **super-resolution** CNN that enlarges small or blurry codes so they can be read.

Photos are also scanned in overlapping tiles so small, distant labels are found. Live frames use a faster mode (frames capped at 1920 px, 2×2 tiles), giving roughly 1–3 scans a second.

**Results on the bundled samples:**
- The shelf photo: all 15 boxes read (14 batches, one copied QR, 3,420 units).
- The delivery photo: 8 of 8.
- A simulated live sweep of the shelf: all 14 batches, the copy and the same 3,420 units.

### Scanning with a phone
Browsers only allow the camera on **`localhost`** or **HTTPS**.

- **Laptop webcam:** open `http://localhost:3000/inventory`. Nothing else needed.
- **Phone:** the phone needs an HTTPS address for your laptop. The most reliable way is a free tunnel, while `npm run dev` and the scanner are running:
  ```bash
  npx cloudflared tunnel --url http://localhost:3000     # or: ngrok http 3000
  ```
  Open the `https://…` address it prints on your phone and go to *Inventory Scan*.
- **Alternative:** `npm run dev:https` serves the app over HTTPS on your network using a self-signed certificate. Some phones refuse the camera on self-signed certificates; if yours does, use the tunnel.

**Tips:** hold the phone 0.5–1 m from the labels, move slowly, and avoid glare on glossy labels.

### Stock levels & alerts (Inventory → Stock)
Every finished live scan (or a photo scan you choose to save) becomes the **current stock count**; each new scan replaces it. Alerts use the **two-bin rule**, counted in **boxes** because that's what the camera can see:

- **2 or more boxes** of a medicine → ✅ OK
- **only 1 box left** → ⚠️ *Low: reorder*
- **0 boxes** → 🔴 *Out of stock*

The minimum (default 2) can be changed per medicine. Only **genuine** boxes count; counterfeit, expired, unknown, suspicious and copied boxes are listed separately as *Not usable*. Units per box (from the blockchain) are shown for information.

**Box finished:** when a box is used up, tap *Box finished* and the alert updates straight away; the next scan confirms it. Alerts also appear as a badge on the menu and a card on the dashboard. Medicines not seen in a scan count as zero, so scan every shelf.

**Where it's stored.** Stock levels live in the browser's local storage (`lib/stockStore.ts`). Authenticity always comes from the blockchain on every scan; stock counts are the pharmacy's own records. It needs no database, but it's per device, so use Export/Import to move it. To use PostgreSQL instead, only `read()`/`write()` in that file change.

**Batches created without a database** are saved to `data/batches.json`, so they survive restarts locally.

## ☁️ Deploying (optional)

Local is the main way to run MediChain. If you need it online:

1. **Scanner → Render** (or Railway / Hugging Face Spaces). Create a new *Web Service* from this repo with **root directory `ml-service`**; it builds from `ml-service/Dockerfile`. Note the URL it gives you.
2. **Website → Vercel.** Import the repo and add the environment variable `ML_SERVICE_URL = <scanner URL>`. Deploy.
3. **Optional database.** Without one, batches *created on the website* don't persist (hosted servers can't write `data/batches.json`); the built-in demo batches always work. For persistence, create a free PostgreSQL (Neon / Supabase), run `config/schema.sql`, and add `DATABASE_URL` on Vercel.

**Before a demo:** free scanner hosting sleeps when idle, so open the Inventory page a minute early. The first scan can take 30–60 s while it wakes up. The deployed site is HTTPS, so phone cameras work directly. Stock data on the deployed site starts empty; use *Import backup*.

## 🏥 Bulk verification (`/bulk-verify`)
Upload CSV / TSV / Excel or paste batch IDs, then confirm the detected columns, review the results, and export a CSV or open a printable compliance report. Rows are **batch IDs** (with optional medicine name, expiry and number of boxes). Including the name and expiry printed on the pack also catches relabelled stock.

### One set of verification rules
`lib/verification.ts` is used by QR scans, bulk uploads and the inventory scan, so a batch always gets the same verdict:

1. Registered on the ledger
2. Licensed, registered manufacturer and not flagged
3. **Unbroken custody**: every hand-off starts where the last one ended, with no unregistered parties. A gap here is the main red flag.
4. Route: going straight from manufacturer to pharmacy without a distributor is allowed but noted
5. In date (warning within 90 days)
6. Pack details match the ledger (when supplied)

Verdicts: **Genuine · Suspicious · Expired · Counterfeit · Not on ledger**.

## 🚀 Quick Start

> **Run everything locally with one command:**
>
> ```bash
> npm install                                   # once
> python -m pip install -r ml-service/requirements.txt   # once (Python 3.9+)
> npm run demo                                  # starts the ML scanner and the website
> ```
>
> Open **http://localhost:3000**. `npm run demo` checks Python and the scanner packages and says exactly what is missing. Everything except the inventory scan also works with plain `npm run dev`.

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+ (local installation)
- MetaMask browser extension (optional, for blockchain interactions)
- Git

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd New

# Install dependencies
npm install

# Compile smart contract
npx hardhat compile

# Set up environment variables
cp .env.example .env.local
```

### Environment Setup

1. **Create `.env.local`** file (copy from `.env.example`):
```env
# PostgreSQL Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=medichain
DB_USER=postgres
DB_PASSWORD=postgres

# JWT Secret
JWT_SECRET=your-secret-key-change-in-production

# Blockchain
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/abc...
PRIVATE_KEY=your_private_key
```

2. **Set up PostgreSQL Database:**
   ```bash
   # Create the database
   createdb medichain

   # Run the schema migration (includes dummy data for medicines)
   psql -d medichain -f config/schema.sql
   ```
   This creates 5 tables: `users`, `batches`, `transfers`, `scans`, `analytics`

### Running the Application

```bash
# Development mode
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## 🎯 Advanced Features

### Missing Link Detection Engine
- **Automatic Detection**: Identifies skipped supply chain steps
- **Visual Warnings**: Red badges for suspicious medicine batches
- **Detailed Explanations**: Shows which role is missing (Manufacturer/Distributor/Pharmacy)
- **Trust Score Impact**: Reduces score for incomplete supply chains

### Dynamic QR Codes
- **Scan Tracking**: Records every QR code scan with timestamp
- **Duplicate Detection**: Flags multiple scans from same location
- **Geo-Location**: Tracks scan locations for fraud detection

### Bulk Verification
- **CSV Upload**: Verify hundreds of medicine batches at once
- **Comprehensive Reports**: Genuine, Suspicious, Expired, Counterfeit breakdown
- **Downloadable Results**: Export verification reports in CSV format

### Trust Score Engine (0-100)
**Scoring Algorithm:**
- Supply Chain Completeness: 40 points
- Timing Consistency: 20 points
- Geo/Location anomalies: 20 points
- Scan anomalies: 20 points
- **Penalties**: -10 per QR reuse

**Color-Coded Badges:**
- 🟢 Green (80-100): Trusted
- 🟡 Yellow (50-79): Caution
- 🔴 Red (0-49): High Risk

### Analytics Dashboard
- **Real-time Metrics**: Total batches, genuine rate, flagged batches
- **Event Tracking**: Counterfeit attempts, missing links, duplicate scans
- **Manufacturer Rankings**: Trust scores by pharmaceutical company
- **Security Events**: Recent suspicious activities

## 📊 Database Schema

The platform uses **PostgreSQL** with 5 core tables:

1. **users**: User accounts, companies, and roles
2. **batches**: Medicine batch information (drug_name, dosage, sku, origin)
3. **transfers**: Supply chain transfers with chain-of-custody tracking
4. **scans**: QR code scan history and IP logging
5. **analytics**: Security and system event tracking

See `config/schema.sql` for the complete schema and dummy data injection.

## 🔐 Authentication

Authentication uses **JWT (JSON Web Tokens)** with **bcrypt** password hashing:

- **Register**: `POST /api/auth/register` — creates user with hashed password, returns JWT
- **Login**: `POST /api/auth/login` — validates credentials, returns JWT
- Tokens are stored in `localStorage`
- Auth middleware available at `middleware/auth.ts` for protecting API routes

## 📋 Smart Contract

The core verification logic spans across an Ethereum smart contract and the database layer. 

### Deploy to Sepolia Testnet

Full walkthrough (wallets, free test ETH, keys): **[GUIDE.md → Part 3](GUIDE.md#part-3--put-it-on-the-sepolia-blockchain-optional-free)**. In short:

1. Put `SEPOLIA_RPC_URL` and `PRIVATE_KEY` in `.env.local` (never commit or share it).
2. `npm run chain:compile` then `npm run chain:deploy:sepolia` (writes `public/contract-address.json`).
3. Paste each organisation's public wallet address into `public/wallets.json`, then `npm run chain:roles:sepolia`.

## 👥 Supply Chain Roles

The system supports specialized workflows for the following roles:
1. **Manufacturer**: Creates medicine batches and assigns initial tracking data.
2. **Distributor**: Handles pharmaceutical logistics, cold-chain shipping, and routing.
3. **Pharmacy**: Receives the medicines, making them available to patients.
4. **Patient**: Final recipient who scans the QR code to verify medicine authenticity and journey.
5. **Admin**: Manages platform operations and roles.
6. **Bulk Verifier**: Special role for hospitals that need to verify deliveries en masse.
