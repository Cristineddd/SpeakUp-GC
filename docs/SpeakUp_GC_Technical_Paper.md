# SpeakUp GC: A Web-Based Case Management System for the Diversity, Equity, and Inclusion Unit of Gordon College

**A Technical / Research Paper**

**Presented by**  
Franz Jeric D. Borbo  
Cristine Mariel I. Sabado  

**Bachelor of Science in Information Technology**  
Gordon College · Olongapo City, Philippines  

**In partial fulfillment of the requirements for the degree of**  
Bachelor of Science in Information Technology  

**Class Adviser:** Erlinda Casela-Abarintos  
**Research Adviser:** Reynaldo G. Bautista Jr., MSCS  
**Project / Industry Adviser:** Kenneth Jones B. Basa  
**Project Beneficiary:** Joseph A. Atencio  

---

## Abstract

SpeakUp GC is a web-based case management system developed for the Diversity, Equity, and Inclusion Unit (DEIU) of Gordon College to digitize the filing, tracking, investigation, and resolution of formal complaints related to sexual harassment and gender-based misconduct. The system was designed in response to operational gaps identified through a structured interview with the DEIU officer-in-charge, which revealed that complaint handling remained largely manual—requiring physical documentation, in-person follow-ups, and non-centralized records—despite the presence of Committee on Decorum and Investigation (CODI) procedures aligned with Republic Act No. 7877 (Anti-Sexual Harassment Act) and Republic Act No. 11313 (Safe Spaces Act).

The platform adopts a three-tier architecture composed of a React and Next.js frontend, Firebase Cloud Functions and Next.js API routes as the backend, and Firebase Firestore as a real-time NoSQL database. Core capabilities include role-based access control for Administrators, Complainants, Case Handlers, and Respondents (Defendants); anonymous and identified reporting; evidence upload; real-time case tracking and notifications; confidential case messaging; automated escalation; administrative analytics; and AI-assisted guidance through the LAYA chatbot. Evaluation of the system is grounded in the Technology Acceptance Model (TAM), the ISO/IEC 25010 software quality model, and the System Usability Scale (SUS). This paper documents the problem context, theoretical grounding, system architecture, workflows, database design, security controls, and technology stack of SpeakUp GC.

**Keywords:** SpeakUp GC, case management system, DEIU, CODI, gender-based harassment, Role-Based Access Control, Technology Acceptance Model, ISO/IEC 25010, Firebase, Next.js, Gordon College

---

## 1. Introduction

### 1.1 Background of the Study

Gordon College, a local university in Olongapo City, Philippines, designates the Diversity, Equity, and Inclusion Unit (DEIU) as the primary body responsible for handling formal complaints specifically related to sexual harassment and gender-based misconduct. The DEIU operates under the Committee on Decorum and Investigation (CODI) in coordination with other institutional disciplinary mechanisms that define procedures for filing, processing, and resolving complaints. This framework is aligned with Republic Act No. 7877 and Republic Act No. 11313, both of which require educational institutions to establish accessible and effective mechanisms for reporting and addressing harassment and related offenses.

To assess the current complaint-handling process, the researchers conducted a structured interview with the DEIU officer-in-charge, Mr. Joseph Atencio. Structured interviews are commonly used in systems analysis to identify workflow issues, user requirements, and operational gaps (Creswell & Creswell, 2018). The findings revealed a significant gap between CODI’s intended procedures and actual institutional practice.

Although CODI defines a formal complaint process, implementation remains limited, resulting in low awareness among students, faculty, and staff regarding official reporting channels. This aligns with prior studies indicating that grievance systems are often underutilized when institutions fail to promote accessibility and awareness effectively (Rana et al., 2015).

At present, complaint submission requires physical documentation, including written complaints and notarized forms. Records are manually received, stored, and managed by the DEIU office. Communication with complainants is conducted through in-person interactions, with no centralized or digital record of correspondence. This fragmented approach limits traceability, delays case monitoring, and increases the risk of incomplete documentation—challenges that directly affect compliance with RA 7877 and RA 11313.

