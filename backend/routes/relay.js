const express = require('express');
const router = express.Router();

// In-memory relay registry (in production, use database)
const relays = new Map();

/**
 * POST /api/relay/register
 * Register a new relay node
 */
router.post('/register', (req, res) => {
  try {
    const { relayId, location, country, publicKey } = req.body;

    if (!relayId || !location || !country) {
      return res.status(400).json({
        success: false,
        error: 'relayId, location, and country are required'
      });
    }

    const relay = {
      relayId,
      location,
      country,
      publicKey,
      status: 'active',
      registeredAt: new Date().toISOString()
    };

    relays.set(relayId, relay);

    res.status(201).json({
      success: true,
      relay: {
        id: relay.relayId,
        location: relay.location,
        country: relay.country,
        status: relay.status
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to register relay' });
  }
});

/**
 * GET /api/relay/list
 * Get list of all registered relays
 */
router.get('/list', (req, res) => {
  const relayList = Array.from(relays.values()).map(relay => ({
    id: relay.relayId,
    location: relay.location,
    country: relay.country,
    status: relay.status
  }));

  res.json({
    success: true,
    relays: relayList
  });
});

/**
 * GET /api/relay/status/:id
 * Get status of a specific relay
 */
router.get('/status/:id', (req, res) => {
  const relayId = req.params.id;
  const relay = relays.get(relayId);

  if (!relay) {
    return res.status(404).json({ success: false, error: 'Relay not found' });
  }

  // Mock data for demonstration
  res.json({
    success: true,
    relay: {
      id: relay.relayId,
      status: relay.status,
      uptime: Math.floor(Math.random() * 100), // Mock uptime percentage
      messagesPerSecond: Math.floor(Math.random() * 100), // Mock throughput
      lastSeen: new Date().toISOString()
    }
  });
});

module.exports = router;