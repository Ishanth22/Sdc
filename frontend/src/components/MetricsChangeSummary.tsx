import React, { useEffect, useRef, useState } from 'react';

interface MetricChange {
    label: string;
    from: number;
    to: number;
    unit?: string;
    format?: 'currency' | 'percent' | 'number';
    higherIsBetter?: boolean;
}

interface Props {
    changes: MetricChange[];
    period: string;
    isUpdate: boolean;
    onDone: () => void;
}

function formatVal(val: number, format?: string, unit?: string): string {
    if (format === 'currency') {
        if (Math.abs(val) >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
        if (Math.abs(val) >= 1000) return `₹${(val / 1000).toFixed(0)}K`;
        return `₹${Math.abs(val).toLocaleString('en-IN')}`;
    }
    if (format === 'percent') return `${val.toFixed(1)}%`;
    return `${val.toLocaleString('en-IN')}${unit ? ' ' + unit : ''}`;
}

/* Animated counting number */
const CountUp: React.FC<{ from: number; to: number; format?: string; unit?: string; duration?: number }> = ({
    from, to, format, unit, duration = 1200
}) => {
    const [display, setDisplay] = useState(from);
    const raf = useRef<number | undefined>(undefined);
    useEffect(() => {
        const start = performance.now();
        const animate = (now: number) => {
            const p = Math.min((now - start) / duration, 1);
            const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
            setDisplay(from + (to - from) * eased);
            if (p < 1) raf.current = requestAnimationFrame(animate);
        };
        raf.current = requestAnimationFrame(animate);
        return () => { if (raf.current) cancelAnimationFrame(raf.current); };
    }, [from, to, duration]);
    return <>{formatVal(display, format, unit)}</>;
};

/* Single floating particle */
const Particle: React.FC<{ x: number; color: string; delay: number; size: number }> = ({ x, color, delay, size }) => (
    <div style={{
        position: 'absolute', left: `${x}%`, bottom: 0,
        width: size, height: size, borderRadius: '50%',
        backgroundColor: color, opacity: 0,
        animation: `floatUp 3s ease-out ${delay}s infinite`,
        pointerEvents: 'none',
    }} />
);

const MetricsChangeSummary: React.FC<Props> = ({ changes, period, isUpdate, onDone }) => {
    const [visible, setVisible] = useState(false);
    const [countdown, setCountdown] = useState(7);

    const increased = changes.filter(c => {
        const diff = c.to - c.from;
        return c.higherIsBetter !== false ? diff > 0 : diff < 0;
    });
    const decreased = changes.filter(c => {
        const diff = c.to - c.from;
        return c.higherIsBetter !== false ? diff < 0 : diff > 0;
    });
    const unchanged = changes.filter(c => c.to === c.from);

    useEffect(() => {
        const t = setTimeout(() => setVisible(true), 50);
        return () => clearTimeout(t);
    }, []);

    useEffect(() => {
        if (countdown <= 0) { onDone(); return; }
        const t = setTimeout(() => setCountdown(p => p - 1), 1000);
        return () => clearTimeout(t);
    }, [countdown, onDone]);

    const particles = Array.from({ length: 20 }, (_, i) => ({
        x: Math.random() * 100,
        color: ['#22c55e', '#6366f1', '#f59e0b', '#06b6d4', '#a855f7', '#f43f5e'][i % 6],
        delay: Math.random() * 2,
        size: 4 + Math.random() * 7,
    }));

    const cardStyle: React.CSSProperties = {
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(60px) scale(0.92)',
        opacity: visible ? 1 : 0,
        transition: 'transform 0.55s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.4s ease',
    };

    return (
        <>
            <style>{`
                @keyframes floatUp {
                    0%   { transform: translateY(0) rotate(0deg);   opacity: 0.8; }
                    100% { transform: translateY(-100vh) rotate(720deg); opacity: 0; }
                }
                @keyframes shimmer {
                    0%   { background-position: -200% center; }
                    100% { background-position:  200% center; }
                }
                @keyframes pulseGlow {
                    0%, 100% { box-shadow: 0 0 24px 4px rgba(99,102,241,0.4); }
                    50%       { box-shadow: 0 0 48px 12px rgba(99,102,241,0.7); }
                }
                @keyframes rowSlideIn {
                    from { transform: translateX(-24px); opacity: 0; }
                    to   { transform: translateX(0);     opacity: 1; }
                }
                @keyframes rowSlideInRight {
                    from { transform: translateX(24px); opacity: 0; }
                    to   { transform: translateX(0);    opacity: 1; }
                }
                @keyframes badgePop {
                    0%   { transform: scale(0) rotate(-15deg); }
                    70%  { transform: scale(1.2) rotate(4deg); }
                    100% { transform: scale(1) rotate(0deg);  }
                }
                @keyframes titleGlow {
                    0%, 100% { text-shadow: 0 0 20px rgba(99,102,241,0.5); }
                    50%       { text-shadow: 0 0 40px rgba(99,102,241,0.9), 0 0 80px rgba(139,92,246,0.4); }
                }
                /* Hide scrollbar but keep scroll */
                .mcs-scroll::-webkit-scrollbar { display: none; }
                .mcs-scroll { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>

            {/* ── Full-screen backdrop ── */}
            <div style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                background: 'rgba(5,8,22,0.90)',
                backdropFilter: 'blur(14px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px 16px',
                overflowY: 'auto',
            }}>
                {/* Floating particles (behind card) */}
                <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
                    {particles.map((p, i) => <Particle key={i} {...p} />)}
                </div>

                {/* ── Card ── */}
                <div style={{
                    ...cardStyle,
                    position: 'relative',
                    zIndex: 1,
                    width: '100%',
                    maxWidth: 700,
                    background: 'linear-gradient(135deg, rgba(15,23,42,0.98) 0%, rgba(30,27,75,0.98) 100%)',
                    border: '1px solid rgba(99,102,241,0.35)',
                    borderRadius: 24,
                    animation: visible ? 'pulseGlow 3s ease-in-out infinite' : 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    maxHeight: '90vh',
                }}>
                    {/* Shimmer top bar */}
                    <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                        background: 'linear-gradient(90deg, #6366f1, #a855f7, #06b6d4, #6366f1)',
                        backgroundSize: '200% auto',
                        animation: 'shimmer 2.5s linear infinite',
                        borderRadius: '24px 24px 0 0',
                        flexShrink: 0,
                    }} />

                    {/* ── Header (always visible) ── */}
                    <div style={{ padding: '28px 28px 16px', flexShrink: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                            <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: 12, color: '#6366f1', fontWeight: 700, letterSpacing: 2, marginBottom: 6, textTransform: 'uppercase' }}>
                                    {isUpdate ? '✏️ Metrics Updated' : '🎉 Metrics Submitted'} · {period}
                                </div>
                                <h2 style={{ fontSize: 24, fontWeight: 800, color: 'white', margin: 0, animation: 'titleGlow 3s ease-in-out infinite' }}>
                                    {increased.length > 0 && decreased.length === 0
                                        ? '🚀 Everything Improved!'
                                        : decreased.length > 0
                                        ? "📊 Here's What Changed"
                                        : '✅ Metrics Saved'}
                                </h2>
                                <p style={{ color: '#94a3b8', fontSize: 13, margin: '6px 0 0' }}>
                                    {changes.filter(c => c.to !== c.from).length} metrics changed · {unchanged.length} unchanged
                                </p>
                            </div>
                            {/* Countdown ring */}
                            <div style={{ position: 'relative', flexShrink: 0 }}>
                                <svg width={52} height={52} style={{ transform: 'rotate(-90deg)' }}>
                                    <circle cx={26} cy={26} r={22} fill="none" stroke="rgba(99,102,241,0.15)" strokeWidth={3} />
                                    <circle cx={26} cy={26} r={22} fill="none" stroke="#6366f1" strokeWidth={3}
                                        strokeDasharray={138} strokeLinecap="round"
                                        style={{ strokeDashoffset: (1 - countdown / 7) * 138, transition: 'stroke-dashoffset 1s linear' }} />
                                </svg>
                                <div style={{
                                    position: 'absolute', inset: 0, display: 'flex',
                                    alignItems: 'center', justifyContent: 'center',
                                    fontSize: 16, fontWeight: 800, color: 'white',
                                }}>{countdown}</div>
                            </div>
                        </div>
                    </div>

                    {/* ── Scrollable body ── */}
                    <div className="mcs-scroll" style={{ overflowY: 'auto', padding: '0 28px', flex: 1, minHeight: 0 }}>

                        {/* Changes Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: increased.length > 0 && decreased.length > 0 ? '1fr 1fr' : '1fr', gap: 16 }}>

                            {/* ── Increased ── */}
                            {increased.length > 0 && (
                                <div>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: '#22c55e', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <span style={{ fontSize: 16 }}>📈</span> Improved ({increased.length})
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {increased.map((m, i) => {
                                            const diff = m.to - m.from;
                                            const pct = m.from !== 0 ? Math.round((diff / Math.abs(m.from)) * 100) : 100;
                                            return (
                                                <div key={m.label} style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 12, padding: '10px 14px', animation: `rowSlideIn 0.4s ease ${0.15 + i * 0.08}s both` }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                                                        <div>
                                                            <span style={{ fontSize: 11, color: '#86efac', fontWeight: 600 }}>{m.label}</span>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                                                                <span style={{ fontSize: 12, color: '#64748b', textDecoration: 'line-through' }}>{formatVal(m.from, m.format, m.unit)}</span>
                                                                <span style={{ color: '#22c55e' }}>→</span>
                                                                <span style={{ fontSize: 15, fontWeight: 800, color: '#4ade80' }}>
                                                                    <CountUp from={m.from} to={m.to} format={m.format} unit={m.unit} duration={900 + i * 100} />
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div style={{ animation: `badgePop 0.5s cubic-bezier(0.34,1.56,0.64,1) ${0.4 + i * 0.08}s both`, background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.4)', borderRadius: 20, padding: '3px 9px', fontSize: 12, fontWeight: 800, color: '#4ade80', whiteSpace: 'nowrap' }}>
                                                            ↑ {pct > 0 ? `+${pct}%` : ''}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* ── Decreased ── */}
                            {decreased.length > 0 && (
                                <div>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: '#f87171', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <span style={{ fontSize: 16 }}>📉</span> Declined ({decreased.length})
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {decreased.map((m, i) => {
                                            const diff = Math.abs(m.to - m.from);
                                            const pct = m.from !== 0 ? Math.round((diff / Math.abs(m.from)) * 100) : 100;
                                            return (
                                                <div key={m.label} style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 12, padding: '10px 14px', animation: `rowSlideInRight 0.4s ease ${0.15 + i * 0.08}s both` }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                                                        <div>
                                                            <span style={{ fontSize: 11, color: '#fca5a5', fontWeight: 600 }}>{m.label}</span>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                                                                <span style={{ fontSize: 12, color: '#64748b', textDecoration: 'line-through' }}>{formatVal(m.from, m.format, m.unit)}</span>
                                                                <span style={{ color: '#f87171' }}>→</span>
                                                                <span style={{ fontSize: 15, fontWeight: 800, color: '#f87171' }}>
                                                                    <CountUp from={m.from} to={m.to} format={m.format} unit={m.unit} duration={900 + i * 100} />
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div style={{ animation: `badgePop 0.5s cubic-bezier(0.34,1.56,0.64,1) ${0.4 + i * 0.08}s both`, background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.4)', borderRadius: 20, padding: '3px 9px', fontSize: 12, fontWeight: 800, color: '#f87171', whiteSpace: 'nowrap' }}>
                                                            ↓ -{pct}%
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Verdict */}
                        {(increased.length > 0 || decreased.length > 0) && (
                            <div style={{ marginTop: 16, marginBottom: 4, background: increased.length >= decreased.length ? 'linear-gradient(135deg, rgba(34,197,94,0.1), rgba(99,102,241,0.1))' : 'linear-gradient(135deg, rgba(248,113,113,0.1), rgba(99,102,241,0.1))', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 12, padding: '12px 16px', animation: 'rowSlideIn 0.5s ease 0.7s both' }}>
                                <span style={{ fontSize: 13, color: '#c4b5fd' }}>
                                    {increased.length >= decreased.length
                                        ? `✨ Great update! ${increased.length} metric${increased.length !== 1 ? 's' : ''} improved. Keep up the momentum.`
                                        : `⚡ ${decreased.length} metric${decreased.length !== 1 ? 's' : ''} need attention. Dashboard has full details.`}
                                </span>
                            </div>
                        )}
                    </div>{/* end scrollable body */}

                    {/* ── Footer (always visible) ── */}
                    <div style={{ padding: '16px 28px 24px', flexShrink: 0, display: 'flex', justifyContent: 'flex-end' }}>
                        <button onClick={onDone} style={{
                            padding: '10px 28px',
                            background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                            border: 'none', borderRadius: 12,
                            color: 'white', fontWeight: 700, fontSize: 14,
                            cursor: 'pointer',
                            boxShadow: '0 4px 20px rgba(99,102,241,0.5)',
                            transition: 'transform 0.15s, box-shadow 0.15s',
                        }}
                            onMouseEnter={e => { (e.target as HTMLElement).style.transform = 'translateY(-2px)'; (e.target as HTMLElement).style.boxShadow = '0 8px 30px rgba(99,102,241,0.7)'; }}
                            onMouseLeave={e => { (e.target as HTMLElement).style.transform = ''; (e.target as HTMLElement).style.boxShadow = '0 4px 20px rgba(99,102,241,0.5)'; }}
                        >
                            Go to Dashboard →
                        </button>
                    </div>

                </div>{/* end card */}
            </div>{/* end backdrop */}
        </>
    );
};

export default MetricsChangeSummary;