These operational limitations indicate the need for a structured and centralized digital system that aligns actual practice with institutional procedures and national legal requirements. SpeakUp GC addresses these gaps by improving accessibility, ensuring proper documentation, and enabling transparent case tracking within the DEIU.

### 1.2 Objectives of the System

SpeakUp GC was developed to:

1. Provide a secure and accessible web portal for formal complaint submission with evidence upload and optional anonymity.  
2. Enable real-time case tracking and notifications for complainants, respondents, and handlers.  
3. Enforce Role-Based Access Control (RBAC) so sensitive case data is visible only to authorized parties.  
4. Support CODI investigation workflows including handler assignment, internal notes, status updates, messaging, and formal resolution.  
5. Automate escalation of unprocessed cases according to defined service-level thresholds (24, 48, and 72 hours).  
6. Maintain a complete audit trail for institutional accountability and compliance reporting.  
7. Integrate AI-assisted guidance (LAYA) to help users understand rights and reporting procedures.

### 1.3 Statement of the Problem

This study aims to develop a web-based complaint management system for the DEIU of Gordon College to address inefficiencies in complaint handling, improve accessibility, and ensure proper documentation and tracking of cases in compliance with institutional policies and relevant laws such as RA 7877 and RA 11313.

The study uses the Technology Acceptance Model to evaluate user adoption, the ISO/IEC 25010 standard to assess software quality, and the System Usability Scale to measure overall user experience.

Specifically, the study seeks to answer the following research questions:

1. What is the current situation of complaint handling in the DEIU of Gordon College in terms of complaint submission, documentation, and case tracking?  
2. What challenges are encountered in the existing manual complaint management system in terms of efficiency, accessibility, documentation, and case monitoring?  
3. What is the level of software quality of the developed system based on ISO/IEC 25010 in terms of:  
   3.1 Functional suitability;  
   3.2 Performance efficiency;  
   3.3 Usability;  
   3.4 Reliability; and  
   3.5 Security?  
4. What is the level of user acceptance of the proposed system based on the Technology Acceptance Model (TAM) in terms of:  
   4.1 Perceived usefulness;  
   4.2 Perceived ease of use; and  
   4.3 Behavioral intention to use?

### 1.4 Significance of the Study

| Stakeholder | Significance |
|-------------|--------------|
| **DEIU of Gordon College** | Provides a centralized platform for managing complaints, improving efficiency, documentation, compliance with RA 7877 and RA 11313, case monitoring, and data-driven decision-making through reports and analytics. |
| **Students, Faculty, and Non-Teaching Staff** | Offers a more accessible, secure, and transparent way to submit complaints through real-time tracking, optional anonymity, and structured communication channels. |
| **Gordon College Administration** | Enhances accountability and transparency; summarized reports and complaint trends support evaluation of institutional performance and policy implementation. |
| **CODI Representatives** | Organizes complaint records, simplifies case assignment, and provides a clear workflow for monitoring and updating case status. |
| **Future Researchers** | Serves as a reference for web-based complaint management systems in educational institutions and for integrating TAM, ISO/IEC 25010, and usability evaluation in system development. |

### 1.5 Scope and Limitation of the Study

**Scope.** This study focuses on the design, development, and evaluation of SpeakUp GC for the DEIU of Gordon College. The system supports submission, tracking, and management of complaints related to sexual harassment and gender-based misconduct in accordance with institutional procedures and RA 7877 and RA 11313.

Included features:

- User authentication with RBAC for Administrator, Complainant, Case Handler, and Defendant/Respondent  
- Complaint submission with categorization by type and peer-to-peer relationship  
- Identified and anonymous reporting; alias and pseudonym management  
- Unique case numbering; real-time status tracking with notifications  
- Confidential internal messaging; automated report generation  
- Administrative dashboard with analytics and data visualization  
- Escalation monitoring, evidence management, and AI-assisted guidance (LAYA)

