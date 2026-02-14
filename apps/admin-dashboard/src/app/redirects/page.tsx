'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { redirectsApi } from '@/lib/api-client';

export default function RedirectsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [fromPath, setFromPath] = useState('');
  const [toPath, setToPath] = useState('');
  const [statusCode, setStatusCode] = useState(301);

  const { data, isLoading } = useQuery({
    queryKey: ['redirects', { page }],
    queryFn: () => redirectsApi.list({ page, limit: 20 }),
  });

  const createMutation = useMutation({
    mutationFn: () => redirectsApi.create({ fromPath, toPath, statusCode }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['redirects'] });
      setShowCreate(false);
      setFromPath('');
      setToPath('');
      toast.success('Redirect created');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => redirectsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['redirects'] });
      toast.success('Redirect deleted');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Redirects</h1>
          <p className="mt-1 text-sm text-gray-500">Manage URL redirect rules</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          Add Redirect
        </button>
      </div>

      {showCreate && (
        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">From Path</label>
              <input type="text" value={fromPath} onChange={(e) => setFromPath(e.target.value)} placeholder="/old-page" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">To Path</label>
              <input type="text" value={toPath} onChange={(e) => setToPath(e.target.value)} placeholder="/new-page" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
            </div>
            <div className="w-24">
              <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
              <select value={statusCode} onChange={(e) => setStatusCode(Number(e.target.value))} className="w-full rounded-md border border-gray-300 px-2 py-2 text-sm">
                <option value={301}>301</option>
                <option value={302}>302</option>
              </select>
            </div>
            <button type="submit" disabled={createMutation.isPending} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {createMutation.isPending ? 'Adding...' : 'Add'}
            </button>
            <button type="button" onClick={() => setShowCreate(false)} className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300">Cancel</button>
          </form>
        </div>
      )}

      <div className="overflow-hidden rounded-lg bg-white shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">From</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">To</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Created</th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {isLoading ? (
              <tr><td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-400">Loading...</td></tr>
            ) : data?.data?.length ? (
              data.data.map((r: any) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-mono text-gray-700">{r.fromPath}</td>
                  <td className="px-6 py-4 text-sm font-mono text-gray-700">{r.toPath}</td>
                  <td className="px-6 py-4"><span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">{r.statusCode}</span></td>
                  <td className="px-6 py-4 text-xs text-gray-400">{new Date(r.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => { if (confirm('Delete this redirect?')) deleteMutation.mutate(r.id); }} className="text-xs text-red-600 hover:text-red-700">Delete</button>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500">No redirects configured.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
