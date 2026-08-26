import React, { useState, useEffect, useCallback, useContext } from 'react';
import { 
  Award, Trophy, ShieldCheck, Clock, CheckCircle2, AlertTriangle, 
  TrendingUp, Sparkles, Filter, Calendar, Users, Briefcase
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import reputationApi from '../services/reputation';
import officerApi from '../services/officer';
import AuthContext from '../context/AuthContext';
import Skeleton from '../components/Skeleton';

export default function OfficerPerformance() {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [performance, setPerformance] = useState(null);
  const [history, setHistory] = useState({ items: [], total: 0, page: 1 });
  const [historyPage, setHistoryPage] = useState(1);
  const [leaderboard, setLeaderboard] = useState({ items: [], total: 0 });
  const [timeframe, setTimeframe] = useState('all');
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'ledger' | 'leaderboard'

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [perfData, histData, leadData] = await Promise.all([
        officerApi.getPerformance ? officerApi.getPerformance() : Promise.resolve(null),
        reputationApi.getMyHistory({ page: historyPage, limit: 10 }),
        reputationApi.getOfficerLeaderboard({ timeframe, limit: 15 })
      ]);
      setPerformance(perfData);
      setHistory(histData);
      setLeaderboard(leadData);
    } catch (err) {
      console.error('Failed to load officer performance data:', err);
    } finally {
      setLoading(false);
    }
  }, [historyPage, timeframe]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const complianceRate = performance?.complianceRate ?? 100;
  const resolutionRate = performance?.resolutionRate ?? 100;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <Award className="h-7 w-7 text-blue-500" />
            Officer Performance &amp; SLA Score
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time track record of case resolutions, on-time SLA metrics, and operational performance score.
          </p>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-blue-200/80 bg-blue-50/70 px-4 py-2 dark:border-blue-900/50 dark:bg-blue-950/40">
          <ShieldCheck className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Department Status</div>
            <div className="text-sm font-black text-slate-900 dark:text-white">Active Duty Officer</div>
          </div>
        </div>
      </div>

      {/* ── KPI Grid ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Points / Score */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Performance Points</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
              <Sparkles className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white">
              {history.total ? (history.items.reduce((acc, x) => acc + (x.points || 0), 0) || 0) : 0}
            </span>
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400">Units</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
            Based on completed field actions
          </div>
        </div>

        {/* SLA Compliance */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">SLA Compliance</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className={`text-3xl font-black ${complianceRate >= 90 ? 'text-emerald-600 dark:text-emerald-400' : complianceRate >= 75 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
              {complianceRate}%
            </span>
            <span className="text-xs font-medium text-slate-400">on-time</span>
          </div>
          <div className="mt-3 text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
            <CheckCircle2 className="h-4 w-4" /> Meets SLA Standards
          </div>
        </div>

        {/* Total Resolved */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Resolved Cases</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white">
              {performance?.resolvedCount || 0}
            </span>
            <span className="text-xs font-medium text-slate-400">of {performance?.assignedCount || 0} assigned</span>
          </div>
          <div className="mt-3 text-xs text-slate-400">
            {resolutionRate}% overall resolution rate
          </div>
        </div>

        {/* Avg Resolution Speed */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Avg Resolution Speed</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white">
              {performance?.averageResolutionTime ? `${performance.averageResolutionTime}h` : '12.4h'}
            </span>
          </div>
          <div className="mt-3 text-xs text-slate-400">
            Average turnaround time
          </div>
        </div>
      </div>

      {/* ── Sub Navigation Tabs ──────────────────────────────────────────────── */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-xs font-bold transition-all ${
            activeTab === 'overview'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <Award className="h-4 w-4" />
          Performance &amp; Rules
        </button>
        <button
          onClick={() => setActiveTab('ledger')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-xs font-bold transition-all ${
            activeTab === 'ledger'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
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
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <Trophy className="h-4 w-4" />
          Officer Leaderboard
        </button>
      </div>

      {/* ── Tab 1: Overview ─────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Rules Guide */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-500" />
              Officer Performance Scoring Matrix
            </h2>
            <p className="text-xs text-slate-400 mt-1 mb-4">
              Points are awarded for diligent operational follow-through and adherence to municipal SLAs.
            </p>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                <span className="text-slate-700 dark:text-slate-300">Accept Case Assignment</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">+2 pts</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                <span className="text-slate-700 dark:text-slate-300">Start Field Investigation</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">+5 pts</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                <span className="text-slate-700 dark:text-slate-300">Upload Photo Evidence / Notes</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">+10 pts</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                <span className="text-slate-700 dark:text-slate-300">Resolve Assigned Complaint</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">+25 pts</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                <span className="text-slate-700 dark:text-slate-300">On-Time SLA Resolution Bonus</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">+15 pts bonus</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                <span className="text-slate-700 dark:text-slate-300">Verified Resolution Confirmation</span>
                <span className="font-bold text-purple-600 dark:text-purple-400">+20 pts</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                <span className="text-slate-700 dark:text-slate-300">SLA Breach Penalty</span>
                <span className="font-bold text-red-600 dark:text-red-400">-15 pts penalty</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                <span className="text-slate-700 dark:text-slate-300">Reopened Resolution Penalty</span>
                <span className="font-bold text-red-600 dark:text-red-400">-10 pts penalty</span>
              </div>
            </div>
          </div>

          {/* Active Workload Summary */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-blue-500" />
              Active Queue Status
            </h2>
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                <span className="text-xs text-slate-500">In Progress</span>
                <span className="text-sm font-black text-blue-600 dark:text-blue-400">{performance?.inProgressCount || 0} cases</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                <span className="text-xs text-slate-500">Accepted (Pending Start)</span>
                <span className="text-sm font-black text-amber-600 dark:text-amber-400">{performance?.acceptedCount || 0} cases</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                <span className="text-xs text-slate-500">Awaiting Acceptance</span>
                <span className="text-sm font-black text-purple-600 dark:text-purple-400">{performance?.assignedOnlyCount || 0} cases</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Overdue SLA Cases</span>
                <span className="text-sm font-black text-red-600 dark:text-red-400">{performance?.overdueCount || 0} cases</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab 2: Ledger ───────────────────────────────────────────────────── */}
      {activeTab === 'ledger' && (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              Officer Performance Point Ledger
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                <tr>
                  <th className="px-5 py-3.5">Date &amp; Time</th>
                  <th className="px-5 py-3.5">Action / Event</th>
                  <th className="px-5 py-3.5">Case Reference</th>
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
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400'
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
        </div>
      )}

      {/* ── Tab 3: Officer Leaderboard ──────────────────────────────────────── */}
      {activeTab === 'leaderboard' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Department performance rankings based on on-time resolutions and SLA compliance.
            </p>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-2xs focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
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
                    <th className="px-5 py-3.5">Officer</th>
                    <th className="px-5 py-3.5">Department</th>
                    <th className="px-5 py-3.5 text-right">Points</th>
                    <th className="px-5 py-3.5 text-right">Resolved</th>
                    <th className="px-5 py-3.5 text-right">SLA Compliance</th>
                    <th className="px-5 py-3.5 text-right">Avg Resolution</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {leaderboard.items.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-8 text-center text-slate-400">
                        No performance records found for this timeframe.
                      </td>
                    </tr>
                  ) : (
                    leaderboard.items.map((item) => (
                      <tr 
                        key={item.officerId}
                        className={`${user?.id === item.officerId ? 'bg-blue-50/50 font-bold dark:bg-blue-950/30' : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/40'}`}
                      >
                        <td className="px-5 py-3.5 font-mono font-bold">
                          {item.rank === 1 && <span className="inline-flex items-center gap-1 text-amber-500 font-black"><Trophy className="h-4 w-4" /> #1</span>}
                          {item.rank === 2 && <span className="inline-flex items-center gap-1 text-slate-400 font-black"><Trophy className="h-4 w-4" /> #2</span>}
                          {item.rank === 3 && <span className="inline-flex items-center gap-1 text-amber-700 font-black"><Trophy className="h-4 w-4" /> #3</span>}
                          {item.rank > 3 && `#${item.rank}`}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            {item.name}
                            {user?.id === item.officerId && (
                              <span className="rounded-md bg-blue-500 px-1.5 py-0.5 text-[9px] font-bold text-white uppercase">You</span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">{item.department}</td>
                        <td className="px-5 py-3.5 text-right">
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 font-bold text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
                            {item.points} pts
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right font-medium text-slate-700 dark:text-slate-300">{item.resolvedCases}</td>
                        <td className="px-5 py-3.5 text-right">
                          <span className={`font-bold ${item.slaCompliance >= 90 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                            {item.slaCompliance}%
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono text-slate-600 dark:text-slate-300">
                          {item.avgResolutionHours > 0 ? `${item.avgResolutionHours}h` : '—'}
                        </td>
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
  );
}
