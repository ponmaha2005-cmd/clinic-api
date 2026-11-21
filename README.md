# Clinic Appointment API

A REST API built with Node.js, Express and SQLite to manage doctors, patients and appointments.

## Features
- Add and list doctors and patients
- Book appointments with a doctor
- Prevents double booking of the same doctor, date and time
- Filter appointments by doctor or date
- Cancel appointments
- Input validation and proper error codes (400, 404, 409)

## Tech Used
Node.js, Express, SQLite (SQL, JOINs)

## API Endpoints
- GET /doctors (optional filter: ?specialization=Dentist)
- POST /doctors
- GET /patients
- POST /patients
- GET /appointments (filters: ?doctor_id=1&date=2026-11-25)
- POST /appointments
- PUT /appointments/:id/cancel

## Run Locally
Run npm install, then node server.js. The server starts on http://localhost:3000