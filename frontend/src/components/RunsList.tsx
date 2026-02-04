import type { TestRun } from '../types';
import { StatusBadge } from './StatusBadge';

interface RunsListProps {
  runs: TestRun[];
  onSelect: (run: TestRun) => void;
  onDelete: (run: TestRun) => void;
  selectedId: number | null;
}

export function RunsList({ runs, onSelect, onDelete, selectedId }: RunsListProps) {
  if (runs.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-8 text-center text-gray-400">
        <p>No test runs yet. Create one above!</p>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  const truncateUrl = (url: string, maxLen = 40) => {
    if (url.length <= maxLen) return url;
    return url.substring(0, maxLen) + '...';
  };

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-700">
          <tr>
            <th className="px-4 py-3 text-left text-gray-300 font-semibold">URL</th>
            <th className="px-4 py-3 text-left text-gray-300 font-semibold">Agent</th>
            <th className="px-4 py-3 text-left text-gray-300 font-semibold">Status</th>
            <th className="px-4 py-3 text-left text-gray-300 font-semibold">Results</th>
            <th className="px-4 py-3 text-left text-gray-300 font-semibold">Created</th>
            <th className="px-4 py-3 text-left text-gray-300 font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => (
            <tr
              key={run.id}
              onClick={() => onSelect(run)}
              className={`border-t border-gray-700 cursor-pointer hover:bg-gray-700/50 ${
                selectedId === run.id ? 'bg-gray-700' : ''
              }`}
            >
              <td className="px-4 py-3">
                <span className="text-cyan-400" title={run.target_url}>
                  {truncateUrl(run.target_url)}
                </span>
                {run.requirements_file && (
                  <span className="ml-2 px-1 py-0.5 text-xs bg-purple-600 rounded">REQ</span>
                )}
                {run.test_cases_csv && (
                  <span className="ml-2 px-1 py-0.5 text-xs bg-orange-600 rounded">CSV</span>
                )}
              </td>
              <td className="px-4 py-3 text-gray-300 capitalize">{run.agent}</td>
              <td className="px-4 py-3">
                <StatusBadge status={run.status} />
              </td>
              <td className="px-4 py-3 text-gray-300">
                {run.status === 'completed' ? (
                  <span>
                    <span className="text-green-400">{run.passed_count}</span>
                    {' / '}
                    <span className="text-red-400">{run.failed_count}</span>
                    {' / '}
                    <span className="text-gray-400">{run.test_case_count}</span>
                  </span>
                ) : (
                  '-'
                )}
              </td>
              <td className="px-4 py-3 text-gray-400 text-sm">{formatDate(run.created_at)}</td>
              <td className="px-4 py-3">
                <div className="flex gap-2">
                  {run.report_url && (
                    <a
                      href={run.report_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                    >
                      Report
                    </a>
                  )}
                  {run.status !== 'running' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(run);
                      }}
                      className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
