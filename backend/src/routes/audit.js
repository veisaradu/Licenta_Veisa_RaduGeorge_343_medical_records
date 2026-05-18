const express = require('express');
const router = express.Router();
const prisma = require('../services/prisma');
const auth = require('../middleware/auth');
const role = require('../middleware/role');

router.get('/', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    let where;

    if (req.user.role === 'PATIENT') {
      const myRecords = await prisma.medicalRecord.findMany({
        where: { ownerId: req.user.userId },
        select: { id: true },
      });
      const myRecordIds = myRecords.map(r => r.id);

      where = {
        OR: [
          { userId: req.user.userId },
          { documentId: { in: myRecordIds } },
        ],
      };
    } else if (req.user.role === 'DOCTOR') {
      where = { userId: req.user.userId };
    } else {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: { user: { select: { email: true, role: true, firstName: true, lastName: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({ logs, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/notifications', auth, role('PATIENT'), async (req, res) => {
  try {
    const myRecords = await prisma.medicalRecord.findMany({
      where: { ownerId: req.user.userId },
      select: { id: true },
    });
    const myRecordIds = myRecords.map(r => r.id);

    const notifications = await prisma.auditLog.findMany({
      where: {
        documentId: { in: myRecordIds },
        action: 'VIEW',
        userId: { not: req.user.userId },
      },
      include: { user: { select: { email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    res.json(notifications);
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;