const express = require('express');
const router = express.Router();
const prisma = require('../services/prisma');
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const { getBlockchain } = require('../services/blockchain');
const { uploadToIPFS } = require('../services/ipfs');

router.post('/upload', auth, async (req, res) => {
  try {
    const { encryptedContent, encryptedAesKey, documentHash, category, ownerId, iv, fileName } = req.body;

    if (!encryptedContent || !encryptedAesKey || !documentHash || !category || !ownerId || !iv) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const validCategories = ['ANALYSES', 'PRESCRIPTIONS', 'IMAGING', 'CONSULTATIONS'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    if (req.user.role === 'PATIENT' && req.user.userId !== ownerId) {
      return res.status(403).json({ error: 'Patients can only upload for themselves' });
    }

    const owner = await prisma.user.findUnique({ where: { id: ownerId } });
    if (!owner) return res.status(404).json({ error: 'Patient not found' });

    const ipfsCid = await uploadToIPFS({ encryptedContent, encryptedAesKey, iv });

    const categoryIndex = validCategories.indexOf(category);
    const recordId = `rec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    const hashBytes32 = documentHash;

    const { medicalRecordsContract, signer } = getBlockchain();
    const deployerAddress = await signer.getAddress();

    const tx = await medicalRecordsContract.registerRecord(
      recordId,
      ipfsCid,
      hashBytes32,
      deployerAddress,
      categoryIndex
    );
    const receipt = await tx.wait();

    const record = await prisma.medicalRecord.create({
      data: {
        ipfsCid,
        encryptedAesKey,
        documentHash,
        category,
        txHash: receipt.hash,
        uploadedById: req.user.userId,
        ownerId,
        fileName: fileName || 'document',
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.userId,
        action: 'UPLOAD',
        documentId: record.id,
        txHash: receipt.hash,
      }
    });

    res.status(201).json({ recordId: record.id, ipfsCid, txHash: receipt.hash });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const { category, search } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    let where = {};

    if (req.user.role === 'PATIENT') {
      where.ownerId = req.user.userId;
    } else if (req.user.role === 'DOCTOR') {
      const consents = await prisma.consent.findMany({
        where: { doctorId: req.user.userId, granted: true },
        select: { patientId: true, category: true },
      });
      if (consents.length === 0) {
        return res.json({ records: [], pagination: { page, limit, total: 0, totalPages: 0 } });
      }
      where.OR = consents.map(c => ({ ownerId: c.patientId, category: c.category }));
    } else {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (category) where.category = category;
    if (search) where.fileName = { contains: search, mode: 'insensitive' };

    const [records, total] = await Promise.all([
      prisma.medicalRecord.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.medicalRecord.count({ where }),
    ]);

    res.json({ records, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error('Get records error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const record = await prisma.medicalRecord.findUnique({
      where: { id: req.params.id },
    });

    if (!record) return res.status(404).json({ error: 'Record not found' });

    if (req.user.role === 'PATIENT' && record.ownerId !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (req.user.role === 'DOCTOR') {
      const consent = await prisma.consent.findUnique({
        where: {
          patientId_doctorId_category: {
            patientId: record.ownerId,
            doctorId: req.user.userId,
            category: record.category,
          }
        }
      });
      if (!consent || !consent.granted) {
        return res.status(403).json({ error: 'No consent for this record category' });
      }
    }

    try {
      const { auditLogContract } = getBlockchain();
      await auditLogContract.logAccess(req.user.userId, record.id, 'VIEW');
    } catch (blockchainError) {
      console.error('Blockchain log error:', blockchainError);
    }

    await prisma.auditLog.create({
      data: {
        userId: req.user.userId,
        action: 'VIEW',
        documentId: record.id,
        txHash: 'pending',
      }
    });

    res.json({
      id: record.id,
      ipfsCid: record.ipfsCid,
      encryptedAesKey: record.encryptedAesKey,
      documentHash: record.documentHash,
      category: record.category,
      createdAt: record.createdAt,
    });
  } catch (error) {
    console.error('Get record error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', auth, role('PATIENT'), async (req, res) => {
  try {
    const record = await prisma.medicalRecord.findUnique({
      where: { id: req.params.id },
    });

    if (!record) return res.status(404).json({ error: 'Record not found' });
    if (record.ownerId !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await prisma.medicalRecord.delete({ where: { id: req.params.id } });

    res.json({ message: 'Record deleted. Encryption key destroyed - GDPR Art. 17 compliant.' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;