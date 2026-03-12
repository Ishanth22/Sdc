import React, { useEffect, useState } from 'react';
import api from '../api/client';
import Navbar from '../components/Navbar';

const CATEGORIES = [
    { value: 'product', label: 'Product', emoji: '🚀' },
    { value: 'funding', label: 'Funding', emoji: '💰' },
    { value: 'team', label: 'Team', emoji: '👥' },
    { value: 'market', label: 'Market', emoji: '📈' },
    { value: 'legal', label: 'Legal', emoji: '⚖️' },
    { value: 'other', label: 'Other', emoji: '📋' },
];

const getCategoryInfo = (cat: string) => CATEGORIES.find(c => c.value === cat) || CATEGORIES[5];

const Milestones: React.FC = () => {
    const [milestones, setMilestones] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'all' | 'milestone' | 'okr'>('all');
    const [form, setForm] = useState<any>({
        title: '', description: '', category: 'other', deadline: '', completionPercent: 0,
        isOKR: false, objectiveType: 'quarterly', keyResults: []
    });
    const [newKR, setNewKR] = useState({ title: '', target: 100, current: 0, unit: '' });

    useEffect(() => { loadMilestones(); }, []);

    const loadMilestones = async () => {
        try {
            const res = await api.get('/milestones');
            setMilestones(res.data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const handleSave = async () => {
        try {
            if (editId) {
                await api.put(`/milestones/${editId}`, form);
            } else {
                await api.post('/milestones', form);
            }
            setShowForm(false);
            setEditId(null);
            setForm({ title: '', description: '', category: 'other', deadline: '', completionPercent: 0, isOKR: false, objectiveType: 'quarterly', keyResults: [] });
            loadMilestones();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to save milestone');
        }
    };

    const handleComplete = async (id: string) => {
        try {
            await api.put(`/milestones/${id}`, { completed: true });
            loadMilestones();
        } catch (err) { console.error(err); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this milestone?')) return;
        try {
            await api.delete(`/milestones/${id}`);
            loadMilestones();
        } catch (err) { console.error(err); }
    };

    const handleEdit = (m: any) => {
        setEditId(m._id);
        setForm({
            title: m.title,
            description: m.description,
            category: m.category,
            deadline: m.deadline ? new Date(m.deadline).toISOString().split('T')[0] : '',
            completionPercent: m.completionPercent,
            isOKR: m.isOKR || false,
            objectiveType: m.objectiveType || 'quarterly',
            keyResults: m.keyResults || []
        });
        setShowForm(true);
    };

    const addKeyResult = () => {
        if (!newKR.title) return;
        setForm({ ...form, keyResults: [...form.keyResults, { ...newKR }] });
        setNewKR({ title: '', target: 100, current: 0, unit: '' });
    };

    const updateKRProgress = async (milestoneId: string, krIndex: number, current: number) => {
        try {
            await api.put(`/milestones/${milestoneId}/key-result/${krIndex}`, { current });
            loadMilestones();
        } catch (err) { console.error(err); }
    };

    const removeKR = (idx: number) => {
        setForm({ ...form, keyResults: form.keyResults.filter((_: any, i: number) => i !== idx) });
    };

    const handleProgressChange = async (id: string, value: number) => {
        try {
            await api.put(`/milestones/${id}`, { completionPercent: value });
            loadMilestones();
        } catch (err) { console.error(err); }
    };

    const filteredMilestones = viewMode === 'all' ? milestones : viewMode === 'okr' ? milestones.filter(m => m.isOKR) : milestones.filter(m => !m.isOKR);
    const completedCount = filteredMilestones.filter(m => m.completed).length;
    const totalCount = filteredMilestones.length;
    const overallProgress = totalCount > 0 ? Math.round(filteredMilestones.reduce((sum, m) => sum + m.completionPercent, 0) / totalCount) : 0;

    const inputClass = "w-full px-4 py-2.5 bg-slate-800/60 border border-slate-700/50 rounded-lg text-white text-sm placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 outline-none transition-all";

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950">
                <Navbar />
                <div className="flex items-center justify-center h-96">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500" />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950">
            <Navbar />
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-white">🎯 Milestones & OKRs</h1>
                        <p className="text-sm text-slate-400 mt-1">Track milestones and objectives with measurable key results</p>
                    </div>
                    <button
                        onClick={() => { setShowForm(true); setEditId(null); setForm({ title: '', description: '', category: 'other', deadline: '', completionPercent: 0, isOKR: false, objectiveType: 'quarterly', keyResults: [] }); }}
                        className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold text-sm rounded-lg hover:from-indigo-500 hover:to-violet-500 shadow-lg shadow-indigo-500/20 transition-all"
                    >
                        + Add New
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-2 mb-4">
                    {(['all', 'milestone', 'okr'] as const).map(mode => (
                        <button key={mode} onClick={() => setViewMode(mode)}
                            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${viewMode === mode ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-500 hover:text-slate-300'}`}>
                            {mode === 'all' ? '📋 All' : mode === 'milestone' ? '🎯 Milestones' : '📊 OKRs'}
                        </button>
                    ))}
                </div>

                {/* Overall Progress */}
                <div className="bg-slate-900/70 border border-slate-800/50 rounded-xl p-5 mb-6">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-white">Overall Progress</span>
                        <span className="text-sm text-slate-400">{completedCount}/{totalCount} completed</span>
                    </div>
                    <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-700"
                            style={{ width: `${overallProgress}%` }}
                        />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{overallProgress}% average completion</p>
                </div>

                {/* Add/Edit Form */}
                {showForm && (
                    <div className="bg-slate-900/70 border border-indigo-500/20 rounded-xl p-6 mb-6 animate-fade-in">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-base font-semibold text-white">{editId ? 'Edit' : 'New'} {form.isOKR ? 'OKR' : 'Milestone'}</h3>
                            <button onClick={() => setForm({ ...form, isOKR: !form.isOKR })}
                                className={`px-3 py-1 text-xs rounded-lg font-semibold transition-all ${form.isOKR ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-700/40 text-slate-400 hover:text-white'}`}>
                                {form.isOKR ? '📊 OKR Mode' : '🎯 Milestone Mode'} (click to toggle)
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">{form.isOKR ? 'Objective' : 'Title'}</label>
                                <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                                    placeholder={form.isOKR ? 'e.g., Increase market share by 20%' : 'e.g., MVP Launch'} className={inputClass} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Category</label>
                                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className={inputClass}>
                                    {CATEGORIES.map(c => (
                                        <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Deadline</label>
                                <input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} className={inputClass} />
                            </div>
                            {form.isOKR ? (
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Objective Type</label>
                                    <select value={form.objectiveType} onChange={e => setForm({ ...form, objectiveType: e.target.value })} className={inputClass}>
                                        <option value="quarterly">Quarterly</option>
                                        <option value="annual">Annual</option>
                                        <option value="custom">Custom</option>
                                    </select>
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Completion %</label>
                                    <input type="number" min="0" max="100" value={form.completionPercent}
                                        onChange={e => setForm({ ...form, completionPercent: Math.min(100, Math.max(0, Number(e.target.value))) })}
                                        className={inputClass} />
                                </div>
                            )}
                            <div className="md:col-span-2">
                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Description</label>
                                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                                    rows={2} placeholder="Describe this objective..." className={inputClass} />
                            </div>
                        </div>

                        {/* Key Results (OKR only) */}
                        {form.isOKR && (
                            <div className="mt-4 border-t border-slate-800/50 pt-4">
                                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Key Results</h4>
                                {form.keyResults.map((kr: any, i: number) => (
                                    <div key={i} className="flex items-center gap-2 mb-2 bg-slate-800/30 rounded-lg px-3 py-2">
                                        <span className="text-xs text-slate-500">KR{i + 1}</span>
                                        <span className="text-sm text-white flex-1">{kr.title}</span>
                                        <span className="text-xs text-slate-400">{kr.current}/{kr.target} {kr.unit}</span>
                                        <button onClick={() => removeKR(i)} className="text-xs text-red-400/60 hover:text-red-400">✕</button>
                                    </div>
                                ))}
                                <div className="flex gap-2 mt-2">
                                    <input value={newKR.title} onChange={e => setNewKR({ ...newKR, title: e.target.value })}
                                        placeholder="Key result title" className={`flex-1 ${inputClass}`} />
                                    <input type="number" value={newKR.target} onChange={e => setNewKR({ ...newKR, target: Number(e.target.value) })}
                                        placeholder="Target" className={`w-20 ${inputClass}`} />
                                    <input value={newKR.unit} onChange={e => setNewKR({ ...newKR, unit: e.target.value })}
                                        placeholder="Unit" className={`w-20 ${inputClass}`} />
                                    <button onClick={addKeyResult}
                                        className="px-3 py-2 bg-amber-600/80 text-white text-xs rounded-lg hover:bg-amber-500 transition-all">+ Add</button>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end gap-3 mt-4">
                            <button onClick={() => { setShowForm(false); setEditId(null); }}
                                className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 border border-slate-700 rounded-lg hover:border-slate-600 transition-all">Cancel</button>
                            <button onClick={handleSave}
                                className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold text-sm rounded-lg hover:from-indigo-500 hover:to-violet-500 transition-all">
                                {editId ? 'Update' : form.isOKR ? 'Create OKR' : 'Add Milestone'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Milestones List */}
                {filteredMilestones.length === 0 ? (
                    <div className="bg-slate-900/50 border border-slate-800/40 rounded-xl p-12 text-center">
                        <p className="text-4xl mb-3">{viewMode === 'okr' ? '📊' : '🎯'}</p>
                        <p className="text-slate-400 text-sm">{viewMode === 'okr' ? 'No OKRs yet. Create an objective with key results!' : 'No milestones yet. Add your first milestone!'}</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredMilestones.map((m) => {
                            const cat = getCategoryInfo(m.category);
                            const isOverdue = !m.completed && new Date(m.deadline) < new Date();
                            const daysLeft = Math.ceil((new Date(m.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

                            return (
                                <div key={m._id}
                                    className={`bg-slate-900/60 border rounded-xl p-5 transition-all ${m.completed ? 'border-green-500/20 opacity-80' : isOverdue ? 'border-red-500/20' : 'border-slate-800/40 hover:border-indigo-500/20'}`}
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-start gap-3">
                                            <span className="text-xl mt-0.5">{m.isOKR ? '📊' : cat.emoji}</span>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h4 className={`text-base font-semibold ${m.completed ? 'text-green-300 line-through' : 'text-white'}`}>
                                                        {m.title}
                                                    </h4>
                                                    {m.isOKR && <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 rounded text-[9px] font-bold uppercase">OKR</span>}
                                                    {m.isOKR && m.objectiveType && <span className="text-[9px] text-slate-600 uppercase">{m.objectiveType}</span>}
                                                </div>
                                                {m.description && <p className="text-xs text-slate-500 mt-0.5">{m.description}</p>}
                                                <div className="flex items-center gap-3 mt-1.5">
                                                    <span className="px-2 py-0.5 bg-slate-800/60 text-slate-400 rounded-full text-[10px] uppercase">{cat.label}</span>
                                                    <span className={`text-xs ${isOverdue ? 'text-red-400' : 'text-slate-500'}`}>
                                                        📅 {new Date(m.deadline).toLocaleDateString()}
                                                        {!m.completed && (isOverdue ? ` (${Math.abs(daysLeft)}d overdue)` : ` (${daysLeft}d left)`)}
                                                    </span>
                                                    {m.completed && <span className="text-xs text-green-400">✅ Completed</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {!m.completed && (
                                                <button onClick={() => handleComplete(m._id)}
                                                    className="px-3 py-1 text-xs bg-green-500/10 text-green-400 rounded-lg hover:bg-green-500/20 transition-all">
                                                    ✓ Complete
                                                </button>
                                            )}
                                            <button onClick={() => handleEdit(m)}
                                                className="px-3 py-1 text-xs bg-slate-700/40 text-slate-400 rounded-lg hover:bg-slate-700/60 transition-all">Edit</button>
                                            <button onClick={() => handleDelete(m._id)}
                                                className="px-3 py-1 text-xs text-red-400/60 hover:text-red-400 transition-all">🗑️</button>
                                        </div>
                                    </div>

                                    {/* Key Results (OKR) */}
                                    {m.isOKR && m.keyResults?.length > 0 && (
                                        <div className="mb-3 space-y-2">
                                            {m.keyResults.map((kr: any, i: number) => {
                                                const progress = kr.target > 0 ? Math.min(100, Math.round((kr.current / kr.target) * 100)) : 0;
                                                return (
                                                    <div key={i} className="bg-slate-800/30 rounded-lg px-3 py-2">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <span className="text-xs text-slate-300"><span className="text-slate-600">KR{i + 1}</span> {kr.title}</span>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs font-mono text-slate-400">{kr.current}/{kr.target} {kr.unit}</span>
                                                                {!m.completed && (
                                                                    <input type="range" min="0" max={kr.target} value={kr.current}
                                                                        onChange={e => updateKRProgress(m._id, i, Number(e.target.value))}
                                                                        className="w-16 accent-amber-500 cursor-pointer" />
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                                            <div className={`h-full rounded-full transition-all ${progress >= 100 ? 'bg-green-500' : progress >= 70 ? 'bg-amber-500' : 'bg-indigo-500'}`}
                                                                style={{ width: `${progress}%` }} />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Progress Bar */}
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1 h-2.5 bg-slate-800 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-500 ${m.completed ? 'bg-green-500' : m.completionPercent >= 70 ? 'bg-indigo-500' : m.completionPercent >= 40 ? 'bg-amber-500' : 'bg-slate-600'}`}
                                                style={{ width: `${m.completionPercent}%` }}
                                            />
                                        </div>
                                        <span className="text-xs font-semibold text-slate-400 w-10 text-right">{m.completionPercent}%</span>
                                        {!m.completed && !m.isOKR && (
                                            <input
                                                type="range" min="0" max="100" value={m.completionPercent}
                                                onChange={e => handleProgressChange(m._id, Number(e.target.value))}
                                                className="w-20 accent-indigo-500 cursor-pointer"
                                            />
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Milestones;
