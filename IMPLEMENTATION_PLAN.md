# Lakshya Admin — New Features Implementation Plan

## Overview
Implementing 4 features: (1) Admin password reset for any user, (2) Filter options on all pages, (3) Search on registration/payment/audit pages, (4) Registration detail with team info.

## Proposed Changes

---

### Feature 1: Admin Reset Any User's Password

#### [MODIFY] [userService.js](file:///c:/Users/Shiyani%20Prins/OneDrive/Desktop/Lakshya%20admin%20and%20coordinator/server/src/services/userService.js)
- Rename `resetCoordinatorPassword` → `resetUserPassword` (function already works for any user by ID, just a naming clarification)

#### [MODIFY] [Users.jsx](file:///c:/Users/Shiyani%20Prins/OneDrive/Desktop/Lakshya%20admin%20and%20coordinator/client/admin/pages/Users.jsx)
- Add a "Reset Password" button (key icon) in the actions column for non-admin users
- Add a reset password modal with new password input (reuse pattern from Coordinators.jsx)
- Wires to existing `PATCH /users/:id/reset-password` endpoint

---

### Feature 2: Filter Options on Each Page

#### [MODIFY] [Events.jsx](file:///c:/Users/Shiyani%20Prins/OneDrive/Desktop/Lakshya%20admin%20and%20coordinator/client/admin/pages/Events.jsx)
- Add `category` dropdown filter (populated from fetched events' unique categories)
- Add `eventType` dropdown filter (solo/team)

#### [MODIFY] [Users.jsx](file:///c:/Users/Shiyani%20Prins/OneDrive/Desktop/Lakshya%20admin%20and%20coordinator/client/admin/pages/Users.jsx)
- Add `role` dropdown filter (participant/coordinator/admin)
- Add `isActive` dropdown filter (Active/Blocked)

#### [MODIFY] [Coordinators.jsx](file:///c:/Users/Shiyani%20Prins/OneDrive/Desktop/Lakshya%20admin%20and%20coordinator/client/admin/pages/Coordinators.jsx)
- Add `status` dropdown filter (Active/Blocked)

#### [MODIFY] [Registrations.jsx](file:///c:/Users/Shiyani%20Prins/OneDrive/Desktop/Lakshya%20admin%20and%20coordinator/client/admin/pages/Registrations.jsx)
- Add `status` filter (pending/confirmed/cancelled/waitlisted) alongside existing event filter

#### [MODIFY] [Payments.jsx](file:///c:/Users/Shiyani%20Prins/OneDrive/Desktop/Lakshya%20admin%20and%20coordinator/client/admin/pages/Payments.jsx)
- Add `eventId` filter (event dropdown) alongside existing status filter

#### [MODIFY] [AuditLogs.jsx](file:///c:/Users/Shiyani%20Prins/OneDrive/Desktop/Lakshya%20admin%20and%20coordinator/client/admin/pages/AuditLogs.jsx)
- Add `action` filter dropdown (populated dynamically from unique action types)

#### [MODIFY] [auditLogs.js (route)](file:///c:/Users/Shiyani%20Prins/OneDrive/Desktop/Lakshya%20admin%20and%20coordinator/server/src/routes/auditLogs.js)
- Add `action` query param support to the audit logs GET route

---

### Feature 3: Search on Registration, Payment, and Audit Logs Pages

#### [MODIFY] [registrationService.js](file:///c:/Users/Shiyani%20Prins/OneDrive/Desktop/Lakshya%20admin%20and%20coordinator/server/src/services/registrationService.js)
- Add `search` query support: search by participant name/email (using `$lookup` + regex on populated User fields, or a two-stage approach: find matching User IDs first, then filter registrations)

#### [MODIFY] [paymentService.js](file:///c:/Users/Shiyani%20Prins/OneDrive/Desktop/Lakshya%20admin%20and%20coordinator/server/src/services/paymentService.js)
- Add `search` query support: search by participant name/email or transaction ID

#### [MODIFY] [auditLogs.js (route)](file:///c:/Users/Shiyani%20Prins/OneDrive/Desktop/Lakshya%20admin%20and%20coordinator/server/src/routes/auditLogs.js)
- Add `search` query support: search by admin name, action, or details

#### [MODIFY] [Registrations.jsx](file:///c:/Users/Shiyani%20Prins/OneDrive/Desktop/Lakshya%20admin%20and%20coordinator/client/admin/pages/Registrations.jsx)
- Add search input with debounce

#### [MODIFY] [Payments.jsx](file:///c:/Users/Shiyani%20Prins/OneDrive/Desktop/Lakshya%20admin%20and%20coordinator/client/admin/pages/Payments.jsx)
- Add search input with debounce

#### [MODIFY] [AuditLogs.jsx](file:///c:/Users/Shiyani%20Prins/OneDrive/Desktop/Lakshya%20admin%20and%20coordinator/client/admin/pages/AuditLogs.jsx)
- Add search input with debounce

---

### Feature 4: Registration Detail with Team Info

#### [MODIFY] [registrationService.js](file:///c:/Users/Shiyani%20Prins/OneDrive/Desktop/Lakshya%20admin%20and%20coordinator/server/src/services/registrationService.js)
- Enhance `getRegistrations` to deep-populate team data:
  - `teamId` → populate `teamName`, `status`
  - `teamId.leaderId` → populate leader's `name`, `email`
- After fetching registrations, batch-fetch TeamMembers for any team registrations and populate member details

#### [MODIFY] [Registrations.jsx](file:///c:/Users/Shiyani%20Prins/OneDrive/Desktop/Lakshya%20admin%20and%20coordinator/client/admin/pages/Registrations.jsx)
- Add expandable detail rows (like Events/Users pages) showing:
  - Full participant info (name, email, phone, college, branch, year)
  - Event info (title, type, fee)
  - Registration status and date
  - **For team events**: Team name, leader name, team member list with names/emails/status

---

## Verification Plan

### Manual Verification
Since no automated test framework is set up, verification will be done via the running dev servers:

1. **Password Reset**: Navigate to Users page → click reset password icon on a non-admin user → enter new password → confirm → verify success toast
2. **Filters**: Visit each page (Events, Users, Coordinators, Registrations, Payments, Audit Logs) → use each filter dropdown → verify table updates with correct filtered data
3. **Search**: On Registration, Payment, and Audit Logs pages → type in search box → verify results filter correctly by name/email
4. **Registration Detail**: On Registration page → click on a team event registration row → verify expanded detail shows team name, leader name, and all team members
