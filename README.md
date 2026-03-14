# CoreInventory


CoreInventory Hackathon Project

Setup:

1. npm install
2. Copy `.env.example` to `.env`
3. Put your Neon connection strings in `DATABASE_URL` and `DIRECT_URL`
4. npm run prisma:generate
5. npm run prisma:migrate
6. npm run dev

Open http://localhost:3000
deploylink:
Video link:https://drive.google.com/drive/u/0/folders/1rlAHJi80puwYn6PfcJTgnDsQrtd_lPEu
Note:we have made earlier repo but dueo to unexpected circumstances we have to change the link of repo
https://github.com/sonali-kumari1505/odoo_hacathon_2026 here mentor is also added but we have to change this repo.
Warehouse inventory app built with Next.js (App Router), Prisma, and PostgreSQL (Neon).

## Prerequisites

- Node.js 18+
- A PostgreSQL database (Neon or equivalent)

## Setup

1. Install dependencies:

	 npm install

2. Create a `.env` file in the project root with your database URLs:

	 DATABASE_URL="postgres://..."
	 DIRECT_URL="postgres://..."

3. Generate Prisma client:

	 npm run prisma:generate

4. Apply migrations:

	 npm run prisma:migrate

5. Start the app:

	 npm run dev

6. Open:

	 http://localhost:3000

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Create production build
- `npm run start` - Run production server
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Apply committed migrations (`prisma migrate deploy`)
- `npm run test:api` - Run API smoke tests

## Demo Flow

Create product -> Create pending receipt/delivery -> Validate documents -> Transfer stock -> Apply physical-count adjustment -> Check dashboard -> View history

## Implemented Workflows

- Auth
	- Signup
	- Login
	- Logout

- Products
	- Create product
	- Update product
	- View product list
	- Delete product (blocked if stock history exists)

- Receipts (Incoming Stock)
	- Create pending receipt with multiple product lines
	- Validate receipt to increase stock and write ledger movements

- Delivery Orders (Outgoing Stock)
	- Create pending delivery with multiple product lines
	- Validate delivery to decrease stock and write ledger movements
	- Stock availability checks before validation

- Internal Transfer
	- Move stock from one location to another
	- Writes transfer-out and transfer-in ledger entries

- Stock Adjustment
	- Apply physical count by product
	- Writes signed adjustment delta to ledger

- Dashboard
	- Total products
	- Low stock items
	- Pending receipts
	- Pending deliveries

- Stock Ledger
	- Logs receipt, delivery, transfer, adjustment, and manual movement rows

## API Smoke Test

Run:

npm run test:api

What it validates:

- Auth signup and session cookie creation
- Product creation
- Movement creation and validation errors
- History fetch and created movement visibility
- Cleanup of generated test data

## Troubleshooting

### Signup or login not working

1. Check DB connectivity and migration status:

	 npx prisma migrate status

2. If migrations are pending, apply them:

	 npm run prisma:migrate

3. If you see `P1001: Can't reach database server`, verify your Neon `DATABASE_URL` and network access.

4. Clear stale auth cookie in browser (`coreinventory_session`) and retry.

## API errors after schema changes

Re-run:

1. `npm run prisma:generate`
2. `npm run prisma:migrate`

## Notes

- This project targets PostgreSQL (Neon), not SQLite.
- `prisma:migrate` is configured as `prisma migrate   deploy`, so it expects committed migrations.


