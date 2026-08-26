import React, { useState, useEffect, useCallback } from 'react';
import { 
  Award, Trophy, Users, ShieldCheck, Sparkles, TrendingUp, RefreshCw, 
  Settings, CheckCircle, Clock, AlertCircle, Save, Search, Filter 
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import reputationApi from '../../services/reputation';
import Skeleton from '../Skeleton';

export default function ReputationManagementView() {
  const [activeTab, setActiveTab] = useState('citizens'); // 'citizens' | 'officers' | 'rules'
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  
  // Leaderboards
  const [timeframe, setTimeframe] = useState('all');
  const [citizenData, setCitizenData] = useState({ items: [], total: 0, page: 1 });
  const [officerData, setOfficerData] = useState({ items: [], total: 0, page: 1 });
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  // Point Rules
  const [rules, setRules] = useState([]);
  const [savingRules, setSavingRules] = useState(false);
  const [ruleEdits, setRuleEdits] = useState({});

  // ── Load Overview ──────────────────────────────────────────────────────────
  const loadOverview = useCallback(async () => {
    try {
      const data = await reputationApi.getAdminOverview();
      setOverview(data);
    } catch (err) {
      console.error('Failed to load reputation overview:', err);
    }
  }, []);

  // ── Load Citizen Leaderboard ───────────────────────────────────────────────
  const loadCitizens = useCallback(async () => {
    try {
      setLoading(true);
      const data = await reputationApi.getAdminCitizens({ timeframe, page, limit: 15 });
      setCitizenData(data);
    } catch (err) {
      toast.error('Failed to load citizen leaderboard');
    } finally {
      setLoading(false);
    }
  }, [timeframe, page]);

  // ── Load Officer Leaderboard ───────────────────────────────────────────────
  const loadOfficers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await reputationApi.getAdminOfficers({ timeframe, page, limit: 15 });
      setOfficerData(data);
    } catch (err) {
      toast.error('Failed to load officer leaderboard');
    } finally {
      setLoading(false);
    }
  }, [timeframe, page]);

  // ── Load Rules ─────────────────────────────────────────────────────────────
  const loadRules = useCallback(async () => {
    try {
      setLoading(true);
      const data = await reputationApi.getAdminRules();
      setRules(data);
      // Initialize edit state
      const initialEdits = {};
      data.forEach(r => {
        initialEdits[r.rule_key] = { points: r.points, is_active: r.is_active };
      });
      setRuleEdits(initialEdits);
    } catch (err) {
      toast.error('Failed to load point rules');
    } finally {
      setLoading(false);
    }
  }, []);

  // Sync active subtab
  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    if (activeTab === 'citizens') {
      loadCitizens();
    } else if (activeTab === 'officers') {
      loadOfficers();
    } else if (activeTab === 'rules') {
      loadRules();
    }
  }, [activeTab, loadCitizens, loadOfficers, loadRules]);

  // ── Rule Edit Handlers ─────────────────────────────────────────────────────
  function handleRulePointsChange(ruleKey, value) {
    setRuleEdits(prev => ({
      ...prev,
      [ruleKey]: {
        ...prev[ruleKey],
        points: parseInt(value, 10) || 0
      }
    }));
  }

  function handleRuleActiveToggle(ruleKey) {
    setRuleEdits(prev => ({
      ...prev,
      [ruleKey]: {
        ...prev[ruleKey],
        is_active: !prev[ruleKey]?.is_active
      }
    }));
  }

  async function handleSaveRules() {
    try {
      setSavingRules(true);
      const payload = rules.map(r => ({
        rule_key: r.rule_key,
        role: r.role,
        name: r.name,
        description: r.description,
        points: ruleEdits[r.rule_key]?.points !== undefined ? ruleEdits[r.rule_key].points : r.points,
        is_active: ruleEdits[r.rule_key]?.is_active !== undefined ? ruleEdits[r.rule_key].is_active : r.is_active
      }));

      await reputationApi.updateAdminRules(payload);
      toast.success('Reputation rules updated successfully');
      loadRules();
    } catch (err) {
      toast.error('Failed to update point rules');
    } finally {
      setSavingRules(false);
    }
  }

  // Filter citizens/officers by search
  const filteredCitizens = (citizenData.items || []).filter(c => 
    !searchQuery || c.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) || String(c.userId).includes(searchQuery)
  );

  const filteredOfficers = (officerData.items || []).filter(o =>
    !searchQuery || o.name?.toLowerCase().includes(searchQuery.toLowerCase()) || o.department?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* ── KPI Overview Cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Points Issued</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
              <Sparkles className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {(overview?.totalPointsIssued || 0).toLocaleString()}
            </span>
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Civic Units</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Citizen Rewards</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {(overview?.citizenPointsTotal || 0).toLocaleString()}
            </span>
            <span className="text-xs font-medium text-slate-400">earned</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Officer Performance</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {(overview?.officerPointsTotal || 0).toLocaleString()}
            </span>
            <span className="text-xs font-medium text-slate-400">score units</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Ledger Audits</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400">
              <Trophy className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {(overview?.totalTransactions || 0).toLocaleString()}
            </span>
            <span className="text-xs font-medium text-purple-600 dark:text-purple-400">tx logged</span>
          </div>
        </div>
      </div>

      {/* ── Sub-navigation & Controls ────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl dark:bg-slate-800">
          <button
            onClick={() => { setActiveTab('citizens'); setPage(1); }}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'citizens'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Users className="h-4 w-4" />
            Citizen Leaderboard
          </button>
          <button
            onClick={() => { setActiveTab('officers'); setPage(1); }}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'officers'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            Officer Performance
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'rules'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Settings className="h-4 w-4" />
            Rule Configuration
          </button>
        </div>

        {/* Filters */}
        {activeTab !== 'rules' && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search contributor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-900 shadow-2xs focus:border-emerald-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>

            <select
              value={timeframe}
              onChange={(e) => { setTimeframe(e.target.value); setPage(1); }}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-2xs focus:border-emerald-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <option value="all">All Time</option>
              <option value="month">This Month</option>
              <option value="week">This Week</option>
              <option value="today">Today</option>
            </select>
          </div>
        )}
      </div>

      {/* ── Tab Content ──────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      ) : activeTab === 'citizens' ? (
        /* Citizen Leaderboard View */
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3.5">Rank</th>
                  <th className="px-4 py-3.5">Citizen</th>
                  <th className="px-4 py-3.5 text-right">Reputation Points</th>
                  <th className="px-4 py-3.5 text-right">Submitted</th>
                  <th className="px-4 py-3.5 text-right">Verified</th>
                  <th className="px-4 py-3.5 text-right">Resolved</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredCitizens.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-slate-400">
                      No citizen activity recorded for this timeframe.
                    </td>
                  </tr>
                ) : (
                  filteredCitizens.map((item) => (
                    <tr key={item.userId} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-mono font-bold">
                        {item.rank === 1 && <span className="inline-flex items-center gap-1 text-amber-500 font-extrabold"><Trophy className="h-3.5 w-3.5" /> #1</span>}
                        {item.rank === 2 && <span className="inline-flex items-center gap-1 text-slate-400 font-extrabold"><Trophy className="h-3.5 w-3.5" /> #2</span>}
                        {item.rank === 3 && <span className="inline-flex items-center gap-1 text-amber-700 font-extrabold"><Trophy className="h-3.5 w-3.5" /> #3</span>}
                        {item.rank > 3 && `#${item.rank}`}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900 dark:text-white">{item.displayName}</div>
                        <div className="text-[10px] text-slate-400">ID: #{1000 + item.userId}</div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                          +{item.points} pts
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-600 dark:text-slate-300">{item.reports}</td>
                      <td className="px-4 py-3 text-right font-medium text-emerald-600 dark:text-emerald-400">{item.verifiedReports}</td>
                      <td className="px-4 py-3 text-right font-medium text-blue-600 dark:text-blue-400">{item.resolvedReports}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'officers' ? (
        /* Officer Leaderboard View */
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3.5">Rank</th>
                  <th className="px-4 py-3.5">Officer</th>
                  <th className="px-4 py-3.5">Department</th>
                  <th className="px-4 py-3.5 text-right">Performance Score</th>
                  <th className="px-4 py-3.5 text-right">Assigned</th>
                  <th className="px-4 py-3.5 text-right">Resolved</th>
                  <th className="px-4 py-3.5 text-right">SLA Compliance</th>
                  <th className="px-4 py-3.5 text-right">Avg Resolution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredOfficers.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-8 text-center text-slate-400">
                      No officer performance records available for this timeframe.
                    </td>
                  </tr>
                ) : (
                  filteredOfficers.map((item) => (
                    <tr key={item.officerId} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-mono font-bold">
                        {item.rank === 1 && <span className="inline-flex items-center gap-1 text-amber-500 font-extrabold"><Trophy className="h-3.5 w-3.5" /> #1</span>}
                        {item.rank === 2 && <span className="inline-flex items-center gap-1 text-slate-400 font-extrabold"><Trophy className="h-3.5 w-3.5" /> #2</span>}
                        {item.rank === 3 && <span className="inline-flex items-center gap-1 text-amber-700 font-extrabold"><Trophy className="h-3.5 w-3.5" /> #3</span>}
                        {item.rank > 3 && `#${item.rank}`}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                        {item.name}
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                        {item.department}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 font-bold text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
                          {item.points} pts
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-600 dark:text-slate-300">{item.assignedCases}</td>
                      <td className="px-4 py-3 text-right font-medium text-emerald-600 dark:text-emerald-400">{item.resolvedCases}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-bold ${item.slaCompliance >= 90 ? 'text-emerald-600 dark:text-emerald-400' : item.slaCompliance >= 75 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
                          {item.slaCompliance}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-600 dark:text-slate-300">
                        {item.avgResolutionHours > 0 ? `${item.avgResolutionHours}h` : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Configurable Point Rules View */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Customize real-time point weights for citizen engagement and officer performance rewards/penalties.
            </p>
            <button
              onClick={handleSaveRules}
              disabled={savingRules}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-500 disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              {savingRules ? 'Saving Changes...' : 'Save Rule Configuration'}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Citizen Rules Column */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                <Users className="h-4 w-4 text-emerald-500" />
                Citizen Point Rules
              </h3>
              <div className="space-y-3">
                {rules.filter(r => r.role === 'citizen').map(rule => (
                  <div key={rule.rule_key} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-800/40">
                    <div className="max-w-[65%]">
                      <div className="text-xs font-bold text-slate-900 dark:text-white">{rule.name}</div>
                      <div className="text-[11px] text-slate-400">{rule.description}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        value={ruleEdits[rule.rule_key]?.points !== undefined ? ruleEdits[rule.rule_key].points : rule.points}
                        onChange={(e) => handleRulePointsChange(rule.rule_key, e.target.value)}
                        className="w-16 rounded-lg border border-slate-200 bg-white px-2 py-1 text-right text-xs font-bold shadow-2xs focus:border-emerald-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => handleRuleActiveToggle(rule.rule_key)}
                        className={`h-5 w-9 rounded-full transition-colors relative ${
                          (ruleEdits[rule.rule_key]?.is_active !== undefined ? ruleEdits[rule.rule_key].is_active : rule.is_active)
                            ? 'bg-emerald-500'
                            : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                      >
                        <span className={`block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                          (ruleEdits[rule.rule_key]?.is_active !== undefined ? ruleEdits[rule.rule_key].is_active : rule.is_active)
                            ? 'translate-x-4.5'
                            : 'translate-x-1'
                        }`} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Officer Rules Column */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                <ShieldCheck className="h-4 w-4 text-blue-500" />
                Officer Point Rules
              </h3>
              <div className="space-y-3">
                {rules.filter(r => r.role === 'officer').map(rule => (
                  <div key={rule.rule_key} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-800/40">
                    <div className="max-w-[65%]">
                      <div className="text-xs font-bold text-slate-900 dark:text-white">{rule.name}</div>
                      <div className="text-[11px] text-slate-400">{rule.description}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        value={ruleEdits[rule.rule_key]?.points !== undefined ? ruleEdits[rule.rule_key].points : rule.points}
                        onChange={(e) => handleRulePointsChange(rule.rule_key, e.target.value)}
                        className="w-16 rounded-lg border border-slate-200 bg-white px-2 py-1 text-right text-xs font-bold shadow-2xs focus:border-emerald-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => handleRuleActiveToggle(rule.rule_key)}
                        className={`h-5 w-9 rounded-full transition-colors relative ${
                          (ruleEdits[rule.rule_key]?.is_active !== undefined ? ruleEdits[rule.rule_key].is_active : rule.is_active)
                            ? 'bg-blue-500'
                            : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                      >
                        <span className={`block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                          (ruleEdits[rule.rule_key]?.is_active !== undefined ? ruleEdits[rule.rule_key].is_active : rule.is_active)
                            ? 'translate-x-4.5'
                            : 'translate-x-1'
                        }`} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
