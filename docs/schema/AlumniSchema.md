# AlumniSubmission — database schema

**Model name:** `AlumniSubmission`  
**Storage:** MongoDB  
**Collection:** `alumnisubmissions`  
**Purpose:** Engagement data for alumni volunteering as judges, speakers, sponsors, donors, or guests (Lakshya 2026).

Conditional nested objects: if the user selects **Judge** in `engagementRoles`, `judgeDetails` may hold judging experience and event preferences; similarly for **Speaker** → `speakerDetails`, **Guest** → `guestDetails`, etc.

## Fields

| Field | Type | Description |
|--------|------|-------------|
| `name` | String | Full name (required, trimmed). |
| `branch` | String | Academic branch (e.g. IT, CP, EC). |
| `yearOfPassing` | Number | Graduation year. |
| `qualification` | String | One of: `BE`, `ME`, `MCA`. |
| `companyName` | String | Current employer name. |
| `designation` | String | Current professional title. |
| `email` | String | Primary contact email (lowercase, trimmed). |
| `contactNumber` | String | Mobile number. |
| `engagementRoles` | [String] | Roles chosen by the user. Allowed values: `Guest`, `Judge`, `Speaker`, `Donor`, `Sponsor`. |
| `guestDetails` | Object (Mixed) | Optional nested data (e.g. preferred visit timing). |
| `judgeDetails` | Object (Mixed) | Optional nested data (e.g. judging experience, event preferences). |
| `speakerDetails` | Object (Mixed) | Optional nested data (e.g. domain expertise, time slots). |
| `donorDetails` | Object (Mixed) | Optional nested data for donor role. |
| `sponsorDetails` | Object (Mixed) | Optional nested data for sponsor role. |
| `priority` | Boolean | Admin flag for high-value alumni (default: `false`). |
| `submittedAt` | Date | Submission timestamp (Mongoose `createdAt` mapped to this field). |
| `updatedAt` | Date | Last update timestamp. |

## Admin API (reference)

- `GET /api/admin/alumni` — List with pagination, sort by `submittedAt`, filters: `branch`, `engagementRoles`.
- `GET /api/admin/alumni/:id` — Full document.
- `PATCH /api/admin/alumni/:id/priority` — Set or toggle `priority`.
- `GET /api/admin/alumni/export` — CSV export (same filters as list where applicable).

All admin routes require authentication and admin role (same middleware stack as other admin APIs in this project).