Evaluation uses TAM for user acceptance and ISO/IEC 25010 for software quality, complemented by SUS for overall usability.

**Limitations.**

1. The system requires a stable internet connection and does not support offline functionality.  
2. It is developed as a web-based application and does not include a dedicated native mobile application.  
3. Evaluation uses simulated test cases rather than real institutional grievances; reported acceptance during low-stress simulations does not guarantee adoption during real, high-stress grievance events.  
4. The system does not replace existing legal or institutional procedures; physical submission of notarized documents may remain necessary where required by policy.

### 1.6 Definition of Terms

| Term | Definition |
|------|------------|
| **Complaint Management System** | A digital platform used to collect, track, and manage complaints within an organization. |
| **DEIU** | Diversity, Equity, and Inclusion Unit; the office responsible for handling complaints related to harassment and misconduct in Gordon College. |
| **CODI** | Committee on Decorum and Investigation; the institutional body responsible for investigating complaints in accordance with legal and institutional policies. |
| **Role-Based Access Control (RBAC)** | A security mechanism that restricts access to data and system functionalities based on assigned user roles. |
| **Anonymous Reporting** | The process of submitting complaints without revealing the identity of the complainant. |
| **Case Handler** | Authorized personnel responsible for reviewing, processing, and managing assigned complaints. |
| **Real-Time Tracking** | A system feature that allows users to monitor complaint progress and status as updates occur. |
| **Republic Act No. 7877** | Philippine law defining and penalizing sexual harassment in workplaces and educational institutions. |
| **Republic Act No. 11313** | Philippine Safe Spaces Act expanding protection against gender-based sexual harassment and requiring institutional reporting mechanisms. |
| **LAYA** | AI-powered chatbot assistant in SpeakUp GC that provides guidance on rights and reporting procedures. |

---

## 2. Theoretical and Conceptual Framework

### 2.1 Theoretical Framework

The development and evaluation of SpeakUp GC are grounded in the **Technology Acceptance Model (TAM)** and the **ISO/IEC 25010 Software Quality Model**, with the **Input–Process–Output (IPO) Model** explaining system operations and **Role-Based Access Control (RBAC)** acting as the security framework.

**Technology Acceptance Model (TAM)** (Davis, 1989) serves as the theoretical foundation for measuring user adoption. It explains how users accept a system based on *perceived usefulness* and *perceived ease of use*. In this study, TAM evaluates acceptance of SpeakUp GC’s digital reporting and case-tracking capabilities, including behavioral intention to use.

**ISO/IEC 25010** (ISO, 2011) is adopted to assess technical software quality, focusing on:

- Functional suitability  
- Performance efficiency  
- Usability  
- Reliability  
- Security  

**IPO Model.** SpeakUp GC can be described as transforming inputs (complaint data, evidence, user credentials, handler actions) through processes (validation, assignment, notification, escalation, messaging, resolution) into outputs (case records, notifications, reports, audit logs, status updates).

**RBAC.** Access to sensitive grievance data is constrained by role (Administrator, Complainant, Case Handler, Respondent), enforced through protected routes and Firestore security rules.

### 2.2 Conceptual Framework

The conceptual framework illustrates how SpeakUp GC system features are expected to influence user perceptions based on TAM, and how these perceptions relate to system usage and operational outcomes.

**Independent variables (system components):**

1. Complaint management features — online submission, categorization, and real-time tracking  
2. System functionalities — RBAC, alias/anonymity support, and internal messaging  
3. Administrative tools — case assignment, status monitoring, and automated report generation  

**Intervening variables (TAM):**

- Perceived usefulness — belief that the system enhances complaint-handling efficiency and transparency  
- Perceived ease of use — belief that the system is user-friendly and requires minimal effort  
- Behavioral intention to use — willingness to adopt and continue using the system  

