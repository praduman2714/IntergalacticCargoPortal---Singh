# Intergalactic Cargo Portal

Full-stack Next.js portal for authentication, RBAC, and cargo manifest workflows.

## Task 1 Foundation

- `POST /api/signup`
- `POST /api/login`
- JWT authentication
- Prisma user model
- Server-side role provisioning

## Task 2 Core Engine

- `POST /api/upload`
- `GET /api/cargo`
- Admin-only manifest uploads
- Standard users receive `403` with `Clearance level inadequate.`
- Sector-7 cargo weights are multiplied by `1.45`
- Final weights are rounded to the nearest whole number
- Records with prime-number final weights are skipped
- Public cargo fetches are rate-limited to 60 requests per minute per client IP

## Task 3 Frontend Dashboard

- Login and signup screen
- Landing page with top-bar Sign in and Sign up actions
- Role-aware dashboard after authentication
- Admin users see a `File Upload` button and cargo table
- Standard users see only the cargo table; upload controls are not rendered
- Admin weights display in `KG`
- Standard weights display in `LBS`
- Cargo is sorted heaviest to lightest, with Earth pinned to the bottom
- Tailwind CSS frontend styling

## Local Setup

Install dependencies:

```bash
npm install
```

Create your local environment file:

```bash
cp .env.example .env
```

Set `DATABASE_URL` to your Postgres connection string and set `JWT_SECRET` to a long random value.

Generate Prisma Client:

```bash
npm run prisma:generate
```

Run migrations after your database is ready:

```bash
npm run prisma:migrate
```

Start the development server:

```bash
npm run dev
```

Open:

```txt
http://localhost:3000
```

## Demo Accounts

Create an Admin account with an email ending in `@nebula-corp.com`.

```txt
commander@nebula-corp.com
```

Create a Standard account with any other email domain.

```txt
pilot@gmail.com
```

## Role Provisioning Rule

Users do not send or select their role during signup.

- Emails ending exactly in `@nebula-corp.com` become `ADMIN`
- All other emails become `STANDARD`

Admin signup payload:

```json
{
  "email": "commander@nebula-corp.com",
  "password": "SecurePass123"
}
```

## Upload Example

```bash
curl -X POST http://localhost:3000/api/upload \
  -H "Authorization: Bearer ADMIN_TOKEN_HERE" \
  -F "file=@manifest.txt"
```

Fetch saved cargo:

```bash
curl http://localhost:3000/api/cargo
```
