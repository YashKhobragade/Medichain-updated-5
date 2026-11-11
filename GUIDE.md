# MediChain: Run, Understand, Demo

This guide takes you from a fresh laptop to a confident demo. Part 1 is all you need to run the project. Part 3 (Sepolia) is optional and adds real public-blockchain transactions.

---

## Part 1 · Run it on your laptop (about 10 minutes, once)

**You need:** Node.js 20 LTS (nodejs.org) and Python 3.10–3.12 (python.org; on Windows tick *Add Python to PATH*).

Open a terminal **inside the project folder** and run:

```bash
npm install                                            # website packages (a few minutes)
python -m pip install -r ml-service/requirements.txt   # ML scanner packages (Mac: python3)
npm run demo                                           # starts the scanner + the website
```

Open **http://localhost:3000** in Chrome or Edge. Keep the terminal open; press `Ctrl+C` to stop.
Next time you only need `npm run demo`.

`npm run demo` checks your setup and tells you exactly what's missing. If it says the scanner packages are missing, your Python has the wrong OpenCV version: run the `pip install` line again.

### Demo logins (password `demo123`)

The login page has one-click buttons for each demo organisation (emails: manufacturer@, distributor@, pharmacy@, hospital@, customer@ medichain.io):

| Organisation | Role | Menu |
|---|---|---|
| PharmaCure Labs | Manufacturer | Create, Transfers, Live Tracking, Verify, Analytics |
| MediTrust Distributors | Distributor | Transfers, Live Tracking, Verify |
| HealthPlus Pharmacy | Pharmacy | Transfers, Inventory Scan, Bulk Verify, Verify |
| Apollo Hospital Pharmacy | Hospital | Transfers, Inventory Scan, Bulk Verify, Verify |
| Customer | Customer | Verify only |

**Admin** has no button and no demo password. Put a password only you know in `.env.local`:
```
ADMIN_PASSWORD=choose-a-secret
```
restart the app, then sign in with **admin@medichain.io** and that password. Admin sees everything, can act as any organisation, and approves wallets. Until `ADMIN_PASSWORD` is set, admin login is switched off.

**Verify Medicine is public**: a patient can scan a QR without logging in. Every other page needs a login, and **Logout** returns you to the login page. New accounts can be created on the signup page for any role except Admin. For an organisation, type the **company name** in the Name field (e.g. *Midas Pharma*): it appears in the Create page's manufacturer list and in everyone's *Send to* list straight away.

**Tip for demos:** use separate browser windows (normal + incognito, or Chrome + Edge), each logged in as a different organisation, so you never have to log out mid-demo.

---

## Part 2 · Understand the project

### The idea in one line
Every medicine batch gets a QR code; every hand-off between organisations is recorded in a tamper-evident ledger (and optionally on Ethereum); anyone can scan the QR to check where it has been and whether it is genuine.

### The flow

```
Manufacturer ── creates batch + QR ──► Distributor ──► Pharmacy / Hospital ──► Patient
     │                 │                    │                 │                   │
  /manufacturer    /distributor        /distributor      /inventory          /verify
  (Create)         (Transfers)         (Transfers)       (scan shelf,        (scan one QR)
                                                          stock alerts)
                                       Hospital: /bulk-verify (whole delivery as CSV)
```

### What each page does

| Page | What it shows |
|---|---|
| **Create** (`/manufacturer`) | Register a batch: medicine, expiry, quantity. Your own company is pre-selected. Get its QR (download) or a **printable PDF label** with every detail. |
| **Transfers** (`/distributor`) | *Incoming* (confirm what arrived), *Batches you can ship* (send to the next organisation), *History* with the ledger hash and Etherscan link. Only the current holder can send a batch. |
| **Verify** (`/verify`) | Scan or type a batch ID. Verdict (genuine / suspicious / expired / counterfeit / not on ledger), trust score, every check, and the full journey. |
| **Inventory Scan** (`/inventory`) | Point a camera at a shelf. The ML model reads every QR at once, checks each batch, flags copied labels. **Stock** tab: boxes per medicine with low-stock alerts. |
| **Bulk Verify** (`/bulk-verify`) | Upload a CSV/Excel of a delivery. Every row checked; printable compliance report. |
| **Dashboard** | Overview and stock alerts. |

### How a batch is judged (`lib/verification.ts`)
The same checks run everywhere (QR scan, inventory camera, bulk verify):

