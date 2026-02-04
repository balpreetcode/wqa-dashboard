import type { TestRun } from '../types';

interface StatusBadgeProps {
  status: TestRun['status'];
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const styles: Record<TestRun['status'], string> = {
    pending: 'bg-gray-500 text-white',
    queued: 'bg-yellow-500 text-black',
    running: 'bg-blue-500 text-white animate-pulse',
    completed: 'bg-green-500 text-white',
    failed: 'bg-red-500 text-white'
  };

  const labels: Record<TestRun['status'], string> = {
    pending: 'Pending',
    queued: 'Queued',
    running: 'Running',
    completed: 'Completed',
    failed: 'Failed'
  };

  return (
    <span className={`px-2 py-1 rounded text-xs font-semibold ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}
