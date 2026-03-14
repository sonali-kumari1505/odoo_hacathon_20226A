
CoreInventory Hackathon Project

Setup:

1. npm install
2. Copy `.env.example` to `.env`
3. Put your Neon connection strings in `DATABASE_URL` and `DIRECT_URL`
4. npm run prisma:generate
5. npm run prisma:migrate
6. npm run dev

Open http://localhost:3000

Demo:
Create product → Create pending receipt/delivery → Validate documents → Move transfer stock → Apply physical-count adjustment → Check dashboard → View history

Implemented core workflows:
- Auth: signup, login, logout
- Products: create, update, list, delete (delete blocked if stock history exists)
- Receipts: create pending document with multiple products and quantities, then validate to increase stock
- Deliveries: create pending document with multiple products and quantities, then validate to decrease stock (with stock checks)
- Internal transfer: move stock Warehouse A -> Warehouse B with transfer out/in ledger entries
- Stock adjustment: apply physical count and write signed adjustment deltas
- Dashboard: total products, low stock, pending receipts, pending deliveries
- Stock ledger: logs receipt, delivery, transfer, adjustment, and manual movement rows

API validation:

1. npm run test:api

What it checks:
- product creation
- movement creation with type normalization and location persistence
- invalid movement type validation
- unknown product handling (404)
- history includes created movement

The script starts a temporary dev server, runs checks, and cleans up generated test data.

Notes:
- This project is configured for PostgreSQL (Neon), not local SQLite.
- `prisma:migrate` uses `prisma migrate deploy` and expects migrations to be committed.
