# SpeakUp GC — DEIU Formal Complaint Platform

**Gordon College · Diversity, Equity & Inclusion Unit (DEIU)**  
A secure, role-aware web platform for formal GBV and harassment complaint filing, investigation, and resolution under RA 11313 and RA 7877.

---

## Overview

SpeakUp GC gives Gordon College students, faculty, and staff a confidential channel to:

- File **formal complaints** (anonymous or identified) with evidence upload
- **Track case status** in real time from submission through resolution
- **Message assigned CODI members** through encrypted case chat
- Access **Know Your Rights**, the **Learn Hub**, and the **Laya AI assistant**
- Respond to complaints as a **respondent** when formally notified

DEIU administrators and CODI members manage the full case lifecycle — assignment, investigation, escalation, messaging, compliance reporting, and closure.

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 18 + Next.js 14 | App UI and routing |
| Routing | Next.js App Router + React Router compat shim | Page and dashboard routes |
| Styling | Tailwind CSS + shadcn/ui | Design system |
| Auth | Firebase Authentication | Email/password + Google OAuth |
| Database | Cloud Firestore | Real-time complaints, users, chat |
| Storage | Firebase Storage | Evidence file uploads |
| Functions | Firebase Cloud Functions (TypeScript) | Status updates, email notifications |
| Email | Resend (via Cloud Functions) | Verification and notification emails |
| PDF | jsPDF + jspdf-autotable | Case and compliance report export |
| Maps | Leaflet | Incident location picker |
| AI | Gemini / Groq / OpenRouter (fallback chain) | Laya chatbot on Know Your Rights |
| PWA | `@ducanh2912/next-pwa` | Installable progressive web app |

---

## User Roles

| Role | Description | Primary routes |
|------|-------------|----------------|
| **Complainant** | Files and tracks complaints | `/dashboard`, `/complaints`, `/complaints/new` |
| **Respondent** | Views assigned cases and submits formal responses | `/dashboard` (respondent view) |
| **CODI / Case Handler** | Investigates assigned cases, updates status, chats with parties | `/admin/dashboard`, `/admin/reports`, `/admin/messages` |
| **Administrator** | Full DEIU access — users, representatives, analytics, compliance | `/admin/*` |

### Representative roles (Firestore `representatives` collection)

| Role | Access |
|------|--------|
| `admin` | Full system control — assign handlers, manage users, analytics, compliance reports |
| `codi` / `handler` | Assigned case queue, messaging, status updates, case reclassification |

> **Note:** Dean / Coordinator view-only dashboards are **not active** in the current release. Analytics and compliance reporting are handled by **Administrators** and **CODI members** (limited to their own performance stats).

### Role resolution (`DashboardRouter`)

Resolved in priority order:

1. Firebase admin flag (`isAdmin` from `AuthContext`)
2. Firestore `representatives/{uid}` via `useRepresentativeRole`
3. Firestore `users/{uid}.role`
4. `localStorage.userProfile.userRole` (after profile completion)
5. Default: **complainant**

---

## Key Features

### Complainant
- Multi-step **formal complaint** form with category selection, respondent info, evidence, and optional anonymity
- **My Cases** list with live status badges and case ID tracking
- **Case tracking** page with progress timeline
- **Case chat** with assigned CODI member (handler identity masked on sensitive case types)
- **Notifications** for status changes and messages
- **Know Your Rights** hub and **Learn Hub** educational content
- **Laya AI assistant** for GBV and reporting guidance
- **Community groups** (browse and join support groups)

### CODI / Case Handler
- **Case queue** with filters (status, category, escalation, assignment)
- **Handler assignment** (admin) and self-assigned case management
- **Status workflow** with allowed transitions enforced by Cloud Functions
- **Case reclassification** (category + title sync)
- **Escalation controls** and SLA tracking
- **Encrypted messaging** per case
- **Internal notes** and activity timeline
- **Closed cases** archive
- **Performance analytics** (own assigned cases)

### Administrator
- Everything CODI can do, plus:
- **User management** (create, deactivate, role assignment)
- **Representatives management** (CODI roster)
- **System analytics** dashboard
- **Compliance reports** (GDPR / privacy-aware exports)
- **Content library** and **location data** management
- **System settings**

### Respondent
- View cases where they are named as respondent
- Receive formal notifications
- Submit formal responses
- Case messaging where permitted

---

## Routes

