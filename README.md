# CryptoCopy — On-Chain Intelligence (Phases 1 — 10)

A secure, resilient, enterprise-grade **Crypto Copy Trading Platform** built with a modular monolith architecture.

> [!IMPORTANT]
> **PRODUCTION SAFETY BOUNDARY**:
> - **Supported Execution Modes**: `PAPER` (Virtual Simulation) and `TESTNET` (Sepolia, Base Sepolia, Polygon Amoy).
> - **Mainnet Execution**: **STRICTLY BLOCKED** across multi-layer architectural defense gates.
> - **No Real-Money Trading**: Real-money trading, mainnet swaps, production DEX execution, real deposits/withdrawals, and user private key custody are strictly disallowed.

---

## 1. Scope & Implementation Matrix (Phases 1–10)

* **Phase 1: Foundation & Security**: Argon2id password hashing, JWT access tokens with single-use refresh token rotation in HttpOnly/SameSite cookies, RBAC, Helmet, rate limiting, and core fintech layout.
* **Phase 2: Multi-Network Trader Tracking**: Public address format validation for Ethereum, Base, Polygon, and Solana, duplicate prevention, tenant-isolated trader management.
* **Phase 3: Blockchain Monitoring Engine**: Read-only JSON-RPC monitoring, block/signature checkpoints, idempotent transaction ingestion, scheduler concurrency controls.
* **Phase 4: Transaction Detection & DEX Parsing**: Multi-protocol trade parsing (Uniswap V2/V3, Aerodrome, QuickSwap, Raydium, Jupiter), confidence scoring, swap extraction, and trade explorer.
* **Phase 5: Paper Trading Simulation Engine**: Virtual Paper USDC balance management, atomic portfolio updates, copy rules (`FIXED_AMOUNT` and `PERCENTAGE`), trade simulation audit logs.
* **Phase 6: Centralized Risk Management Engine**: Multi-check deterministic risk evaluations, single-trade exposure ceilings, rolling 24h daily budgets, portfolio concentration caps, token blocklists.
* **Phase 7: Centralized Copy Trading Engine**: End-to-end orchestration (`Monitoring` → `Parser` → `CopyRule` → `Risk` → `Paper/Testnet Execution`), failure isolation, copy decision audit stream.
* **Phase 8: Testnet Execution Layer**: EVM Testnet execution adapters (Sepolia, Base Sepolia, Polygon Amoy), Uniswap V2/V3 testnet routers, verified testnet token registry, 10-step pre-execution safety gate.
* **Phase 9: Production Security, Reliability & Operational Readiness**:
  - **Centralized Production Safety Gate** (`productionSafetyService.js`): Multi-layer hard block for all mainnet networks and chain IDs.
  - **Emergency Execution Kill Switch** (`EXECUTION_KILL_SWITCH`): Server-side instant execution halt returning `EXECUTION_DISABLED`.
  - **Execution Lock Manager** (`executionLock.js`): In-memory execution mutex preventing duplicate execution race conditions during concurrent requests.
  - **Execution State Machine Hardening** (`executionStateMachine.js`): Strict lifecycle transition validation preventing invalid state jumps.
  - **Resilient RPC Client & Circuit Breaker** (`rpcClient.js`): Automatic state transitions (`CLOSED` → `OPEN` → `HALF_OPEN`), jittered exponential backoff, rate limit handling.
  - **Interrupted Execution Recovery** (`executionRecoveryService.js`): On-chain verification of interrupted transactions across server restarts without duplicate broadcasts.
  - **Structured Logging & Automated Secret Redaction** (`logger.js`): Deep recursive secret sanitization (zero private keys, seed phrases, or passwords in logs).
  - **Health & Readiness Subsystem**: Dedicated `/liveness`, `/readiness`, `/system/status`, and `/system/metrics` endpoints.
  - **Immutable Security & Operational Audit Log** (`AuditLog.js`, `auditService.js`): Persistent, indexed audit records.
  - **Frontend System Operations & Health Dashboard** (`OperationsPage.jsx`): Real-time telemetry, safety badges, kill switch controls, metrics, and audit log explorer.
* **Phase 10: Final Validation, Controlled Testnet Operations & Production Readiness**:
  - **Full End-to-End Pipeline Verification**: Full tracing from raw block events through parsing, rule matching, risk evaluation, execution safety gates, simulated/testnet execution, receipt polling, recovery, and audit logs.
  - **Failure Injection & Resilience**: Comprehensive validation under RPC timeouts, circuit breaker fast-fails, delayed receipts, server restart recovery, concurrent duplicate rejection, and emergency kill switches.
  - **Multi-Layer Mainnet Hard Blocking**: Negative tests asserting rejection of Ethereum, Base, Polygon, Solana, Arbitrum, Optimism, and BSC across all layers.
  - **Audit Immutability & Secret Scrubbing**: Cryptographic-grade secret redaction across log and audit streams.
  - **Unified Test Regression Suite**: 119/119 backend tests passing (100% pass rate) with 0 frontend build errors.

