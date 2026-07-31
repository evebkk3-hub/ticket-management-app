# TASA Agent Super APP Memory

Last reviewed: 2026-07-30

## Source

- Space: `TASA` — TLI Agent Super APP
- Space ID: `64782341`
- Homepage ID: `64782585`
- Homepage: https://tlidigitalgroup.atlassian.net/wiki/spaces/TASA/overview

The homepage is still mostly the default Confluence team-space template. Requirements must be
discovered from child pages rather than inferred from the overview page.

## Relevant Page Reviewed

### [APP] วางแผนอาชีพ (Goal Setting & Sale Simulation)

- Page ID: `221708289`
- Story code: `SALE_SIM`
- Version: `1.1`
- Story status: `NEW`
- Document status: `draft`
- Release: `1`
- Last modified: 2025-05-08
- URL: https://tlidigitalgroup.atlassian.net/wiki/spaces/TASA/pages/221708289

### Objective

Allow unit-to-division agents to guide an agent candidate through a career conversation and show an
illustrative income simulation for the life-insurance agent career.

### Actors

- Unit
- Center
- Region
- Division

### Journey

1. เปิดบทสนทนา — conversation opening and candidate interests
2. การเปิดใจ — financial behavior and reasons to increase income
3. จุดแข็งธุรกิจไทยประกันชีวิต — configurable company/business highlights
4. เครื่องมือคำนวณรายได้ — income and activity simulation
5. เส้นทางอาชีพ — agent career path and video content
6. ขั้นตอนการสมัครตัวแทน — ASQ and trainee-agent application
7. จดบันทึก — plain-text candidate notes with return-to-origin navigation

Users may navigate directly between steps; completion of every step is not mandatory.

## Step 4: Income Simulation

Two input modes are specified.

### Monthly-income target

- Range: 20,000–300,000 THB
- Increment: 10,000 THB
- Default: 50,000 THB
- Calculation result also updates data used for recommended course auto-assignment.

### Sales target

- Policies per month: 1–8; default 4
- Commission: 10%, 20%, 30%, or 40%; default 40%
- Premium per policy: 20,000–300,000 THB
- Premium increment: 10,000 THB
- Default premium: 20,000 THB

### Outputs

- First-year monthly income simulation
- Total income and progress views
- Example progression for agent, unit manager (month 4), and center manager (month 7)
- Activity funnel: calls, first appointments, second appointments, submitted policies
- Year 1–5 income split into active and passive income
- Five-year center-manager income summary
- Career benefits and qualification content including MBRT, MDRT, COT, and TOT

Qualification criteria are described as based on official first-year-premium rules for 2025 and may
change annually. They must therefore be versioned configuration, not hard-coded permanent rules.

## Content and Integration

- Some conversation content is fixed in the application.
- Business highlights, selected awards, benefit descriptions, and videos are configurable.
- Referenced data tables include `business_highlight` and `video_content`.
- Candidate List/Profile is the entry point.
- ASQ and trainee-agent e-Application are downstream destinations.
- General API failure uses the common full-screen error pattern.

## References Identified

- `REF_SALE_SIM_001` — Goal Setting & Sale Planning content
- `REF_SALE_SIM_002` — Agent Career Path Scheme
- `REF_SALE_SIM_003` — Goal and Sale Simulation Model_20240924 (calculation source)
- `REF_SALE_SIM_004` — Application input validation
- `REF_SALE_SIM_005` — ASQ questionnaire
- `REF_SALE_SIM_006` — Trainee-agent e-Application
- `REF_SALE_SIM_007` — Candidate Profile
- `REF_SALE_SIM_008` — Candidate List
- `REF_SALE_SIM_009` — Common General Error

Related Jira references include ASAA-1645, ASAA-2124 through ASAA-2128, ASAA-2827, and ASAA-1647.

## Architecture Boundary

Do not merge the domains:

| Domain | Primary subject | Calculation purpose |
| --- | --- | --- |
| Customer Life Planning | Insurance prospect/customer | Premium, coverage, goals, AV, riders, retirement |
| Agent Career Planning | Agent candidate | Career income, sales activity, promotion, benefits |

Reusable platform capabilities may include:

- authenticated agent and organization scope;
- candidate/prospect shell components;
- stepper, draft/prefill, notes, and content rendering;
- versioned calculation configuration;
- chart/table components;
- audit, telemetry, and common errors.

Separate calculation engines, rule catalogues, APIs, persistence models, and Golden Tests are
required.

## Open Items

1. Read and version the full TASA page inventory.
2. Obtain and verify `Goal and Sale Simulation Model_20240924`.
3. Confirm formula rounding and promotion assumptions.
4. Confirm whether income values are illustrative or compliance-controlled.
5. Confirm API contracts and storage tables for draft/prefill, notes, and course assignment.
6. Confirm the latest qualification year and effective-date configuration.
