const express = require('express');
const router = express.Router();
const prisma = require('../services/prisma');
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const { getBlockchain } = require('../services/blockchain');

router.post('/grant', auth, role('PATIENT'), async (req, res) => {
  try {
    const { doctorCnp, category } = req.body;

    if (!doctorCnp || !category) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const validCategories = ['ANALYSES', 'PRESCRIPTIONS', 'IMAGING', 'CONSULTATIONS'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    const doctor = await prisma.user.findUnique({ where: { cnp: doctorCnp } });
    if (!doctor || doctor.role !== 'DOCTOR') {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    const patient = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { cnp: true },
    });

    const categoryIndex = validCategories.indexOf(category);
    const { consentContract } = getBlockchain();
    const tx = await consentContract.grantConsent(patient.cnp, doctorCnp, categoryIndex);
    const receipt = await tx.wait();

    const consent = await prisma.consent.upsert({
      where: {
        patientId_doctorId_category: {
          patientId: req.user.userId,
          doctorId: doctor.id,
          category,
        }
      },
      update: { granted: true, txHash: receipt.hash },
      create: {
        patientId: req.user.userId,
        doctorId: doctor.id,
        category,
        granted: true,
        txHash: receipt.hash,
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.userId,
        action: 'CONSENT_GRANT',
        txHash: receipt.hash,
      }
    });

    res.json({ message: 'Consent granted', consentId: consent.id, txHash: receipt.hash });
  } catch (error) {
    console.error('Grant consent error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/revoke', auth, role('PATIENT'), async (req, res) => {
  try {
    const { doctorCnp, category } = req.body;

    if (!doctorCnp || !category) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const doctor = await prisma.user.findUnique({ where: { cnp: doctorCnp } });
    if (!doctor) return res.status(404).json({ error: 'Doctor not found' });

    const patient = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { cnp: true },
    });

    const validCategories = ['ANALYSES', 'PRESCRIPTIONS', 'IMAGING', 'CONSULTATIONS'];
    const categoryIndex = validCategories.indexOf(category);

    const { consentContract } = getBlockchain();
    const tx = await consentContract.revokeConsent(patient.cnp, doctorCnp, categoryIndex);
    const receipt = await tx.wait();

    await prisma.consent.update({
      where: {
        patientId_doctorId_category: {
          patientId: req.user.userId,
          doctorId: doctor.id,
          category,
        }
      },
      data: { granted: false, txHash: receipt.hash }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.userId,
        action: 'CONSENT_REVOKE',
        txHash: receipt.hash,
      }
    });

    res.json({ message: 'Consent revoked', txHash: receipt.hash });
  } catch (error) {
    console.error('Revoke consent error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    let consents;

    if (req.user.role === 'PATIENT') {
      consents = await prisma.consent.findMany({
        where: { patientId: req.user.userId },
        include: { doctor: { select: { id: true, email: true, cnp: true, firstName: true, lastName: true } } },
        orderBy: { createdAt: 'desc' },
      });
    } else if (req.user.role === 'DOCTOR') {
      consents = await prisma.consent.findMany({
        where: { doctorId: req.user.userId, granted: true },
        include: { patient: { select: { id: true, email: true, cnp: true, firstName: true, lastName: true } } },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      return res.status(403).json({ error: 'Forbidden' });
    }

    res.json(consents);
  } catch (error) {
    console.error('Get consents error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
