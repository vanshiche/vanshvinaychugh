/**
 * server.js
 * Entry point for the SRM BFHL REST API.
 * Exposes: POST /bfhl
 */

const express = require('express');
const cors = require('cors');
const { processHierarchy } = require('./src/hierarchyProcessor');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ───────────────────────────────────────────────────────────────

// Enable CORS for all origins (evaluator calls from a different origin)
app.use(cors());

// Parse JSON bodies
app.use(express.json());

// ── Routes ───────────────────────────────────────────────────────────────────

/**
 * POST /bfhl
 * Accepts: { "data": ["A->B", "A->C", ...] }
 * Returns: Full hierarchy response per spec.
 */
app.post('/bfhl', (req, res) => {
  try {
    const { data } = req.body;

    // Basic request validation
    if (!req.body || !Array.isArray(data)) {
      return res.status(400).json({
        error: 'Invalid request body. Expected { "data": [...] }',
      });
    }

    const result = processHierarchy(data);
    return res.status(200).json(result);
  } catch (err) {
    console.error('[POST /bfhl] Error:', err);
    return res.status(500).json({
      error: 'Internal server error. Please try again.',
    });
  }
});

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

// ── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅  BFHL API running on http://localhost:${PORT}`);
});

module.exports = app;
