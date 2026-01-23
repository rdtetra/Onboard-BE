# Onboard API Backend

Backend API for the Onboard application built with TypeScript, NestJS, and PostgreSQL.

## Technologies

- **TypeScript** - Programming language
- **NestJS** - Web framework
- **PostgreSQL** - Database
- **TypeORM** - ORM
- **JWT** - Authentication
- **Passport** - Authentication strategy

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Server
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=onboard
DB_SYNC=true

# JWT Authentication
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=7d

# JWT Reset Token (for password reset)
JWT_RESET_SECRET=your-reset-secret-key-here

# Rate Limiting
THROTTLE_TTL=60
THROTTLE_LIMIT=10
```

### Environment Variables Description

- **PORT** - Server port (default: 3000)
- **DB_HOST** - PostgreSQL host (default: localhost)
- **DB_PORT** - PostgreSQL port (default: 5432)
- **DB_USERNAME** - PostgreSQL username (default: postgres)
- **DB_PASSWORD** - PostgreSQL password (default: postgres)
- **DB_NAME** - Database name (default: onboard)
- **DB_SYNC** - Auto-sync database schema (default: true, set to false in production)
- **JWT_SECRET** - Secret key for signing JWT tokens (required)
- **JWT_EXPIRES_IN** - JWT token expiration time (default: 7d)
- **JWT_RESET_SECRET** - Secret key for password reset tokens (required)
- **THROTTLE_TTL** - Rate limit time window in seconds (default: 60)
- **THROTTLE_LIMIT** - Maximum requests per time window (default: 10)

## Installation

```bash
npm install
```

## Database Setup

1. Create a PostgreSQL database:
```bash
createdb onboard
```

2. The application will automatically create tables on startup if `DB_SYNC=true`.

## Development

Start the development server with hot-reload:

```bash
npm run start:dev
```

The server will start on `http://localhost:3000` (or the port specified in your `.env` file).

## Production

1. Build the application:
```bash
npm run build
```

2. Start the production server:
```bash
npm run start:prod
```

**Important:** Make sure to set `DB_SYNC=false` in your production `.env` file to prevent automatic schema changes.

## API Documentation

For detailed API documentation, including all endpoints, request/response formats, and authentication requirements, see [API_DOCS.md](./API_DOCS.md).

## Scripts

- `npm run build` - Build the application
- `npm run start` - Start the application
- `npm run start:dev` - Start in development mode with hot-reload
- `npm run start:prod` - Start in production mode
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm test` - Run unit tests
- `npm run test:e2e` - Run end-to-end tests
