const Queue = require('bull');
const { dbOps } = require('../db/database');
const { executeWebQASimple } = require('../services/cliExecutor');

// Create Bull queue
const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const webqaQueue = new Queue('webqa', REDIS_URL, {
  defaultJobOptions: {
    attempts: 1,
    timeout: 35 * 60 * 1000, // 35 minutes (slightly more than CLI timeout)
    removeOnComplete: 100,
    removeOnFail: 100
  },
  settings: {
    stalledInterval: 60000, // Check for stalled jobs every 60 seconds
    maxStalledCount: 30, // Allow up to 30 stall checks (30 minutes) before failing
    lockDuration: 120000 // Lock jobs for 2 minutes before considering them stalled
  }
});

// Store for SSE clients listening to logs
const logListeners = new Map();

/**
 * Add a log listener for a run
 */
function addLogListener(runId, callback) {
  if (!logListeners.has(runId)) {
    logListeners.set(runId, []);
  }
  logListeners.get(runId).push(callback);
}

/**
 * Remove a log listener
 */
function removeLogListener(runId, callback) {
  if (logListeners.has(runId)) {
    const listeners = logListeners.get(runId);
    const index = listeners.indexOf(callback);
    if (index > -1) {
      listeners.splice(index, 1);
    }
    if (listeners.length === 0) {
      logListeners.delete(runId);
    }
  }
}

/**
 * Emit log to all listeners for a run
 */
function emitLog(runId, log) {
  if (logListeners.has(runId)) {
    logListeners.get(runId).forEach(callback => callback(log));
  }
}

// Process jobs
webqaQueue.process(async (job) => {
  const { runId, targetUrl, agent, uuid } = job.data;

  console.log(`[WebQA] Starting job for run ${runId}: ${targetUrl} (${agent})`);

  // Update status to running
  dbOps.updateRunStatus(runId, 'running');

  let fullLogs = '';
  let lastProgress = 0;

  // Set up heartbeat to prevent stalling
  const heartbeatInterval = setInterval(() => {
    lastProgress += 1;
    job.progress(lastProgress % 100);
  }, 30000); // Update progress every 30 seconds

  try {
    const result = await executeWebQASimple(agent, targetUrl, uuid, (log) => {
      fullLogs += log;
      emitLog(runId, log);

      // Update job progress to prevent stalling
      lastProgress += 1;
      job.progress(Math.min(lastProgress, 99));

      // Update logs in database periodically
      if (fullLogs.length % 1000 < 100) {
        dbOps.updateRunLog(runId, fullLogs);
      }
    });

    clearInterval(heartbeatInterval);

    if (result.success && result.reportUrl) {
      // Parse results if possible (basic parsing)
      let testCaseCount = 0, passedCount = 0, failedCount = 0;

      // Try to extract stats from logs
      const totalMatch = fullLogs.match(/Total Tests?:\s*(\d+)/i);
      const passedMatch = fullLogs.match(/Passed:\s*(\d+)/i);
      const failedMatch = fullLogs.match(/Failed:\s*(\d+)/i);

      if (totalMatch) testCaseCount = parseInt(totalMatch[1]);
      if (passedMatch) passedCount = parseInt(passedMatch[1]);
      if (failedMatch) failedCount = parseInt(failedMatch[1]);

      dbOps.updateRunCompleted(
        runId,
        'completed',
        result.reportUrl,
        null, // report_path
        fullLogs,
        testCaseCount,
        passedCount,
        failedCount
      );

      console.log(`[WebQA] Completed run ${runId}: ${result.reportUrl}`);
      return { success: true, reportUrl: result.reportUrl };

    } else {
      dbOps.updateRunFailed(
        runId,
        result.error || 'No report URL found in output',
        fullLogs
      );

      console.log(`[WebQA] Failed run ${runId}: ${result.error}`);
      return { success: false, error: result.error };
    }

  } catch (error) {
    clearInterval(heartbeatInterval);
    dbOps.updateRunFailed(
      runId,
      error.message,
      fullLogs
    );

    console.error(`[WebQA] Error in run ${runId}:`, error);
    throw error;
  }
});

// Queue event handlers
webqaQueue.on('completed', (job, result) => {
  console.log(`[WebQA] Job ${job.id} completed:`, result);
});

webqaQueue.on('failed', (job, err) => {
  console.error(`[WebQA] Job ${job.id} failed:`, err.message);
});

webqaQueue.on('error', (err) => {
  console.error('[WebQA] Queue error:', err);
});

/**
 * Add a new job to the queue
 */
async function addJob(runId, targetUrl, agent, uuid) {
  const job = await webqaQueue.add({
    runId,
    targetUrl,
    agent,
    uuid
  });

  dbOps.updateBullJobId(runId, job.id.toString());

  return job;
}

/**
 * Get queue stats
 */
async function getQueueStats() {
  const [waiting, active, completed, failed] = await Promise.all([
    webqaQueue.getWaitingCount(),
    webqaQueue.getActiveCount(),
    webqaQueue.getCompletedCount(),
    webqaQueue.getFailedCount()
  ]);

  return { waiting, active, completed, failed };
}

module.exports = {
  webqaQueue,
  addJob,
  getQueueStats,
  addLogListener,
  removeLogListener
};
