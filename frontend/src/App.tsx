import { useEffect, useMemo, useState } from 'react';
import {
  Brain, History as TimelineIcon, ClipboardCheck, Puzzle, Sparkles, BookOpen,
  ShieldCheck, Plus, Download, Trash2, LogOut, Play, AlertTriangle, X, Check,
  Activity, Moon, Smile, Zap, Briefcase, ChevronRight, Printer,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar,
} from 'recharts';
import { api, getToken, setToken, clearToken } from './lib/api';
import { DEMO_OBSERVATIONS, DEMO_INSIGHT } from './lib/demoData';

const DISCLAIMER = 'NeuroLens provides educational health insights and pattern awareness. It does not diagnose medical conditions.';
const EMERGENCY_MSG = 'Some symptoms can require urgent medical attention. If you believe you may be experiencing a medical emergency, contact your local emergency service or seek immediate medical care.';
const CATEGORIES = ['cognitive', 'sleep', 'mood', 'physical', 'daily_functioning'] as const;
const CAT_ICON: Record<string, any> = { cognitive: Brain, sleep: Moon, mood: Smile, physical: Zap, daily_functioning: Briefcase };
const SEV_NUM: Record<string, number> = { mild: 1, moderate: 2, strong: 3 };

type Obs = { id?: number; signal: string; category: string; severity: string; impact: number; note?: string; observed_at?: string; created_at?: string };

function useBackend() {
  const [live, setLive] = useState(false);
  useEffect(() => {
    fetch(((import.meta.env.VITE_API_URL as string) || 'http://localhost:8000') + '/health')
      .then((r) => setLive(r.ok)).catch(() => setLive(false));
  }, []);
  return live;
}

function patternStrength(obs: Obs[]) {
  if (!obs.length) return 0;
  const groups: Record<string, Obs[]> = {};
  obs.forEach((o) => { const k = o.signal.toLowerCase(); (groups[k] ||= []).push(o); });
  const scores = Object.values(groups).map((g) => Math.min(100, Math.round(g.length * 14 + g.reduce((s, x) => s + (SEV_NUM[x.severity] || 1) * 4, 0) / g.length + g.reduce((s, x) => s + x.impact * 5, 0) / g.length)));
  return Math.min(100, Math.max(...scores, 0));
}