1. **On the ledger:** the batch was registered by a manufacturer.
2. **Licensed manufacturer:** made by a registered company and not flagged.
3. **Unbroken custody:** every hand-off starts where the last one ended, between registered organisations only.
4. **Route:** skipping the distributor (manufacturer → pharmacy) is flagged as a *missing link*.
5. **Journey:** how far the batch has travelled (shown as the 3-step *Journey* bar on Verify).
6. **In date:** expired batches fail; within 90 days is a warning.
7. **Ledger untampered:** if anyone edits the ledger file, its hash chain breaks and the batch becomes *suspicious*.

**Verdict vs score.** The *verdict* answers "is it fake?" (genuine / suspicious / expired / counterfeit / not on ledger). The *trust score* also reflects the journey: **100 only when the batch has passed manufacturer → distributor → pharmacy/hospital in that order, with every hand-off confirmed received.** Until then it is capped: still at the manufacturer **60**, in the distributor stage **80**, on its way to (or delivered without) a distributor **90**. Failed or cautionary checks lower it further. A new batch is therefore *Genuine, 60/100*, and it rises as it moves.

### How transfers are made tamper-evident (`lib/shipments.ts`)
Each shipment (SENT / RECEIVED) is an entry holding the **SHA-256 hash of the entry before it**, like blocks in a blockchain. Changing any old entry changes its hash and breaks every link after it. The app re-checks the chain every time, and the Transfers page shows *Ledger intact* or *Ledger tampered at entry #N*.

Rules enforced on every shipment (`lib/supplyChain.ts`):
- only the organisation currently holding a batch can ship it (**unauthorised transfers are blocked**),
- you can only ship to registered organisations,
- a batch on its way must be received before it moves again,
- counterfeit or expired batches cannot be shipped.

### Where the ML is (`ml-service/`)
A small Python service using OpenCV's **WeChat QR** engine, which has two trained neural networks: a **detector CNN** that finds QR codes in the picture and a **super-resolution CNN** that sharpens small or blurry ones. Big photos are scanned in overlapping tiles so distant labels are found too.

### Stock alerts (two-bin rule)
Each batch is one box with one QR. After a scan: **2+ boxes** of a medicine = OK, **1 box** = *Low: reorder*, **0** = *Out of stock*. *Box finished* updates it immediately. Only genuine boxes count.

### Where data lives

| Data | Where | Why |
|---|---|---|
| Batches you create | `data/batches.json` | Survives restarts, no database needed |
| Shipment ledger | `data/ledger.json` | Hash-linked, tamper-evident |
| Blockchain receipts | `data/chain-tx.json` | Etherscan links for on-chain actions |
| Demo logins / sign-ups | built in / `data/users.json` | |
| Stock counts | the browser (localStorage) | The pharmacy's own records; use Export backup |
| Smart contract | Ethereum Sepolia (after Part 3) | Public, permanent proof |

To start over, stop the app and delete the `data` folder.

### Key files

```
app/                    pages (each folder = one URL) and api/ (server endpoints)
lib/verification.ts     the six checks and the trust score
lib/shipments.ts        hash-linked shipment ledger
lib/supplyChain.ts      who may ship / receive what
lib/onchain.ts          writes to the smart contract through MetaMask
lib/stockStore.ts       stock counts and the two-bin rule
contracts/              the Solidity smart contract
scripts/deploy.js       deploys the contract
scripts/setup-roles.js  gives each organisation's wallet its role on the contract
ml-service/main.py      the ML QR scanner
```

---

## Part 3 · Put it on the Sepolia blockchain (optional, free)

Sepolia is Ethereum's **test network**. Its ETH is free and has no money value. **Never pay for Sepolia ETH.** Use **new MetaMask wallets just for this project**, never one holding real money.

Without this part everything still works; actions are recorded in the MediChain ledger only, and the app says so in a bar at the top of the Create and Transfers pages.

### 1. Wallets (MetaMask)
1. Install the MetaMask extension in Chrome.
2. In MetaMask turn on **Show test networks** and select **Sepolia**.
3. Create a **Regulator** account (the admin: deploys the contract and approves companies), then one account per company: **PharmaCure**, **MediTrust**, **HealthPlus** (and your own, e.g. **Midas**). Each organisation needs its own account.

