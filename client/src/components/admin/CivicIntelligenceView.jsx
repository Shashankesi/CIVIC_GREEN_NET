import React, { useState, useEffect } from 'react';
import { 
  Sparkles, AlertTriangle, Layers, TrendingUp, Building2, UserCheck, 
  MapPin, RefreshCw, Send, CheckCircle2, Clock, ShieldAlert, 
  FileText, Activity, AlertOctagon, HelpCircle, ChevronRight, BarChart2 
} from 'lucide-react';
import { aiApi } from '../../services/ai';
import toast from 'react-hot-toast';

export default function CivicIntelligenceView({ onNavigateTab }) {
  const [activeSection, setActiveSection] = useState('copilot'); // 'copilot' | 'hotspots' | 'clusters' | 'recurring' | 'departments' | 'officers' | 'trends'
  
  // Data states
  const [hotspots, setHotspots] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [recurringIssues, setRecurringIssues] = useState([]);
  const [deptInsights, setDeptInsights] = useState([]);
  const [officerInsights, setOfficerInsights] = useState([]);
  const [trends, setTrends] = useState(null);
  const [timeframe, setTimeframe] = useState('30d');
  const [loading, setLoading] = useState(false);

  // Copilot states
  const [copilotQuestion, setCopilotQuestion] = useState('');
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [copilotHistory, setCopilotHistory] = useState([
    {
      role: 'assistant',
      text: 'Hello Administrator. I am your Civic Operations Copilot. You can ask any analytical question regarding complaint trends, department bottlenecks, SLA breaches, or officer workload distribution.',
      isInitial: true
    }
  ]);

  const QUICK_QUERIES = [
    'How many unresolved sanitation complaints are there?',
    'Which department has the highest overdue workload?',
    'Show the biggest complaint hotspot',
    'Which category increased the most this month?',
    'Which officers currently have the highest workload?',
    'Which complaints have breached SLA?'
  ];

  async function loadAllIntelligence() {
    setLoading(true);
    try {
      const [hs, cl, rec, depts, off, tr] = await Promise.allSettled([
        aiApi.getHotspots(30),
        aiApi.getDuplicateClusters(),
        aiApi.getRecurringIssues(60),
        aiApi.getDepartmentInsights(),
        aiApi.getOfficerInsights(),
        aiApi.getTrends(timeframe)
      ]);

      if (hs.status === 'fulfilled') setHotspots(hs.value || []);
      if (cl.status === 'fulfilled') setClusters(cl.value || []);
      if (rec.status === 'fulfilled') setRecurringIssues(rec.value || []);
      if (depts.status === 'fulfilled') setDeptInsights(depts.value || []);
      if (off.status === 'fulfilled') setOfficerInsights(off.value || []);
      if (tr.status === 'fulfilled') setTrends(tr.value || null);
    } catch (e) {
      toast.error('Failed to load some civic intelligence metrics');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAllIntelligence();
  }, [timeframe]);

  async function handleSendCopilot(queryText = null) {
    const q = (queryText || copilotQuestion).trim();
    if (!q) return;

    setCopilotHistory(prev => [...prev, { role: 'user', text: q }]);
    if (!queryText) setCopilotQuestion('');
    setCopilotLoading(true);

    try {
      const res = await aiApi.askAdminCopilot(q);
      setCopilotHistory(prev => [
        ...prev,
        {
          role: 'assistant',
          text: res.explanation,
          verifiedData: res.verifiedData,
          intent: res.intent
        }
      ]);
    } catch (err) {
      setCopilotHistory(prev => [
        ...prev,
        {
          role: 'assistant',
          text: 'I encountered an error querying the operations database. Please verify your connection or try again.',
          isError: true
        }
      ]);
    } finally {
      setCopilotLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Top Header ────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white shadow-md">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Civic Intelligence & Predictive Analytics
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300/40">
                  AI ASSISTIVE
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Data-driven civic operational insights, duplicate clustering, emerging hotspots, and verified Copilot Q&A.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadAllIntelligence}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 transition-all shadow-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Intelligence
          </button>
        </div>
      </div>

      {/* ── Navigation Tabs ───────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 text-xs font-semibold">
        {[
          { key: 'copilot', label: 'Operations Copilot', icon: Sparkles },
          { key: 'hotspots', label: `Emerging Hotspots (${hotspots.length})`, icon: MapPin },
          { key: 'clusters', label: `Duplicate Clusters (${clusters.length})`, icon: Layers },
          { key: 'recurring', label: `Recurring Issues (${recurringIssues.length})`, icon: AlertTriangle },
          { key: 'departments', label: 'Department Workload', icon: Building2 },
          { key: 'officers', label: 'Officer Recommendations', icon: UserCheck },
          { key: 'trends', label: 'Predictive Trends', icon: TrendingUp }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeSection === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveSection(tab.key)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-sm font-bold'
                  : 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-750'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── SECTION 1: Operations Copilot ─────────────────────── */}
      {activeSection === 'copilot' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chat Box */}
          <div className="lg:col-span-2 flex flex-col h-[560px] bg-white dark:bg-[#111C2D] rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-xs overflow-hidden">
            {/* Chat header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-slate-850 dark:text-white uppercase tracking-wider">
                  Admin AI Copilot Console (Verified PostgreSQL Engine)
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                Strict SQL Safety Active
              </span>
            </div>

            {/* Message history */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {copilotHistory.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-emerald-600 text-white shadow-xs rounded-tr-none'
                        : msg.isError
                        ? 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 rounded-tl-none'
                        : 'bg-slate-100 dark:bg-slate-800/70 text-slate-800 dark:text-slate-150 border border-slate-200/80 dark:border-slate-700/60 rounded-tl-none'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1.5 font-bold opacity-80 text-[10px] uppercase tracking-wider">
                      {msg.role === 'user' ? 'You (Admin)' : '✨ Operations Copilot'}
                    </div>
                    <div className="whitespace-pre-wrap font-sans">{msg.text}</div>
                    
                    {msg.intent && (
                      <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-700/50 flex items-center justify-between text-[10px] opacity-75">
                        <span>Database Intent: <code className="font-mono">{msg.intent}</code></span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">● 100% DB Match</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {copilotLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-100 dark:bg-slate-800/70 rounded-2xl p-4 text-xs flex items-center gap-2 text-slate-500">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin text-emerald-500" />
                    Querying PostgreSQL operations database & synthesizing response...
                  </div>
                </div>
              )}
            </div>

            {/* Input box */}
            <div className="p-3 border-t border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendCopilot();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={copilotQuestion}
                  onChange={(e) => setCopilotQuestion(e.target.value)}
                  placeholder="Ask any question about municipal complaints, hotspots, or SLA compliance..."
                  className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="submit"
                  disabled={copilotLoading || !copilotQuestion.trim()}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
                >
                  <Send className="h-3.5 w-3.5" />
                  Ask
                </button>
              </form>
            </div>
          </div>

          {/* Quick Questions Sidebar */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-[#111C2D] rounded-2xl p-5 border border-slate-200 dark:border-slate-800/80 shadow-xs">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-emerald-500" />
                Quick Analytical Queries
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Click any pre-approved operational query to retrieve verified statistics:
              </p>
              <div className="space-y-2">
                {QUICK_QUERIES.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendCopilot(q)}
                    disabled={copilotLoading}
                    className="w-full text-left p-2.5 rounded-xl bg-slate-50 hover:bg-emerald-50/70 dark:bg-slate-900/60 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-750 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-300 transition-all flex items-center justify-between group"
                  >
                    <span>{q}</span>
                    <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-emerald-500 shrink-0 transition-transform group-hover:translate-x-0.5" />
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl p-4 border border-emerald-200/60 dark:border-emerald-900/40 text-xs text-emerald-900 dark:text-emerald-300">
              <div className="font-bold flex items-center gap-1.5 mb-1">
                <ShieldAlert className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                Authoritative Accuracy Guarantee
              </div>
              <p className="text-[11px] leading-relaxed text-emerald-800 dark:text-emerald-300/80">
                Admin Copilot strictly executes pre-approved parameterized analytical routines. Numerical responses are guaranteed to mirror PostgreSQL database truth.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── SECTION 2: Emerging Hotspots ──────────────────────── */}
      {activeSection === 'hotspots' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {hotspots.map(hs => (
              <div
                key={hs.id}
                className="bg-white dark:bg-[#111C2D] rounded-2xl p-5 border border-slate-200 dark:border-slate-800/80 shadow-xs hover:border-emerald-500/40 transition-all"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                      hs.riskLevel === 'critical'
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-300/50'
                        : hs.riskLevel === 'emerging'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300/50'
                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300/50'
                    }`}>
                      {hs.status}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-2">{hs.zone}</h4>
                    <p className="text-xs text-slate-400 capitalize">{hs.category} Hotspot</p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-black text-slate-900 dark:text-white">{hs.totalReports}</span>
                    <span className="block text-[10px] text-slate-400 font-medium">reports</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl text-center text-xs mb-3">
                  <div>
                    <span className="block font-bold text-rose-600 dark:text-rose-400">{hs.unresolvedCount}</span>
                    <span className="text-[10px] text-slate-400">Unresolved</span>
                  </div>
                  <div>
                    <span className="block font-bold text-amber-600 dark:text-amber-400">{hs.slaBreaches}</span>
                    <span className="text-[10px] text-slate-400">SLA Breaches</span>
                  </div>
                  <div>
                    <span className="block font-bold text-emerald-600 dark:text-emerald-400">{hs.trendDisplay}</span>
                    <span className="text-[10px] text-slate-400">vs Prev Period</span>
                  </div>
                </div>

                <button
                  onClick={() => onNavigateTab && onNavigateTab('map', { search: hs.zone })}
                  className="w-full py-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                >
                  <MapPin className="h-3.5 w-3.5" />
                  View on Live Map
                </button>
              </div>
            ))}
          </div>
          {hotspots.length === 0 && (
            <div className="p-8 text-center bg-white dark:bg-[#111C2D] rounded-2xl border border-slate-200 dark:border-slate-800">
              <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-800 dark:text-white">No Critical Hotspots Active</p>
              <p className="text-xs text-slate-400">Complaint distribution is balanced across municipal sectors.</p>
            </div>
          )}
        </div>
      )}

      {/* ── SECTION 3: Duplicate Clusters ─────────────────────── */}
      {activeSection === 'clusters' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {clusters.map((cl, idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-[#111C2D] rounded-2xl p-5 border border-slate-200 dark:border-slate-800/80 shadow-xs"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-1 rounded-md">
                    {cl.clusterId}
                  </span>
                  <span className="text-xs font-bold text-slate-500">
                    {cl.totalReports} Related Reports ({Math.round(cl.averageSimilarity * 100)}% similarity)
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">{cl.location}</h4>
                <p className="text-xs text-slate-400 mb-4 capitalize">Category: {cl.category} • Primary: {cl.primaryTitle}</p>

                <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Member Complaints:</span>
                  {cl.complaints?.map(m => (
                    <div
                      key={m.id}
                      className="p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white mr-2">{m.id}</span>
                        <span className="text-slate-600 dark:text-slate-300 truncate max-w-[200px]">{m.title}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        m.status === 'resolved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {m.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {clusters.length === 0 && (
            <div className="p-8 text-center bg-white dark:bg-[#111C2D] rounded-2xl border border-slate-200 dark:border-slate-800">
              <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-800 dark:text-white">No Duplicate Clusters Detected</p>
              <p className="text-xs text-slate-400">All recent complaints represent distinct physical events.</p>
            </div>
          )}
        </div>
      )}

      {/* ── SECTION 4: Recurring Civic Issues ──────────────────── */}
      {activeSection === 'recurring' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recurringIssues.map(rec => (
              <div
                key={rec.id}
                className="bg-white dark:bg-[#111C2D] rounded-2xl p-5 border border-slate-200 dark:border-slate-800/80 shadow-xs"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                      {rec.riskLevel} Risk Recurring Issue
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-1.5">{rec.location}</h4>
                  </div>
                  <span className="text-xs font-bold text-slate-400">{rec.period}</span>
                </div>

                <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl text-center text-xs my-3">
                  <div>
                    <span className="block font-bold text-slate-900 dark:text-white">{rec.totalReports}</span>
                    <span className="text-[10px] text-slate-400">Total Reports</span>
                  </div>
                  <div>
                    <span className="block font-bold text-emerald-600 dark:text-emerald-400">{rec.resolvedCount}</span>
                    <span className="text-[10px] text-slate-400">Past Resolves</span>
                  </div>
                  <div>
                    <span className="block font-bold text-rose-600 dark:text-rose-400">{rec.reopenedCount}</span>
                    <span className="text-[10px] text-slate-400">Reopened</span>
                  </div>
                </div>

                <div className="text-xs space-y-1.5 text-slate-600 dark:text-slate-300">
                  <p><strong className="text-slate-900 dark:text-white">Pattern Reason:</strong> {rec.riskReason}</p>
                  <p className="text-emerald-700 dark:text-emerald-300"><strong className="text-slate-900 dark:text-white">Recommended Action:</strong> {rec.recommendedAction}</p>
                </div>
              </div>
            ))}
          </div>
          {recurringIssues.length === 0 && (
            <div className="p-8 text-center bg-white dark:bg-[#111C2D] rounded-2xl border border-slate-200 dark:border-slate-800">
              <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-800 dark:text-white">No Chronic Recurring Defects</p>
              <p className="text-xs text-slate-400">No municipal zones have repeated unresolved patterns.</p>
            </div>
          )}
        </div>
      )}

      {/* ── SECTION 5: Department Intelligence ────────────────── */}
      {activeSection === 'departments' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {deptInsights.map(d => (
            <div
              key={d.id}
              className="bg-white dark:bg-[#111C2D] rounded-2xl p-5 border border-slate-200 dark:border-slate-800/80 shadow-xs"
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">{d.name}</h4>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  d.status === 'Optimal' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {d.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs mb-4">
                <div className="p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl">
                  <span className="text-[10px] text-slate-400 block">Total Assigned</span>
                  <span className="text-base font-bold text-slate-900 dark:text-white">{d.totalAssigned}</span>
                </div>
                <div className="p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl">
                  <span className="text-[10px] text-slate-400 block">SLA Compliance</span>
                  <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">{d.slaCompliance}%</span>
                </div>
                <div className="p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl">
                  <span className="text-[10px] text-slate-400 block">Active In Progress</span>
                  <span className="text-base font-bold text-blue-600 dark:text-blue-400">{d.inProgress}</span>
                </div>
                <div className="p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl">
                  <span className="text-[10px] text-slate-400 block">Overdue Cases</span>
                  <span className="text-base font-bold text-rose-600 dark:text-rose-400">{d.overdue}</span>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-2 flex justify-between">
                <span>Avg Resolution Time:</span>
                <span className="font-bold text-slate-700 dark:text-slate-200">{d.avgResolutionTimeHours} hrs</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── SECTION 6: Officer Workload Recommendations ───────── */}
      {activeSection === 'officers' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {officerInsights.map(off => (
              <div
                key={off.id}
                className="bg-white dark:bg-[#111C2D] rounded-2xl p-5 border border-slate-200 dark:border-slate-800/80 shadow-xs"
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">{off.name}</h4>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded capitalize ${
                    off.availability === 'available' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {off.availability}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-3">{off.department}</p>

                <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl text-center text-xs mb-3">
                  <div>
                    <span className="block font-bold text-slate-900 dark:text-white">{off.activeAssignments}</span>
                    <span className="text-[10px] text-slate-400">Active</span>
                  </div>
                  <div>
                    <span className="block font-bold text-rose-600 dark:text-rose-400">{off.overdueCount}</span>
                    <span className="text-[10px] text-slate-400">Overdue</span>
                  </div>
                  <div>
                    <span className="block font-bold text-emerald-600 dark:text-emerald-400">{off.slaCompliance}%</span>
                    <span className="text-[10px] text-slate-400">SLA Rate</span>
                  </div>
                </div>

                {off.aiRecommendation && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40 text-[11px] font-medium text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                    <span>{off.aiRecommendation}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SECTION 7: Predictive Trends ──────────────────────── */}
      {activeSection === 'trends' && (
        <div className="space-y-4">
          {/* Timeframe Selector */}
          <div className="flex items-center justify-between p-4 bg-white dark:bg-[#111C2D] rounded-2xl border border-slate-200 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Analysis Window:
            </span>
            <div className="flex gap-2">
              {['7d', '30d', '90d', '6m'].map(tf => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
                    timeframe === tf
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {tf === '7d' ? '7 Days' : tf === '30d' ? '30 Days' : tf === '90d' ? '90 Days' : '6 Months'}
                </button>
              ))}
            </div>
          </div>

          {trends && !trends.hasSufficientData ? (
            <div className="p-8 text-center bg-white dark:bg-[#111C2D] rounded-2xl border border-slate-200 dark:border-slate-800">
              <Activity className="h-8 w-8 text-slate-400 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-slate-800 dark:text-white">Insufficient Historical Data</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">{trends.message}</p>
            </div>
          ) : trends?.trends ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {trends.trends.map(t => (
                <div
                  key={t.category}
                  className="bg-white dark:bg-[#111C2D] rounded-2xl p-5 border border-slate-200 dark:border-slate-800/80 shadow-xs"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white capitalize">{t.category}</h4>
                    <span className={`text-xs font-bold ${
                      t.trendDirection === 'rising' ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                    }`}>
                      {t.indicator}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">
                    Current Period: <strong className="text-slate-800 dark:text-white">{t.currentCount}</strong> • Previous Period: <strong className="text-slate-800 dark:text-white">{t.previousCount}</strong>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
