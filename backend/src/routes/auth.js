const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../services/prisma');

router.post('/register', async (req, res) => {
  try {
    const { email, cnp, password, role, rsaPublicKey, encryptedPrivKey, pbkdf2Salt, firstName, lastName } = req.body;

    if (!email || !cnp || !password || !role || !rsaPublicKey || !encryptedPrivKey || !pbkdf2Salt || !firstName || !lastName) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (!['PATIENT', 'DOCTOR', 'ADMIN'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { cnp }] }
    });
    if (existing) {
      return res.status(400).json({ error: 'Invalid registration details' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        cnp,
        firstName,
        lastName,
        passwordHash,
        role,
        rsaPublicKey,
        encryptedPrivKey,
        pbkdf2Salt,
      }
    });

    res.status(201).json({
      message: 'Account created successfully',
      userId: user.id,
      role: user.role,
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'strict',
      maxAge: 8 * 60 * 60 * 1000,
    });

    res.json({
      userId: user.id,
      role: user.role,
      email: user.email,
      rsaPublicKey: user.rsaPublicKey,
      encryptedPrivKey: user.encryptedPrivKey,
      pbkdf2Salt: user.pbkdf2Salt,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    sameSite: 'strict',
  });
  res.json({ message: 'Logged out successfully' });
});

router.get('/me', async (req, res) => {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true, rsaPublicKey: true, firstName: true, lastName: true, cnp: true }
    });
    res.json({ ...user, userId: user.id });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;