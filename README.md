# Intergalactic Cargo Portal

Full-stack Next.js portal for authentication, RBAC, and cargo manifest workflows.

## Task 1 Foundation

- `POST /api/signup`
- `POST /api/login`
- JWT authentication
- Prisma user model
- Server-side role provisioning

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

Run the first migration after your database is ready:

```bash
npm run prisma:migrate -- --name init
```

Start the development server:

```bash
npm run dev
```

Open:

```txt
http://localhost:3000
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
