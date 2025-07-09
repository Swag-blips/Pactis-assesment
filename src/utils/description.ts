export const description = `Wallet System API
This API provides a comprehensive set of endpoints for managing digital wallets. It supports core wallet operations such as creating wallets, depositing funds, withdrawing, and transferring funds between wallets, with a focus on data integrity, concurrency control, and performance.

Built with NestJS, this system integrates key backend engineering concepts including:

Concurrency handling for safe deposits and withdrawals

Idempotency for preventing duplicate transfers

Atomic transactions to ensure reliability

Message queue integration (Bull) for asynchronous processing

Redis caching for low-latency balance retrieval

Pagination and metadata in transaction histories

The API is designed to be fault-tolerant, scalable, and suitable for high-throughput environments.

🧪 Testing is done with Jest, covering both unit and integration cases.
🐳 Docker support and rate limiting are available for production-readiness`;