### 2. Free test ETH
The **Regulator** (deploys, approves), **manufacturers** (create, ship) and **distributors** (ship) need test ETH; pharmacies only receive. Get it once into the Regulator account and send ~0.01 to each of the others from MetaMask (*Send*). Get it from a Sepolia faucet such as the **Google Cloud Web3 faucet** or **Alchemy's Sepolia faucet**. Faucet rules change (some need a login or a tiny mainnet balance), so **start a day or two before your demo**. A small drop is enough.

### 3. RPC key
Sign up at **Alchemy** (or Infura), create an app for **Ethereum Sepolia**, and copy its HTTPS URL.

### 4. `.env.local`
Create a file called `.env.local` in the project folder:

```
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/your-key
PRIVATE_KEY=0x...the Regulator account's private key...
ADMIN_PASSWORD=choose-a-secret
```

(MetaMask → Regulator account → ⋮ → Account details → Show private key. MetaMask shows it without `0x`: add `0x` in front.)
**Keep this file private.** Never share it, upload it to GitHub, or include it in your submission zip.

### 5. Deploy the contract
```bash
npm run chain:compile
npm run chain:deploy:sepolia
```
This writes the contract address into `public/contract-address.json` and prints an Etherscan link to it. The deploying wallet (Regulator) becomes the **admin**. It has no company role, so no manufacturer can approve itself or others.

**Redeploying** (e.g. after changing the contract) creates a new contract: approve the companies again (step 6). Batches put on the old contract keep their Etherscan links but continue in the MediChain ledger only, so create fresh batches for the demo.

### 6. Link each organisation's wallet and approve it (in the app)
1. Log in as the organisation (e.g. **PharmaCure Labs** or your own *Midas*), select **its** MetaMask account, and open **Create** or **Transfers**. The bar at the top says *"This MetaMask account is not linked yet"* → click **Link this wallet**. It now says *Waiting for the admin to approve it*. Repeat for every organisation (each with its own MetaMask account).
2. Log in as **Admin** (admin@medichain.io + your `ADMIN_PASSWORD`), select the **Regulator** account in MetaMask, open **Admin → Wallet approvals** and click **Approve** for each company → confirm in MetaMask. Each approval is a blockchain transaction.
3. Back as the organisation, the bar says *"…wallet is approved on the blockchain"*.

**Alternative (terminal):** paste the addresses into `public/wallets.json` and run the roles script:

```json
"PharmaCure Labs":        { "role": "manufacturer", "address": "0x..." },
"MediTrust Distributors": { "role": "distributor",  "address": "0x..." },
"HealthPlus Pharmacy":    { "role": "pharmacy",     "address": "0x..." }
```

Then:
```bash
npm run chain:roles:sepolia
```
Running it again is safe; it only changes what's missing.

### What's inside the QR
A short JSON text: `{"id":"MED-…","name":"Pantocid","by":"Midas","mfg":"10/2026","exp":"09/2028"}`. **Google Lens or any phone camera shows it as text** (medicine, maker, made and expiry month), even offline. Verify Medicine (camera), Inventory Scan and Bulk Verify read the batch ID from `id`. It's kept short so the inventory scanner reads it from almost as far as the old link-only codes. The full check (journey, trust score) is on **Verify Medicine**. The PDF label also prints the verify link.

### New organisations
Sign up (company name in the Name field), then do step 6 for it: link its wallet, admin approves. No file editing. A company that hasn't linked a wallet still works in the app; its actions are recorded in the MediChain ledger only, and the app says so.

### 7. Use it
1. `npm run demo`, open the app in the Chrome that has MetaMask.
2. Log in as **PharmaCure Labs**, switch MetaMask to the **PharmaCure** account. The bar should say *Blockchain: also writing to Sepolia*. (If it says *Switch to Sepolia*, click it.)
3. **Create** a batch → confirm in MetaMask → *View on Etherscan*.
4. **Transfers** → Send it to MediTrust → confirm in MetaMask → Etherscan link in History.
5. Log in as **MediTrust**, switch MetaMask to **MediTrust** → *Confirm received* → Send to HealthPlus → confirm.
6. Open the batch on **Verify**: each step shows *On Sepolia: view on Etherscan*.

Only batches **created while connected to Sepolia** exist on-chain. The built-in demo batches (`BAT-MED-…`) are ledger-only; the app tells you when that's the case.

**Before demo day:** do one full Sepolia journey the day before and keep the Etherscan pages open in tabs as proof, in case the venue Wi-Fi is poor.

---

## Part 4 · A 5-minute demo script

