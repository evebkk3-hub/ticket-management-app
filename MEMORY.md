# Project Memory: PlantUML Demo / Ticket / APL-RYP / Life Planning

Last reviewed: 2026-07-30
Review role: SA Lead + Dev Lead
Review type: repository-wide static analysis and build verification
Source of truth: current working tree, including uncommitted files

## 1. Executive Summary

This repository is a prototype workspace containing several products and design artifacts:

1. Ticket Management and Social Monitoring
2. APL/RYP renewal payment prototype
3. Life Planning web calculator
4. Life Planning Expo mobile application
5. Renewal Payment Expo mobile application
6. PlantUML, Draw.io, database pre-design, and requirement documents

The Java backend is operational and dependency-light, but it is not production-ready. It is a
single-process modular monolith whose module boundaries exist mainly in page names and method
groups, not in packages or components. `WebMain.java` contains routing, authentication, HTML,
API orchestration, JSON serialization, and error handling. `TicketDatabase.java` contains schema,
migration, seed data, repositories, and business rules.

The most important risks are:

- hard-coded login credentials and a static shared session token;
- no CSRF protection on state-changing form/API operations;
- public Life Planning API with no authentication, rate limit, or request-size control;
- database operations that should be atomic use separate connections and transactions;
- payment callbacks have no signature verification, idempotency key, or replay protection;
- business rules, persistence, and UI are tightly coupled in very large Java classes;
- target diagrams and actual SQLite schemas have significant drift;
- almost no automated tests or CI quality gates;
- prototype SQLite/runtime choices are unsuitable for multi-instance production deployment;
- inconsistent text encoding is visible in the Life Planning mobile source/output;
- repository contains several products with unclear ownership and release boundaries.

Recommended posture: continue using the current implementation for local demo/prototyping only.
Before production integration, establish product boundaries, authentication/authorization,
transactional consistency, API contracts, migration tooling, automated tests, observability, and
a production database.

## 2. Repository Map

### Java backend

- Entry point: `src/main/java/com/example/ticket/WebMain.java`
- Persistence and domain records: `src/main/java/com/example/ticket/TicketDatabase.java`
- Life Planning calculation: `src/main/java/com/example/ticket/LifePlanningCalculator.java`
- CLI domain demo: `src/main/java/com/example/ticket/Main.java`
- Swing UI: `src/main/java/com/example/ticket/GuiMain.java`
- External feed clients:
  - `PantipSearchClient.java`
  - `SocialSearchClient.java`
- Runtime scripts:
  - `run-ticket-web.cmd`
  - `run-ticket-app.cmd`
  - `run-ticket-gui.cmd`
  - `run-life-planning.cmd`
- Runtime database: `data/tickets.db`

### Mobile applications

- `projects/life-planning-mobile`
  - Expo/React Native JavaScript application
  - Calls `POST /api/life-planning/calculate`
  - Stores a local draft in AsyncStorage
- `projects/renewal-payment-mobile/mobile-renewal-payment`
  - Expo/React Native TypeScript application
  - Has domain, repository, database migration, seed, and bootstrap layers
  - Uses local Expo SQLite

### Analysis/design assets

- Ticket diagrams: `ticket-management-*.puml`
- Life Planning diagrams: `docs/life-planning/*.puml`
- RYP database pre-design: `database/ryp/ryp-er.puml`
- APL/RYP technical specification: `R3_APL_Payment_Technical_Spec_v0.1.md`
- Screen/API mapping: `LIFE_PLANNING_V2_SCREEN_API_MAPPING.md`
- Release checklist: `RELEASE_TEST.md`

## 3. Current Runtime Architecture

```text
Browser / Expo client
        |
        v
JDK HttpServer (single root context)
        |
        v
WebApplication
  - route dispatch
  - authentication
  - form parsing
  - HTML generation
  - API JSON generation
  - workflow orchestration
        |
        v
TicketDatabase
  - schema + additive migration
  - seed data
  - query/repository methods
  - payment/ticket business rules
        |
        v
SQLite data/tickets.db
```