**Dependent variables:**

- Actual or self-reported system usage  
- Operational outcomes — perceived efficiency, transparency in case tracking, and overall user satisfaction  

**Expected relationships.** Improved functionality, reliability, and accessibility are expected to positively influence perceived usefulness. Clear interface design and simplified workflows are expected to enhance perceived ease of use. Both constructs are expected to positively influence behavioral intention and actual usage, which in turn align with improved perceptions of efficiency, transparency, and satisfaction—subject to the study’s evaluation design.

```
[System Features]
 Complaint Mgmt · RBAC/Anonymity/Messaging · Admin Tools
            │
            ▼
[TAM Mediators]
 Perceived Usefulness ←→ Perceived Ease of Use
            │
            ▼
 Behavioral Intention → System Usage
            │
            ▼
[Outcomes]
 Efficiency · Transparency · Satisfaction
            │
            + ISO/IEC 25010 Quality Evaluation
```

**Figure 1.** Conceptual framework of SpeakUp GC (TAM-mediated relationships with ISO quality evaluation).

---

## 3. System Architecture

SpeakUp GC follows a web-based **three-tier architecture** consisting of the frontend (client), backend (server), and database layers. This structure supports organized complaint processing, secure role-based access, real-time updates, and centralized incident record management for Gordon College.

```
┌─────────────────────────────────────────────────────────────────┐
│                     CLIENT LAYER (Frontend)                      │
│         React · Next.js · Tailwind CSS · shadcn/ui               │
│   Complainant | Respondent | CODI Officer | System Admin UIs     │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS / Firebase SDK
┌────────────────────────────▼────────────────────────────────────┐
│                     SERVER LAYER (Backend)                       │
│   Firebase Cloud Functions (TypeScript) · Next.js API Routes     │
│   Auth · Workflow · Validation · Notifications · LAYA (Gemini)   │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                    DATA LAYER (Database & Storage)               │
│   Firebase Firestore · Firebase Storage · Cloudinary             │
│   Users · Complaints · Messages · Notifications · Audit Logs     │
└─────────────────────────────────────────────────────────────────┘
```

**Figure 2.** High-level three-tier architecture of SpeakUp GC.

### 3.1 Frontend (Client Layer)

The system interface is developed using **React** with **Next.js**. It provides separate dashboards and modules for Complainants, Respondents, CODI Officers, and System Administrators. The frontend handles formal complaint submission, case tracking, evidence upload, notifications, AI-powered chatbot assistance (LAYA), analytics, and user interaction.

The user interface is styled using **Tailwind CSS** and **shadcn/ui** to ensure a modern, accessible, and responsive design. Client-side PDF generation is handled through **jsPDF** and **jspdf-autotable**. Incident location selection is supported through an interactive map picker (**Leaflet**). Application state is managed primarily through the **React Context API**.

### 3.2 Backend (Server Layer)

The backend is implemented through **Firebase Cloud Functions** written in **TypeScript** and **Next.js API routes**. It processes requests from the frontend, handles authentication checks, manages case workflows, validates submitted complaints, assigns handlers, records case decisions, generates notifications, and triggers email alerts.

The backend integrates with **Google Gemini AI** to power the LAYA chatbot assistant and form-validation features. Email notifications are delivered for critical case updates such as assignments and status changes.

### 3.3 Database Layer

SpeakUp GC uses **Firebase Firestore**, a NoSQL cloud database. It stores user accounts, complainant profiles, formal complaints, evidence metadata, case assignments, case decisions, CODI workflow data, notifications, chat messages, audit logs, and system settings. Firestore provides real-time synchronization so users see updated case information without manual page refreshes. Evidence files are stored in **Firebase Storage** and **Cloudinary**, with references persisted in complaint documents.

---

## 4. System Workflow

