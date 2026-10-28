# DentaBook - Dental Clinic & Appointment Management Platform

A web platform for dental service discovery, price estimation, online appointment booking, and clinic management.

---

## 📁 Repository Structure

```
DentaBook/
├── docs/                       # Formal project & client documentation
│   ├── 01_PROJECT_OVERVIEW.md         # Executive summary, problem statement & user roles
│   ├── 02_PATIENT_WORKFLOW.md         # Complete 18-step customer journey & flowchart
│   ├── 03_CLINIC_ADMIN_WORKFLOW.md    # Complete 13-step clinic/admin lifecycle
│   ├── 04_FEATURE_SPECIFICATIONS.md   # Estimator logic, booking engine & specifications
│   └── 05_DELIVERY_ROADMAP.md         # Phases, milestones & client sign-off checklist
├── internal/                   # Developer & AI staging notes (retained for future migration)
│   └── README.md
├── src/                        # Web application source code (to be developed)
│   └── .gitkeep
├── sync.bat                    # One-click Windows backup & sync tool (pull + commit + push)
├── sync.ps1                    # PowerShell sync script
├── Information.txt             # Original client brief
├── .gitignore                  # Git ignore rules for dependencies and environment files
└── README.md                   # Repository guide
```

---

## 🔄 Cloud Syncing & Backup

To sync your work or pull recent updates across your devices:

### Option 1: One-Click Sync (Windows)
Double-click [`sync.bat`](file:///d:/Antigravity/DentaBook/sync.bat) in the project folder. It will:
1. Fetch and rebase the latest commits from GitHub.
2. Stage all your modified/new files.
3. Commit with a timestamp (or a custom message you specify).
4. Push everything to GitHub automatically.

### Option 2: Command Line
```powershell
.\sync.ps1 -Message "Your update description"
```
Or with standard Git commands:
```bash
git pull --rebase origin main
git add .
git commit -m "Your update description"
git push origin main
```

---

## 📖 Client Documentation Index

- [**01. Project Overview & Scope**](docs/01_PROJECT_OVERVIEW.md)
- [**02. Patient Journey & Workflow (18 Steps)**](docs/02_PATIENT_WORKFLOW.md)
- [**03. Clinic & Administration Workflow (13 Steps)**](docs/03_CLINIC_ADMIN_WORKFLOW.md)
- [**04. Feature Specifications & Requirements**](docs/04_FEATURE_SPECIFICATIONS.md)
- [**05. Delivery Roadmap & Milestones**](docs/05_DELIVERY_ROADMAP.md)

---

## 🔒 Confidentiality & Client Delivery Plan
This repository serves as the private development workspace, continuous backup, and synchronization hub. Once development is complete, a dedicated clean client repository will be generated containing exclusively the deployable code (`src/`) and client documentation (`docs/`), keeping all internal notes, agent transcripts, and developer records strictly isolated.
