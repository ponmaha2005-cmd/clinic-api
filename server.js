const express = require("express");
const { DatabaseSync } = require("node:sqlite");

const app = express();
app.use(express.json());

const db = new DatabaseSync("clinic.db");

db.exec(`
  CREATE TABLE IF NOT EXISTS doctors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    specialization TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS patients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    doctor_id INTEGER NOT NULL,
    patient_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Booked',
    FOREIGN KEY (doctor_id) REFERENCES doctors(id),
    FOREIGN KEY (patient_id) REFERENCES patients(id)
  );
`);

const doctorCount = db.prepare("SELECT COUNT(*) AS c FROM doctors").get().c;
if (doctorCount === 0) {
  const insert = db.prepare(
    "INSERT INTO doctors (name, specialization) VALUES (?, ?)"
  );
  insert.run("Dr. Ravi", "General");
  insert.run("Dr. Meena", "Dentist");
  insert.run("Dr. Karthik", "Pediatrician");
}

app.get("/", (req, res) => {
  res.send("Clinic Appointment API is running");
});

// ---------- Doctors ----------
app.get("/doctors", (req, res) => {
  const q = req.query.specialization;
  if (q) {
    const rows = db
      .prepare("SELECT * FROM doctors WHERE specialization LIKE ?")
      .all(`%${q}%`);
    return res.json(rows);
  }
  res.json(db.prepare("SELECT * FROM doctors").all());
});

app.post("/doctors", (req, res) => {
  const { name, specialization } = req.body || {};
  if (!name || !specialization) {
    return res
      .status(400)
      .json({ message: "Name and specialization are required" });
  }
  const result = db
    .prepare("INSERT INTO doctors (name, specialization) VALUES (?, ?)")
    .run(name, specialization);
  res
    .status(201)
    .json({ id: Number(result.lastInsertRowid), name, specialization });
});

// ---------- Patients ----------
app.get("/patients", (req, res) => {
  res.json(db.prepare("SELECT * FROM patients").all());
});

app.post("/patients", (req, res) => {
  const { name, phone } = req.body || {};
  if (!name || !phone) {
    return res.status(400).json({ message: "Name and phone are required" });
  }
  const result = db
    .prepare("INSERT INTO patients (name, phone) VALUES (?, ?)")
    .run(name, phone);
  res.status(201).json({ id: Number(result.lastInsertRowid), name, phone });
});

// ---------- Appointments ----------
app.get("/appointments", (req, res) => {
  let sql = `
    SELECT a.id, a.date, a.time, a.status,
           d.name AS doctor, d.specialization,
           p.name AS patient, p.phone
    FROM appointments a
    JOIN doctors d ON a.doctor_id = d.id
    JOIN patients p ON a.patient_id = p.id
    WHERE 1 = 1`;
  const params = [];

  if (req.query.doctor_id) {
    sql += " AND a.doctor_id = ?";
    params.push(Number(req.query.doctor_id));
  }
  if (req.query.date) {
    sql += " AND a.date = ?";
    params.push(req.query.date);
  }
  sql += " ORDER BY a.date, a.time";

  res.json(db.prepare(sql).all(...params));
});

app.post("/appointments", (req, res) => {
  const { doctor_id, patient_id, date, time } = req.body || {};
  if (!doctor_id || !patient_id || !date || !time) {
    return res.status(400).json({
      message: "doctor_id, patient_id, date and time are required",
    });
  }

  const doctor = db.prepare("SELECT id FROM doctors WHERE id = ?").get(doctor_id);
  if (!doctor) return res.status(404).json({ message: "Doctor not found" });

  const patient = db
    .prepare("SELECT id FROM patients WHERE id = ?")
    .get(patient_id);
  if (!patient) return res.status(404).json({ message: "Patient not found" });

  const clash = db
    .prepare(
      "SELECT id FROM appointments WHERE doctor_id = ? AND date = ? AND time = ? AND status = 'Booked'"
    )
    .get(doctor_id, date, time);
  if (clash) {
    return res
      .status(409)
      .json({ message: "This time slot is already booked for the doctor" });
  }

  const result = db
    .prepare(
      "INSERT INTO appointments (doctor_id, patient_id, date, time) VALUES (?, ?, ?, ?)"
    )
    .run(doctor_id, patient_id, date, time);

  res.status(201).json({
    id: Number(result.lastInsertRowid),
    doctor_id,
    patient_id,
    date,
    time,
    status: "Booked",
  });
});

app.put("/appointments/:id/cancel", (req, res) => {
  const result = db
    .prepare("UPDATE appointments SET status = 'Cancelled' WHERE id = ?")
    .run(Number(req.params.id));
  if (Number(result.changes) === 0) {
    return res.status(404).json({ message: "Appointment not found" });
  }
  res.json({ message: "Appointment cancelled" });
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});