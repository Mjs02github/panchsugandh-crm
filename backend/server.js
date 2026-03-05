require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const app = express();

// ── Middleware ──────────────────────────────────────────────
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'https://vbnm.club'
];

app.use(cors({
    origin: function (origin, callback) {
        // Allow Capacitor Android (http/https localhost), generic localhost, or existing origins
        if (!origin ||
            allowedOrigins.includes(origin) ||
            process.env.FRONTEND_URL === origin ||
            origin.startsWith('http://localhost') ||
            origin.startsWith('https://localhost') ||
            origin.startsWith('capacitor://localhost')) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
}));

// ── Compression (reduces response size by 60-70%) ────────────
app.use(compression());

// ── Rate Limiting ─────────────────────────────────────────────
// Login: max 10 attempts per minute per IP
const loginLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10,
    message: { error: 'Too many login attempts. Please wait a minute and try again.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// General API: max 300 requests per minute per IP
const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 300,
    message: { error: 'Too many requests. Please slow down.' },
    standardHeaders: true,
    legacyHeaders: false,
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Routes ──────────────────────────────────────────────────
app.use('/api/auth/login', loginLimiter);
app.use('/api', apiLimiter);
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/areas', require('./routes/areas'));
app.use('/api/retailers', require('./routes/retailers'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/delivery', require('./routes/delivery'));
app.use('/api/visits', require('./routes/visits'));
app.use('/api/targets', require('./routes/targets'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/locations', require('./routes/locations'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/chat', require('./routes/chat'));

// ── Health check ────────────────────────────────────────────
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
});

// ── Serve Frontend ────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'dist')));

// ── 404 handler for API routes ──────────────────────────────
app.use('/api/*', (req, res) => {
    res.status(404).json({ error: 'API Route not found' });
});

// ── Catch-all for React Router ──────────────────────────────
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// ── Global error handler ─────────────────────────────────────
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    // Never expose stack traces in production
    const isProd = process.env.NODE_ENV === 'production';
    res.status(500).json({
        error: 'Internal server error',
        ...(isProd ? {} : { detail: err.message }),
    });
});

// ── Start ────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`🚀 Panchsugandh CRM API running on port ${PORT}`);
});
