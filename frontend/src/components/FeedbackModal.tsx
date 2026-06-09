import { useState } from 'react';
import { apiClient } from '../api/client';

interface FeedbackModalProps {
  sessionId: string;
  onClose: () => void;
}


export function FeedbackModal({ sessionId, onClose }: FeedbackModalProps) 
{
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!content.trim()) {
      setError('Feedback cannot be empty.');
      return;
    }

    try 
    {
      setLoading(true);
      setError(null);

      await apiClient.post('/feedback', { sessionId, content,});
      setContent('');
      onClose();
    } 
    // catch (err) 
    // {
    //   console.error(err);
    //   setError('Failed to submit feedback.');
    // } 
    catch (err: any) {
    console.error('FEEDBACK ERROR:', err?.response?.data || err);
    setError(err?.response?.data?.message || 'Failed to submit feedback.');
    }
    finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="modal bg-slate-900 p-6 rounded-md w-[90%] max-w-md shadow-lg">
        <h2 className="text-xl font-bold mb-4">Game Feedback</h2>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="How was the game?"
          className="w-full min-h-[100px] p-2 rounded border border-slate-700 bg-slate-800 text-white"
        />

        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}

        <div className="mt-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-700 rounded hover:bg-slate-600"
          >
            Skip
          </button>
          <button
            onClick={submit}
            disabled={loading}
            className="px-4 py-2 bg-teal-500 rounded hover:bg-teal-400 disabled:opacity-50"
          >
            {loading ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  );
}