### 4.1 Complaint Submission and Case Data Flow

```
Login / Auth → Formal Complaint Form → Validation & Evidence Upload
     → Firestore (status: pending) → Notify Admin & CODI
     → Admin Assigns Handler → status: inProgress
     → Notify Handler & Complainant → Real-time Tracking
```

**Figure 3.** Complaint submission and assignment flow.

Complainants log in using email/password or Google account, then complete the formal complaint form. Information collected includes complaint title and description; incident category (e.g., Sexual Harassment, Discrimination, Bullying); severity (Low to Critical); incident date, time, and location (interactive map); respondent and witness information; and supporting evidence (photos, documents, or links). Optional anonymity and alias/pseudonym support protect complainant identity when needed.

After client and server validation, the system stores the complaint as a **pending** case with a unique identifier, timestamps, and escalation level **0**. Immediate notifications are sent to the complainant (confirmation) and to Admin/CODI users (new-case alert). When an administrator accepts a case for investigation and assigns a CODI handler, the record is updated with handler identity and assignment timestamp, and status becomes **inProgress**. Both handler and complainant receive assignment notifications.

Escalation monitoring calculates hours unprocessed since submission and automatically escalates after **24, 48, and 72 hours**. Escalated cases are highlighted on the admin dashboard.

| Escalation Level | Condition | Meaning |
|------------------|-----------|---------|
| 0 | Default | Normal — no escalation |
| 1 | > 24 hours unprocessed | Priority |
| 2 | > 48 hours unprocessed | Urgent |
| 3 | > 72 hours unprocessed | Critical |

**Table 1.** Automatic escalation levels in SpeakUp GC.

### 4.2 Investigation and Resolution Data Flow

```
Handler Reviews Evidence → Case Chat / Internal Notes → Status Updates
     → Formal Decision → Notify Parties → Archive for Audit
```

**Figure 4.** Investigation and resolution flow.

The assigned CODI handler investigates by reviewing evidence, communicating through case chat, adding internal notes (not visible to the complainant), and updating status. Formal resolution decisions include:

| Decision | Description |
|----------|-------------|
| **Resolved** | Complaint addressed satisfactorily |
| **Dismissed** | Insufficient merit or evidence |
| **Referred** | Escalation to another authority or department |
| **Closed** | Finalized with no further action required |

**Table 2.** Resolution decision types.

Decision details, notes, decision-maker information, and timestamps are stored in the complaint record. Notifications are sent to relevant parties; critical updates may also trigger email delivery. Closed cases remain accessible for record-keeping. Status changes are recorded in update history, activity logs, and notification records.

### 4.3 Authentication and Role Routing

```
Landing → Register / Login → Email Verification → Profile Completion
     → Role Resolution → Role-Based Dashboard
```

**Figure 5.** Authentication and dashboard routing flow.

### 4.4 Case Chat Flow

```
Open Case → Chat Room (per complaint ID) → Real-time Messages
     → Unread Badges on Dashboards
```

**Figure 6.** Case messaging flow.

---

## 5. Role-Based Access Control (RBAC)

SpeakUp GC implements RBAC to protect sensitive complaint information and ensure users access only functions related to their responsibilities.

| Role | Capabilities |
|------|----------------|
| **Complainant** (Student, Faculty, or Staff) | Submit complaints with evidence; track cases; view assigned handler info; receive notifications; use LAYA; download PDF reports; use case chat |
| **Respondent / Defendant** | View cases where named; receive formal notifications; submit formal responses; message where permitted |
| **CODI Officer / Case Handler** | View assigned cases; access details and evidence; investigate; add internal notes; update status; communicate with parties; generate reports; monitor escalation; record resolutions |
| **System Admin / DEIU Coordinator** | View all complaints; assign handlers; manage users and roles; configure settings; monitor analytics; access audit logs; generate compliance reports; manage announcements; override decisions when necessary |

