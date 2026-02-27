import React, { useEffect, useState } from 'react';
import api from '../api/client';
import Navbar from '../components/Navbar';

const Profile: React.FC = () => {
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        api.get('/startup/profile').then(res => setProfile(res.data)).finally(() => setLoading(false));
    }, []);

    const handleSave = async () => {
        setSaving(true);
        setSuccess(false);
        try {
            const res = await api.put('/startup/profile', profile);
            setProfile(res.data);
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    const inputClass = "w-full px-4 py-2.5 bg-slate-800/60 border border-slate-700/50 rounded-lg text-white text-sm placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 outline-none transition-all";
    const labelClass = "block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5";

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
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <h1 className="text-2xl font-bold text-white mb-2">Profile Settings</h1>
                <p className="text-sm text-slate-400 mb-6">Update your startup information.</p>

                {success && (
                    <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm">
                        ✅ Profile updated successfully!
                    </div>
                )}

                <div className="bg-slate-900/60 border border-slate-800/40 rounded-xl p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>Company Name</label>
                            <input type="text" value={profile?.companyName || ''} onChange={e => setProfile({ ...profile, companyName: e.target.value })} className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>Sector</label>
                            <select value={profile?.sector || ''} onChange={e => setProfile({ ...profile, sector: e.target.value })} className={inputClass}>
                                {['Fintech', 'Healthtech', 'Edtech', 'Ecommerce', 'DeepTech', 'Agritech', 'Logistics', 'CleanTech', 'SaaS', 'Other'].map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>Stage</label>
                            <select value={profile?.stage || ''} onChange={e => setProfile({ ...profile, stage: e.target.value })} className={inputClass}>
                                {['Idea', 'Seed', 'Early', 'Growth'].map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>City</label>
                            <input type="text" value={profile?.city || ''} onChange={e => setProfile({ ...profile, city: e.target.value })} className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>Team Size</label>
                            <input type="number" value={profile?.teamSize || ''} onChange={e => setProfile({ ...profile, teamSize: Number(e.target.value) })} className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>Website</label>
                            <input type="url" value={profile?.website || ''} onChange={e => setProfile({ ...profile, website: e.target.value })} placeholder="https://" className={inputClass} />
                        </div>
                        <div className="md:col-span-2">
                            <label className={labelClass}>Description</label>
                            <textarea value={profile?.description || ''} onChange={e => setProfile({ ...profile, description: e.target.value })} rows={3} className={inputClass} placeholder="Describe your startup..." />
                        </div>
                    </div>

                    <div className="flex justify-end mt-6">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold text-sm rounded-lg hover:from-indigo-500 hover:to-violet-500 shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50"
                        >
                            {saving ? 'Saving…' : '💾 Save Profile'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;
