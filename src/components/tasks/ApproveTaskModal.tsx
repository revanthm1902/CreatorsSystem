/**
 * ApproveTaskModal — shown when an admin approves a submitted task.
 *
 * Single responsibility: collect an optional bonus token amount before
 * confirming task approval.
 */

import { useState } from 'react';
import { CheckCircle, Zap, Gift, X, Clock, AlertTriangle } from 'lucide-react';

interface ApproveTaskModalProps {
  taskTitle: string;
  baseTokens: number;
  deadline: string;
  submissionNote: string | null;
  loading: boolean;
  onApprove: (bonusTokens: number) => Promise<void>;
  onClose: () => void;
}

export function ApproveTaskModal({
  taskTitle,
  baseTokens,
  deadline,
  submissionNote,
  loading,
  onApprove,
  onClose,
}: ApproveTaskModalProps) {
  const [awardInput, setAwardInput] = useState('');

  const isOnTime = new Date() <= new Date(deadline);

  // On-time → planned tokens earned; Late → planned tokens forfeited
  const earnedBase = isOnTime ? baseTokens : 0;
  // Admin's discretionary input: bonus on-time, or mercy award when late
  const adminAward = awardInput === '' ? 0 : Math.max(0, parseInt(awardInput, 10) || 0);
  const totalTokens = earnedBase + adminAward;

  const handleConfirm = async () => {
    await onApprove(adminAward);
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[92vh] overflow-y-auto"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-pull-indicator sm:hidden" />

        {/* Header */}
        <div className="p-4 sm:p-6" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <div className="flex items-center justify-between">
            <h2
              className="text-lg font-bold flex items-center gap-2"
              style={{ color: 'var(--text-primary)' }}
            >
              <CheckCircle className="w-5 h-5 text-success" />
              Approve Task
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-primary/10"
              style={{ color: 'var(--text-muted)' }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Approving <strong style={{ color: 'var(--text-primary)' }}>"{taskTitle}"</strong>
          </p>
        </div>

        <div className="p-4 sm:p-6 space-y-5">
          {/* Submission note */}
          {submissionNote && (
            <div>
              <p
                className="text-xs font-medium mb-1.5 flex items-center gap-1.5"
                style={{ color: 'var(--text-muted)' }}
              >
                <CheckCircle className="w-3.5 h-3.5" />
                User's Work Summary
              </p>
              <div
                className="rounded-lg p-3 text-sm"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  color: 'var(--text-secondary)',
                  borderLeft: '3px solid var(--color-primary)',
                }}
              >
                {submissionNote}
              </div>
            </div>
          )}

          {/* Timing banner */}
          {isOnTime ? (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium bg-success/10 text-success border border-success/20">
              <Clock className="w-4 h-4 shrink-0" />
              <span>Submitted on time — planned tokens will be awarded in full.</span>
            </div>
          ) : (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl text-sm font-medium bg-danger/10 text-danger border border-danger/20">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Submitted <strong>late</strong> — the planned {baseTokens} token{baseTokens !== 1 ? 's' : ''} are
                forfeited. You may still award tokens at your discretion below.
              </span>
            </div>
          )}

          {/* Token breakdown card */}
          <div
            className="rounded-xl p-4 space-y-2"
            style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-color)' }}
          >
            {/* Planned tokens row */}
            <div className="flex items-center justify-between text-sm">
              <span style={{ color: 'var(--text-muted)' }}>Planned tokens</span>
              {isOnTime ? (
                <div className="flex items-center gap-1 font-semibold" style={{ color: 'var(--text-primary)' }}>
                  <Zap className="w-3.5 h-3.5 text-accent" />
                  {baseTokens}
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold line-through" style={{ color: 'var(--text-muted)' }}>
                    {baseTokens}
                  </span>
                  <span className="text-xs font-semibold text-danger">forfeited</span>
                </div>
              )}
            </div>

            {/* Admin award row */}
            <div className="flex items-center justify-between text-sm">
              <span style={{ color: 'var(--text-muted)' }}>
                {isOnTime ? 'Bonus (admin)' : 'Admin award'}
              </span>
              <div className="flex items-center gap-1 font-semibold text-success">
                <Gift className="w-3.5 h-3.5" />
                +{adminAward}
              </div>
            </div>

            {/* Total */}
            <div
              className="pt-2 mt-2 flex items-center justify-between font-bold text-base"
              style={{ borderTop: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
            >
              <span>Total awarded</span>
              <div className="flex items-center gap-1 text-accent">
                <Zap className="w-4 h-4" />
                {totalTokens}
              </div>
            </div>
          </div>

          {/* Admin award input */}
          <div>
            <label
              className="text-sm font-medium mb-2 flex items-center gap-1.5"
              style={{ color: 'var(--text-secondary)' }}
            >
              <Gift className="w-4 h-4 text-success" />
              {isOnTime ? 'Bonus Tokens' : 'Award Tokens'}{' '}
              <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span>
            </label>
            <input
              type="number"
              min={0}
              value={awardInput}
              onChange={(e) => setAwardInput(e.target.value)}
              placeholder={
                isOnTime
                  ? 'e.g. 5 — leave blank for no bonus'
                  : 'e.g. 3 — leave blank to award 0 tokens'
              }
              className="w-full px-4 py-3 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/50"
              style={{
                backgroundColor: 'var(--input-bg)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
              }}
            />
            <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
              {isOnTime
                ? 'Optionally reward exceptional work with extra tokens on top of the planned amount.'
                : 'Planned tokens are forfeited due to late submission. You may still award tokens at your discretion.'}
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl font-medium transition-all"
              style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-success hover:bg-success/90 text-white rounded-xl font-semibold transition-all disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Approve &amp; Award {totalTokens} Token{totalTokens !== 1 ? 's' : ''}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