---

## 2. Supported Networks & Execution Modes

| Network | Chain ID | Execution Mode | Status | Supported Protocols |
| :--- | :--- | :--- | :--- | :--- |
| **Ethereum Sepolia** | `11155111` | `TESTNET` / `PAPER` | **ACTIVE** | Uniswap V2/V3 Testnet Routers |
| **Base Sepolia** | `84532` | `TESTNET` / `PAPER` | **ACTIVE** | Uniswap V3 Base Sepolia Router |
| **Polygon Amoy** | `80002` | `TESTNET` / `PAPER` | **ACTIVE** | Uniswap V3 Polygon Amoy Router |
| **Ethereum Mainnet** | `1` | `MAINNET` | **HARD BLOCKED** | N/A (Execution Forbidden) |
| **Base Mainnet** | `8453` | `MAINNET` | **HARD BLOCKED** | N/A (Execution Forbidden) |
| **Polygon Mainnet** | `137` | `MAINNET` | **HARD BLOCKED** | N/A (Execution Forbidden) |
| **Solana Mainnet Beta**| `101` | `MAINNET` | **HARD BLOCKED** | N/A (Execution Forbidden) |

---

## 3. End-to-End Pipeline Architecture

```
[Blockchain Event / Ingestion]
        │
        ▼
[TransactionParser] (DEX swap & token transfer extraction)
        │
        ▼
[CopyTradingEngine] (Orchestrates rule discovery & eligibility)
        │
        ▼
[CopyRuleEngine] (Calculates allocation & rule compliance)
        │
        ▼
[RiskManagementEngine] (Enforces exposure ceilings & daily budgets)
        │
        ▼
[Execution Safety Gate & Mutex Lock] (Production safety check & concurrency mutex)
   ├── If Mode === PAPER   ──► [PaperTradingEngine] (Atomic virtual balance update)
   └── If Mode === TESTNET ──► [TestnetExecutionService] (EVM Testnet broadcast & receipt polling)
        │
        ▼
[Audit & Recovery Service] (Immutable audit logging & recovery tracking)
```

---

## 4. API Endpoints (Version 1)

### System Health & Operations (Phase 9)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/health` | Comprehensive backward-compatible health report | No |
| `GET` | `/api/v1/health/liveness` | Fast liveness probe (`{"status":"UP","alive":true}`) | No |
| `GET` | `/api/v1/health/readiness` | Deep readiness check (DB, scheduler, safety) | No |
| `GET` | `/api/v1/system/status` | Safe operational status (no credentials exposed) | No |
| `GET` | `/api/v1/system/metrics` | Internal performance metrics & counters | No |
| `POST` | `/api/v1/system/kill-switch` | Emergency execution kill switch control | **Yes** |
| `POST` | `/api/v1/system/recover` | Triggers on-demand execution recovery scan | **Yes** |
| `GET` | `/api/v1/audit/logs` | Query user-scoped immutable audit logs | **Yes** |

### Core Feature Endpoints (Phases 1–8)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | Register new user account | No |
| `POST` | `/api/v1/auth/login` | Authenticate user with password | No |
| `POST` | `/api/v1/auth/refresh` | Rotate access token | No (Cookie) |
| `POST` | `/api/v1/auth/logout` | Invalidate session | No |
| `GET` | `/api/v1/traders` | List tracked traders | **Yes** |
| `POST` | `/api/v1/traders` | Add tracked trader | **Yes** |
| `GET` | `/api/v1/transactions/recent` | Recent parsed transactions | **Yes** |
| `GET` | `/api/v1/copy-rules` | List user copy rules | **Yes** |
| `GET` | `/api/v1/risk` | Get risk limits & configuration | **Yes** |
| `GET` | `/api/v1/paper/portfolio` | Virtual portfolio balance & holdings | **Yes** |
| `GET` | `/api/v1/execution/config` | Get testnet execution settings | **Yes** |
| `PATCH`| `/api/v1/execution/config` | Update testnet execution parameters | **Yes** |
| `GET` | `/api/v1/execution/records` | List testnet execution audit records | **Yes** |
| `POST` | `/api/v1/execution/dry-run` | Validate pre-execution safety gates | **Yes** |

---

## 5. Running the Test Suite

### Backend Test Suite (105 Automated Tests)
Run complete regression and Phase 9 test suite:
```bash
cd backend
npm test
```

### Frontend Production Build
```bash
cd frontend
npm run build
```

---

## 6. Environment Variables

Configure `.env` using `.env.example`:
```ini
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/copy_trading_db
JWT_ACCESS_SECRET=your_jwt_access_secret_min_32_chars
JWT_REFRESH_SECRET=your_jwt_refresh_secret_min_32_chars
EXECUTION_KILL_SWITCH=false
TESTNET_EXECUTION_ENABLED=false
TESTNET_EXECUTION_PRIVATE_KEY=
```
