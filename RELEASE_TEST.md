# Release Test Plan

Run this checklist before releasing the application.

## 1. Build Test

```powershell
javac -encoding UTF-8 -d out src\main\java\com\example\ticket\*.java
```

Expected result:

- Command exits with code `0`
- No Java compiler errors

## 2. Start Web Application

```powershell
.\run-ticket-web.cmd
```

Open:

```text
http://localhost:8080
```

Expected result:

- Web app starts on port `8080`
- Login page loads

Login test user:

```text
User: Supachai.h
Password: 12345678
```

## 3. Web Smoke Test

Check these URLs:

```text
http://localhost:8080/
http://localhost:8080/apl
http://localhost:8080/roadmap
http://localhost:8080/roadmap/R3
http://localhost:8080/projects
http://localhost:8080/projects/APL-RYP-PAYMENT
http://localhost:8080/tickets
http://localhost:8080/tickets?page=2
http://localhost:8080/pantip
http://localhost:8080/social
```

Expected result:

- All pages return HTTP `200`
- Pages redirect to `/login` before sign-in
- Navigation links are visible
- APL/RYP Payment Console is visible
- Roadmap shows Epic R3 with Features, User Stories, and Impact Analysis
- Projects page shows the APL/RYP payment requirement
- List/feed pages show pagination when there are more than 10 records
- Thai text displays correctly

## 4. Ticket Workflow Test

1. Create a ticket from the web form.
2. Open `List View`.
3. Click the ticket subject.
4. Confirm the detail page opens.
5. Assign the ticket to another team.
6. Add a follow-up note.
7. Close the ticket with a closure note.
8. Add a private message from the support team.
9. Add a private message from the customer.

Expected result:

- Ticket is saved to SQLite
- Ticket appears in List View
- Detail page shows metadata, description, and history
- Assignment changes assignee and sets status to `ASSIGNED`
- Assignment note appears in history
- Follow-up note appears in history
- Close action sets status to `CLOSED`
- Close note appears in history
- Private messages appear in the private customer conversation section
- Private message actions appear in structured ticket history

## 5. APL/RYP Payment Test

1. Open `APL/RYP Payment Console`.
2. Confirm sample policies show Legacy and InsureMo.
3. Create a QR payment for `APL100001`.
4. Create a Credit Card payment for a policy that allows cards.
5. Confirm Credit Card is blocked or disabled for ineligible policy.
6. Call API:

   ```text
   GET /api/apl/policies
   GET /api/apl/quote?policyNo=APL100001
   POST /api/apl/payments
   ```

Expected result:

- Premium, rider, interest, and total due are calculated
- Payment transaction includes collection/trx/reference fields
- Premium and interest receipt numbers are generated
- Reconcile status is `MATCHED`
- Core transaction status and GL status are updated
- QR/Credit Card payments queue SMS

## 6. R3 Roadmap Test

1. Open `Roadmap`.
2. Open `R3`.
3. Confirm 8 features are visible.
4. Confirm `US-01` through `US-20` are visible.
5. Confirm `IA-01` through `IA-08` are visible.
6. Call API:

   ```text
   GET /api/backlog/epics
   GET /api/backlog/epics/R3
   ```

Expected result:

- Epic R3 is returned
- Features 1-8 are returned
- User Stories 1-20 are nested under their features
- Impact Analysis items IA-01 to IA-08 are returned

## 7. Pantip Monitor Test

1. Open `Pantip Monitor`.
2. Add a keyword.
3. Search the keyword.
4. Create a ticket from an imported topic.
5. Click the same topic action again.

Expected result:

- New topics are imported
- Existing topics are skipped by `topic_id`
- Created tickets link back to imported topics
- Duplicate ticket action opens the existing ticket, shows Source References, and records history

## 8. Social Monitor Test

1. Open `Social Monitor`.
2. Select `PANTIP` or `REDDIT`.
3. Enter a keyword.
4. Click `Search and Import New Posts`.
5. Create a ticket from an imported post.
6. Click the same post action again.

Expected result:

- New posts are imported
- Existing posts are skipped by `source + external_id`
- Created tickets link back to imported posts
- Duplicate ticket action opens the existing ticket, shows Source References, and records history
- Reddit search does not fail with HTTP `403`

## 9. Database Check

Database path:

```text
data/tickets.db
```

Tables expected:

- `tickets`
- `projects`
- `agile_epics`
- `agile_features`
- `agile_user_stories`
- `agile_impact_analysis`
- `apl_policies`
- `apl_payments`
- `keywords`
- `pantip_topics`
- `social_posts`

## Release Criteria

Release only when:

- Build passes
- Web pages return HTTP `200`
- R3 roadmap hierarchy and API work
- APL/RYP payment app and API work
- Ticket create/detail/assign/follow-up/close/private-message works
- Duplicate feed ticket actions reuse existing tickets and preserve source references/history
- Pantip import does not duplicate existing topics
- Social import does not duplicate existing posts
- No stack traces are shown to normal users during expected workflows
