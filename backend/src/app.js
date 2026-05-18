const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const authRoutes = require('./routes/auth');
const recordRoutes = require('./routes/records');
const consentRoutes = require('./routes/consent');
const auditRoutes = require('./routes/audit');
const adminRoutes = require('./routes/admin');
const userRoutes = require('./routes/users');

const app = express();

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/records', recordRoutes);
app.use('/api/consent', consentRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);

module.exports = app;