**Table 3.** User roles and primary capabilities.

### 5.1 Role Resolution

Roles are resolved in priority order:

1. Firebase Admin flag (`isAdmin` in Firestore)  
2. `representatives` collection for CODI / admin roles  
3. `users` collection `role` field  
4. `localStorage` user role (after profile completion)  
5. Default: **complainant**  

Roles are enforced through protected routes and component-level access control. Complaint updates by staff require the user to be **assigned to the case** or hold the **admin** role (Firestore security rules). On sensitive case types, handler identity may be masked from complainants.

---

## 6. Database Design

SpeakUp GC uses Firebase Firestore for real-time, scalable data management. Relationships are maintained through document references linking users, complaints, messages, notifications, and logs.

| Collection | Purpose | Key Fields |
|------------|---------|------------|
| **users** | User accounts (by user ID) | email, displayName, isAdmin, role, createdAt, auth provider, photoURL, emailVerified |
| **registeredUsers** | Validated registrations (by email) | email, registration timestamp, provider, displayName |
| **complaints** | Formal complaint records | complainant/respondent details, case info, location, evidence, assignment, resolution, escalation, timestamps |
| **notifications** | Real-time alerts | userId, type, title, message, priority, read status, related complaintId, action links, timestamps |
| **representatives** | CODI officer profiles | userId, name, role, email, department, assigned cases, active status |
| **messages** | Case chat messages | caseId, sender details, content, timestamp, read status |
| **activityLogs** | System audit logs | user actions, target data, timestamps, IP address |
| **notificationPreferences** | Notification settings | email and in-app preferences |

**Table 4.** Main Firestore collections.

A complaint document typically includes identity and authorship metadata (including anonymity flags); incident data (title, description, category, severity, date/time, location); party information; evidence references; workflow status and assignment; escalation and SLA fields; resolution details; and internal notes not exposed to complainants.

---

## 7. System Technologies Used

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | React, Next.js | Component UI, routing, application delivery |
| Styling | Tailwind CSS, shadcn/ui | Responsive, accessible design system |
| State | React Context API | Auth and shared client state |
| Authentication | Firebase Authentication | Email/password and Google OAuth |
| Database | Firebase Firestore | Real-time NoSQL data |
| File storage | Firebase Storage, Cloudinary | Documents and images |
| Backend | Firebase Cloud Functions (TypeScript), Next.js API routes | Workflows, validation, notifications |
| AI | Google Gemini AI | LAYA chatbot and form assistance |
| Documents | jsPDF, jspdf-autotable | Case and compliance PDF export |
| Maps | Leaflet | Incident location picker |
| Communications | Email notification services | Critical email alerts |
| Hosting | Vercel | Frontend hosting and CDN |
| Backend hosting | Firebase | Functions, Firestore, Storage |

**Table 5.** Technology stack of SpeakUp GC.

---

## 8. Security and Authentication

SpeakUp GC implements multi-layer security aligned with the sensitivity of grievance data and RA 10173 (Data Privacy Act).

1. **Secure authentication** via Firebase Authentication (email/password and Google OAuth), with password strength requirements and email verification before access (admin bypass where necessary).  
2. **RBAC** via protected routes and Firestore security rules; only authorized users access sensitive data.  
3. **Data validation** on client and server sides; file uploads restricted by type and size.  
4. **API protection** using authentication checks, CORS restrictions, and rate limiting where implemented.  
5. **Anonymous reporting** to protect complainant identity when needed.  
6. **Encryption** in transit (HTTPS) and at rest (Firebase encryption); sensitive configuration stored in environment variables.  
7. **Audit logs** tracking logins, submissions, updates, and deletions.  
8. **Account management** including cascading data cleanup on user deletion and safeguards against unauthorized access.

---

## 9. Deployment and Hosting

