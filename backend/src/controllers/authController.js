const pool = require("../db/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// 🔐 REGISTER
exports.register = async (req, res) => {
  const { email, password } = req.body;

  try {
    // проверяем существует ли пользователь
    const userExists = await pool.query(
      "SELECT * FROM users WHERE email=$1",
      [email]
    );

    if (userExists.rows.length > 0) {
      return res.status(400).json({ message: "User already exists" });
    }

    // хешируем пароль
    const hashedPassword = await bcrypt.hash(password, 10);

    // сохраняем пользователя
    const newUser = await pool.query(
      "INSERT INTO users(email, password) VALUES($1,$2) RETURNING *",
      [email, hashedPassword]
    );

    res.status(201).json({
      message: "User registered",
      user: newUser.rows[0],
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// 🔐 LOGIN
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // ищем пользователя
    const user = await pool.query(
      "SELECT * FROM users WHERE email=$1",
      [email]
    );

    if (user.rows.length === 0) {
      return res.status(400).json({ message: "User not found" });
    }

    // проверяем пароль
    const validPassword = await bcrypt.compare(
      password,
      user.rows[0].password
    );

    if (!validPassword) {
      return res.status(400).json({ message: "Invalid password" });
    }

    // создаём токен
    const token = jwt.sign(
      { id: user.rows[0].id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login successful",
      token,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
