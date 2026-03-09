# API Documentation

## Authentication
All endpoints except public auth endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <access_token>
```

## Impersonation (Super Admin)

Super admins can obtain a token that represents another user (tenant), then use that token for all API calls to act as that user.

**POST** `/auth/impersonate`

**Public:** No (requires super admin Bearer token)

**Request Body:**
```json
{
  "userId": "target-user-uuid"
}
```

**Response:** Same shape as login:
```json
{
  "url": "/auth/impersonate",
  "message": ["Success"],
  "success": true,
  "statusCode": 200,
  "timestamp": "...",
  "data": {
    "access_token": "eyJ...",
    "user": {
      "id": "target-user-uuid",
      "email": "tenant@example.com",
      "fullName": "Tenant One"
    }
  }
}
```

The `access_token` is a JWT for the **target user** (same format as login). The payload includes an optional `impersonatedBy` claim (super admin's user id) so the frontend can show e.g. "Viewing as Tenant One" and a "Stop impersonating" action. Only users with role `SUPER_ADMIN` can call this endpoint; others receive `403 Forbidden`. The target user must exist and be active. To stop impersonating, the frontend switches back to the original super admin token (store it before calling impersonate).

## Permissions-Based Authorization
Endpoints can require specific permissions using the `@Allow()` decorator. Users must have all specified permissions to access the endpoint. If a user lacks required permissions, they will receive a `403 Forbidden` response.

**Available Permissions:**  
`CREATE_USER`, `READ_USER`, `UPDATE_USER`, `DELETE_USER` | `CREATE_BOT`, `READ_BOT`, `UPDATE_BOT`, `DELETE_BOT` | `CREATE_WIDGET`, `READ_WIDGET`, `UPDATE_WIDGET`, `DELETE_WIDGET` | `CREATE_KB_SOURCE`, `READ_KB_SOURCE`, `UPDATE_KB_SOURCE`, `DELETE_KB_SOURCE` | `CREATE_COLLECTION`, `READ_COLLECTION`, `UPDATE_COLLECTION`, `DELETE_COLLECTION` | `CREATE_TASK`, `READ_TASK`, `UPDATE_TASK`, `DELETE_TASK` | `READ_AUDIT_LOG`

Permissions are assigned to users and included in the JWT token. The system automatically checks permissions on protected endpoints.

**Example Usage:**
```typescript
@Get('users')
@Allow(Permission.READ_USER)
getUsers() { ... }

@Post('users')
@Allow(Permission.CREATE_USER)
createUser() { ... }

@Patch('users/:id')
@Allow(Permission.UPDATE_USER)
updateUser() { ... }
```

## Response Format
All responses follow this format:
```json
{
  "url": "/endpoint",
  "message": ["message1", "message2"],
  "success": true,
  "statusCode": 200,
  "timestamp": "2024-01-01T00:00:00.000Z",
  "data": { ... }
}
```

---

## Auth Endpoints

### Register
**POST** `/auth/register`

**Public:** Yes

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "Password123!",
  "fullName": "John Doe"
}
```

**Response:** `200 OK` — `data` contains `access_token` and `user`. First user gets role `SUPER_ADMIN`; every subsequent user gets an organization created for them automatically, is set as that org's owner, and receives role `TENANT`. Organization is internal (not exposed to clients).

---

### Login
**POST** `/auth/login`

**Public:** Yes

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "Password123!"
}
```

**Response:**
```json
{
  "url": "/auth/login",
  "message": ["Login successful"],
  "success": true,
  "statusCode": 200,
  "timestamp": "2024-01-01T00:00:00.000Z",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "fullName": "John Doe"
    }
  }
}
```

---

### Forgot Password
**POST** `/auth/forgot-password`

**Public:** Yes

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "url": "/auth/forgot-password",
  "message": ["If the email exists, a password reset link has been sent."],
  "success": true,
  "statusCode": 200,
  "timestamp": "2024-01-01T00:00:00.000Z",
  "data": {
    "message": "If the email exists, a password reset link has been sent."
  }
}
```

---

### Reset Password
**POST** `/auth/reset-password?token=<reset_token>`

**Public:** Yes

**Query Parameters:**
- `token` (required): Reset token from email

**Request Body:**
```json
{
  "password": "NewPassword123!"
}
```

**Response:**
```json
{
  "url": "/auth/reset-password",
  "message": ["Password has been reset successfully"],
  "success": true,
  "statusCode": 200,
  "timestamp": "2024-01-01T00:00:00.000Z",
  "data": {
    "message": "Password has been reset successfully"
  }
}
```

