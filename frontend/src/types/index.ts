export interface TestRun {
  id: number;
  uuid: string;
  target_url: string;
  agent: 'claude' | 'opencode';
  status: 'pending' | 'queued' | 'running' | 'completed' | 'failed';
  requirements_file: string | null;
  test_cases_csv: string | null;
  test_case_count: number;
  passed_count: number;
  failed_count: number;
  warning_count: number;
  report_url: string | null;
  report_path: string | null;
  execution_log: string | null;
  error_message: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  bull_job_id: string | null;
}

export interface RunsListResponse {
  runs: TestRun[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateRunRequest {
  target_url: string;
  agent: 'claude' | 'opencode';
  requirements_file?: File;
  test_cases_csv?: File;
}

export interface LogEvent {
  type: 'initial' | 'log' | 'status' | 'done';
  log?: string;
  status?: string;
  reportUrl?: string;
  error?: string;
}
