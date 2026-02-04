import { useState, useEffect, useRef } from 'react';
import type { TestRun } from '../types';
import { StatusBadge } from './StatusBadge';
import { subscribeToLogs } from '../api/client';

interface RunDetailProps {
  run: TestRun;
  onClose: () => void;
  onUpdate: (run: TestRun) => void;
}

export function RunDetail({ run, onClose, onUpdate }: RunDetailProps) {
  const [logs, setLogs] = useState(run.execution_log || '');
  const [status, setStatus] = useState(run.status);
  const [reportUrl, setReportUrl] = useState(run.report_url);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Subscribe to logs if running
    if (['queued', 'running'].includes(run.status)) {
      const unsubscribe = subscribeToLogs(run.id, (event) => {
        if (event.type === 'initial' && event.log) {
          setLogs(event.log);
        } else if (event.type === 'log' && event.log) {
          setLogs((prev) => prev + event.log);
        } else if (event.type === 'status' && event.status) {
          setStatus(event.status as TestRun['status']);
        } else if (event.type === 'done') {
          if (event.status) setStatus(event.status as TestRun['status']);
          if (event.reportUrl) setReportUrl(event.reportUrl);
          onUpdate({ ...run, status: event.status as TestRun['status'], report_url: event.reportUrl || null });
        }
      });

      return unsubscribe;
    }
  }, [run.id, run.status, onUpdate]);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-white">Test Run Details</h2>
            <p className="text-cyan-400 text-sm">{run.target_url}</p>
          </div>
          <div className="flex items-center gap-4">
            <StatusBadge status={status} />
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-2xl"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="p-4 border-b border-gray-700 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Agent:</span>
            <span className="text-white ml-2 capitalize">{run.agent}</span>
          </div>
          <div>
            <span className="text-gray-400">Created:</span>
            <span className="text-white ml-2">{new Date(run.created_at).toLocaleString()}</span>
          </div>
          {run.requirements_file && (
            <div>
              <span className="px-2 py-1 bg-purple-600 text-white rounded text-xs">Requirements File</span>
            </div>
          )}
          {run.test_cases_csv && (
            <div>
              <span className="px-2 py-1 bg-orange-600 text-white rounded text-xs">Test Cases CSV</span>
            </div>
          )}
        </div>

        {/* Results */}
        {status === 'completed' && (
          <div className="p-4 border-b border-gray-700 flex items-center gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">{run.passed_count}</div>
              <div className="text-gray-400 text-sm">Passed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-400">{run.failed_count}</div>
              <div className="text-gray-400 text-sm">Failed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-300">{run.test_case_count}</div>
              <div className="text-gray-400 text-sm">Total</div>
            </div>
            {reportUrl && (
              <a
                href={reportUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto px-4 py-2 bg-green-600 text-white rounded font-semibold hover:bg-green-700"
              >
                View Report
              </a>
            )}
          </div>
        )}

        {/* Error */}
        {status === 'failed' && run.error_message && (
          <div className="p-4 border-b border-gray-700 bg-red-500/10">
            <span className="text-red-400 font-semibold">Error: </span>
            <span className="text-red-300">{run.error_message}</span>
          </div>
        )}

        {/* Logs */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-[300px]">
          <div className="px-4 py-2 bg-gray-700 text-gray-300 font-semibold text-sm">
            Execution Logs
            {['queued', 'running'].includes(status) && (
              <span className="ml-2 text-cyan-400 animate-pulse">Live</span>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-4 bg-gray-900">
            <pre className="log-viewer text-gray-300 whitespace-pre-wrap">
              {logs || 'Waiting for logs...'}
            </pre>
            <div ref={logsEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
}
