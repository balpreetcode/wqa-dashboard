import { useState, useEffect, useCallback } from 'react';
import { fetchRuns, deleteRun } from './api/client';
import type { TestRun } from './types';
import { NewRunForm } from './components/NewRunForm';
import { RunsList } from './components/RunsList';
import { RunDetail } from './components/RunDetail';

function App() {
  const [runs, setRuns] = useState<TestRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRun, setSelectedRun] = useState<TestRun | null>(null);

  const loadRuns = useCallback(async () => {
    try {
      const data = await fetchRuns(1, 50);
      setRuns(data.runs);
    } catch (error) {
      console.error('Failed to load runs:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRuns();

    // Poll for updates every 5 seconds
    const interval = setInterval(loadRuns, 5000);
    return () => clearInterval(interval);
  }, [loadRuns]);

  const handleRunCreated = (run: TestRun) => {
    setRuns((prev) => [run, ...prev]);
    setSelectedRun(run);
  };

  const handleDelete = async (run: TestRun) => {
    if (!confirm(`Delete test run for ${run.target_url}?`)) return;

    try {
      await deleteRun(run.id);
      setRuns((prev) => prev.filter((r) => r.id !== run.id));
      if (selectedRun?.id === run.id) {
        setSelectedRun(null);
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to delete');
    }
  };

  const handleRunUpdate = (updatedRun: TestRun) => {
    setRuns((prev) =>
      prev.map((r) => (r.id === updatedRun.id ? { ...r, ...updatedRun } : r))
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-cyan-400">
            WQA Dashboard
          </h1>
          <span className="text-gray-400 text-sm">WebQA Testing Platform</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <NewRunForm onCreated={handleRunCreated} />

        <h2 className="text-xl font-semibold text-white mb-4">Test Runs</h2>

        {loading ? (
          <div className="bg-gray-800 rounded-lg p-8 text-center text-gray-400">
            Loading...
          </div>
        ) : (
          <RunsList
            runs={runs}
            onSelect={setSelectedRun}
            onDelete={handleDelete}
            selectedId={selectedRun?.id || null}
          />
        )}
      </main>

      {/* Run Detail Modal */}
      {selectedRun && (
        <RunDetail
          run={selectedRun}
          onClose={() => setSelectedRun(null)}
          onUpdate={handleRunUpdate}
        />
      )}
    </div>
  );
}

export default App;