The server uses the JDK `HttpServer` default executor (`server.setExecutor(null)`). Each repository
method normally opens its own JDBC connection. There is no explicit connection pool, unit of work,
or service-layer transaction boundary.

## 4. Implemented Business Capabilities

### Ticket Management

- create and list tickets;
- ticket detail;
- assign, follow up, and close;
- ticket history;
- private customer/support messages;
- Pantip keyword import and deduplication;
- generic social post import and deduplication;
- source-to-ticket reference lookup;
- pagination in the web layer.

### APL/RYP Payment

- seeded policy and payment configuration;
- eligibility and due-date evaluation;
- premium component calculation;
- payment creation;
- payment result callback;
- reconcile approval;
- receipt print confirmation;
- GL/reconcile/report views;
- legacy and `/api/v1` route aliases.

### Life Planning

- public web page;
- calculation API;
- premium segment validation/calculation;
- retirement and rider inputs;
- SQLite configuration/rule seed tables;
- Expo mobile client and local draft storage.

## 5. SA Lead Assessment

### 5.1 Domain boundaries

Ticket, APL/RYP, roadmap/project tracking, and Life Planning are separate bounded contexts but
share one Java package, one database, one server, and one release artifact. This increases change
coupling and makes ownership, SLA, security policy, and release impact unclear.

Recommended bounded contexts:

- `ticketing`
- `monitoring`
- `renewalpayment`
- `lifeplanning`
- `backlog` (or move to a documentation/product-management system)
- `identityaccess`

For the next phase, a modular monolith is sufficient. Microservices are not required yet. Enforce
module boundaries with packages, interfaces, schema ownership, and tests first.

### 5.2 Diagram-to-code traceability

The diagrams describe target or conceptual models, not the implemented physical model.

- Ticket ER contains User, Team, Category, Priority, SLA, TicketAssignment, TicketComment,
  Attachment, StatusHistory, KnowledgeArticle, VendorEscalation, and SatisfactionSurvey.
- The SQLite implementation stores requester, assignee, category, priority, and status mostly as
  text columns in `tickets`; several conceptual entities are absent.
- Life Planning ER describes plan/version/segment/withdrawal/rider/result/projection/document/audit
  entities.
- The current Java database contains Life Planning configuration and calculation-rule tables, but
  not the complete versioned planning aggregate shown in the ER.
- RYP database pre-design separates history, transaction, and detail and includes UUID and
  idempotency concepts.
- The Java prototype uses `apl_payments` and related tables with a different physical model and
  does not implement the pre-design idempotency contract.

Decision required: label each diagram as `Conceptual`, `Logical Target`, or `Physical Current`.
Never present the current diagrams as an as-built model until reconciled.

### 5.3 API contract

The APIs are manually routed and manually serialize JSON. There is no OpenAPI document, schema
validation, consistent error envelope, correlation ID, version lifecycle policy, or contract test.

Required API standards:

- OpenAPI 3.x contract;
- consistent resource naming and HTTP status codes;
- JSON request bodies for public integration APIs;
- validation errors with field/code/message;
- idempotency key for payment creation and callback processing;
- signed callback authentication and timestamp/replay validation;
- pagination metadata;
- correlation/request ID;
- API version deprecation policy.

### 5.4 Data architecture

SQLite is acceptable for a single-user/local demo. It is not the target for production payment or
multi-instance hosting. The Docker/Render guidance also acknowledges ephemeral storage risk.

Production target should use a managed relational database, preferably PostgreSQL, with:

- versioned migrations;
- foreign keys enabled and verified;
- unique constraints for business idempotency;
- decimal/money precision rules;
- UTC timestamps plus business timezone conversion;
- audit trail and immutable payment events;
- backup, restore, retention, and reconciliation controls;
- encryption and PII classification.

### 5.5 Non-functional requirements missing or incomplete

