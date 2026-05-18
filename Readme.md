

## Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Git](https://git-scm.com/)



## Setup

### 1. Clone the repository

```bash
git clone https://github.com/veisaradu/Licenta_Veisa_RaduGeorge_343_medical_records.git
cd Licenta_Veisa_RaduGeorge_343_medical_records
```


### 2. Blockchain (Hardhat)

```bash
cd blockchain
npm install
```

Start the local Hardhat network (keep this terminal open):

```bash
npx hardhat node
```

In a separate terminal, deploy the contracts:

```bash
npx hardhat run scripts/deploy.js --network localhost
```

The addresses displayed in the console will be needed for the backend configuration:

```
MedicalRecords deployed to: 0x...
Consent deployed to: 0x...
AuditLog deployed to: 0x...
```



### 3. Backend

```bash
cd ../backend
npm install
```

Start the PostgreSQL database via Docker:

```bash
docker compose up -d
```

Create the `.env` file in `/backend`:

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/medchain"

# JWT
JWT_SECRET=a_long_random_secret_of_at_least_32_characters

# Pinata (IPFS) — create a free account at https://pinata.cloud and get the keys
PINATA_API_KEY=
PINATA_SECRET_KEY=

# Blockchain — addresses obtained from the deploy step
MEDICAL_RECORDS_ADDRESS=0x...
CONSENT_ADDRESS=0x...
AUDIT_LOG_ADDRESS=0x...

# Local Hardhat network
BLOCKCHAIN_RPC_URL=http://127.0.0.1:8545

# Private key of a Hardhat account (displayed when running npx hardhat node)
DEPLOYER_PRIVATE_KEY=0x...
```


Apply database migrations:

```bash
npx prisma migrate dev
```

Start the backend server:

```bash
npm run dev
```

The backend runs at `http://localhost:3000`.



### 4. Frontend

```bash
cd ../frontend
npm install
npm run dev
```

The frontend runs at `http://localhost:5173`.




## Smart Contract Testing

```bash
cd blockchain
npx hardhat test
```




## Admin Account Setup

On first run, create an admin account by registering a user normally, then manually updating the role via Prisma Studio:

```bash
cd backend
npx prisma studio
```

Navigate to the `User` table and change the `role` field to `ADMIN`.