1. **Problem (30 s):** counterfeit medicines; nobody can see a medicine's journey.
2. **Create (45 s):** log in as PharmaCure → create a batch → show its QR (and the Etherscan link if on Sepolia).
3. **Transfer (90 s):** Transfers → send to MediTrust. Switch window to MediTrust → *Confirm received* → send to HealthPlus. Point at *Ledger intact* and the hash in History.
4. **Blocked actions (30 s):** as MediTrust, try to send a batch you don't hold, or the counterfeit `BAT-MED-SUS-001` → refused.
5. **Verify (45 s):** point Google Lens at the QR (shows the medicine details), then scan it in **Verify Medicine → camera** → *Genuine* with the full journey. Then `BAT-MED-SUS-001` → *Counterfeit*.
6. **Inventory (60 s):** HealthPlus → Inventory Scan → live camera on printed QR labels (or the *Pharmacy shelf* sample photo) → copied label and expired box flagged → **Stock** tab → *Low: reorder* → *Box finished*.
7. **Bulk verify (30 s):** Hospital → *Try a sample delivery* → *Compliance report*.
8. **Tamper (optional, 30 s):** open `data/ledger.json`, change one name, save, refresh Transfers → *Ledger tampered*; the batch becomes *Suspicious*. Change it back.

---

## Part 5 · Likely viva questions

- **Is it really on a blockchain?** Yes: with Part 3, batches and transfers are written to Ethereum Sepolia and can be opened on Etherscan. The app also keeps its own SHA-256 hash-linked ledger, so it still works offline and any edit is detected.
- **Where is the machine learning?** OpenCV's WeChat QR models: a detector CNN finds every QR in an image and a super-resolution CNN sharpens small ones, so a whole shelf is read in one photo.
- **How are counterfeits detected?** Unknown batch, flagged origin, gaps in custody, unregistered parties, expiry, the same QR on two boxes, and ledger tampering.
- **Can anyone who signs up write to the blockchain?** No. A new company links its wallet, but the smart contract only accepts it after the admin (the regulator) approves it, and that approval is itself a blockchain transaction.
- **What does the QR contain?** A short JSON text with the batch ID, medicine, maker, made and expiry month. A phone shows the details instantly; MediChain's scanners read the ID and check it against the ledger, so editing the text can't fake anything.
- **Who is the admin?** A regulator wallet, separate from every company. The contract makes the deployer the admin and gives it no company role.
- **What stops someone shipping a batch they stole?** Only the current holder can ship (checked by the server, and by the smart contract's `onlyCurrentOwner`).
- **Why is stock stored in the browser?** It's the pharmacy's own day-to-day record; authenticity always comes from the ledger/blockchain. Moving it to PostgreSQL only changes `lib/stockStore.ts`.
- **Why not put everything on-chain?** Every on-chain write costs gas and takes seconds. The usual design keeps proof on-chain and details off-chain.
- **Limitations?** The camera only counts labels it can see; stock is per device; Sepolia needs internet; AI voice re-ordering (step 6 of the original brief) is future scope.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `python is not recognized` | Reinstall Python with *Add to PATH*, or use `py` on Windows / `python3` on Mac. |
| Scan page: *scanner service isn't running* | Run the `pip install -r ml-service/requirements.txt` line again, then `npm run demo`. |
| `Port 3000 is already in use` | Another copy is running. Close it or restart the computer. |
| Camera doesn't start | Use `http://localhost:3000` (not your IP) and allow camera access. For a phone, see README → *Scanning with a phone*. |
| Bar says *Smart contract not deployed yet* | Expected until you do Part 3. Everything else works. |
| MetaMask: *no test ETH* | Get Sepolia ETH from a faucet for that account. |
| *not approved on the blockchain yet* | Link the wallet (bar on Create/Transfers), then Admin → Wallet approvals → Approve. |
| Admin: *Only the wallet that deployed the contract can approve* | Switch MetaMask to the Regulator account (the one in `.env.local`). |
| Admin login says *Invalid email or password* | Set `ADMIN_PASSWORD` in `.env.local` and restart the app. |
| *has not linked a wallet yet* | That recipient hasn't linked a wallet; the shipment is still recorded in the ledger. Link + approve it to also go on-chain. |
| *belongs to a different wallet* | Switch MetaMask to the account of the organisation that holds the batch. |
| `chain:deploy:sepolia` fails with a URL/key error | Check `.env.local` is in the project folder and has both lines. |
| Start completely fresh | Stop the app, delete the `data` folder, clear the site's browser storage. |