- availability and recovery objectives (SLA/SLO, RTO, RPO);
- peak TPS/concurrency and batch volumes;
- response-time targets;
- authentication and role matrix;
- audit and regulatory retention;
- PDPA/PII handling;
- monitoring, alerting, and operational dashboard;
- downstream retry, timeout, circuit-breaker, and dead-letter policy;
- reconciliation cut-off and financial exception workflow;
- release/rollback strategy.

## 6. Dev Lead Assessment

### 6.1 Maintainability

Measured current Java source:

- `WebMain.java`: about 2,331 lines / 127 KB
- `TicketDatabase.java`: about 2,706 lines / 135 KB
- `GuiMain.java`: about 636 lines
- `Main.java`: about 414 lines

The two largest classes violate separation of concerns and make regression testing difficult.
Suggested package structure:

```text
com.example
  shared.http
  shared.persistence
  identity
  ticketing.api
  ticketing.application
  ticketing.domain
  ticketing.persistence
  renewalpayment.api
  renewalpayment.application
  renewalpayment.domain
  renewalpayment.persistence
  lifeplanning.api
  lifeplanning.application
  lifeplanning.domain
  lifeplanning.persistence
```

### 6.2 Transaction integrity

Ticket assignment/follow-up/close first update `tickets`, then call `addTicketHistory`, which opens
another connection. Private message and its history record are also separate operations. A failure
between operations leaves inconsistent state.

Payment status/reconcile flows read and update through separate connections and have no explicit
transaction or optimistic locking. Concurrent callbacks/actions can overwrite state or process a
transition twice.

Required fix pattern:

- service/application method owns one connection/transaction;
- repository overloads accept the transaction connection;
- commit only after state and audit/history records succeed;
- rollback on any failure;
- add optimistic version or guarded transition predicates;
- enforce idempotency with a unique database constraint.

### 6.3 Security

Critical:

- username and password are hard-coded in `WebMain.java`;
- every authenticated user receives the same static session value;
- cookie lacks `Secure` (it has `HttpOnly` and `SameSite=Lax`);
- no session store, expiry, rotation, logout invalidation, brute-force control, or MFA;
- no role-based authorization;
- no CSRF token for state-changing HTML forms;
- payment callback has no signature or trusted-client authentication;
- Life Planning API bypasses authentication entirely;
- HTTP errors render Java exception text to the browser.

High:

- no explicit request body size limit;
- no rate limiting;
- no security headers such as CSP, frame protection, and MIME sniffing protection;
- no structured security/audit event model;
- mobile drafts may contain personal/financial information in unencrypted AsyncStorage.

Positive:

- SQL values are generally passed through prepared statements;
- HTML output has escaping helpers;
- session cookie uses `HttpOnly` and `SameSite=Lax`.

### 6.4 Concurrency and reliability

- `HttpServer` default executor gives limited operational control.
- `currentExchange`/request page handling should be reviewed for any thread-local dependency and
  guaranteed cleanup; cleanup currently exists in `finally`.
- `nextTicketId()` style application-generated IDs can race under concurrent requests unless the
  database guarantees the insert outcome and retry behavior.
- SQLite busy timeout, WAL mode, foreign key mode, and connection settings are not centrally
  configured.
- External feed calls need explicit connection/read timeouts, retry policy, user-agent policy, and
  error classification.

### 6.5 Validation and error handling

- Form input is parsed manually.
- Business enums/status transitions are strings in multiple layers.
- Some invalid values are allowed to reach database/business methods.
- Generic exceptions are converted into an HTML 500 containing `exception.toString()`.
- JSON APIs do not have a uniform exception-to-response mapper.

Recommended:

- typed request/response DTOs;
- central validation;
- domain status/value objects;
- state transition policy;
- safe public error codes and server-side structured logs;
- never expose stack/class/database detail to normal users.

### 6.6 Testability and quality gates

No dedicated Java test directory or automated backend test suite was found. Release validation is
mainly a manual checklist.

Minimum test pyramid:

