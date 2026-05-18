const express = require('express');
const router = express.Router();
const prisma = require('../services/prisma');
const auth = require('../middleware/auth');
const role = require('../middleware/role');

router.get('/users', auth, role('ADMIN'), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        cnp: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/users/:id', auth, role('ADMIN'), async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        email: true,
        cnp: true,
        role: true,
        createdAt: true,
      }
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/users/:id/pubkey', auth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { id: true, rsaPublicKey: true, role: true },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/users/:id/role', auth, role('ADMIN'), async (req, res) => {
  try {
    const { role: newRole } = req.body;
    if (!['PATIENT', 'DOCTOR', 'ADMIN'].includes(newRole)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { role: newRole },
      select: { id: true, email: true, role: true },
    });

    res.json(user);
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/users/:id', auth, role('ADMIN'), async (req, res) => {
  try {
    if (req.params.id === req.user.userId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const id = req.params.id;

    await prisma.$transaction([
      prisma.auditLog.deleteMany({ where: { userId: id } }),
      prisma.consent.deleteMany({
        where: { OR: [{ patientId: id }, { doctorId: id }] },
      }),
      prisma.medicalRecord.deleteMany({
        where: { OR: [{ ownerId: id }, { uploadedById: id }] },
      }),
      prisma.doctorRequest.deleteMany({ where: { userId: id } }),
      prisma.user.delete({ where: { id } }),
    ]);

    res.json({ message: 'User deleted' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/audit', auth, role('ADMIN'), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        include: { user: { select: { email: true, role: true, firstName: true, lastName: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.auditLog.count(),
    ]);

    res.json({ logs, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error('Get audit error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/stats', auth, role('ADMIN'), async (req, res) => {
  try {
    const [totalUsers, totalRecords, totalConsents, totalLogs] = await Promise.all([
      prisma.user.count(),
      prisma.medicalRecord.count(),
      prisma.consent.count({ where: { granted: true } }),
      prisma.auditLog.count(),
    ]);

    const usersByRole = await prisma.user.groupBy({
      by: ['role'],
      _count: { role: true },
    });

    res.json({
      totalUsers,
      totalRecords,
      totalConsents,
      totalLogs,
      usersByRole,
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/doctor-requests', auth, role('ADMIN'), async (req, res) => {
  try {
    const requests = await prisma.doctorRequest.findMany({
      include: { user: { select: { id: true, email: true, cnp: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(requests);
  } catch (error) {
    console.error('Get doctor requests error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/doctor-requests/:id/approve', auth, role('ADMIN'), async (req, res) => {
  try {
    const request = await prisma.doctorRequest.findUnique({
      where: { id: req.params.id },
    });
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.status !== 'PENDING') {
      return res.status(400).json({ error: 'Request already processed' });
    }

    await prisma.$transaction([
      prisma.doctorRequest.update({
        where: { id: req.params.id },
        data: { status: 'APPROVED' },
      }),
      prisma.user.update({
        where: { id: request.userId },
        data: { role: 'DOCTOR' },
      }),
    ]);

    await prisma.auditLog.create({
      data: {
        userId: req.user.userId,
        action: 'DOCTOR_APPROVED',
        txHash: 'off-chain',
      }
    });

    res.json({ message: 'Doctor request approved' });
  } catch (error) {
    console.error('Approve doctor request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/doctor-requests/:id/reject', auth, role('ADMIN'), async (req, res) => {
  try {
    const { adminNote } = req.body;
    const request = await prisma.doctorRequest.findUnique({
      where: { id: req.params.id },
    });
    if (!request) return res.status(404).json({ error: 'Request not found' });

    await prisma.doctorRequest.update({
      where: { id: req.params.id },
      data: { status: 'REJECTED', adminNote: adminNote || 'Request rejected' },
    });

    res.json({ message: 'Doctor request rejected' });
  } catch (error) {
    console.error('Reject doctor request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;