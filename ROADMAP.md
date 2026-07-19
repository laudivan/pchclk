# Project Roadmap - PchClk

## Phase 1: Foundation & Architecture
- [x] Initialize repository, `.gitignore`, and Container files (`Containerfile`, `podman-compose.yml`).
- [x] Design SQLite schema with WAL enabled (Employees, Logs, Admins, Device Authorizations).
- [x] Setup Node.js API boilerplate with local database migration scripting.

## Phase 2: Core Backend (REST API)
- [x] Device authorization flow (Admin QR generation -> Device validation).
- [ ] Quarterly hash rotation generator (15-minute window timestamp validations).
- [x] Audit Log system implementation (intercepting and recording affected rows, timestamp, user, action).
- [x] Multilingual internationalization (i18n) setup for API error/status payloads.

## Phase 3: Frontend Interfaces (Vue.js + Bootstrap)
- [ ] **Smart TV Interface**: Live clock + high-contrast auto-refreshing QR Code.
- [ ] **Employee PWA UI**: Offline sync, registration, last 3 months local reports, camera QR-scanner.
- [x] **Admin Dashboard UI**: Configurable custom frequency periods (e.g., Jun 20 to Jul 19), logs visualization, and device authorization modal.

## Phase 4: Hardening & Localization
- [x] Full Brazilian Portuguese (pt-BR) and English (en-US) localization translation maps.
- [ ] End-to-end Containerization testing under Podman.
- [ ] PWA service-workers caching verification.