- unit tests for Life Planning and APL calculation/rule evaluation;
- state transition tests for ticket and payment workflows;
- repository integration tests against a disposable database;
- HTTP contract tests for authentication, APIs, and error handling;
- concurrency/idempotency tests for payment callback and ticket creation from feeds;
- mobile repository/database tests;
- smoke tests for packaged Docker runtime;
- encoding snapshots for Thai UI/API text.

Recommended CI gates:

1. Java compile and tests
2. TypeScript/JavaScript lint and typecheck
3. dependency and secret scan
4. migration test from previous database version
5. API contract test
6. Docker build and health check
7. release artifact/version generation

### 6.7 Mobile observations

Renewal Payment mobile:

- has a better initial separation into domain/repository/database/service layers;
- TypeScript typecheck passes in the reviewed workspace;
- local SQLite is suitable for offline/demo data, but sync/source-of-truth rules must be defined;
- payment status and financial data should not become independently authoritative on device.

Life Planning mobile:

- `package.json` declares a `typecheck` script but does not declare TypeScript;
- local `tsc` was not available, so the typecheck command fails;
- source is JavaScript, so either add a deliberate JS check/lint setup or migrate to TypeScript;
- visible mojibake sequences indicate an encoding problem in source or prior file conversion;
- default API URL is `http://localhost:8080`, which does not point to the development host from a
  physical iPad/device;
- AsyncStorage draft parsing silently ignores errors and has no schema version/migration.

## 7. Prioritized Risk Register

### P0: Must resolve before production/security testing

1. Replace hard-coded credentials/static session with real identity and server-side sessions or
   signed short-lived tokens.
2. Authenticate and authorize every sensitive route; define role/action matrix.
3. Add CSRF protection for browser forms and signed authentication for payment callbacks.
4. Add idempotency/replay protection to payment creation and callback handling.
5. Make payment/ticket state change plus audit/history atomic.
6. Remove internal exception details from client responses.
7. Move production persistence from ephemeral/local SQLite to managed database.

### P1: Required for controlled pilot

1. Split Java code into bounded-context modules and application/repository layers.
2. Add automated calculation, workflow, repository, and HTTP tests.
3. Establish OpenAPI contracts and consistent error responses.
4. Add database migration/version tooling and integrity constraints.
5. Add structured logs, metrics, tracing/correlation ID, health/readiness endpoints.
6. Define NFRs, operational ownership, RTO/RPO, retention, and reconciliation rules.
7. Correct Thai encoding and mobile API environment configuration.

### P2: Maintainability and scale

1. Introduce connection pooling and configured executor after load profile is known.
2. Add background job/outbox pattern for SMS, GL, and downstream updates.
3. Separate seed/demo data from production migrations.
4. Generate API clients from contract.
5. Align diagrams with as-built schemas and automate documentation checks.
6. Split repository/release boundaries if the products have different owners or cadences.

## 8. Recommended Delivery Sequence

### Phase 0: Baseline (1 short iteration)

- freeze and tag the current demo;
- classify diagrams and documents;
- define product owners and bounded contexts;
- add CI compile/typecheck and test skeleton;
- document environment/secrets configuration.

### Phase 1: Safety foundation

- identity, session, RBAC, CSRF, callback signing;
- safe error handler and structured logging;
- transaction boundaries, idempotency, migration framework;
- managed database target and environment separation.

### Phase 2: Modularization and contracts

- extract application/domain/repository modules one workflow at a time;
- publish OpenAPI;
- add contract/integration tests;
- isolate external adapters (Core, GL, SMS, payment gateway, Pantip/social).

### Phase 3: Production readiness

- outbox/retry/reconciliation;
- observability and alerting;
- load/security/DR testing;
- data migration rehearsal;
- operational runbooks and rollback plan.

## 9. Verified Commands and Results

Reviewed on 2026-07-30:

```text
javac -encoding UTF-8 -d out src\main\java\com\example\ticket\*.java
Result: PASS

npm.cmd run typecheck
Working directory: projects/renewal-payment-mobile/mobile-renewal-payment
Result: PASS

npm.cmd run typecheck
Working directory: projects/life-planning-mobile
Result: FAIL - local `tsc` executable is unavailable
```

