# Food Waste Management App

Full-stack food rescue platform with role-based access for `admin`, `donor`, and `ngo`.

## Features

- User authentication (register, login, forgot password)
- Role-based authorization
- Add food listings (admin/donor)
- Delete food listings (admin/donor)
- NGO pickup requests
- Admin request approval/rejection
- Food insights dashboard
- Contact details on listings (contact name + number)
- Automatic food expiry after 24 hours (MongoDB TTL index)

## Tech Stack

- Backend: Node.js, Express, MongoDB, Mongoose, JWT
- Frontend: HTML, CSS, Vanilla JavaScript

## Environment Variables

Create `.env` in project root:

```env
MONGO_URI=mongodb://127.0.0.1:27017/foodwaste
JWT_SECRET=replace_with_long_random_secret
PORT=10000
CORS_ORIGIN=http://127.0.0.1:5500,https://your-frontend-domain.example
```

## Run Locally

Install dependencies:

```bash
npm install
```

Start backend:

```bash
npm run start:backend
```

Start frontend (new terminal):

```bash
npm run start:frontend
```

Open:

- Frontend: `http://localhost:5500`
- Backend: `http://localhost:10000`
- Health: `http://localhost:10000/health`

## Scripts

- `npm run start` - start backend
- `npm run start:backend` - start backend
- `npm run start:frontend` - serve frontend on port 5500
- `npm test` - run API tests

## Core API Routes

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/forgot-password`
- `GET /foods`
- `POST /foods` (admin/donor)
- `DELETE /foods/:id` (admin/donor)
- `GET /foods/insights`
- `POST /requests` (ngo)
- `GET /requests`
- `PUT /requests/:id/approve` (admin)
- `PUT /requests/:id/reject` (admin)

## Submission Checklist

- Replace `JWT_SECRET` with a strong random secret.
- Verify MongoDB is running and reachable.
- Run `npm test` and keep all tests passing.
- Confirm frontend loads with backend status visible.
- Test all 3 roles end-to-end.
- Deploy backend and frontend for public demo link.

## Notes

- MongoDB TTL deletion runs in the background (typically about every 60 seconds), so expiry is automatic but not exact to the second.
