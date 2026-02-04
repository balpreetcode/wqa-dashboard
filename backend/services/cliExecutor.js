const pty = require('node-pty');
const path = require('path');
const fs = require('fs');

const CLI_PATHS = {
  claude: process.env.CLAUDE_PATH || '/home/usr1/.local/bin/claude',
  opencode: process.env.OPENCODE_PATH || '/home/usr1/.opencode/bin/opencode'
};

const REPORTS_DIR = process.env.REPORTS_DIR || '/var/www/files.winds-os.com';
const REPORTS_URL = process.env.REPORTS_URL || 'https://files.winds-os.com';

/**
 * Execute /webqa command via claude or opencode CLI
 * Uses node-pty for proper PTY support
 */
async function executeWebQASimple(agent, targetUrl, runUuid, onLog = () => {}) {
  const cliPath = CLI_PATHS[agent];

  if (!fs.existsSync(cliPath)) {
    throw new Error(`CLI not found: ${cliPath}`);
  }

  const workDir = path.join('/tmp', `webqa-${runUuid}`);
  await fs.promises.mkdir(workDir, { recursive: true });

  return new Promise((resolve, reject) => {
    let logs = '';
    let reportUrl = null;

    // Spawn the CLI with a real PTY
    const proc = pty.spawn(cliPath, [
      '-p', `/webqa ${targetUrl}`,
      '--dangerously-skip-permissions'
    ], {
      name: 'xterm-256color',
      cols: 200,
      rows: 50,
      cwd: workDir,
      env: {
        ...process.env,
        HOME: '/home/usr1',
        PATH: process.env.PATH
      }
    });

    console.log(`[CLI] Spawned process for ${agent}: ${proc._pid}`);

    proc.onData((data) => {
      // Remove ANSI escape codes for cleaner logs
      let text = data;
      text = text.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
      text = text.replace(/\x1b\][^\x07]*\x07/g, '');
      text = text.replace(/\r/g, '');

      console.log(`[CLI] Data received: ${text.length} chars`);
      logs += text;
      onLog(text);

      // Extract report URL from logs
      const urlMatch = logs.match(/https:\/\/files\.winds-os\.com\/webqa-[^\s\)\]"<\x1b\n]+/);
      if (urlMatch) {
        reportUrl = urlMatch[0].replace(/[)\]"<]+$/, '');
      }
    });

    proc.onExit(({ exitCode, signal }) => {
      console.log(`[CLI] Process exited: code=${exitCode}, signal=${signal}, logs=${logs.length} chars`);

      // Clean up work directory after a delay
      setTimeout(() => {
        fs.promises.rm(workDir, { recursive: true, force: true }).catch(() => {});
      }, 5000);

      resolve({
        success: exitCode === 0 || reportUrl !== null,
        reportUrl,
        logs,
        exitCode
      });
    });

    // 30 minute timeout
    const timeout = setTimeout(() => {
      console.log(`[CLI] Timeout - killing process`);
      proc.kill();
      reject(new Error('Execution timeout (30 minutes)'));
    }, 30 * 60 * 1000);

    proc.onExit(() => clearTimeout(timeout));
  });
}

/**
 * Legacy function - kept for compatibility
 */
async function executeWebQA(agent, targetUrl, runUuid, onLog = () => {}) {
  return executeWebQASimple(agent, targetUrl, runUuid, onLog);
}

module.exports = {
  executeWebQA,
  executeWebQASimple,
  CLI_PATHS,
  REPORTS_DIR,
  REPORTS_URL
};