PowerShell's `npm.ps1` was blocked by the machine execution policy; `npm.cmd` was used for the
valid renewal-payment check. No server was started and no write workflow was executed because this
review was requested as analysis, not as a production/data mutation task.

## 10. Working Tree Caution

At review time the working tree already contained modified and untracked files. These changes are
assumed to belong to the user. Future work must inspect `git status` and targeted diffs and must
not discard or overwrite unrelated edits.

## 11. Architecture Decisions Pending

Record answers here or in ADR files:

1. Is this repository a demo portfolio, a shared prototype workspace, or a product monorepo?
2. Which system is authoritative for APL/RYP policy, payment, receipt, GL, and reconciliation?
3. Is Life Planning calculation illustrative or actuarially approved?
4. Which diagram is the approved target physical data model?
5. Required identity provider and role model?
6. Required audit retention and PDPA classification?
7. Online-only versus offline mobile behavior and conflict resolution?
8. Production deployment topology and managed database?
9. Expected volume, concurrency, availability, RTO, and RPO?
10. Which downstream operations require synchronous confirmation versus asynchronous outbox?

## 12. Memory Update Rule

When architecture or implementation changes materially:

1. update `Last reviewed`;
2. record the verified current state, not only the target design;
3. move resolved risks to an ADR/change log rather than silently deleting history;
4. keep commands and results reproducible;
5. distinguish facts observed in code from recommendations and pending decisions.

## 13. Downloads Knowledge Base (2026-07-30)

Source reviewed: `C:\Users\lenovo\Downloads`

Detailed coverage and durable domain memory:

- `docs/memory/DOWNLOADS_DOCUMENT_MEMORY.md`

Coverage completed:

- 40 Excel workbooks
- all 339 Excel worksheets, including 66 hidden sheets
- approximately 1.02 million non-empty Excel cells scanned
- approximately 386,046 Excel formula cells scanned
- 38 PDF documents / 668 pages
- 7 DOCX documents, including body, tables, headers, footers, notes, and comments where present
- 1 legacy `.doc` file (Jira HTML export)
- 1 Draw.io file / 3 diagram pages

Key additions to project memory:

1. Life Planning source chain is Product Specification -> BRD -> calculation model -> screen/API
   specification. The current-looking calculation sources are model V5.7 and Self Design V1.5,
   but an approved release/version matrix is still required.
2. Life Planning includes RP/TP premium design, sum assured, investment return, savings,
   retirement/annuity, withdrawal, riders, COI/account-value sustainability, occupation caps,
   projection, and sales illustration.
3. RYP/APL scope includes Legacy and InsureMO eligibility, realtime premium/interest, QR/Credit
   Card payment, receipts, Core update, reconciliation, GL, notification, dashboard status, and
   payment-history/detail views.
4. Payment result codes are channel-specific. QR/Cheque, Credit Card, and Direct Debit codes must
   be interpreted with the channel and state machine, not as one shared status code.
5. TLPro-to-TL Smart migration spans prospect, address, PDPA, quotation/rider, application,
   insured/beneficiary/guardian, documents, payment, refund, eKYC, and related offer/tracking
   entities.
6. UAM uses View/Create/Update/Delete/Approve/Reject across trainee agent, agent, unit, center,
   region, division, director, and expired-license roles. Multiple current/archive/hidden matrices
   create policy source-of-truth risk.
7. The API landscape is broad and version-fragmented. `TLI_Surrounding _API_Spec.xlsx` alone has
   68 worksheets, including producer/consumer, UW, payment, refund, notification, document,
   consent, receipt, and collection integrations.
8. Cached formula error values are concentrated in Life Planning simulation/template sheets.
   They require controlled Excel recalculation and scenario classification before being treated
   as implementation defects.
9. Downloads include production-like identifiers and personal/financial examples. Raw extracted
   content must remain outside Git; only sanitized summaries and coverage metadata are retained.
10. `[NASA] BRD - Life Planning LV V.2.4.pdf` and its `(1)` copy are byte-identical.

