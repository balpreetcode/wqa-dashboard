const express = require('express');
const { getQueueStats } = require('../queue/webqaProcessor');
const { CLI_PATHS } = require('../services/cliExecutor');
const fs = require('fs');

const router = express.Router();

/**
 * GET /api/health - Health check
 */
router.get('/', async (req, res) => {
  try {
    const queueStats = await getQueueStats();

    const cliStatus = {
      claude: fs.existsSync(CLI_PATHS.claude),
      opencode: fs.existsSync(CLI_PATHS.opencode)
    };

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      queue: queueStats,
      cli: cliStatus
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
});

module.exports = router;
