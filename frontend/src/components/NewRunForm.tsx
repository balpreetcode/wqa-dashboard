import { useState, useRef } from 'react';
import { createRun } from '../api/client';
import type { TestRun } from '../types';

interface NewRunFormProps {
  onCreated: (run: TestRun) => void;
}

export function NewRunForm({ onCreated }: NewRunFormProps) {
  const [targetUrl, setTargetUrl] = useState('');
  const [agent, setAgent] = useState<'claude' | 'opencode'>('claude');
  const [requirementsFile, setRequirementsFile] = useState<File | null>(null);
  const [testCasesCsv, setTestCasesCsv] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reqFileRef = useRef<HTMLInputElement>(null);
  const csvFileRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const run = await createRun({
        target_url: targetUrl,
        agent,
        requirements_file: requirementsFile || undefined,
        test_cases_csv: testCasesCsv || undefined
      });

      // Reset form
      setTargetUrl('');
      setRequirementsFile(null);
      setTestCasesCsv(null);
      if (reqFileRef.current) reqFileRef.current.value = '';
      if (csvFileRef.current) csvFileRef.current.value = '';

      onCreated(run);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create run');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gray-800 rounded-lg p-6 mb-6">
      <h2 className="text-xl font-bold text-white mb-4">New Test Run</h2>

      {error && (
        <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-2 rounded mb-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Target URL */}
        <div className="md:col-span-2">
          <label className="block text-gray-300 mb-2">Target URL *</label>
          <input
            type="url"
            value={targetUrl}
            onChange={(e) => setTargetUrl(e.target.value)}
            placeholder="https://example.com"
            required
            className="w-full px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-cyan-500 focus:outline-none"
          />
        </div>

        {/* Agent Selection */}
        <div>
          <label className="block text-gray-300 mb-2">Agent *</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="agent"
                value="claude"
                checked={agent === 'claude'}
                onChange={() => setAgent('claude')}
                className="text-cyan-500"
              />
              <span className="text-white">Claude Code</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="agent"
                value="opencode"
                checked={agent === 'opencode'}
                onChange={() => setAgent('opencode')}
                className="text-cyan-500"
              />
              <span className="text-white">OpenCode</span>
            </label>
          </div>
        </div>

        {/* Requirements File */}
        <div>
          <label className="block text-gray-300 mb-2">Requirements File (PDF/MD)</label>
          <input
            type="file"
            ref={reqFileRef}
            accept=".pdf,.md,.txt,.markdown"
            onChange={(e) => setRequirementsFile(e.target.files?.[0] || null)}
            className="w-full px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 file:mr-4 file:py-1 file:px-4 file:rounded file:border-0 file:bg-cyan-600 file:text-white file:cursor-pointer"
          />
        </div>

        {/* Test Cases CSV */}
        <div>
          <label className="block text-gray-300 mb-2">Test Cases CSV</label>
          <input
            type="file"
            ref={csvFileRef}
            accept=".csv"
            onChange={(e) => setTestCasesCsv(e.target.files?.[0] || null)}
            className="w-full px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 file:mr-4 file:py-1 file:px-4 file:rounded file:border-0 file:bg-cyan-600 file:text-white file:cursor-pointer"
          />
        </div>
      </div>

      <div className="mt-6">
        <button
          type="submit"
          disabled={loading || !targetUrl}
          className="px-6 py-2 bg-cyan-600 text-white rounded font-semibold hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Starting...' : 'Start Test'}
        </button>
      </div>
    </form>
  );
}