export default function App() {
  const backendLive = useBackend();
  const [route, setRoute] = useState<'landing' | 'onboarding' | 'app'>('landing');
  const [tab, setTab] = useState('overview');
  const [demoMode, setDemoMode] = useState(true);
  const [authed, setAuthed] = useState(!!getToken());
  const [obs, setObs] = useState<Obs[]>(DEMO_OBSERVATIONS as Obs[]);
  const [insight, setInsight] = useState<any>(DEMO_INSIGHT);
  const [strength, setStrength] = useState(72);
  const [filter, setFilter] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [emergency, setEmergency] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [onboard, setOnboard] = useState({ goal: '', signals: [] as string[], sleep: 'Okay', stress: 'Medium', impact: 'A little' });
  const [checkin, setCheckin] = useState({ focus: 'Same', sleep: 'Okay', difficulty: 'No', dayImpact: 'A little' });
  const [memoryCards, setMemoryCards] = useState<number[]>([]);
  const [memoryPick, setMemoryPick] = useState<number[]>([]);
  const [reactionStart, setReactionStart] = useState<number | null>(null);
  const [reactionScore, setReactionScore] = useState<number | null>(null);
  const [newObs, setNewObs] = useState({ signal: '', category: 'cognitive', severity: 'mild', impact: 1, note: '' });
  const [learn, setLearn] = useState<any[]>([]);
  const [showAuth, setShowAuth] = useState(false);
  const [authForm, setAuthForm] = useState({ email: 'demo@neurolens.ai', password: 'demo1234' });

  const say = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2800); };

  // Try loading live data when authed + backend
  useEffect(() => {
    if (authed && backendLive && !demoMode) {
      api.dashboard().then((d) => {
        setStrength(d.pattern_strength ?? 0);
        if (d.latest_insight) setInsight(d.latest_insight);
        return api.observations();
      }).then((o) => { if (Array.isArray(o) && o.length) setObs(o); })
        .catch(() => { setDemoMode(true); });
      api.learn().then(setLearn).catch(() => {});
    }
  }, [authed, backendLive, demoMode]);

  const filtered = useMemo(() => filter === 'all' ? obs : obs.filter((o) => o.category === filter), [obs, filter]);
  const chartData = useMemo(() => {
    const byDay: Record<string, number> = {};
    [...obs].reverse().forEach((o) => {
      const d = String(o.observed_at || '').slice(0, 10) || String(o.observed_at);
      byDay[d] = (byDay[d] || 0) + (SEV_NUM[o.severity] || 1);
    });
    return Object.entries(byDay).slice(-14).map(([day, load]) => ({ day: day.slice(5) || day, load }));
  }, [obs]);
  const catCounts = useMemo(() => CATEGORIES.map((c) => ({ cat: c, n: obs.filter((o) => o.category === c).length })), [obs]);
  const daysTracked = useMemo(() => new Set(obs.map((o) => String(o.observed_at).slice(0, 10))).size || 14, [obs]);

  const checkEmergency = (text: string) => {
    if (/suicid|self.?harm|kill myself|stroke|facial droop|slurred speech|chest pain|can.?t breathe|seizure|blacked out|lost consciousness|worst.*headache/i.test(text)) {
      setEmergency(EMERGENCY_MSG);
    }
  };

  const runAnalysis = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 900)); // analysis animation
    if (!demoMode && authed && backendLive) {
      try {
        const res = await api.runAnalysis();
        setInsight(res.payload); setStrength(res.analysis.pattern_strength);
        setDemoMode(res.demo_mode === 'fallback');
        say(res.demo_mode === 'fallback' ? 'Demo Intelligence Mode — showing fallback results' : 'AI analysis complete');
      } catch { setDemoMode(true); setInsight(DEMO_INSIGHT); setStrength(patternStrength(obs)); }
    } else {
      setStrength(patternStrength(obs) || 72);
      setInsight(DEMO_INSIGHT);
      say('Demo Intelligence Mode — showing illustrative results');
    }
    setLoading(false);
  };

  const addObservation = async () => {
    if (!newObs.signal.trim()) { say('Please describe the observation'); return; }
    checkEmergency(newObs.signal + ' ' + newObs.note);
    const entry: Obs = { ...newObs, signal: newObs.signal.trim(), observed_at: new Date().toISOString().slice(0, 10) };
    setObs([entry, ...obs]);
    if (!demoMode && authed && backendLive) {
      try { await api.addObservation(entry); } catch {}
    }
    setNewObs({ signal: '', category: 'cognitive', severity: 'mild', impact: 1, note: '' });
    say('Observation added to your timeline');
  };

  const submitCheckin = async () => {
    const entry: Obs[] = [];
    if (checkin.focus === 'Worse') entry.push({ signal: 'Focus difficulty', category: 'cognitive', severity: 'moderate', impact: 2, observed_at: new Date().toISOString().slice(0, 10), note: 'From daily check-in' });
    if (checkin.sleep === 'Poor') entry.push({ signal: 'Sleep disruption', category: 'sleep', severity: 'moderate', impact: 2, observed_at: new Date().toISOString().slice(0, 10), note: 'From daily check-in' });
    if (checkin.difficulty === 'Yes') entry.push({ signal: 'Difficulty completing familiar tasks', category: 'daily_functioning', severity: 'moderate', impact: 2, observed_at: new Date().toISOString().slice(0, 10), note: 'From daily check-in' });
    if (entry.length) { setObs([...entry, ...obs]); entry.forEach((e) => checkEmergency(e.signal)); }
    if (!demoMode && authed && backendLive) {
      try { await api.addCheckin({ focus: checkin.focus.toLowerCase(), sleep: checkin.sleep.toLowerCase(), difficulty: checkin.difficulty.toLowerCase().replace(' ', '_'), day_impact: checkin.dayImpact.toLowerCase().replace(/ /g, '_') }); } catch {}
    }
    say('Check-in saved — timeline updated');
  };

  // memory exercise
  const startMemory = () => {
    const vals = [1, 1, 2, 2, 3, 3, 4, 4].sort(() => Math.random() - 0.5);
    setMemoryCards(vals); setMemoryPick([]);
  };
  const reactionGo = () => {
    setReactionStart(null); setReactionScore(null);
    setTimeout(() => setReactionStart(Date.now()), 1200 + Math.random() * 2000);
  };

  const doAuth = async (mode: 'login' | 'register') => {
    try {
      const r = mode === 'login' ? await api.login(authForm.email, authForm.password) : await api.register(authForm.email, authForm.password);
      setToken(r.access_token); setAuthed(true); setDemoMode(false); setShowAuth(false);
      say('Signed in — live mode enabled');
    } catch { say('Backend unavailable — staying in Demo Mode'); setShowAuth(false); }
  };

  const exportPDF = () => window.print();

  if (route === 'landing') return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 via-white to-slate-50">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2 font-extrabold text-lg"><Brain className="text-teal-600" /> NeuroLens</div>
        <div className="flex gap-3">
          <button className="btn-ghost !py-2" onClick={() => setShowAuth(true)}>Sign in</button>
          <button className="btn-primary !py-2" onClick={() => { setRoute('app'); setDemoMode(true); }}>Try Demo <ChevronRight size={16} /></button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 pb-20">
        <section className="fade-in py-14 text-center">
          <span className="chip bg-teal-100 text-teal-800">AI for Human Health · UnivaBio Hackathon</span>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl md:text-6xl font-extrabold tracking-tight">Your everyday health signals shouldn't live in scattered notes.</h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">NeuroLens uses AI to organize observations, surface patterns, and turn uncertainty into better questions.</p>
          <div className="mt-8 flex justify-center gap-3 flex-wrap">
            <button className="btn-primary" onClick={() => { setRoute('onboarding'); }}><Play size={16} /> Try Demo</button>
            <button className="btn-ghost" onClick={() => { setRoute('app'); }}>See How It Works</button>
          </div>
          <p className="mt-4 text-xs text-slate-500">{DISCLAIMER}</p>
        </section>
        <section className="grid gap-4 md:grid-cols-3">
          {[
            ['The Problem', 'Focus lapses, poor sleep, forgetfulness — scattered across memory and notes. Nobody connects the dots.'],
            ['How it works', 'Log observations → deterministic pattern engine → AI explains in plain language → better questions for your clinician.'],
            ['Privacy first', 'Minimal data, export & delete anytime, transparent AI processing. No diagnosis, ever.'],
          ].map(([t, b]) => (
            <div key={t} className="card p-6"><h3 className="font-bold">{t}</h3><p className="mt-2 text-sm text-slate-600">{b}</p></div>
          ))}
        </section>
        <section className="card mt-6 p-8 text-center">
          <p className="text-2xl font-extrabold">Notice earlier. Understand better. Ask better questions.</p>
          <button className="btn-primary mt-5" onClick={() => setRoute('onboarding')}>Start Demo <ChevronRight size={16} /></button>
        </section>
      </main>
      {showAuth && <AuthModal authForm={authForm} setAuthForm={setAuthForm} doAuth={doAuth} close={() => setShowAuth(false)} enter={() => { setRoute('app'); setShowAuth(false); }} />}
    </div>
  );

  if (route === 'onboarding') {
    const signals = ['Difficulty concentrating', 'Unusual forgetfulness', 'Sleep changes', 'Headaches', 'Mood changes', 'Speech changes', 'Trouble with familiar tasks'];
    return (
      <div className="mx-auto min-h-screen max-w-2xl px-6 py-10">
        <div className="flex items-center gap-2 font-extrabold text-lg"><Brain className="text-teal-600" /> NeuroLens</div>
        <h1 className="mt-6 text-3xl font-extrabold">Let's understand what you'd like to track.</h1>
        <p className="mt-2 text-slate-600">Friendly, non-scary questions. Takes about a minute.</p>
        <div className="card mt-6 space-y-5 p-6">
          <div><label className="label" htmlFor="goal">What would you like to understand?</label>
            <input id="goal" className="input mt-2" placeholder="e.g. my focus and sleep lately" value={onboard.goal} onChange={(e) => setOnboard({ ...onboard, goal: e.target.value })} /></div>
          <fieldset><legend className="label">What observations have you noticed? (pick any)</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {signals.map((s) => (
                <button key={s} onClick={() => setOnboard({ ...onboard, signals: onboard.signals.includes(s) ? onboard.signals.filter((x) => x !== s) : [...onboard.signals, s] })}
                  aria-pressed={onboard.signals.includes(s)}
                  className={`rounded-full border px-4 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${onboard.signals.includes(s) ? 'bg-slate-900 text-white border-slate-900' : 'bg-white hover:bg-slate-100'}`}>{s}</button>
              ))}
            </div></fieldset>
          <div className="grid grid-cols-3 gap-3">
            {[['Sleep quality', 'sleep', ['Good', 'Okay', 'Poor']], ['Stress level', 'stress', ['Low', 'Medium', 'High']], ['Daily impact', 'impact', ['Not at all', 'A little', 'A lot']]].map(([label, key, opts]: any) => (
              <div key={key}><span className="label">{label}</span>
                <div className="mt-2 space-y-1">{opts.map((o: string) => (
                  <label key={o} className="flex items-center gap-2 text-sm"><input type="radio" name={key} checked={(onboard as any)[key] === o} onChange={() => setOnboard({ ...onboard, [key]: o })} className="accent-teal-600" />{o}</label>
                ))}</div></div>
            ))}
          </div>
          <p className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">{DISCLAIMER}</p>
          <button className="btn-primary w-full justify-center" onClick={() => { setRoute('app'); setTab('overview'); say('Demo Profile loaded — Fictional Data'); }}>Continue to my dashboard <ChevronRight size={16} /></button>
        </div>
      </div>
    );
  }

  const tabs = [
    ['overview', 'Overview', Activity], ['timeline', 'Timeline', TimelineIcon], ['checkin', 'Check-in', ClipboardCheck],
    ['exercises', 'Exercises', Puzzle], ['insights', 'Insights', Sparkles], ['learn', 'Learn', BookOpen], ['privacy', 'Privacy', ShieldCheck],
  ];

  return (
    <div className="min-h-screen">
      {emergency && (
        <div role="alert" className="flex items-start gap-3 bg-amber-100 border-b border-amber-300 px-6 py-3 text-sm">
          <AlertTriangle className="mt-0.5 text-amber-700" size={18} />
          <p className="flex-1 text-amber-900">{emergency}</p>
          <button aria-label="Dismiss safety notice" onClick={() => setEmergency(null)} className="rounded p-1 hover:bg-amber-200"><X size={16} /></button>
        </div>
      )}
      <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-3">
          <span className="flex items-center gap-2 font-extrabold"><Brain className="text-teal-600" /> NeuroLens</span>
          <span className="chip bg-slate-100 text-slate-600">Demo Profile — Fictional Data</span>
          {demoMode && <span className="chip bg-violet-100 text-violet-800" title="Fallback deterministic results">Demo Intelligence Mode</span>}
          {!demoMode && backendLive && <span className="chip bg-teal-100 text-teal-800">Live AI</span>}
          <nav aria-label="Primary" className="ml-auto flex flex-wrap gap-1">
            {tabs.map(([id, label, Icon]: any) => (
              <button key={id} onClick={() => setTab(id)} aria-current={tab === id ? 'page' : undefined}
                className={`navlink flex items-center gap-1.5 ${tab === id ? 'navlink-active' : ''}`}><Icon size={15} />{label}</button>
            ))}
          </nav>
          <div className="flex gap-2">
            {!authed
              ? <button className="btn-ghost !px-3 !py-2 text-sm" onClick={() => setShowAuth(true)}>Sign in</button>
              : <button aria-label="Sign out" className="rounded-lg p-2 hover:bg-slate-100" onClick={() => { clearToken(); setAuthed(false); setDemoMode(true); say('Signed out'); }}><LogOut size={16} /></button>}
            <button className="btn-primary !px-3 !py-2 text-sm" onClick={runAnalysis}><Sparkles size={15} /> Analyze</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-24 pt-6">
        {tab === 'overview' && (
          <div className="fade-in space-y-5">
            <section><h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Your health signals, organized.</h1>
              <p className="mt-2 text-slate-600">NeuroLens helps you notice patterns in everyday observations so you can understand them and discuss them more effectively.</p></section>
            <section className="grid grid-cols-2 gap-3 md:grid-cols-4" aria-label="Stats">
              {[
                ['Pattern Strength', `${strength}`, '/ 100 · pattern worth monitoring, not disease probability'],
                ['Observations', `${obs.length}`, 'structured entries'],
                ['Days tracked', `${daysTracked}`, 'longitudinal timeline'],
                ['Emerging patterns', `${insight?.patterns?.length ?? 3}`, 'explainable cards'],
              ].map(([t, v, s]) => (
                <div key={t} className="card p-5 transition hover:shadow-lg"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t}</p>
                  <p className="mt-1 text-3xl font-extrabold">{v}</p><p className="text-xs text-slate-500">{s}</p></div>
              ))}
            </section>
            <section className="card p-5">
              <h2 className="font-bold">Health Signal Timeline</h2>
              <div className="mt-3 h-56" role="img" aria-label="Signal load chart over last 14 days">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData.length ? chartData : [{ day: '—', load: 0 }]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="day" fontSize={11} /><YAxis fontSize={11} />
                    <Tooltip /><Line type="monotone" dataKey="load" stroke="#0d9488" strokeWidth={3} dot={{ r: 3 }} name="Signal load" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>
            <section className="grid gap-4 md:grid-cols-2">
              <div className="card p-5">
                <h2 className="flex items-center gap-2 font-bold"><Sparkles size={16} className="text-teal-600" /> AI Insight</h2>
                {loading ? (<div className="mt-3 space-y-2"><div className="skeleton h-4" /><div className="skeleton h-4 w-5/6" /><div className="skeleton h-4 w-2/3" /></div>)
                  : (<p className="mt-2 text-sm leading-relaxed text-slate-700">"{insight?.summary}"</p>)}
                <button className="btn-ghost mt-4 !py-2 text-sm" onClick={() => setTab('insights')}>Open full report <ChevronRight size={14} /></button>
              </div>
              <div className="card p-5">
                <h2 className="font-bold">What changed this week?</h2>
                <div className="mt-3 h-40"><ResponsiveContainer width="100%" height="100%">
                  <BarChart data={catCounts}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="cat" fontSize={10} tickFormatter={(v) => v.slice(0, 6)} /><YAxis fontSize={11} allowDecimals={false} /><Tooltip /><Bar dataKey="n" fill="#14b8a6" radius={[6, 6, 0, 0]} name="Observations" /></BarChart>
                </ResponsiveContainer></div>
                <p className="mt-2 text-xs text-slate-500">Recent focus–sleep co-occurrence is the strongest signal pair. Monitoring both together is most informative.</p>
              </div>
            </section>
            <section className="card p-5">
              <h2 className="font-bold">Top observations</h2>
              <ul className="mt-3 divide-y text-sm">{obs.slice(0, 5).map((o, i) => (
                <li key={i} className="flex items-center gap-3 py-2">
                  {(() => { const I = CAT_ICON[o.category] || Activity; return <I size={16} className="text-teal-600" />; })()}
                  <span className="font-medium">{o.signal}</span>
                  <span className="chip bg-slate-100 text-slate-600">{o.category}</span>
                  <span className="ml-auto text-slate-500">{String(o.observed_at).slice(0, 10)} · {o.severity}</span>
                </li>))}</ul>
            </section>
          </div>
        )}

        {tab === 'timeline' && (
          <div className="fade-in space-y-4">
            <h1 className="text-2xl font-extrabold">Health Signal Timeline</h1>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by category">
              {['all', ...CATEGORIES].map((c) => (
                <button key={c} onClick={() => setFilter(c)} className={`rounded-full border px-4 py-1.5 text-sm font-medium ${filter === c ? 'bg-slate-900 text-white border-slate-900' : 'bg-white hover:bg-slate-100'}`}>{c}</button>
              ))}
            </div>
            <div className="card p-5">
              <h2 className="font-bold">Log an observation</h2>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div><label className="label" htmlFor="sig">Observation</label><input id="sig" className="input mt-1" placeholder="e.g. Focus difficulty" value={newObs.signal} onChange={(e) => { setNewObs({ ...newObs, signal: e.target.value }); }} /></div>
                <div><label className="label" htmlFor="note">Note (optional)</label><input id="note" className="input mt-1" placeholder="Context…" value={newObs.note} onChange={(e) => setNewObs({ ...newObs, note: e.target.value })} /></div>
                <div><label className="label" htmlFor="cat">Category</label><select id="cat" className="input mt-1" value={newObs.category} onChange={(e) => setNewObs({ ...newObs, category: e.target.value })}>{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
                <div><label className="label" htmlFor="sev">Severity</label><select id="sev" className="input mt-1" value={newObs.severity} onChange={(e) => setNewObs({ ...newObs, severity: e.target.value })}><option value="mild">mild</option><option value="moderate">moderate</option><option value="strong">strong</option></select></div>
              </div>
              <button className="btn-primary mt-4" onClick={addObservation}><Plus size={16} /> Add to timeline</button>
            </div>
            <ol className="space-y-2">
              {filtered.map((o, i) => (
                <li key={i} className="card flex items-center gap-3 p-4 transition hover:shadow-lg">
                  {(() => { const I = CAT_ICON[o.category] || Activity; return <span className="rounded-xl bg-teal-50 p-2"><I size={18} className="text-teal-700" /></span>; })()}
                  <div><p className="font-semibold">{o.signal} <span className="text-xs font-normal text-slate-500">— {o.severity}</span></p>
                    <p className="text-xs text-slate-500">{String(o.observed_at).slice(0, 10)} · {o.category}{o.note ? ` · ${o.note}` : ''}</p></div>
                  <span className={`chip ml-auto ${o.severity === 'mild' ? 'bg-emerald-100 text-emerald-800' : o.severity === 'moderate' ? 'bg-amber-100 text-amber-800' : 'bg-orange-100 text-orange-800'}`}>{o.severity}</span>
                </li>
              ))}
              {!filtered.length && <li className="card p-6 text-sm text-slate-500">No observations in this category yet — add one above.</li>}
            </ol>
          </div>
        )}

        {tab === 'checkin' && (
          <div className="fade-in mx-auto max-w-xl space-y-4">
            <h1 className="text-2xl font-extrabold">Daily 60-second check-in</h1>
            <div className="card space-y-5 p-6">
              {([
                ['How was your focus today?', 'focus', ['Better', 'Same', 'Worse']],
                ['How was your sleep?', 'sleep', ['Good', 'Okay', 'Poor']],
                ['Did anything feel unusually difficult?', 'difficulty', ['No', 'A little', 'Yes']],
                ['How much did this affect your day?', 'dayImpact', ['Not at all', 'A little', 'A lot']],
              ] as Array<[string, string, string[]]>).map(([q, key, opts]) => (
                <fieldset key={key}><legend className="label">{q}</legend>
                  <div className="mt-2 flex gap-2">{opts.map((o: string) => (
                    <button key={o} onClick={() => setCheckin({ ...checkin, [key]: o })} aria-pressed={(checkin as any)[key] === o}
                      className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium ${((checkin as any)[key] === o) ? 'bg-slate-900 text-white border-slate-900' : 'bg-white hover:bg-slate-100'}`}>{o}</button>
                  ))}</div></fieldset>
              ))}
              <button className="btn-primary w-full justify-center" onClick={submitCheckin}><Check size={16} /> Save check-in</button>
            </div>
          </div>
        )}

        {tab === 'exercises' && (
          <div className="fade-in space-y-4">
            <h1 className="text-2xl font-extrabold">Cognitive mini-exercises</h1>
            <p className="rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600">These activities are experimental self-monitoring exercises and are not clinical assessments.</p>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="card p-5">
                <h2 className="font-bold">Memory pairs</h2>
                {!memoryCards.length ? <button className="btn-ghost mt-3 !py-2 text-sm" onClick={startMemory}>Start</button> : (
                  <div className="mt-3 grid grid-cols-4 gap-2" role="group" aria-label="Memory game">
                    {memoryCards.map((v, i) => (
                      <button key={i} onClick={() => {
                        const pick = [...memoryPick, i];
                        if (pick.length === 2) {
                          if (memoryCards[pick[0]] === memoryCards[pick[1]]) say('Nice match!');
                          setTimeout(() => setMemoryPick([]), 400);
                        } else setMemoryPick(pick);
                      }}
                        aria-label={`Card ${i + 1}`} className={`h-12 rounded-xl border font-bold ${memoryPick.includes(i) ? 'bg-slate-900 text-white' : 'bg-slate-50 hover:bg-slate-100'}`}>
                        {memoryPick.includes(i) ? memoryCards[i] : '·'}</button>
                    ))}
                  </div>)}
              </div>
              <div className="card p-5">
                <h2 className="font-bold">Reaction-time task</h2>
                <p className="text-xs text-slate-500">Tap as soon as the button turns green. Today / previous / trend shown after each try.</p>
                {!reactionStart ? <button className="btn-ghost mt-3 !py-2 text-sm" onClick={reactionGo}>Get ready…</button> : (
                  <button onClick={() => { setReactionScore(Date.now() - (reactionStart || Date.now())); setReactionStart(null); say('Reaction recorded'); }}
                    className="mt-3 w-full rounded-xl bg-emerald-500 py-6 font-bold text-white hover:bg-emerald-600">TAP NOW</button>)}
                {reactionScore !== null && <p className="mt-2 text-sm">Today: <b>{reactionScore} ms</b> · Previous: 340 ms · Trend: stable</p>}
              </div>
            </div>
          </div>
        )}

        {tab === 'insights' && (
          <div className="fade-in space-y-4" id="report">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-extrabold">AI Insight Report</h1>
              <button className="btn-ghost !py-2 text-sm" onClick={exportPDF}><Printer size={14} /> Print / Save PDF</button>
            </div>
            <Section title="Your Snapshot" body={insight?.summary} />
            <div className="grid gap-4 md:grid-cols-3">
              {(insight?.patterns || []).slice(0, 3).map((p: any, i: number) => (
                <article key={i} className="card p-5">
                  <p className="text-xs font-bold uppercase tracking-wide text-teal-700">Why this matters</p>
                  <h3 className="mt-1 font-bold">{p.title}</h3>
                  <p className="mt-2 text-sm text-slate-600">{p.why_it_matters}</p>
                  <p className="mt-2 text-xs font-semibold">What we observed</p>
                  <p className="text-xs text-slate-600">{p.observed}</p>
                  <p className="mt-2 text-xs font-semibold">What could influence it</p>
                  <p className="text-xs text-slate-600">{(p.influences || []).join(' · ')}</p>
                  <p className="mt-2 text-[11px] font-semibold text-slate-500">This pattern is not a diagnosis.</p>
                </article>
              ))}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Section title="Context" list={insight?.possible_context} />
              <Section title="Questions to Consider" list={insight?.questions_for_clinician} />
              <Section title="What to Monitor" list={insight?.monitoring_suggestions} />
              <Section title="Confidence & Limitations" body={insight?.uncertainty} />
            </div>
            {insight?.safety_message && <p role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">{insight.safety_message}</p>}
            <button className="btn-primary" onClick={async () => {
              if (!demoMode && authed && backendLive) { try { await api.createReport(); say('Report saved'); } catch {} }
              exportPDF();
            }}><Download size={16} /> Generate shareable health summary</button>
            <p className="text-xs text-slate-500">AI-generated educational summary — not a medical diagnosis.</p>
          </div>
        )}

        {tab === 'learn' && (
          <div className="fade-in space-y-3">
            <h1 className="text-2xl font-extrabold">Learn</h1>
            {(learn.length ? learn : [
              { title: 'Sleep and concentration', body: 'Short or disrupted sleep is commonly associated with next-day difficulty concentrating.', source: 'CDC — About Sleep', reviewed: '2025-11-01' },
              { title: 'Stress and everyday forgetfulness', body: 'High stress can make forgetfulness more noticeable. Smaller steps and routines help.', source: 'NIMH — Stress information', reviewed: '2025-10-15' },
              { title: 'Why tracking patterns matters', body: 'A two-week timeline of what/ how often/ how strong/ daily impact is practical to bring to a visit.', source: 'NeuroLens curated guidance', reviewed: '2026-01-20' },
              { title: 'When to seek care promptly', body: 'Facial droop, slurred speech, chest pain, difficulty breathing, seizure, or thoughts of self-harm need urgent care.', source: 'MedlinePlus', reviewed: '2025-08-01' },
            ]).map((t: any, i: number) => (
              <article key={i} className="card p-5"><h3 className="font-bold">{t.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{t.body}</p>
                <p className="mt-2 text-xs text-slate-500">Source: {t.source} · Reviewed {t.reviewed}</p></article>
            ))}
          </div>
        )}

        {tab === 'privacy' && (
          <div className="fade-in mx-auto max-w-2xl space-y-4">
            <h1 className="text-2xl font-extrabold">Privacy Center</h1>
            <div className="card space-y-2 p-5 text-sm">
              <Row k="What is stored" v="Observations, check-ins, exercise results, AI insights you generate." />
              <Row k="Why" v="To build your timeline and explain patterns. Nothing else." />
              <Row k="AI processing" v={demoMode ? 'Demo Intelligence Mode: deterministic on-device-style explanations. No external AI call.' : 'Structured analysis sent to configured AI API; outputs validated by safety layer.'} />
              <Row k="What we never do" v="No diagnosis, no prescriptions, no selling data, no unnecessary personal info." />
            </div>
            <div className="flex gap-3 flex-wrap">
              <button className="btn-ghost !py-2 text-sm" onClick={async () => {
                const data = (!demoMode && authed && backendLive) ? await api.exportData().catch(() => ({ observations: obs })) : { observations: obs };
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'neurolens-export.json'; a.click();
                say('Data exported');
              }}><Download size={14} /> Export my data</button>
              <button className="inline-flex items-center gap-2 rounded-xl border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50" onClick={async () => {
                if (!demoMode && authed && backendLive) { try { await api.deleteData(); } catch {} }
                setObs([]); say('Your data was deleted');
              }}><Trash2 size={14} /> Delete my data</button>
            </div>
          </div>
        )}
      </main>

      {toast && <div role="status" className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white shadow-lg">{toast}</div>}
      {showAuth && <AuthModal authForm={authForm} setAuthForm={setAuthForm} doAuth={doAuth} close={() => setShowAuth(false)} enter={() => setShowAuth(false)} />}
      <footer className="border-t bg-white px-6 py-4 text-center text-xs text-slate-500">{DISCLAIMER}</footer>
    </div>
  );
}

function Section({ title, body, list }: any) {
  return (
    <section className="card p-5"><h2 className="font-bold">{title}</h2>
      {body && <p className="mt-2 text-sm leading-relaxed text-slate-700">{body}</p>}
      {list && <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">{list.map((x: string, i: number) => <li key={i}>{x}</li>)}</ul>}
    </section>
  );
}
function Row({ k, v }: any) {
  return <p><span className="font-semibold">{k}: </span><span className="text-slate-600">{v}</span></p>;
}
function AuthModal({ authForm, setAuthForm, doAuth, close, enter }: any) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" role="dialog" aria-modal="true" aria-label="Sign in">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-bold">Sign in / Create demo account</h2>
        <p className="mt-1 text-xs text-slate-500">Backend: demo@neurolens.ai / demo1234 (seeded). Without backend, Demo Mode is used.</p>
        <label className="label mt-4 block" htmlFor="email">Email</label>
        <input id="email" className="input mt-1" value={authForm.email} onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })} />
        <label className="label mt-3 block" htmlFor="pw">Password</label>
        <input id="pw" type="password" className="input mt-1" value={authForm.password} onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })} />
        <div className="mt-4 flex gap-2">
          <button className="btn-primary flex-1 justify-center" onClick={() => doAuth('login')}>Sign in</button>
          <button className="btn-ghost flex-1 justify-center" onClick={() => doAuth('register')}>Register</button>
        </div>
        <button className="mt-3 w-full rounded-xl px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100" onClick={() => { close(); enter(); }}>Continue in Demo Mode</button>
      </div>
    </div>
  );
}