### Change Password
**POST** `/auth/change-password`

**Public:** No (Requires Authentication)

Set or change the authenticated user’s password.

**Two flows:**

1. **After invite (password change required)**  
   When the user has `passwordChangeRequired: true` (e.g. just logged in with a temporary password), send only `newPassword`. Current password is not required.

2. **Normal change**  
   When the user does not have `passwordChangeRequired`, send both `currentPassword` and `newPassword`. Current password is verified before updating.

**Request Body:**
```json
{
  "currentPassword": "CurrentOrTempPassword1!",
  "newPassword": "NewSecurePassword123!"
}
```

- `currentPassword`: Optional. Required when the user does **not** have `passwordChangeRequired`. Omit when the user has `passwordChangeRequired` (e.g. after invite).
- `newPassword`: Required. Must meet the app’s password rules (e.g. min 8 chars, 1 number, 1 special character).

**Response:** `200 OK`
```json
{
  "url": "/auth/change-password",
  "message": ["Password has been changed successfully"],
  "success": true,
  "statusCode": 200,
  "timestamp": "2024-01-01T00:00:00.000Z",
  "data": {
    "message": "Password has been changed successfully"
  }
}
```

On success, the user’s `passwordChangeRequired` flag is cleared. Use the same access token; no new token is returned.

---

## User Endpoints

### Get All Users
**GET** `/users`

**Public:** No (Requires Authentication)

**Required Permissions:** `READ_USER`

**Query params:**

| Param    | Type   | Description |
|----------|--------|-------------|
| `page`   | string | Page number (1-based). Default: 1 |
| `limit`  | string | Page size. Default: 20, max: 100 |
| `search` | string | Filter by email or full name (partial, case-insensitive) |
| `status` | string | Filter: `active` or `inactive` (by `isActive`) |

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:** `200 OK` — `data` is paginated: `{ data: User[], total, page, limit, totalPages }`. Each user includes `botCount` and `kbSourceCount` (counts for their organization).

---

### Get User by ID
**GET** `/users/:id`

**Public:** No (Requires Authentication)

**Headers:**
```
Authorization: Bearer <access_token>
```

**URL Parameters:**
- `id` (required): User UUID

**Response:** `200 OK` — single user in `data` (includes `role`, `organization` when loaded).

**Errors:** `404` if user not found.

---

### Invite User
**POST** `/users/invite`

**Public:** No (Requires Authentication)

**Required Permissions:** `CREATE_USER` (and caller must belong to an organization)

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "fullName": "New User"
}
```

**Response:** `201` — created user in `data`. User is added to the inviter's organization with role `TENANT` and a temporary password (e.g. sent by email).

**Errors:** `409` if email already exists. `400` if caller has no organization.

---

### Create User
**POST** `/users`

**Public:** No (Requires Authentication)

**Required Permissions:** `CREATE_USER`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "Password123!",
  "fullName": "John Doe"
}
```

