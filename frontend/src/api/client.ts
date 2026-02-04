import type { TestRun, RunsListResponse, CreateRunRequest } from '../types';

const API_BASE = '/api';

export async function fetchRuns(page = 1, limit = 20): Promise<RunsListResponse> {
  const res = await fetch(`${API_BASE}/runs?page=${page}&limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch runs');
  return res.json();
}

export async function fetchRun(id: number): Promise<TestRun> {
  const res = await fetch(`${API_BASE}/runs/${id}`);
  if (!res.ok) throw new Error('Failed to fetch run');
  return res.json();
}

export async function createRun(data: CreateRunRequest): Promise<TestRun> {
  const formData = new FormData();
  formData.append('target_url', data.target_url);
  formData.append('agent', data.agent);

  if (data.requirements_file) {
    formData.append('requirements_file', data.requirements_file);
  }
  if (data.test_cases_csv) {
    formData.append('test_cases_csv', data.test_cases_csv);
  }

  const res = await fetch(`${API_BASE}/runs`, {
    method: 'POST',
    body: formData
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to create run');
  }

  return res.json();
}

export async function deleteRun(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/runs/${id}`, {
    method: 'DELETE'
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to delete run');
  }
}

export function subscribeToLogs(
  runId: number,
  onMessage: (event: { type: string; log?: string; status?: string; reportUrl?: string; error?: string }) => void
): () => void {
  const eventSource = new EventSource(`${API_BASE}/runs/${runId}/logs`);

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage(data);
    } catch (e) {
      console.error('Failed to parse SSE message:', e);
    }
  };

  eventSource.onerror = () => {
    eventSource.close();
  };

  return () => eventSource.close();
}

export async function checkHealth(): Promise<{
  status: string;
  queue: { waiting: number; active: number; completed: number; failed: number };
  cli: { claude: boolean; opencode: boolean };
}> {
  const res = await fetch(`${API_BASE}/health`);
  return res.json();
}
