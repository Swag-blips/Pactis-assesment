
# Wallet System API

## 🚀 Overview

This project implements a **production-grade backend API** for a digital wallet system. It tackles key backend engineering challenges such as **concurrency**, **idempotency**, **message queuing**, **deadlock prevention**, and **latency optimization** using scalable design patterns. Built with **NestJS** (Node.js + TypeScript), the system uses **MySQL/PostgreSQL** for persistence, **Redis** for caching, and **Bull (with Redis)** for background job processing.

---

## ✨ Features

1. **Wallet Creation**
   - Create wallets with a unique ID and optional initial balance (default: 0).
2. **Deposit Funds**
   - Safely deposit funds into a wallet, even under high concurrency.
3. **Withdraw Funds**
   - Withdraw funds with overdraw protection and concurrency handling.
4. **Transfer Funds**
   - Atomically transfer funds between wallets with full idempotency.
5. **Transaction History**
   - Paginated transaction logs with rich metadata (e.g., timestamps, status, IDs).

---

## ⚙️ Advanced Engineering

- **Concurrency & Deadlock Prevention**
  - Uses **row-level locking** (via `SELECT ... FOR UPDATE`) and **ACID transactions** to guarantee correctness under concurrent operations.
- **Message Queues**
  - Leverages **Bull** and Redis to offload transfers and withdrawals to a reliable async job queue, with retry strategies for failure handling.
- **Caching**
  - Caches wallet balances and transaction histories with **Redis**, ensuring high-speed reads and proper cache invalidation after mutations.
- **Latency Optimization**
  - Optimized for low response times with techniques like batch fetching and asynchronous background processing.

---

## 🧱 Tech Stack

| Layer         | Tool/Service            |
|---------------|--------------------------|
| Framework     | [NestJS](https://nestjs.com/) |
| Language      | TypeScript (Node.js)     |
| Database      | MySQL or PostgreSQL via TypeORM |
| Caching       | Redis                    |
| Queues        | Bull (backed by Redis)   |
| Testing       | Jest                     |
| Containerization | Docker + Docker Compose |

---

## 🛠️ Setup Instructions

### Prerequisites

- Node.js (v16+)
- pnpm (or npm/yarn)
- Docker & Docker Compose
- Redis
- MySQL or PostgreSQL

---

### 🚀 Quick Start (Recommended via Docker)

```bash
docker-compose up --build
```

This spins up the entire stack: NestJS API, Redis, and your SQL database.

---

### 🧪 Local Development

```bash
pnpm install
cp .env.example .env
pnpm start:dev
```

Ensure Redis and your database are running locally. Update `.env` accordingly.

---

## 📘 API Documentation

- **Swagger UI:** Available at [`/api`](http://localhost:3000/api) when the server is running.

### Endpoints

| Method | Path                            | Description                  |
|--------|----------------------------------|------------------------------|
| POST   | `/wallets`                      | Create wallet                |
| POST   | `/wallets/:id/deposit`          | Deposit funds                |
| POST   | `/wallets/:id/withdraw`         | Withdraw funds               |
| POST   | `/wallets/transfer`             | Transfer between wallets     |
| GET    | `/wallets/:id/transactions`     | Transaction history (paginated) |

Refer to Swagger for full request/response schemas.

---

## 🗃️ Database Schema

### 🪪 `wallets`
- `id` (UUID, PK)
- `balance` (decimal)
- `created_at` (timestamp)
- `updated_at` (timestamp)
- Indexes: `id` (unique)

### 📜 `transactions`
- `id` (UUID, PK)
- `senderWallet` (FK)
- `receiverWallet` (FK)
- `errorMessage` (string)
- `type` (enum: deposit | withdrawal | transfer)
- `amount` (decimal)
- `status` (pending, completed, failed)
- `timestamp` (timestamp)
- Indexes: `wallet_id`, `created_at`

### 🔒 `idempotency_keys`
- `id` (UUID, PK)
- `status` (success, error)
- `created_at` (timestamp)

**Constraints:**
- No negative balances (enforced via app logic + DB)
- Unique transaction IDs (for idempotency)

---

## 🧪 Testing

- **Unit Tests:** `src/wallet/wallet.service.spec.ts`
- **Integration Tests:** `test/app.e2e-spec.ts`

```bash
pnpm test
```

Tests cover core logic and edge cases (e.g., concurrency collisions, failed jobs, overdraws).

---

## 🧠 Design Considerations

- **Atomic Transactions:** Transfers are executed inside DB transactions for ACID compliance.
- **Concurrency:** Handled via pessimistic locking (`SELECT ... FOR UPDATE`) + retry logic.
- **Idempotency:** Transfer endpoints require `clientTransactionId` to prevent double-spending.
- **Deadlock Avoidance:** Consistent locking order; retries on deadlock.
- **Background Processing:** Heavy operations (transfer/withdraw) run in Bull queues.
- **Caching:** Fast reads on wallet balances, flushed on mutation.
- **Pagination:** Paginated transaction endpoints with offset + limit strategy.

---

## 🎁 Bonus Features

- ✅ **API Rate Limiting:** Prevents abuse of wallet endpoints.
- ✅ **Dockerized:** Fully containerized app stack (API + Redis + DB).
- ✅ **Swagger UI:** Auto-generated API docs available on `/api`.

---

## 📝 License

MIT

---

## 🙋‍♂️ Notes

- See Swagger docs for real examples and schema validations.
- For bugs or questions, feel free to open an issue or discussion.

---

### 🔍 Assessment Alignment Checklist ✅

| Requirement                    | Implemented? |
|-------------------------------|--------------|
| Wallet Creation               | ✅           |
| Deposit / Withdraw            | ✅           |
| Transfer + Idempotency        | ✅           |
| Transaction History (Paginated) | ✅        |
| Concurrency & Deadlock Safety | ✅           |
| Message Queue (BullMQ)        | ✅           |
| Redis Caching                 | ✅           |
| Low-Latency Optimization      | ✅           |
| Tests (unit + integration)    | ✅           |
| Docker                        | ✅           |
| Swagger Docs                  | ✅           |
| Rate Limiting (Bonus)         | ✅           |
