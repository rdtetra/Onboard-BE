# API Documentation

## Authentication
All endpoints except public auth endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <access_token>
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

**Response:**
```json
{
  "url": "/auth/register",
  "message": ["User registered successfully"],
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

---

## User Endpoints

### Get All Users
**GET** `/users`

**Public:** No (Requires Authentication)

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "url": "/users",
  "message": ["Users retrieved successfully"],
  "success": true,
  "statusCode": 200,
  "timestamp": "2024-01-01T00:00:00.000Z",
  "data": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "fullName": "John Doe",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

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

**Response:**
```json
{
  "url": "/users/uuid",
  "message": ["User retrieved successfully"],
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

### Create User
**POST** `/users`

**Public:** No (Requires Authentication)

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
