require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());
const pool = require("./db/db");
const authRoutes = require("./routes/authRoutes");
app.use("/api/auth", authRoutes);

const userRoutes = require("./routes/userRoutes");
app.use("/api/user", userRoutes);

app.get("/", (req, res) => {
  res.send("API работает 🚀");
});

const PORT = process.env.PORT || 5000;

pool.connect()
  .then(() => console.log("PostgreSQL connected ✅"))
  .catch(err => console.error("Connection error", err));

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
