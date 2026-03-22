## SmartPayBin Real-Project Split Roadmaps

This plan targets the full real deployment (Raspberry Pi + physical sensors + dashboard + backend). The mock hardware script remains in scope only as a controlled test harness for API and frontend development.

### Roadmap 1: Backend Owner

**Goal**
Deliver production-ready APIs and device-ingestion services that support both real hardware and simulator traffic.

**Phases**
1. Platform hardening (Week 1)
1. Add environment-driven config (PORT, MONGODB_URI, API keys, CORS origins).
2. Add centralized error middleware and consistent API error schema.
3. Harden `Deposit` model constraints (required fields, enums, value bounds, timestamps).
4. Refactor route-inline business logic into controllers/services.

2. Device ingestion contract (Week 1)
1. Finalize ingestion endpoint contract for Raspberry Pi payloads.
2. Add request validation and idempotency strategy (dedupe using device event ID).
3. Add API authentication for device clients (token or signed request).
4. Add ingestion logging and trace IDs.

3. Read APIs for dashboard (Week 2)
1. GET deposits (pagination, filtering by bin/user/time).
2. GET summary (totals, rewards, average fill, waste-type distribution).
3. GET bin health view (latest sensor state, last-seen timestamp, status).

4. Reliability and operations (Week 2)
1. Add rate limiting and abuse protection.
2. Add health and readiness endpoints.
3. Add integration tests for ingest + summary paths.
4. Publish backend API contract document for Frontend and Hardware teams.

**Backend Deliverables**
1. Stable ingest contract for real Pi devices.
2. Query APIs powering frontend analytics.
3. Secure and observable API service with test coverage.

**Backend Verification**
1. Real hardware events are accepted with auth and stored correctly.
2. Duplicate event replay does not double count rewards.
3. Dashboard aggregates match raw stored events.

### Roadmap 2: Frontend Owner

**Goal**
Deliver an operations dashboard for real-time monitoring of bins, deposits, and device health.

**Phases**
1. Frontend foundation (Week 1)
1. Scaffold app, environment setup, API client, route structure.
2. Define UI design system (type, spacing, color tokens, responsive layout).
3. Implement shared loading/error/retry UI components.

2. Core product pages (Week 2)
1. Overview: total deposits, rewards, active bins, average fill.
2. Bins page: per-bin fill status, last-seen hardware heartbeat, alert states.
3. Deposits page: recent activity table with filters and pagination.

3. Real-hardware operations UX (Week 3)
1. Add alert views for offline devices and threshold crossings.
2. Add refresh strategy (polling interval now, websocket-ready architecture later).
3. Add role-ready structure for admin/operator extension.

4. Release quality (Week 3)
1. Responsive and accessibility checks.
2. Frontend integration tests for core views.
3. Demo and staging environment validation.

**Frontend Deliverables**
1. Real-time capable operations dashboard.
2. Bin-health and deposits monitoring workflows.
3. Production-ready frontend build pipeline.

**Frontend Verification**
1. Live UI metrics update from real Pi ingestion.
2. Device offline state surfaces within expected latency window.
3. API failure states remain non-breaking and recover automatically.

### Roadmap 3: Hardware Owner (Real Pi + Sensors + Simulator)

**Goal**
Deliver reliable physical device telemetry from Raspberry Pi and maintain simulator parity for development/testing.

**Phases**
1. Hardware baseline and sensor integration (Week 1)
1. Finalize sensor BOM and GPIO wiring map.
2. Implement sensor driver layer on Raspberry Pi (distance/fill, weight, optional RFID).
3. Define calibrated conversion formulas and noise filtering rules.
4. Validate local sensor reads and timestamping.

2. Edge software and transport (Week 2)
1. Build Pi edge agent to package events in backend contract format.
2. Add local buffering/queue for offline operation and retry on reconnect.
3. Add secure auth material handling for device-to-backend communication.
4. Add heartbeat messages for device liveness.

3. Field reliability and calibration (Week 3)
1. Run repeated fill/empty cycles and record sensor drift.
2. Tune thresholds for full-bin, near-full, and anomaly states.
3. Validate end-to-end latency from sensor trigger to backend persistence.

4. Simulator as test harness (parallel, ongoing)
1. Keep `mock_pi.py` for CI/local UI/API tests when hardware is unavailable.
2. Ensure simulator payload schema always matches real device schema.
3. Add deterministic scenario modes for regression testing.

**Hardware Deliverables**
1. Calibrated Pi device image and edge agent.
2. Reliable event delivery with offline retry behavior.
3. Simulator maintained as contract-test tool, not production source.

**Hardware Verification**
1. Real sensor events align with measured physical inputs.
2. Offline-to-online recovery drains queued events without loss.
3. Simulator and real device produce contract-compatible payloads.

### Cross-Team Integration Milestones

1. Milestone A (End Week 1): Ingestion contract freeze and first sensor-calibrated sample payload approved.
2. Milestone B (Mid Week 2): Backend ingest + frontend overview + Pi heartbeat fully integrated.
3. Milestone C (End Week 3): Full demo on real hardware with fallback simulator test flow validated.
4. Milestone D (End Week 4): Pilot-ready checklist complete (security, reliability, monitoring).

### Scope Boundaries

1. Primary scope: real Raspberry Pi and sensors for production path.
2. Secondary scope: simulator for development, QA, and regression automation.
3. Out of immediate scope unless scheduled: multi-site fleet management and cloud autoscaling.

### Coordination Rules

1. Backend contract is the shared source of truth; any schema change requires versioned change notes.
2. Hardware team publishes calibration reports and payload examples each week.
3. Frontend team validates dashboard assumptions against real telemetry, not simulator-only behavior.
4. Daily sync tracks blockers, schema changes, sensor anomalies, and readiness state.