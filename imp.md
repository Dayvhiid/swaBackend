# Backend Implementation Plan: Soul Winner's Assistant (SWA)

This document outlines the technical requirements and architecture for the SWA backend system.

## 1. Core Architecture
- **Framework**: Node.js with Express or NestJS.
- **Database**: MongoDB (NoSQL) for flexible schema and high-performance read/writes.
- **Authentication**: JWT (JSON Web Token) for stateless authentication.
- **ORM/ODM**: Mongoose for MongoDB modeling.

## 2. User Roles & Hierarchy
The system follows a strict hierarchical structure:
1. **Super Admin**: Global access to all zones.
2. **Zonal Admin**: Manages one or more Zones.
3. **Area Admin**: Manages Areas within a Zone.
4. **Parish Admin**: Manages Soul Winners within a Parish.
5. **Soul Winner**: Manages individual Converts.

### Data Hierarchy
`Zone` > `Area` > `Parish` > `Soul Winner` > `Convert`

---

## 3. MongoDB Collections & Schema

### Users Collection
- `_id`: ObjectID
- `name`: String
- `email`: String (Unique, Indexed)
- `passwordHash`: String
- `role`: Enum (soul_winner, parish_admin, area_admin, zonal_admin, super_admin)
- `parishId`: ObjectID (Reference)
- `areaId`: ObjectID (Reference)
- `zonalId`: ObjectID (Reference)
- `notificationPreferences`: {
    `followUpReminders`: Boolean,
    `pendingActions`: Boolean,
    `newConverts`: Boolean,
    `weeklyReports`: Boolean
  }
- `createdAt`: Date

### Hierarchy Collections (Zones, Areas, Parishes)
- Standard collections to manage the structural organization.

### Converts Collection
- `_id`: ObjectID
- `soulWinnerId`: ObjectID (Reference)
- `parishId`: ObjectID (Reference)
- `name`: String
- `phone`: String
- `whatsapp`: String
- `houseAddress`: String
- `dateBornAgain`: Date
- `ageGroup`: Enum (Children, Teenagers, YAYA, Adults, Elders)
- `gender`: Enum (Male, Female)
- `maritalStatus`: Enum (Single, Married, Divorced, Widowed)
- `career`: String
- `status`: Enum (Active, Inactive, Completed, Unreachable)
- **Embedded Arrays:**
  - `followUpVisits`: Array of Objects
    - `visitNumber`: Number (1-8)
    - `title`: String
    - `visitDate`: Date (Nullable)
    - `isCompleted`: Boolean
  - `spiritualGrowth`: {
      `believerClass`: Enum (NotStarted, InProgress, Completed),
      `waterBaptism`: Enum (NotStarted, InProgress, Completed),
      `workersTraining`: Enum (NotStarted, InProgress, Completed)
    }
- `createdAt`: Date

**Standardized Visit Titles (Embedded in Converts):**
1. Visit 1: Welcome & Introduction
2. Visit 2: Assurance of Salvation
3. Visit 3: The New Birth
4. Visit 4: The Word of God
5. Visit 5: Prayer
6. Visit 6: The Holy Spirit
7. Visit 7: Water Baptism
8. Visit 8: Church & Fellowship

### Notifications Collection
- `_id`: ObjectID
- `userId`: ObjectID (Reference)
- `type`: Enum (reminder, alert, info, success)
- `title`: String
- `message`: String
- `isRead`: Boolean
- `createdAt`: Date

---

## 4. API Endpoints

### Authentication
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| POST | `/api/auth/login` | Returns JWT and User profile. |
| POST | `/api/auth/signup` | Register new Soul Winner. |
| POST | `/api/auth/reset-password` | Initiates password recovery. |
| GET | `/api/user/profile` | Returns current user details. |
| PUT | `/api/user/profile` | Update profile info. |
| GET | `/api/user/notifications` | Fetch recent notifications. |
| PATCH | `/api/user/notifications/settings` | Update pref (followUpReminders, etc). |

### Converts Management
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| GET | `/api/converts` | List converts (Paginated, Search, Role-filtered). |
| POST | `/api/converts` | Create new convert record. |
| GET | `/api/converts/{id}` | Detailed convert profile. |
| PUT | `/api/converts/{id}` | Update personal information. |
| PATCH | `/api/converts/{id}/visits/{num}` | Toggle visit completion. |
| PATCH | `/api/converts/{id}/milestones` | Update spiritual growth status. |

### Dashboard & Analytics
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| GET | `/api/dashboard/stats` | Aggregate stats (Total, Active, Retention). |
| GET | `/api/dashboard/trends` | Time-series data for charts. |
| GET | `/api/reports/detailed` | Role-specific performance reports. |

---

## 5. Business Logic & Computed Fields
- **Convert Stage**: Should be dynamically calculated based on completed visits and spiritual milestones:
    - If `visits` completed < 8: "Visit X of 8"
    - If `visits` completed == 8 and `BelieverClass` != Completed: "Believers Class"
    - If `BelieverClass` == Completed: "Follow-up Completed"
- **Retention Rate**: Calculate per Soul Winner/Parish/Area based on the ratio of "Active" vs "Inactive" converts over a rolling 6-month period.
- **Pending Follow-ups**: Any convert with a scheduled visit date in the past that is not marked as `is_completed`.

## 6. Security Requirements
- **RBAC (Role Based Access Control)**: Middleware to ensure admins can only see data within their jurisdiction (e.g., Parish Admin only sees their Parish converts).
- **Data Privacy**: Encrypt sensitive phone and address fields where necessary.
- **Audit Logs**: Track changes to convert status and milestone updates.

## 6. Real-time Features (Phase 2)
- **Push Notifications**: Reminders for pending follow-up visits.
- **In-app Notifications**: Announcements from administrators to Soul Winners.

