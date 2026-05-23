import "dotenv/config";
import cors from "cors";
import express from "express";
import { createAdminUser } from "./lib/auth.js";
import { authRouter } from "./routes/auth.js";
import { healthRouter } from "./routes/health.js";
import { usersRouter } from "./routes/users.js";
import { hospitalsRouter } from "./routes/hospitals.js";
import { patientsRouter } from "./routes/patients.js";

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/hospitals", hospitalsRouter);
app.use("/api/patients", patientsRouter);

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(500).json({ message: "Internal server error." });
});

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