| Component | Platform |
|-----------|----------|
| Frontend | Vercel (global CDN delivery) |
| Backend services | Firebase Cloud Functions |
| Database | Firebase Firestore |
| File storage | Firebase Storage and Cloudinary CDN |
| Domains | SSL-secured custom domains |
| Environments | Separated development and production |

**Table 6.** Deployment and hosting configuration.

---

## 10. Research Methodology (Evaluation Design)

Consistent with the full research manuscript, SpeakUp GC is evaluated using a **developmental and descriptive-evaluative** research design. The developmental aspect covers architecture and implementation; the descriptive-evaluative aspect assesses software quality, user acceptance, and usability.

**Locale.** Gordon College, Olongapo City, Philippines, centralized in the DEIU.

**Study groups.**

- **Group A** — DEIU officer-in-charge and authorized CODI representatives (administrative/backend users); preferably total enumeration of willing authorized personnel.  
- **Group B** — stratified sample of students, faculty, and non-teaching staff representing end users who submit and track complaints during the pilot.

**Instruments.**

- TAM questionnaire (perceived usefulness, perceived ease of use, behavioral intention, self-reported use)  
- ISO/IEC 25010 Likert items (functional suitability, performance efficiency, usability, reliability, security)  
- System Usability Scale (SUS), standard 10 items  
- User Acceptance Testing (UAT) pack with pass/fail test cases  

**Data gathering.** Approvals from administration, DEIU, and CODI; orientation and demonstration; Google Forms survey with informed consent; simulated scenarios rather than real grievances; aggregate reporting to protect anonymity; UAT execution for Groups A and B.

**Statistical treatment.** Frequency and percentage for demographics; weighted mean and standard deviation for Likert items; Cronbach’s alpha for scale reliability; Pearson’s *r* or Spearman’s rho for TAM relationships after normality checks; analyses at α = 0.05 using statistical software such as SPSS.

> Note: Chapter 3 of the full manuscript presents the quantitative findings once fieldwork is completed. This technical paper focuses on system design and implementation, while remaining consistent with the study’s evaluation framework.

---

## 11. Discussion

SpeakUp GC consolidates complaint intake, investigation, and resolution into a single institutional platform. Relative to paper-based and fragmented practice identified in the DEIU interview, the system improves:

1. **Accessibility** — browser-based filing with optional anonymity and AI guidance  
2. **Transparency** — real-time tracking for complainants and handlers  
3. **Accountability** — escalation SLAs, audit logs, and role-enforced actions  
4. **Operational efficiency** — automated notifications, assignment workflows, and PDF exports  
5. **Compliance posture** — alignment with Safe Spaces, Anti-Sexual Harassment, and Data Privacy requirements at the process and control level  

Limitations include dependence on cloud availability, internet connectivity, evaluation based on simulated rather than live grievances, and the continued need for notarized physical documents where institutional policy requires them.

---

## 12. Conclusion and Recommendations

### 12.1 Conclusion

This paper presented SpeakUp GC, a web-based case management system for the DEIU and CODI of Gordon College. Built on a three-tier architecture with React/Next.js and Firebase, and evaluated under TAM, ISO/IEC 25010, and SUS frameworks, the platform digitizes complaint submission, role-based investigation, automated escalation, real-time collaboration, and compliance-oriented record-keeping. By integrating secure authentication, RBAC, audit logging, and educational support through LAYA, SpeakUp GC strengthens institutional capacity to respond to sexual harassment and gender-based misconduct reports in a more accessible, confidential, and accountable manner.

### 12.2 Recommendations

1. Sustain institutional promotion and orientation so awareness of official digital reporting channels continues to increase.  
2. Maintain separation between simulated evaluation data and live grievance records, with strict compliance to RA 10173.  
3. Consider future offline/PWA enhancements and deeper analytics for prevention programming.  
4. Continue periodic security and usability review as CODI procedures and legal guidance evolve.  
5. Use the system as a complement to—not a replacement for—required legal and notarized institutional procedures.

