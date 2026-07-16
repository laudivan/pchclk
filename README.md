# PchClk ⏰

An open-source, lightweight, offline-first Punch Clock solution designed for small offices and public administration departments. 

Licensed under the **MIT License**.

## 🚀 Key Features
- **Offline-first PWA Front-ends**: Seamless experience even under unstable network conditions.
- **Dynamic QR-Code Clock-in**: Prevents location spoofing using a Smart TV/Widescreen active clock with daily-rotating hashes (updated every 15 minutes).
- **One Device per Employee**: Tight security binding verified on each punch-clock request.
- **SQLite with WAL**: High-performance, zero-maintenance, zero-configuration local database.
- **Containerized**: Native deployment with Podman and `podman-compose`.

## 🛠️ Technology Stack
- **Backend**: Node.js, Express (REST API), SQLite (`better-sqlite3` or similar Node WAL driver).
- **Frontend**: Vue.js, Bootstrap (Web Responsive & PWA).
- **DevOps**: Podman, `podman-compose`.

---
*PchClk is free software. Copyleft is in our roots, designed to empower local administrations in the Brazilian Northeast and beyond.*
