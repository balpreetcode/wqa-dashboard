const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { dbOps } = require('../db/database');
const { addJob, addLogListener, removeLogListener } = require('../queue/webqaProcessor');
const upload = require('../middleware/upload');

const router = express.Router();

/**
 * GET /api/runs - List all test runs
 */
router.get('/', (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;

    const runs = dbOps.getAllRuns(limit, offset);
    const total = dbOps.getRunCount();

    res.json({
      runs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error listing runs:', error);
    res.status(500).json({ error: 'Failed to list runs' });
  }
});

/**
 * GET /api/runs/:id - Get single run details
 */
router.get('/:id', (req, res) => {
  try {
    const run = dbOps.getRun(parseInt(req.params.id));

    if (!run) {
      return res.status(404).json({ error: 'Run not found' });
    }

    res.json(run);
  } catch (error) {
    console.error('Error getting run:', error);
    res.status(500).json({ error: 'Failed to get run' });
  }
});

/**
 * POST /api/runs - Create new test run
 */
router.post('/',
  upload.fields([
    { name: 'requirements_file', maxCount: 1 },
    { name: 'test_cases_csv', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const { target_url, agent } = req.body;

      // Validate required fields
      if (!target_url) {
        return res.status(400).json({ error: 'target_url is required' });
      }

      if (!agent || !['claude', 'opencode'].includes(agent)) {
        return res.status(400).json({ error: 'agent must be "claude" or "opencode"' });
      }

      // Validate URL format
      try {
        new URL(target_url);
      } catch {
        return res.status(400).json({ error: 'Invalid URL format' });
      }

      const uuid = uuidv4();
      const requirementsFile = req.files?.requirements_file?.[0]?.path || null;
      const testCasesCsv = req.files?.test_cases_csv?.[0]?.path || null;

      // Create run in database
      const run = dbOps.createRun(
        uuid,
        target_url,
        agent,
        requirementsFile,
        testCasesCsv
      );

      // Update status to queued
      dbOps.updateRunStatus(run.id, 'queued');

      // Add job to queue
      await addJob(run.id, target_url, agent, uuid);

      // Get the updated run
      const updatedRun = dbOps.getRun(run.id);

      res.status(201).json(updatedRun);
    } catch (error) {
      console.error('Error creating run:', error);
      res.status(500).json({ error: 'Failed to create run' });
    }
  }
);

/**
 * DELETE /api/runs/:id - Delete a run
 */
router.delete('/:id', (req, res) => {
  try {
    const run = dbOps.getRun(parseInt(req.params.id));

    if (!run) {
      return res.status(404).json({ error: 'Run not found' });
    }

    // Don't delete running jobs
    if (run.status === 'running') {
      return res.status(400).json({ error: 'Cannot delete a running test' });
    }

    dbOps.deleteRun(parseInt(req.params.id));

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting run:', error);
    res.status(500).json({ error: 'Failed to delete run' });
  }
});

/**
 * GET /api/runs/:id/logs - SSE stream for live logs
 */
router.get('/:id/logs', (req, res) => {
  const runId = parseInt(req.params.id);

  // Get current run
  const run = dbOps.getRun(runId);
  if (!run) {
    return res.status(404).json({ error: 'Run not found' });
  }

  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

  // Send current logs first
  if (run.execution_log) {
    res.write(`data: ${JSON.stringify({ type: 'initial', log: run.execution_log })}\n\n`);
  }

  // Send current status
  res.write(`data: ${JSON.stringify({ type: 'status', status: run.status })}\n\n`);

  // If already completed/failed, close connection
  if (['completed', 'failed'].includes(run.status)) {
    res.write(`data: ${JSON.stringify({ type: 'done', status: run.status, reportUrl: run.report_url })}\n\n`);
    return res.end();
  }

  // Set up listener for new logs
  const logCallback = (log) => {
    res.write(`data: ${JSON.stringify({ type: 'log', log })}\n\n`);
  };

  addLogListener(runId, logCallback);

  // Polling for status changes
  const statusInterval = setInterval(() => {
    const currentRun = dbOps.getRun(runId);
    if (currentRun && ['completed', 'failed'].includes(currentRun.status)) {
      res.write(`data: ${JSON.stringify({
        type: 'done',
        status: currentRun.status,
        reportUrl: currentRun.report_url,
        error: currentRun.error_message
      })}\n\n`);
      clearInterval(statusInterval);
      removeLogListener(runId, logCallback);
      res.end();
    }
  }, 2000);

  // Clean up on client disconnect
  req.on('close', () => {
    clearInterval(statusInterval);
    removeLogListener(runId, logCallback);
  });
});

module.exports = router;
