# TL Smart Foundation & Lead MVP

Expo application for the first TL Smart vertical slice: Lead List and Short
Form Add Lead. It is intentionally isolated from the existing projects.

## Implemented

- Responsive mobile, tablet, and web shell
- Lead list, search, status summary, and quick-create entry point
- Short-form required fields and standard validation messages
- Age-to-birth-date calculation for year/month input
- Existing-customer lookup by 13-digit national ID
- Policy selection with latest policy first
- Duplicate detection scoped by sales owner
- Create/update success flow and default PDPA status
- TLI Agent Super APP career-planning journey with seven navigable steps
- Career income simulation by monthly-income target or sales target
- First-year/five-year illustration, activity funnel, qualification indicator, and candidate notes
- e-Application list and six-step application workflow
- Insured, beneficiary, health, document, signature, and initial-payment readiness
- Completion validation and simulated application submission/reference number

The Career Simulation is explicitly marked `ILLUSTRATIVE_MVP`. It follows the
documented input ranges and journey, but does not claim production parity with
the referenced `Goal and Sale Simulation Model_20240924` spreadsheet.

The e-Application workflow is also an MVP simulation. Document upload,
signature, payment, and Core submission are represented as local UI state and
must be replaced with approved integrations before production.

## Run

```powershell
cd projects\tl-smart
npm install
npm run web
```

## Test

```powershell
npm test
```

Demo customer national ID: `1103700123456`.

## Requirement sources

- [APP Short Form - Add Lead TL Smart](https://tlidigitalgroup.atlassian.net/wiki/spaces/TNS/pages/935247074)
- [NASA-16 Impact Analysis](https://tlidigitalgroup.atlassian.net/wiki/spaces/TNS/pages/935273448)
- [NASA-19 Lead List & Profile](https://tlidigitalgroup.atlassian.net/wiki/spaces/TNS/pages/935247646)
- [TASA Goal Setting & Sale Simulation](https://tlidigitalgroup.atlassian.net/wiki/spaces/TASA/pages/221708289)
- [TNS Step 1.1 Insured Information](https://tlidigitalgroup.atlassian.net/wiki/spaces/TNS/pages/935291654)
- [TNS Step 6 Payment](https://tlidigitalgroup.atlassian.net/wiki/spaces/TNS/pages/935307978)
