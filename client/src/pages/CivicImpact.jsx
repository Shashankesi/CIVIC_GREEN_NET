import React, { useState, useEffect, useCallback, useContext } from 'react';
import { 
  Award, Trophy, Sparkles, TrendingUp, ShieldCheck, CheckCircle2, 
  Clock, ArrowUpRight, Flame, HelpCircle, Filter, Calendar, Users, RefreshCw
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import reputationApi from '../services/reputation';
import AuthContext from '../context/AuthContext';
import Skeleton from '../components/Skeleton';
import ErrorState from '../components/ErrorState';
import AppShell from '../components/AppShell';

export default function CivicImpact() {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reputation, setReputation] = useState(null);
  const [history, setHistory] = useState({ items: [], total: 0, page: 1 });
  const [historyPage, setHistoryPage] = useState(1);
  const [leaderboard, setLeaderboard] = useState({ items: [], total: 0, currentUserRank: null });
  const [timeframe, setTimeframe] = useState('all');
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'ledger' | 'leaderboard'

  // ── Load User Reputation ───────────────────────────────────────────────────
  const loadReputation = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await reputationApi.getMyReputation();
      setReputation(data);
    } catch (err) {
      console.error('Failed to load civic reputation:', err);
      setError(err?.response?.data?.message || 'Could not load your civic reputation profile.');
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Load Ledger History ────────────────────────────────────────────────────
  const loadHistory = useCallback(async (page = 1) => {
    try {
      const data = await reputationApi.getMyHistory({ page, limit: 10 });
      setHistory(data || { items: [], total: 0, page: 1 });
    } catch (err) {
      console.error('Failed to load history:', err);
    }
  }, []);

  // ── Load Leaderboard ───────────────────────────────────────────────────────
  const loadLeaderboard = useCallback(async () => {
    try {
      const data = await reputationApi.getCitizenLeaderboard({ timeframe, limit: 15 });
      setLeaderboard(data || { items: [], total: 0, currentUserRank: null });
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
    }
  }, [timeframe]);

  useEffect(() => {
    loadReputation();
  }, [loadReputation]);

  useEffect(() => {
    loadHistory(historyPage);
  }, [loadHistory, historyPage]);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  const currentLevel = reputation?.currentLevel || { name: 'New Contributor', badgeIcon: '🌱', progressPercent: 0 };
  const nextLevel = reputation?.nextLevel;

  if (loading && !reputation) {
    return (
      <AppShell title="Civic Impact & Reputation">
        <div className="space-y-6">
          <Skeleton className="h-10 w-64 rounded-xl" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Skeleton className="h-32 rounded-3xl" />
            <Skeleton className="h-32 rounded-3xl" />
            <Skeleton className="h-32 rounded-3xl" />
            <Skeleton className="h-32 rounded-3xl" />
          </div>
          <Skeleton className="h-96 rounded-3xl" />
        </div>
      </AppShell>
    );
  }

  if (error && !reputation) {
    return (
      <AppShell title="Civic Impact & Reputation">
        <ErrorState
          title="Unable to load civic reputation"
          message={error}
          onRetry={loadReputation}
        />
      </AppShell>
    );
  }

  return (
    <AppShell title="Civic Impact & Reputation">
      <div className="space-y-6">
        {/* ── Header ──────────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <Award className="h-7 w-7 text-emerald-500" />
            Civic Impact &amp; Reputation
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Track your contributions, rank among city changemakers, and earn verified civic achievements.
          </p>
        </div>

        {/* Level Badge Pill */}
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200/80 bg-emerald-50/70 px-4 py-2 dark:border-emerald-900/50 dark:bg-emerald-950/40">
          <span className="text-2xl">{currentLevel.badgeIcon}</span>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Current Standing</div>
            <div className="text-sm font-black text-slate-900 dark:text-white">{currentLevel.name}</div>
          </div>
        </div>
      </div>

      {/* ── Overview Metrics Grid ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Points */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Reputation Score</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
              <Sparkles className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white">
              {reputation?.totalPoints || 0}
            </span>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Civic Points</span>
          </div>
          {/* Progress to next level */}
          {nextLevel && (
            <div className="mt-4 space-y-1.5">
              <div className="flex justify-between text-[11px] font-medium text-slate-400">
                <span>Progress to {nextLevel.name}</span>
                <span>{nextLevel.pointsNeeded} pts to go</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div 
                  className="h-full rounded-full bg-linear-to-r from-emerald-500 to-teal-400 transition-all duration-500" 
                  style={{ width: `${currentLevel.progressPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Citywide Rank */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">City Rank</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
              <Trophy className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white">
              #{reputation?.rank || 1}
            </span>
            <span className="text-xs font-medium text-slate-400">Citywide</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
            <TrendingUp className="h-4 w-4" /> Top Tier Contributor
          </div>
        </div>

        {/* Verified Reports */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Verified Reports</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white">
              {reputation?.verifiedReports || 0}
            </span>
            <span className="text-xs font-medium text-slate-400">of {reputation?.totalReports || 0} total</span>
          </div>
          <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            {reputation?.totalReports > 0
              ? `${Math.round(((reputation?.verifiedReports || 0) / reputation.totalReports) * 100)}% accuracy score`
              : 'Submit reports to build accuracy'}
          </div>
        </div>

        {/* Resolved Community Issues */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Resolved Issues</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white">
              {reputation?.resolvedReports || 0}
            </span>
            <span className="text-xs font-bold text-purple-600 dark:text-purple-400">Resolved</span>
          </div>
          <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Direct positive impact created
          </div>
        </div>
      </div>

      {/* ── Tab Navigation ──────────────────────────────────────────────────── */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-xs font-bold transition-all ${
            activeTab === 'overview'
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <Award className="h-4 w-4" />
          Impact Overview &amp; Badges
        </button>
        <button
          onClick={() => setActiveTab('ledger')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-xs font-bold transition-all ${
            activeTab === 'ledger'
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <Clock className="h-4 w-4" />
          Point History Ledger
        </button>
        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-xs font-bold transition-all ${
            activeTab === 'leaderboard'
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <Trophy className="h-4 w-4" />
          City Leaderboard
        </button>
      </div>

      {/* ── Tab 1: Overview & Badges Shelf ──────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Badges Shelf */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              Verified Civic Badges &amp; Achievements
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-6">
              Badges are automatically unlocked as your real-world civic contributions are verified.
            </p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {(reputation?.badgeCatalog || []).map((badge) => (
                <div
                  key={badge.id}
                  className={`relative rounded-2xl border p-4 transition-all ${
                    badge.isEarned
                      ? 'border-emerald-200/90 bg-emerald-50/40 dark:border-emerald-800/60 dark:bg-emerald-950/20'
                      : 'border-slate-200 bg-slate-50/50 opacity-60 dark:border-slate-800 dark:bg-slate-800/30'
                  }`}
                >
                  {badge.isEarned && (
                    <div className="absolute right-3 top-3 rounded-full bg-emerald-500 p-1 text-white shadow-xs">
                      <CheckCircle2 className="h-3 w-3" />
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl font-bold ${
                      badge.isEarned
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-200 text-slate-400 dark:bg-slate-700 dark:text-slate-500'
                    }`}>
                      <Award className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 dark:text-white">{badge.name}</h3>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        {badge.category}
                      </span>
                    </div>
                  </div>
                  <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    {badge.description}
                  </p>
                  {badge.isEarned ? (
                    <div className="mt-3 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      ✓ Earned {badge.awarded_at ? new Date(badge.awarded_at).toLocaleDateString() : ''}
                    </div>
                  ) : (
                    <div className="mt-3 text-[10px] font-semibold text-slate-400">
                      Criteria: {badge.criteria_points} pts
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Point System Rules Guide Card */}
          <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-6 dark:border-slate-800 dark:bg-slate-850">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-emerald-500" />
              How Civic Points Are Calculated
            </h3>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 text-xs">
              <div className="flex items-center justify-between rounded-xl bg-white p-3 shadow-2xs dark:bg-slate-900">
                <span className="text-slate-600 dark:text-slate-300">Valid Complaint Submission</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">+10 pts</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-white p-3 shadow-2xs dark:bg-slate-900">
                <span className="text-slate-600 dark:text-slate-300">Complaint Verification</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">+20 pts</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-white p-3 shadow-2xs dark:bg-slate-900">
                <span className="text-slate-600 dark:text-slate-300">Successful Issue Resolution</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">+30 pts</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-white p-3 shadow-2xs dark:bg-slate-900">
                <span className="text-slate-600 dark:text-slate-300">Helpful Photo / Evidence</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">+5 pts</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-white p-3 shadow-2xs dark:bg-slate-900">
                <span className="text-slate-600 dark:text-slate-300">Duplicate Report</span>
                <span className="font-bold text-slate-400">0 pts (No penalty)</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-white p-3 shadow-2xs dark:bg-slate-900">
                <span className="text-slate-600 dark:text-slate-300">Confirmed False/Abusive Report</span>
                <span className="font-bold text-red-600 dark:text-red-400">-30 pts penalty</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab 2: Point History Ledger ─────────────────────────────────────── */}
      {activeTab === 'ledger' && (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="h-4 w-4 text-emerald-500" />
              Transaction History Ledger
            </h2>
            <span className="text-xs text-slate-400">
              Total {history.total} recorded transactions
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                <tr>
                  <th className="px-5 py-3.5">Date &amp; Time</th>
                  <th className="px-5 py-3.5">Activity Event</th>
                  <th className="px-5 py-3.5">Reference / Case</th>
                  <th className="px-5 py-3.5 text-right">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {history.items.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="py-8 text-center text-slate-400">
                      No point transactions recorded yet.
                    </td>
                  </tr>
                ) : (
                  history.items.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="px-5 py-3 font-mono text-slate-500 dark:text-slate-400">
                        {new Date(tx.created_at).toLocaleString('en-IN', {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </td>
                      <td className="px-5 py-3">
                        <div className="font-semibold text-slate-900 dark:text-white">{tx.reason || tx.event_type}</div>
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">{tx.event_type}</div>
                      </td>
                      <td className="px-5 py-3 font-mono text-slate-600 dark:text-slate-300">
                        {tx.complaint_id ? `#CGN-${String(tx.complaint_id).padStart(5, '0')}` : 'System'}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-bold ${
                          tx.points > 0
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                            : 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400'
                        }`}>
                          {tx.points > 0 ? `+${tx.points}` : tx.points} pts
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {history.total > 10 && (
            <div className="flex items-center justify-between border-t border-slate-100 p-4 dark:border-slate-800">
              <button
                onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                disabled={historyPage === 1}
                className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300"
              >
                Previous
              </button>
              <span className="text-xs text-slate-400">
                Page {historyPage} of {Math.ceil(history.total / 10)}
              </span>
              <button
                onClick={() => setHistoryPage(p => p + 1)}
                disabled={historyPage >= Math.ceil(history.total / 10)}
                className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Tab 3: City Leaderboard ─────────────────────────────────────────── */}
      {activeTab === 'leaderboard' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Citywide civic leaderboard based on verified community action and resolution outcomes.
            </p>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-2xs focus:border-emerald-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <option value="all">All Time</option>
              <option value="month">This Month</option>
              <option value="week">This Week</option>
              <option value="today">Today</option>
            </select>
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                  <tr>
                    <th className="px-5 py-3.5">Rank</th>
                    <th className="px-5 py-3.5">Citizen</th>
                    <th className="px-5 py-3.5 text-right">Points</th>
                    <th className="px-5 py-3.5 text-right">Submitted</th>
                    <th className="px-5 py-3.5 text-right">Verified</th>
                    <th className="px-5 py-3.5 text-right">Resolved</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {leaderboard.items.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-slate-400">
                        No activity found for this timeframe.
                      </td>
                    </tr>
                  ) : (
                    leaderboard.items.map((item) => (
                      <tr 
                        key={item.userId} 
                        className={`${item.isCurrentUser ? 'bg-emerald-50/50 font-bold dark:bg-emerald-950/30' : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/40'}`}
                      >
                        <td className="px-5 py-3.5 font-mono font-bold">
                          {item.rank === 1 && <span className="inline-flex items-center gap-1 text-amber-500 font-black"><Trophy className="h-4 w-4" /> #1</span>}
                          {item.rank === 2 && <span className="inline-flex items-center gap-1 text-slate-400 font-black"><Trophy className="h-4 w-4" /> #2</span>}
                          {item.rank === 3 && <span className="inline-flex items-center gap-1 text-amber-700 font-black"><Trophy className="h-4 w-4" /> #3</span>}
                          {item.rank > 3 && `#${item.rank}`}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            {item.displayName}
                            {item.isCurrentUser && (
                              <span className="rounded-md bg-emerald-500 px-1.5 py-0.5 text-[9px] font-bold text-white uppercase">You</span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                            +{item.points} pts
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right font-medium text-slate-600 dark:text-slate-300">{item.reports}</td>
                        <td className="px-5 py-3.5 text-right font-medium text-emerald-600 dark:text-emerald-400">{item.verifiedReports}</td>
                        <td className="px-5 py-3.5 text-right font-medium text-blue-600 dark:text-blue-400">{item.resolvedReports}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  </AppShell>
);
}
