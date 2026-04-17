const router = require('express').Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// ── REGISTER ──────────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ msg: "All fields are required" });

    const existing = await User.findOne({ email });
    if (existing)
      return res.status(400).json({ msg: "Email already registered. Please log in." });

    const hashed = await bcrypt.hash(password, 10);
    const user   = new User({ name, email, password: hashed });
    await user.save();

    res.json({ msg: "User Registered", success: true });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ msg: "Server error during registration" });
  }
});

// ── LOGIN ─────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ msg: "All fields are required" });

    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ msg: "No account found with this email" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ msg: "Incorrect password" });

    res.json({
      msg: "Login Success",
      userId: user._id,
      name:   user.name,       // ← needed for welcome message
      email:  user.email
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ msg: "Server error during login" });
  }
});

module.exports = router;