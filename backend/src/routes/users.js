const express = require('express');
const router = express.Router();
const prisma = require('../services/prisma');
const auth = require('../middleware/auth');
const role = require('../middleware/role');

router.post('/doctor-request', auth, role('PATIENT'), async (req, res) => {
  try {
    const { paraCode, specialization, fullName } = req.body;

    if (!paraCode || !specialization || !fullName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const existing = await prisma.doctorRequest.findUnique({
      where: { userId: req.user.userId },
    });
    if (existing && existing.status === 'PENDING') {
      return res.status(409).json({ error: 'You already have a pending request' });
    }

    const request = await prisma.doctorRequest.upsert({
      where: { userId: req.user.userId },
      update: { paraCode, specialization, fullName, status: 'PENDING' },
      create: { userId: req.user.userId, paraCode, specialization, fullName },
    });

    res.status(201).json({ message: 'Request submitted', requestId: request.id });
  } catch (error) {
    console.error('Doctor request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/doctor-request/status', auth, role('PATIENT'), async (req, res) => {
  try {
    const request = await prisma.doctorRequest.findUnique({
      where: { userId: req.user.userId },
    });
    if (!request) return res.json({ status: 'NONE' });
    res.json({ status: request.status, adminNote: request.adminNote });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/search', auth, role('DOCTOR'), async (req, res) => {
  try {
    const { cnp } = req.query;
    if (!cnp) return res.status(400).json({ error: 'CNP required' });

    const patient = await prisma.user.findUnique({
      where: { cnp },
      select: { id: true, email: true, role: true },
    });

    if (!patient || patient.role !== 'PATIENT') {
      return res.status(404).json({ error: 'Patient not found' });
    }

    res.json(patient);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