## 14. TASA Confluence Knowledge Source (2026-07-30)

Source space:

- `TASA` — TLI Agent Super APP
- Homepage: `https://tlidigitalgroup.atlassian.net/wiki/spaces/TASA/overview?homepageId=64782585`
- Space ID: `64782341`
- Detailed memory: `docs/memory/TASA_AGENT_SUPER_APP_MEMORY.md`

Classification:

- TASA is primarily an Agent/Candidate/Career Planning domain source.
- It is related to the broader TL Smart ecosystem but is not the authoritative source for
  customer Life Planning V1 actuarial formulas.
- Career Goal Setting & Sale Simulation must remain a separate bounded context from customer
  Life Planning, although both can reuse shared UI, calculation, content, audit, and draft
  infrastructure.

Confirmed first-pass capabilities from `[APP] วางแผนอาชีพ (Goal Setting & Sale Simulation)`:

1. Seven-step candidate career-planning journey: conversation opening, engagement, TLI business
   strengths, income simulation, career path, agent application, and notes.
2. Actors are unit, center, region, and division-level agents.
3. Income simulation supports monthly-income target or sales-target input.
4. Sales-target inputs include policies per month, commission percentage, and premium per policy.
5. Results cover first-year monthly income, activity targets, five-year active/passive income,
   career benefits, and qualification information.
6. Candidate data is entered from Candidate List/Profile; draft data must be saved and prefilled.
7. Configurable content includes selected business highlights, awards, benefits, and video content.
8. ASQ and trainee-agent e-Application are downstream journeys.

Source caution:

- The main Sale Simulation page is version 1.1 and marked `draft`.
- The exact calculation formulas remain in referenced Google Sheet
  `Goal and Sale Simulation Model_20240924`; they are not yet represented in this repository.
- Formula implementation must wait for extraction/version confirmation and Golden Test cases.

## 15. Project Docs Knowledge Base (2026-07-31)

Source reviewed: `C:\Users\lenovo\plantuml-demo\docs`

Detailed sanitized coverage and analysis:

- `docs/memory/DOCS_DOCUMENT_MEMORY.md`

Verified coverage:

- 52 Excel workbooks / all 584 worksheets, including 108 hidden sheets
- 37 PDFs / all 665 pages
- 7 DOCX documents plus 1 legacy `.doc`
- 1 Draw.io file / 3 pages
- 1 PowerPoint / 16 slides
- 2 PNG solution diagrams
- 6 TXT, 2 project Markdown, and 3 PlantUML supporting artifacts
- no parser errors in the Excel, PDF, or DOCX passes

New durable conclusions:

1. Application/e-Application is an orchestration domain spanning authentication risk checks,
   insured and beneficiary data, health answers, PDPA, DOPA/eKYC, verified email, documents,
   signatures, preview, payment, e-Submission, status tracking, and application detail.
2. Submission requires a server-side completeness policy and explicit recoverable workflow
   states; screen progress alone must never authorize final submission.
3. The 105-sheet Life Planning POC API catalog confirms wide integration dependencies across
   identity, consent, payment/refund, OCR, documents, Core/DIM, UW, correspondence, signatures,
   counter-offer, family, notification, and cheque. POC sheets are evidence, not production
   contracts.
4. OIC e-Policy/Custodian scope targets 1 January 2027 in the reviewed material. TL Smart must
   support electronic-original policy generation, signing, custodian submission/verification,
   rejection and resubmission, endorsement, retrieval, retention, and optional paper-copy
   requests with complete audit evidence.
5. Rider wording, name mapping, benefit units, and amount formatting are product-versioned
   business content. Use effective-dated configuration shared by UI, calculations, quotation,
   application, and policy-document generation.
6. ASA menu/permission workbooks are versioned across releases and contain historical/hidden
   variants. One machine-readable authorization source must drive both UI visibility and API
   enforcement.
7. The project-doc corpus contains production-like customer and financial examples. Raw files
   and extracted samples must remain outside commits; Memory retains only sanitized findings
   and coverage metadata.
