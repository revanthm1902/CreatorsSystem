import { useState } from 'react';
import {
  X,
  Gift,
  Zap,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import type { Profile } from '../../types/database';

interface GiveTokensModalProps {
  target: Profile;
  actorId: string;
  actorName: string;
  giveTokens: (targetUserId: string, amount: number, reason: string, actorId: string, actorName: string, targetName: string) => Promise<{ error: string | null }>;
  onClose: () => void;
}

export function GiveTokensModal({ target, actorId, actorName, giveTokens, onClose }: GiveTokensModalProps) {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const tokens = parseInt(amount, 10);
    if (!tokens || tokens < 1) {
      setError('Enter a valid number of tokens (minimum 1)');
      return;
    }
    if (tokens > 10000) {
      setError('Maximum 10,000 tokens at a time');
      return;
    }

    setLoading(true);
    setError('');

    const result = await giveTokens(target.id, tokens, reason.trim(), actorId, actorName, target.full_name);
    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess(true);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl overflow-hidden"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
      >
        <div className="sm:hidden w-10 h-1 rounded-full mx-auto mt-3 mb-1" style={{ backgroundColor: 'var(--border-color)' }} />

        <div
          className="flex items-center justify-between p-5"
          style={{ borderBottom: '1px solid var(--border-color)' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent/20 rounded-full flex items-center justify-center">
              <Gift className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h2 className="font-bold" style={{ color: 'var(--text-primary)' }}>Give Tokens</h2>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>to {target.full_name}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }} className="p-1.5 rounded-lg hover:bg-primary/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {success ? (
          <div className="p-6 text-center space-y-4">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-accent/20 rounded-full">
              <Zap className="w-7 h-7 text-accent" />
            </div>
            <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
              {amount} tokens given to {target.full_name}!
            </p>
            <button
              onClick={onClose}
              className="w-full px-4 py-3 bg-primary hover:bg-primary-hover text-white font-semibold rounded-xl transition-all"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {error && (
              <div className="bg-danger/10 border border-danger/30 text-danger rounded-xl p-3 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Current Balance
              </label>
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                <Zap className="w-4 h-4 text-accent" />
                <span className="font-bold text-accent">{target.total_tokens}</span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>tokens</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Tokens to Give
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                min={1}
                max={10000}
                className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent transition-all"
                style={{ backgroundColor: 'var(--input-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                placeholder="e.g. 50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Reason <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>(optional)</span>
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent transition-all"
                style={{ backgroundColor: 'var(--input-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                placeholder="e.g. Great performance this week"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 rounded-xl transition-all text-sm font-medium"
                style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-accent hover:bg-accent/90 text-white font-semibold rounded-xl transition-all disabled:opacity-50 text-sm"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Gift className="w-4 h-4" />
                    Give Tokens
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