### Public
| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/login`, `/forgot-password`, `/reset-password` | Authentication |
| `/terms`, `/privacy`, `/mission` | Legal and info pages |

### Complainant (protected)
| Route | Description |
|-------|-------------|
| `/dashboard` | Complainant home |
| `/complaints` | My cases |
| `/complaints/new` | File formal complaint |
| `/case-tracking/[id]` | Case detail & timeline |
| `/case-chat/[complaintId]` | Case conversation |
| `/notifications` | Notification center |
| `/know-your-rights` | Rights hub + Laya chatbot |
| `/learn` | Learn Hub |
| `/browse-groups` | Community groups |
| `/account` | Profile & settings |

### Admin / CODI
| Route | Description |
|-------|-------------|
| `/admin/dashboard` | Admin or CODI overview |
| `/admin/reports` | Case queue & case detail |
| `/admin/messages` | CODI message inbox |
| `/admin/closed-cases` | Archived cases |
| `/admin/analytics` | Analytics |
| `/admin/compliance-reports` | Compliance report generator |
| `/admin/representatives` | CODI roster (admin) |
| `/admin/users` | User management (admin) |
| `/admin/settings` | System settings (admin) |
| `/admin/content-library` | Content management (admin) |
| `/admin/locations` | Campus location data (admin) |

---

## Project Structure

```
SpeakUp-GC-main/
├── frontend/                    # Next.js app
│   ├── app/                     # App Router pages
│   └── src/
│       ├── views/
│       │   ├── dashboard/       # Complainant, Respondent, Case Handler views
│       │   ├── admin/           # AdminDashboardRedesign, CodiDashboard, AdminReportsPage, …
│       │   ├── complainant/     # FormalComplaint, SubmitComplaint
│       │   ├── case/            # CaseChat, CaseTrackingPage
│       │   └── Landing.tsx
│       ├── components/
│       │   ├── admin/           # AdminLayout, AssignHandlerDialog, EscalationControls, …
│       │   ├── case/            # Status managers, activity logger
│       │   ├── chat/            # HandlerChatInterface, ChatInterface
│       │   └── routing/         # DashboardRouter, SmartDashboardRouter
│       ├── services/            # Firestore service layer
│       ├── contexts/            # AuthContext
│       ├── hooks/               # useRepresentativeRole, usePermissions, …
│       ├── types/               # complaints, users, representative, escalation, …
│       └── constants/           # formalComplaintCategories, …
└── backend/
    ├── firebase/                # firestore.rules, indexes, firebase.json
    └── functions/src/           # Cloud Functions (status, email, notifications)
```

---

## Activity Flows

### Complaint lifecycle
```
Complainant files complaint → DEIU validates → Admin assigns CODI handler
→ Investigation & messaging → Respondent notified (if applicable)
→ Deliberation → Resolution / dismissal → Case closed & archived
```

### Authentication
```
Landing → Register / Login → Email verification → Profile completion
→ Role-based dashboard routing
```

### Case chat
```
Complainant or CODI opens case → Chat room created per complaint
→ Real-time messages → Unread badges on dashboard & admin sidebar
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- Firebase project (e.g. `speakupgc-2026`)
- Firebase CLI (for rules and functions deployment)

### Installation

```bash
cd frontend
npm install
```

### Environment

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=
```

Optional (AI chatbot):

```env
NEXT_PUBLIC_GEMINI_API_KEY=
NEXT_PUBLIC_GROQ_API_KEY=
NEXT_PUBLIC_OPENROUTER_API_KEY=
```

### Development

```bash
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Production build

```bash
cd frontend
npm run build
npm start
```

### Firebase (backend)

```bash
# Deploy Firestore rules
./backend/deploy-rules.sh

# Cloud Functions
cd backend/functions
npm install
npm run deploy
```

---

## Security

- Anonymous or identified complaint filing
- Firebase Auth with Google Sign-In
- Firestore security rules scoped by role and case assignment
- Handler identity masked from complainants on sensitive case types
- Soft-delete pattern on users and complaints
- Encrypted case messaging; evidence stored in Firebase Storage
- Compliance-aware reporting for institutional audits

Complaint updates by staff require the user to be **assigned to the case** or hold the **admin** role (enforced in `firestore.rules`).

---

## Legal Framework

This platform operates under:

- **RA 11313** — Safe Spaces Act  
- **RA 7877** — Anti-Sexual Harassment Act  
- **RA 10173** — Data Privacy Act  
- **GC-CODI** — Gordon College Committee on Decorum and Investigation procedures  

---

## License

For academic use only — Gordon College, Olongapo City.
