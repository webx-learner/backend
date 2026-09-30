import "dotenv/config";
import express from "express";
import cors from "cors";
import { pool } from "./db.js";

const app = express();
const allowedOrigins = [process.env.FRONTEND_URL, "http://localhost:5173"].filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error("Not allowed by CORS"));
  },
}));
app.use(express.json());

app.get("/", (req, res) => res.json({ message: "Full-Stack Deployment Demo API" }));

app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.status(200).json({ status: "ok", database: "connected" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: "error", database: "disconnected" });
  }
});

app.get("/api/tasks", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT id, title, description, status, created_at FROM tasks ORDER BY id DESC");
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch tasks" });
  }
});

app.post("/api/tasks", async (req, res) => {
  const { title, description = "" } = req.body;
  if (!title?.trim()) return res.status(400).json({ message: "Title is required" });
  try {
    const [result] = await pool.query("INSERT INTO tasks (title, description) VALUES (?, ?)", [title.trim(), description.trim()]);
    const [rows] = await pool.query("SELECT id, title, description, status, created_at FROM tasks WHERE id = ?", [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to create task" });
  }
});

app.patch("/api/tasks/:id", async (req, res) => {
  const { id } = req.params;
  const { title, description, status } = req.body;
  if (status && !["pending", "completed"].includes(status)) return res.status(400).json({ message: "Invalid status" });
  try {
    const [existing] = await pool.query("SELECT * FROM tasks WHERE id = ?", [id]);
    if (!existing.length) return res.status(404).json({ message: "Task not found" });
    const current = existing[0];
    await pool.query("UPDATE tasks SET title = ?, description = ?, status = ? WHERE id = ?", [
      title?.trim() || current.title,
      description ?? current.description,
      status || current.status,
      id,
    ]);
    const [rows] = await pool.query("SELECT id, title, description, status, created_at FROM tasks WHERE id = ?", [id]);
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update task" });
  }
});

app.delete("/api/tasks/:id", async (req, res) => {
  try {
    const [result] = await pool.query("DELETE FROM tasks WHERE id = ?", [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ message: "Task not found" });
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to delete task" });
  }
});

const PORT = Number(process.env.PORT || 5050);
app.listen(PORT, "0.0.0.0", () => console.log(`API running on port ${PORT}`));
