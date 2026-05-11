# Student ID Card Portal

A Next.js + TypeScript + Tailwind CSS portal for student data collection, bulk Excel imports, and admin reporting.

## Features

- Student registration and login
- Student detail entry with photo upload
- Bulk Excel import and export to Excel/PDF
- Admin login and college-wise dashboard
- Responsive, glassmorphism-inspired UI with smooth transitions

## Getting Started

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Admin Access



Default admin credentials:

- Email: `admin@college.edu`
- Password: `Admin@123`

## Project Structure

- `app/` - Next.js pages and routing
- `components/` - Shared UI and auth provider
- `lib/` - typed storage utilities and data models
- `styles/` - Tailwind and global styles

## Notes

Data is stored in browser localStorage for demo purposes.
