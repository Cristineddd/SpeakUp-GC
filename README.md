# SpeakUp GC — DEIU Formal Complaint Platform

**Gordon College Diversity and Equity Inclusion Unit (DEIU)**  
A secure, role-aware web platform for formal complaint submission, investigation, and resolution.

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend framework | React 18 + Next.js 14 | Component-based UI |
| Routing | React Router v6 (compat shim for Next.js) | Page/dashboard routing |
| Styling | Tailwind CSS + shadcn/ui | Utility-first design system |
| Auth | Firebase Authentication | Email/password + Google OAuth |
| Database | Firebase Firestore | Real-time complaint & user data |
| Storage | Firebase Storage | Evidence file uploads |
| Functions | Firebase Cloud Functions (TypeScript) | Server-side logic (status updates, admin ops) |
| PDF generation | jsPDF + jspdf-autotable | Client-side case report export |
| Date utilities | date-fns | Date formatting & relative time |
| State management | React Context API + useState/useEffect | Local UI & auth state |
| Type safety | TypeScript | End-to-end type coverage |

---

## User Roles & Dashboards

| Role | Dashboard Component | Route |
|------|--------------------|----|
| **Complainant** | `views/dashboard/Dashboard.tsx` | `/dashboard` |
| **Respondent (Defendant)** | `views/dashboard/RespondentDashboard.tsx` | `/dashboard` (inline) |
| **CODI / Case Handler** | `views/dashboard/CaseHandlerDashboard.tsx` | `/dashboard` → `/admin/reports` |
| **System Admin** | `views/admin/AdminDashboard.tsx` | `/admin` |

### Role Resolution (DashboardRouter / SmartDashboardRouter)

Role is resolved in priority order:
1. Firebase Admin flag (`isAdmin` from `AuthContext`)
2. `useRepresentativeRole` hook (Firestore `representatives/{uid}`)
3. Firestore `users/{uid}.role` field
4. `localStorage.userProfile.userRole` (set after profile completion)
5. Default: `complainant`

---

## Use Cases

| ID | Use Case | Actor | Status |
|----|---------|-------|--------|
| UC-01 | Register / Login | All | ✅ |
| UC-02 | Submit Informal Report | Complainant | ✅ |
| UC-03 | Submit Formal Complaint | Complainant | ✅ |
| UC-04 | Track Complaint Status | Complainant | ✅ |
| UC-05 | View & Download Case Report (PDF) | Complainant | ✅ |
| UC-06 | Assign Case Handler | Admin | ✅ |
| UC-07 | Investigate Case | CODI / Handler | ✅ |
| UC-08 | Update Case Status | CODI / Handler | ✅ |
| UC-09 | Generate Case PDF Report | CODI / Admin | ✅ |
| UC-10 | Receive Formal Notification | Respondent | ✅ |
| UC-11 | Submit Formal Response | Respondent | ✅ |
| UC-12 | View Respondent Dashboard | Respondent | ✅ |
| UC-13 | Manage Users | Admin | ✅ |
| UC-14 | View Analytics | Admin / Dean | ✅ |
| UC-15 | Case Chat / Messaging | All | ✅ |
| UC-16 | AI Assistant Widget | All | ✅ |

---

## Project Structure

```
frontend/src/
├── views/
│   ├── dashboard/
│   │   ├── Dashboard.tsx           # Complainant dashboard
│   │   ├── RespondentDashboard.tsx # Defendant/Respondent dashboard
│   │   └── CaseHandlerDashboard.tsx# CODI / Case Handler dashboard
│   ├── admin/
│   │   ├── AdminDashboard.tsx      # System Admin dashboard
│   │   ├── DeanCoordinatorDashboard.tsx
│   │   └── SmartDashboard.tsx      # Admin role switcher
│   ├── complainant/
│   │   ├── ComplainantDashboard.tsx
│   │   ├── FormalComplaint.tsx
│   │   └── SubmitComplaint.tsx
│   └── Landing.tsx
├── components/
│   ├── routing/
│   │   ├── DashboardRouter.tsx     # Role-aware dashboard router
│   │   └── SmartDashboardRouter.tsx
│   ├── ai/
│   │   └── AIAssistantWidget.tsx   # Floating AI assistant
│   └── layout/
│       └── Sidebar.tsx
├── services/
│   ├── pdfService.ts              # jsPDF report generation
│   ├── notificationService.ts     # Firestore notifications
│   └── messageService.ts          # Firestore chat rooms
├── contexts/
│   └── AuthContext.tsx            # Firebase Auth context
├── hooks/
│   ├── usePermissions.ts          # Role-based permission checks
│   └── useRepresentativeRole.ts   # Firestore representative role
├── types/
│   ├── users.ts                   # UserRole enum, user interfaces
│   ├── complaints.ts              # ComplaintStatus enum, complaint types
│   ├── notification.ts            # Notification types
│   └── message.ts                 # ChatRoom types
└── compat/
    └── router.tsx                 # React Router → Next.js compat shim
```

---

## Activity Flows

### Complaint Submission Flow
```
Complainant → Login → Submit Complaint → DEIU validates → Assign Handler
→ Investigation → Notify Respondent → Respondent submits response
→ Deliberation → Resolution → Notify all parties
```

### Authentication Flow
```
User visits landing → Register/Login → Email verification
→ Profile completion (role selection) → Routed to role dashboard
```

### PDF Report Flow
```
User (Complainant/Handler/Admin) → Clicks "Download Report"
→ pdfService.ts (jsPDF) → generateCaseReport() / generateSummaryReport()
→ PDF auto-downloaded in browser
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Firebase project (`speakupgc-2026`)

### Installation

```bash
cd frontend
npm install
```

### Environment Setup

Create a `.env.local` file in `/frontend`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Build for Production

```bash
npm run build
npm start
```

---

## 👥 User Roles

| Role | Access |
|---|---|
| `student` | File complaints, track cases, messaging |
| `representative` | View assigned complaints |
| `coordinator` | Manage complaints, messaging |
| `dean` | Dashboard, reports |
| `admin` | Full access |
| `superadmin` | Full access + user management |

---

## 🔒 Security

- Anonymous or identified complaint filing
- Firebase Auth with Google Sign-In
- Session-based persistence (logout on browser close)
- Firestore security rules per role

---

## 📄 License

For academic use only — Gordon College, Olongapo City.

