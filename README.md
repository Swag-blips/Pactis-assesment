# Wallet System API

## Overview

This project implements a robust backend API for a wallet application, designed to address critical backend engineering concerns such as concurrency, latency, idempotency, deadlock prevention, and message queue integration. The system is built using **NestJS** (Node.js + TypeScript), with support for **MySQL/PostgreSQL** as the database, **Redis** for caching, and **Bull** (backed by Redis) for asynchronous job processing.

---

## Features

1. **Wallet Creation**
   - Create wallets with a unique ID and an initial balance (default: 0).
2. **Deposit Funds**
   - Deposit funds into a wallet with safe handling of concurrent deposits.
3. **Withdraw Funds**
   - Withdraw funds, preventing overdraws and handling concurrent withdrawals.
4. **Transfer Funds**
   - Transfer funds atomically between wallets, with idempotency for repeated requests.
5. **Transaction History**
   - Retrieve a paginated list of all wallet transactions, including metadata.

---

## Advanced Features

- **Concurrency & Deadlock Prevention:** Uses database and application-level mechanisms (e.g., row-level locking, transaction management) to ensure safe concurrent operations.
- **Message Queues:** Integrates Bull (with Redis) for asynchronous transaction processing and retry logic.
- **Caching:** Uses Redis to cache wallet balances and transaction histories, with cache invalidation on updates.
- **Latency Optimization:** Optimized APIs for low latency, including batch processing for large transaction histories.

---

## Technical Stack

- **Backend Framework:** [NestJS](https://nestjs.com/) (Node.js + TypeScript)
- **Database:** MySQL or PostgreSQL (via TypeORM)
- **Caching:** Redis
- **Message Queue:** Bull (with Redis)
- **Testing:** Jest

---

## Setup Instructions

### Prerequisites

- Node.js (v16+)
- pnpm (or npm/yarn)
- Docker & Docker Compose (for local development)
- Redis
- MySQL or PostgreSQL

### Installation

1. **Clone the repository:**

   ```bash
   git clone <repo-url>
   cd pactis-assessment
   ```

2. **Install dependencies:**

   ```bash
   pnpm install
   ```

3. **Configure environment variables:**
   - Copy `.env.example` to `.env` and fill in your database, Redis, and Bull configurations.

4. **Run with Docker Compose (recommended):**

   ```bash
   docker-compose up --build
   ```

5. **Run locally (without Docker):**
   - Start your database and Redis.
   - Run migrations (if any).
   - Start the server:
     ```bash
     pnpm start:dev
     ```

---

## API Documentation

- **Swagger UI:** Available at `/api` when the server is running.
- **Endpoints:**
  - `POST /wallets` - Create a wallet
  - `POST /wallets/:id/deposit` - Deposit funds
  - `POST /wallets/:id/withdraw` - Withdraw funds
  - `POST /wallets/transfer` - Transfer funds
  - `GET /wallets/:id/transactions` - Get transaction history

Refer to Swagger for detailed request/response schemas.

---

## Database Schema

- **Wallets Table**
  - `id` (PK, unique)
  - `balance`
  - `created_at`
  - Indexes: `id` (unique)

- **Transactions Table**
  - `id` (PK, unique, UUID)
  - `wallet_id` (FK)
  - `type` (deposit, withdrawal, transfer)
  - `amount`
  - `status`
  - `created_at`
  - Indexes: `wallet_id`, `created_at`

- **Idempotency Table**
  - `id` (PK, unique, transaction ID)
  - `status`
  - `created_at`

**Constraints:**

- Prevent negative balances (application logic).
- Unique transaction IDs for idempotency.

---

## Testing

- **Unit Tests:** Located in `src/wallet/wallet.service.spec.ts`
- **Integration Tests:** Located in `test/app.e2e-spec.ts`
- **Run tests:**
  ```bash
  pnpm test
  ```

---

## Assumptions & Design Decisions

- **Idempotency:** Each transfer uses a unique transaction ID to prevent duplicate processing.
- **Concurrency:** Uses database transactions and row-level locking to prevent race conditions.
- **Deadlock Prevention:** Locks are acquired in a consistent order; retries are implemented for deadlocks.
- **Asynchronous Processing:** Transfers and withdrawals are queued and processed by Bull for reliability.
- **Caching:** Redis is used for fast reads; cache is invalidated on balance/transaction updates.
- **Pagination:** Transaction history endpoints are paginated for performance.

---

## Bonus Features

- **API Rate Limiting:** Wallet endpoints are rate limited
- **Dockerized:** The app is fully containerized for easy deployment.

---

## License

MIT

---

**Note:**

- For detailed API usage, see the Swagger docs.
- For any questions, please open an issue