---

## References

### Books / Standards

Davis, F. D. (1989). Perceived usefulness, perceived ease of use, and user acceptance of information technology. *MIS Quarterly, 13*(3), 319–340.  
International Organization for Standardization. (2011). *ISO/IEC 25010:2011 Systems and software engineering — Systems and software Quality Requirements and Evaluation (SQuaRE) — System and software quality models*. ISO.  
Creswell, J. W., & Creswell, J. D. (2018). *Research design: Qualitative, quantitative, and mixed methods approaches* (5th ed.). SAGE Publications.

### Journals / Articles / Issuances

Rana, N. P., Dwivedi, Y. K., Williams, M. D., & Weerakkody, V. (2015). Investigating success of an e-government initiative: Validation of an integrated IS success model. *Information Systems Frontiers, 17*(1), 127–142.  
Republic Act No. 7877. *Anti-Sexual Harassment Act of 1995*. Republic of the Philippines.  
Republic Act No. 11313. *Safe Spaces Act*. Republic of the Philippines.  
Republic Act No. 10173. *Data Privacy Act of 2012*. Republic of the Philippines.

### Electronic Sources

Google Firebase Documentation. https://firebase.google.com/docs  
Vercel / Next.js Documentation. https://nextjs.org/docs  
Google AI Gemini API Documentation. https://ai.google.dev/docs  
React Documentation. https://react.dev  

### Institutional Sources

Gordon College Committee on Decorum and Investigation (GC-CODI). Institutional procedures for case investigation and resolution.  
SpeakUp GC Technical Manual. System architecture, workflow, RBAC, database design, technologies, security, and deployment. Gordon College DEIU.  
Borbo, F. J. D., & Sabado, C. M. I. Research manuscript: *SpeakUp GC: A Web-Based Case Management System for the Diversity, Equity, and Inclusion Unit of Gordon College*. Bachelor of Science in Information Technology, Gordon College.

---

## Appendix A. Project Structure (Summary)

```
SpeakUp-GC/
├── frontend/                 # Next.js application
│   ├── app/                  # App Router pages
│   └── src/
│       ├── views/            # Role dashboards and feature screens
│       ├── components/       # UI, admin, case, chat, routing
│       ├── services/         # Firestore and domain services
│       ├── contexts/         # Auth and shared context
│       ├── hooks/            # Permissions, roles, status hooks
│       ├── types/            # Domain TypeScript models
│       └── constants/        # Categories and configuration
└── backend/
    ├── firebase/             # Firestore rules, indexes, config
    └── functions/src/        # Cloud Functions (status, email, notifications)
```

## Appendix B. Primary Application Routes

| Audience | Example Routes |
|----------|----------------|
| Public | `/`, `/login`, `/terms`, `/privacy`, `/mission` |
| Complainant | `/dashboard`, `/complaints`, `/complaints/new`, `/case-tracking/[id]`, `/case-chat/[complaintId]`, `/know-your-rights`, `/learn` |
| Admin / CODI | `/admin/dashboard`, `/admin/reports`, `/admin/messages`, `/admin/closed-cases`, `/admin/analytics`, `/admin/compliance-reports`, `/admin/users`, `/admin/representatives`, `/admin/settings` |

## Appendix C. Mapping to Full Manuscript Chapters

| Manuscript Chapter | Coverage in this Technical Paper |
|--------------------|----------------------------------|
| Chapter 1 — Problem and Background | Sections 1–2 |
| Chapter 2 — Research Methodology | Section 10 |
| Chapter 3 — Data Presentation | Reserved for full manuscript (field results) |
| Chapter 4 — Summary / Conclusion | Section 12 |
| Technical Manual | Sections 3–9 |

---

*Prepared from the SpeakUp GC Research Manuscript and Technical Manual*  
*Gordon College · BSIT · DEIU / CODI Project*  
*For academic and institutional use*