**Response:**
```json
{
  "url": "/users",
  "message": ["User created successfully"],
  "success": true,
  "statusCode": 200,
  "timestamp": "2024-01-01T00:00:00.000Z",
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "fullName": "John Doe",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### Update User
**PATCH** `/users/:id`

**Public:** No (Requires Authentication)

**Required Permissions:** `UPDATE_USER`

**Headers:**
```
Authorization: Bearer <access_token>
```

**URL Parameters:**
- `id` (required): User UUID

**Request Body:**
```json
{
  "email": "newemail@example.com",
  "fullName": "Jane Doe",
  "password": "NewPassword123!"
}
```

**Response:**
```json
{
  "url": "/users/uuid",
  "message": ["User updated successfully"],
  "success": true,
  "statusCode": 200,
  "timestamp": "2024-01-01T00:00:00.000Z",
  "data": {
    "id": "uuid",
    "email": "newemail@example.com",
    "fullName": "Jane Doe",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### Delete User
**DELETE** `/users/:id`

**Public:** No (Requires Authentication)

**Required Permissions:** `DELETE_USER`

**Headers:**
```
Authorization: Bearer <access_token>
```

**URL Parameters:**
- `id` (required): User UUID

**Response:**
```json
{
  "url": "/users/uuid",
  "message": ["User deleted successfully"],
  "success": true,
  "statusCode": 200,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## Bots API

Base path: `/bots`. All operations are scoped to the current user's organization (SUPER_ADMIN can see all).

### List bots
**GET** `/bots` — **Permission:** `READ_BOT`

**Query params:** `page`, `limit` (default 20, max 100), `botType` (`GENERAL` | `PROJECT`), `search` (name, partial case-insensitive).

**Response:** `200 OK` — `data` is paginated: `{ data: Bot[], total, page, limit, totalPages }`.

### Get one bot
**GET** `/bots/:id` — **Permission:** `READ_BOT`. **Errors:** `404` if not found.

### Create bot
**POST** `/bots` — **Permission:** `CREATE_BOT`. Caller must belong to an organization.

**GENERAL:** `{ "botType": "GENERAL", "name": "...", "description": "...", "domains": ["example.com"] }`  
**PROJECT:** `{ "botType": "PROJECT", "name": "...", "description": "...", "domains": ["shop.example.com"], "targetUrls": ["/checkout"], "behavior": "AUTO_SHOW", "priority": "MEDIUM", "visibilityStartDate": "2026-01-01", "visibilityEndDate": "2026-12-31", "oncePerSession": false }`

| Field               | Rules |
|---------------------|-------|
| botType             | `GENERAL` or `PROJECT` |
| name                | Max 200 |
| domains             | GENERAL: ≥1; PROJECT: exactly 1 |
| targetUrls           | PROJECT only, ≥1 paths starting with `/` |
| behavior            | PROJECT only, required: `AUTO_SHOW` or `BUTTON_ONLY` |
| priority            | PROJECT only, required: `HIGHEST`, `HIGH`, `MEDIUM`, `LOW` |
| visibilityStartDate | PROJECT only, required, ISO date string |
| visibilityEndDate   | PROJECT only, required, ISO date string |
| oncePerSession      | PROJECT only, optional, default false |

**Response:** `201` — created bot in `data` (includes `widget` relation). A default widget is created and linked to the bot automatically; use PATCH `/widgets/:id` to customize it.

### Update bot
**PATCH** `/bots/:id` — **Permission:** `UPDATE_BOT`. Body: subset of create fields. `botType` cannot be changed.

### Archive / Disable / Enable bot
**PATCH** `/bots/:id/archive` — sets state to `ARCHIVED`.  
**PATCH** `/bots/:id/disable` — sets state to `DISABLED`.  
**PATCH** `/bots/:id/enable` — sets state to `ACTIVE`.  
**Permission:** `UPDATE_BOT`.

### Delete bot
**DELETE** `/bots/:id` — **Permission:** `DELETE_BOT`. Soft-delete. The bot's linked widget (if any) is soft-deleted and unlinked; tasks for the bot are soft-deleted. **Errors:** `404` if not found.

### Get bot's KB sources
**GET** `/bots/:id/kb-sources` — **Permission:** `READ_BOT`. Returns the list of KB sources linked to this bot. **Errors:** `404` if bot not found.

### Link KB source to bot
**POST** `/bots/:id/kb-sources/:sourceId` — **Permission:** `UPDATE_BOT`. Links the given KB source to the bot. Bot and source must belong to the same organization. **Errors:** `404` if bot or source not found; `400` if different organizations.

### Unlink KB source from bot
**DELETE** `/bots/:id/kb-sources/:sourceId` — **Permission:** `UPDATE_BOT`. Unlinks the KB source from the bot. **Errors:** `404` if bot or source not found.

**Bot enums:** BotType `GENERAL` | `PROJECT`; BotState `ACTIVE` | `DISABLED` | `ARCHIVED`; Behavior `AUTO_SHOW` | `BUTTON_ONLY`; BotPriority `HIGHEST` | `HIGH` | `MEDIUM` | `LOW`.

---

## Widgets API

Base path: `/widgets`. Each widget is the configuration for one bot (one-to-one: bot has at most one widget). Widgets control appearance (position, colors, header text, welcome message, etc.) for the chat widget. All operations are scoped to the current user's organization (SUPER_ADMIN can see all).

### List widgets
**GET** `/widgets` — **Permission:** `READ_WIDGET`

**Query params:** `page`, `limit` (default 20, max 100), `botId` (filter by bot UUID), `search` (header text, partial case-insensitive).

**Response:** `200 OK` — `data` is paginated: `{ data: Widget[], total, page, limit, totalPages }`. Each widget includes `bot` when loaded.

### Get one widget
**GET** `/widgets/:id` — **Permission:** `READ_WIDGET`. **Errors:** `404` if not found or user has no access to the widget's bot.

### Get widget by bot
**GET** `/widgets/by-bot/:botId` — **Permission:** `READ_WIDGET`. Returns the widget for the given bot, or `null` in `data` if the bot has no widget. **Errors:** `404` if bot not found or no access.

### Create widget
**POST** `/widgets` — **Permission:** `CREATE_WIDGET`. Caller must have access to the bot. A bot can have at most one widget. (When a bot is created, a default widget is created automatically; use this endpoint only if that widget was deleted and you need to create a new one.)

**Request body:**
```json
{
  "botId": "uuid-of-bot",
  "botLogoUrl": "https://example.com/logo.png",
  "position": "bottom_right",
  "appearance": "light",
  "primaryColor": "#000000",
  "headerTextColor": "#000000",
  "background": "#ffffff",
  "botMessageBg": "#f0f0f0",
  "botMessageText": "#000000",
  "userMessageBg": "#007bff",
  "userMessageText": "#ffffff",
  "headerText": "Chat with us",
  "welcomeMessage": "Hi! How can we help?",
  "showPoweredBy": true
}
```

| Field           | Rules |
|-----------------|-------|
| botId           | Required, UUID of an existing bot (user must have access) |
| botLogoUrl      | Optional, URL, max 2000 |
| position        | Optional: `bottom_left` \| `bottom_right`; default `bottom_right` |
| appearance      | Optional: `light` \| `dark`; default `light` |
| primaryColor     | Optional, hex e.g. `#ffffff`; default `#000000` |
| headerTextColor  | Optional, hex; default `#000000` |
| background       | Optional, hex; default `#ffffff` |
| botMessageBg     | Optional, hex; default `#f0f0f0` |
| botMessageText   | Optional, hex; default `#000000` |
| userMessageBg    | Optional, hex; default `#007bff` |
| userMessageText  | Optional, hex; default `#ffffff` |
| headerText       | Optional, max 200; default null |
| welcomeMessage   | Optional, max 5000; default null |
| showPoweredBy    | Optional, boolean; default true |

**Response:** `201` — created widget in `data` (includes `bot`). **Errors:** `404` if bot not found; `409` if the bot already has a widget.

### Update widget
**PATCH** `/widgets/:id` — **Permission:** `UPDATE_WIDGET`. Body: any subset of create fields (except `botId`). **Errors:** `404` if not found.

### Delete widget
**DELETE** `/widgets/:id` — **Permission:** `DELETE_WIDGET`. Soft-deletes the widget and unlinks it from the bot. **Errors:** `404` if not found.

**Widget enums:** WidgetPosition `bottom_left` | `bottom_right`; WidgetAppearance `light` | `dark`. All color fields use hex codes (e.g. `#ffffff`).

---

## Tasks API

Base path: `/tasks`. Tasks belong to a bot (one bot has many tasks). Each task can have multiple chips and a many-to-many link to KB sources. All operations are scoped to bots the user can access (same organization; SUPER_ADMIN can see all).

### List tasks
**GET** `/tasks` — **Permission:** `READ_TASK`

**Query params:** `page`, `limit` (default 20, max 100), `botId` (filter by bot UUID), `search` (task name, partial case-insensitive), `isActive` (`true` | `false`).

**Response:** `200 OK` — `data` is paginated: `{ data: Task[], total, page, limit, totalPages }`.

### Get one task
**GET** `/tasks/:id` — **Permission:** `READ_TASK`. **Errors:** `404` if not found or user has no access to the task's bot.

### Create task
**POST** `/tasks` — **Permission:** `CREATE_TASK`. Caller must have access to the given bot.

**Request body:**
```json
{
  "name": "Onboarding",
  "introMessage": "Hi, I can help with…",
  "instruction": "Answer using the linked KB sources.",
  "targetUrls": ["/pricing", "/api"],
  "isActive": true,
  "botId": "uuid-of-bot",
  "kbSourceIds": ["uuid-of-kb-source-1", "uuid-of-kb-source-2"],
  "chips": [
    { "type": "query", "chipName": "Pricing", "chipText": "What are your plans?" },
    { "type": "link", "chipName": "Docs", "chipText": "https://docs.example.com" }
  ]
}
```

| Field        | Rules |
|--------------|-------|
| name         | Required, max 200 |
| introMessage | Required, max 5000 |
| instruction  | Required, max 10000 |
| targetUrls   | Required; array of paths starting with `/` (e.g. `/pricing`, `/api`); can be empty |
| isActive     | Required, boolean |
| botId        | Required, UUID of an existing bot (user must have access) |
| kbSourceIds  | Required; array of KB source UUIDs; can be empty `[]` |
| chips        | Optional array. Each: `type` `query` \| `link`, `chipName` max 200, `chipText` max 2000 |

**Response:** `201` — created task in `data`. **Errors:** `404` if bot not found.

### Update task
**PATCH** `/tasks/:id` — **Permission:** `UPDATE_TASK`. Body: subset of create fields. If `chips` is sent, it replaces all chips for the task. **Errors:** `404` if task or (when changing) bot not found.

### Delete task
**DELETE** `/tasks/:id` — **Permission:** `DELETE_TASK`. Permanently deletes the task and its chips. **Errors:** `404` if not found.

**Task/Chip enums:** ChipType `query` | `link`.

---

## Knowledge Base Sources API

Base path: `/knowledge-base/sources`. Sources can exist independently; each can be linked to multiple bots and belong to at most one collection. List/get return `linkedBots` (count) and `collection` (object or null). All operations scoped by organization.

### List sources
**GET** `/knowledge-base/sources` — **Permission:** `READ_KB_SOURCE`

**Query params:** `page`, `limit` (default 20, max 100), `search` (name), `sourceType` (`URL` | `PDF` | `DOCX` | `TXT`).

**Response:** `200 OK` — paginated; each source includes `linkedBots` (number) and `collection`.

### Get one source
**GET** `/knowledge-base/sources/:id` — **Permission:** `READ_KB_SOURCE`. **Errors:** `404` if not found.

### Download source file
**GET** `/knowledge-base/sources/:id/download` — **Permission:** `READ_KB_SOURCE`. Returns binary (PDF/DOCX). **Errors:** `400` if not PDF/DOCX; `404` if not found.

### Create source (JSON)
**POST** `/knowledge-base/sources` — **Permission:** `CREATE_KB_SOURCE`. Caller must belong to an organization.

**URL:** `{ "sourceType": "URL", "name": "...", "url": "https://...", "refreshSchedule": "WEEKLY" }`  
**TXT:** `{ "sourceType": "TXT", "name": "...", "content": "..." }`  
**PDF/DOCX:** `{ "sourceType": "PDF", "name": "...", "fileKey": "uploads/..." }`

| Field           | Rules |
|-----------------|-------|
| sourceType      | `URL`, `PDF`, `DOCX`, `TXT` |
| name            | Max 200 |
| url             | If URL; max 2048 |
| refreshSchedule | If URL: `MANUAL`, `DAILY`, `WEEKLY`, `MONTHLY` |
| content         | If TXT; max 50000 |
| fileKey         | If PDF/DOCX; max 2048 |

**Response:** `201` — created source in `data`.

### Upload source (file)
**POST** `/knowledge-base/sources/upload` — **Permission:** `CREATE_KB_SOURCE`  
**Content-Type:** `multipart/form-data`. Fields: `name`, `sourceType` (`PDF` | `DOCX`), `file` (max 20 MB). **Response:** `201`.

### Update source
**PATCH** `/knowledge-base/sources/:id` — **Permission:** `UPDATE_KB_SOURCE`. Body: subset of fields; `sourceType` cannot be changed. Use Collections API to add/remove from collection.

### Refresh source (URL only)
**POST** `/knowledge-base/sources/:id/refresh` — **Permission:** `UPDATE_KB_SOURCE`. Forces refresh (updates `lastRefreshed`). **Errors:** `400` if not URL.

### Link / Unlink bot
**POST** `/knowledge-base/sources/:id/bots/:botId` — link bot to source.  
**DELETE** `/knowledge-base/sources/:id/bots/:botId` — unlink. **Permission:** `UPDATE_KB_SOURCE`. **Errors:** `404` if source or bot not found.

### Delete source
**DELETE** `/knowledge-base/sources/:id` — **Permission:** `DELETE_KB_SOURCE`. Unlinks from collection, then soft-deletes.

**Enums:** SourceType `URL` | `PDF` | `DOCX` | `TXT`; SourceStatus `READY` | `PROCESSING` | `FAILED`; RefreshSchedule `MANUAL` | `DAILY` | `WEEKLY` | `MONTHLY`.

---

## Collections API

Base path: `/collections`. Collection has `name` and optional `description`; can contain multiple KB sources. Each source belongs to at most one collection. Collections are hard-deleted; deleting a collection unlinks its sources. Scoped by organization.

### List collections
**GET** `/collections` — **Permission:** `READ_COLLECTION`  
**Query params:** `page`, `limit` (default 20, max 100). **Response:** `200 OK` — paginated; each collection includes `sources` array.

### Get one collection
**GET** `/collections/:id` — **Permission:** `READ_COLLECTION`. **Errors:** `404` if not found.

### Create collection
**POST** `/collections` — **Permission:** `CREATE_COLLECTION`. Caller must belong to an organization.  
**Body:** `{ "name": "...", "description": "..." }`. Name max 200; description max 2000 optional. **Response:** `201`.

### Update collection
**PATCH** `/collections/:id` — **Permission:** `UPDATE_COLLECTION`. Body: `name`, `description` (optional).

### Delete collection
**DELETE** `/collections/:id` — **Permission:** `DELETE_COLLECTION`. Unlinks all sources, then permanently deletes collection.

### Add / Remove source
**POST** `/collections/:id/sources/:sourceId` — add source to collection (moves from another collection if needed).  
**DELETE** `/collections/:id/sources/:sourceId` — remove source from collection. **Permission:** `UPDATE_COLLECTION`. **Errors:** `404` if collection/source not found or source not in collection.

---

## Multi-tenant and roles

- **Organization** is internal: not exposed to clients. There are no public endpoints to create or read organizations.
- When a **tenant** (non–first user) **registers**, an organization is created automatically; that user is set as the org’s owner and receives role **TENANT**. The first user gets role **SUPER_ADMIN** and has no organization.
- **Invited users** join the inviter’s organization and receive role **TENANT**.
- **Roles:** `SUPER_ADMIN` (platform-wide), `TENANT` (org member; org owner is a tenant who owns an organization). Permissions are assigned per role; guards enforce `@Allow(Permission.XXX)`.
- **Data scope:** Bots, KB sources, and collections belong to an organization. All list/get/create/update/delete are scoped by the current user's `organizationId`. **SUPER_ADMIN** can bypass and see all. Audit logs store `organizationId` (which org the log concerns); list is scoped by org.

---

## Validation Rules

### Password
- Minimum 8 characters
- Maximum 100 characters
- At least 1 number
- At least 1 special character

### Email
- Must be a valid email format

### Full Name
- Maximum 200 characters
- Required for registration
- Optional for user creation/update

---

## Audit Logs

**GET** `/audit-logs` — **Permission:** `READ_AUDIT_LOG`. Query params: `page`, `limit`, `action`, `resource`, `userId`, `organizationId` (optional; SUPER_ADMIN only). Returns paginated results. Each log includes `organizationId`. Logs are scoped by organization (`organizationId` or `userId`); each user sees only their organization’s logs (SUPER_ADMIN may see all).

---

## Error Responses

### 400 Bad Request
```json
{
  "url": "/endpoint",
  "message": ["Validation error message"],
  "success": false,
  "statusCode": 400,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 401 Unauthorized
```json
{
  "url": "/endpoint",
  "message": ["Invalid credentials"],
  "success": false,
  "statusCode": 401,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 404 Not Found
```json
{
  "url": "/endpoint",
  "message": ["Resource not found"],
  "success": false,
  "statusCode": 404,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 409 Conflict
```json
{
  "url": "/endpoint",
  "message": ["User with this email already exists"],
  "success": false,
  "statusCode": 409,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 403 Forbidden
```json
{
  "url": "/endpoint",
  "message": ["Insufficient permissions"],
  "success": false,
  "statusCode": 403,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 429 Too Many Requests
```json
{
  "url": "/endpoint",
  "message": ["Too many requests, please try again later"],
  "success": false,
  "statusCode": 429,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## Rate Limiting

All endpoints are rate limited:
- **Default:** 10 requests per 60 seconds per IP address
- **Configurable:** Via `THROTTLE_TTL` and `THROTTLE_LIMIT` environment variables

---

## Shared

### Paginated response shape

When an endpoint returns a paginated list, `data` has the form:

```json
{
  "data": [ ... ],
  "total": 42,
  "page": 1,
  "limit": 10,
  "totalPages": 5
}
```

### ApiResponse type

```ts
interface ApiResponse<T> {
  url: string;
  message: string[];
  success: boolean;
  statusCode: number;
  timestamp: string;
  data?: T;
}
```
