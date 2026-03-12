import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import api from '../api/client';
import Navbar from '../components/Navbar';

/* Styled markdown renderer for AI responses */
const MarkdownResponse: React.FC<{ content: string }> = ({ content }) => (
    <div className="prose-ai">
        <ReactMarkdown
            components={{
                h1: ({ children }) => <h2 className="text-lg font-bold text-white mt-4 mb-2 border-b border-slate-700/50 pb-1">{children}</h2>,
                h2: ({ children }) => <h3 className="text-base font-bold text-white mt-4 mb-2">{children}</h3>,
                h3: ({ children }) => <h4 className="text-sm font-bold text-violet-300 mt-3 mb-1.5">{children}</h4>,
                h4: ({ children }) => <h5 className="text-sm font-semibold text-indigo-300 mt-2 mb-1">{children}</h5>,
                p: ({ children }) => <p className="text-sm text-slate-300 leading-relaxed mb-2">{children}</p>,
                strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
                em: ({ children }) => <em className="text-violet-300 not-italic font-medium">{children}</em>,
                ul: ({ children }) => <ul className="space-y-1.5 my-2 ml-1">{children}</ul>,
                ol: ({ children }) => <ol className="space-y-1.5 my-2 ml-1 list-decimal list-inside">{children}</ol>,
                li: ({ children }) => (
                    <li className="text-sm text-slate-300 leading-relaxed flex items-start gap-2">
                        <span className="text-violet-400 mt-1.5 text-[6px] flex-shrink-0">●</span>
                        <span>{children}</span>
                    </li>
                ),
                blockquote: ({ children }) => (
                    <blockquote className="border-l-2 border-violet-500/40 pl-3 my-2 text-sm text-slate-400 italic">{children}</blockquote>
                ),
                code: ({ children }) => (
                    <code className="px-1.5 py-0.5 bg-slate-800/80 border border-slate-700/50 rounded text-xs text-violet-300 font-mono">{children}</code>
                ),
                hr: () => <hr className="border-slate-700/40 my-3" />,
                a: ({ href, children }) => <a href={href} className="text-violet-400 underline hover:text-violet-300" target="_blank" rel="noreferrer">{children}</a>,
                table: ({ children }) => <table className="w-full text-sm my-3 border border-slate-700/50 rounded-lg overflow-hidden">{children}</table>,
                thead: ({ children }) => <thead className="bg-slate-800/60">{children}</thead>,
                th: ({ children }) => <th className="text-left px-3 py-2 text-xs font-semibold text-slate-300 uppercase tracking-wider border-b border-slate-700/50">{children}</th>,
                td: ({ children }) => <td className="px-3 py-2 text-sm text-slate-300 border-b border-slate-800/30">{children}</td>,
            }}
        >
            {content}
        </ReactMarkdown>
    </div>
);

const AIAdvisor: React.FC = () => {
    const [advice, setAdvice] = useState<{ question: string; answer: string }[]>([]);
    const [context, setContext] = useState<any>(null);
    const [contextSummary, setContextSummary] = useState('');
    const [dataFed, setDataFed] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [customQuestion, setCustomQuestion] = useState('');
    const [asking, setAsking] = useState(false);
    const [chatHistory, setChatHistory] = useState<{ question: string; answer: string; dataPointsUsed?: string[]; isCustom: boolean }[]>([]);

    useEffect(() => { loadAdvice(); }, []);

    const loadAdvice = async () => {
        try {
            const res = await api.get('/advisor');
            setAdvice(res.data.advice || []);
            setContext(res.data.context);
            setContextSummary(res.data.contextSummary || '');
            setDataFed(res.data.dataFed || []);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const askQuestion = async () => {
        if (!customQuestion.trim()) return;
        setAsking(true);
        const q = customQuestion;
        setCustomQuestion('');
        setChatHistory(prev => [...prev, { question: q, answer: '', isCustom: true }]);

        try {
            const res = await api.post('/advisor/ask', { question: q });
            setChatHistory(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                    question: q,
                    answer: res.data.answer,
                    dataPointsUsed: res.data.dataPointsUsed,
                    isCustom: true
                };
                return updated;
            });
        } catch (err: any) {
            setChatHistory(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                    question: q,
                    answer: 'Sorry, I was unable to process your question. Please try again.',
                    isCustom: true
                };
                return updated;
            });
        } finally {
            setAsking(false);
        }
    };

    const suggestedQuestions = [
        "What are the biggest risks facing my startup right now?",
        "How is my financial health trending over time?",
        "What should I do to improve my churn rate?",
        "Am I ready to raise my next funding round?",
        "How do I compare to industry benchmarks?",
        "What's the most urgent issue I need to address?",
    ];

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950">
                <Navbar />
                <div className="flex flex-col items-center justify-center h-96 gap-4">
                    <div className="relative">
                        <div className="animate-spin rounded-full h-14 w-14 border-t-2 border-b-2 border-violet-500" />
                        <span className="absolute inset-0 flex items-center justify-center text-lg">🤖</span>
                    </div>
                    <p className="text-sm text-slate-400 animate-pulse">Analyzing all your company data with AI...</p>
                    <p className="text-xs text-slate-600">Feeding metrics, scores, milestones & benchmarks</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950">
            <Navbar />
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 bg-gradient-to-br from-violet-500 to-pink-600 rounded-xl flex items-center justify-center text-2xl shadow-lg shadow-violet-500/25">
                        🤖
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-3 flex-wrap">
                            <h1 className="text-2xl font-bold text-white">AI Advisor</h1>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${context?.aiPowered
                                ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                }`}>
                                {context?.aiPowered ? `✨ ${context?.model || 'AI Powered'}` : '⚙️ Rule-Based'}
                            </span>
                        </div>
                        <p className="text-sm text-slate-400 mt-0.5">
                            {contextSummary || 'Intelligent insights trained on your complete company data'}
                        </p>
                    </div>
                </div>

                {/* Data Context */}
                <div className="bg-slate-900/50 border border-slate-800/40 rounded-xl p-5 mb-6">
                    <div className="flex flex-wrap items-center gap-6 mb-3">
                        {[
                            { label: 'Company', value: context?.company, color: 'text-white font-semibold' },
                            { label: 'Sector', value: context?.sector, color: 'text-indigo-300' },
                            { label: 'Health Score', value: `${context?.score}/100`, color: `font-bold ${(context?.score || 0) >= 60 ? 'text-green-400' : (context?.score || 0) >= 40 ? 'text-amber-400' : 'text-red-400'}` },
                            { label: 'Period', value: context?.period, color: 'text-white' },
                            { label: 'Milestones', value: context?.milestones, color: 'text-white' },
                            { label: 'Alerts', value: context?.activeAlerts > 0 ? `${context.activeAlerts} active` : '✅ None', color: 'text-white' },
                        ].map((item, i) => (
                            <div key={i}>
                                <p className="text-[10px] text-slate-600 uppercase tracking-wider">{item.label}</p>
                                <p className={`text-sm ${item.color}`}>{item.value}</p>
                            </div>
                        ))}
                    </div>
                    {dataFed.length > 0 && (
                        <div className="border-t border-slate-800/50 pt-3">
                            <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-1.5">📊 Data Fed to AI</p>
                            <div className="flex flex-wrap gap-2">
                                {dataFed.map((item, i) => (
                                    <span key={i} className="px-2.5 py-1 bg-slate-800/60 border border-slate-700/40 rounded-lg text-[11px] text-slate-400">{item}</span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* AI Recommendations */}
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
                    🧠 AI Analysis & Recommendations
                </h3>
                <div className="space-y-3 mb-8">
                    {advice.map((item, i) => (
                        <details key={i} className="group bg-slate-900/60 border border-slate-800/40 rounded-xl hover:border-violet-500/20 transition-all">
                            <summary className="p-5 cursor-pointer flex items-center justify-between list-none">
                                <h4 className="text-sm font-bold text-violet-300 flex items-center gap-2">
                                    <span className="text-base">💡</span>
                                    {item.question}
                                </h4>
                                <svg className="w-4 h-4 text-slate-500 group-open:rotate-180 transition-transform flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </summary>
                            <div className="px-5 pb-5 border-t border-slate-800/30 pt-4">
                                <MarkdownResponse content={item.answer} />
                            </div>
                        </details>
                    ))}
                </div>

                {/* Chat History */}
                {chatHistory.length > 0 && (
                    <div className="mb-6">
                        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">💬 Conversation</h3>
                        <div className="space-y-4">
                            {chatHistory.map((item, i) => (
                                <div key={i} className="bg-slate-900/60 border border-violet-500/15 rounded-xl overflow-hidden">
                                    {/* User question */}
                                    <div className="flex items-start gap-3 p-4 bg-slate-800/20">
                                        <div className="w-8 h-8 bg-indigo-500/20 rounded-full flex items-center justify-center text-sm flex-shrink-0">👤</div>
                                        <p className="text-sm text-white font-medium pt-1">{item.question}</p>
                                    </div>
                                    {/* AI answer */}
                                    <div className="p-4">
                                        <div className="flex items-start gap-3">
                                            <div className="w-8 h-8 bg-gradient-to-br from-violet-500/30 to-pink-500/30 rounded-full flex items-center justify-center text-sm flex-shrink-0">🤖</div>
                                            <div className="flex-1 pt-0.5 min-w-0">
                                                {!item.answer ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-violet-500" />
                                                        <p className="text-sm text-slate-400 animate-pulse">Analyzing your data...</p>
                                                    </div>
                                                ) : (
                                                    <MarkdownResponse content={item.answer} />
                                                )}
                                            </div>
                                        </div>
                                        {item.dataPointsUsed && item.dataPointsUsed.length > 0 && item.answer && (
                                            <div className="mt-3 pl-11">
                                                <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-1">Data Points Referenced</p>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {item.dataPointsUsed.map((dp, j) => (
                                                        <span key={j} className="px-2 py-0.5 bg-violet-500/10 border border-violet-500/20 rounded text-[10px] text-violet-300">
                                                            📊 {dp}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Ask a Question */}
                <div className="bg-slate-900/70 border border-slate-800/50 rounded-xl p-6 sticky bottom-4">
                    <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                        Ask the AI Advisor
                        {context?.aiPowered && <span className="text-[10px] text-violet-400">• {context?.model}</span>}
                    </h3>
                    <div className="flex flex-wrap gap-2 mb-4">
                        {suggestedQuestions.map((q, i) => (
                            <button
                                key={i}
                                onClick={() => setCustomQuestion(q)}
                                className="px-3 py-1.5 bg-slate-800/60 border border-slate-700/40 rounded-lg text-xs text-slate-400 hover:text-violet-300 hover:border-violet-500/30 hover:bg-violet-500/5 transition-all"
                            >
                                {q}
                            </button>
                        ))}
                    </div>
                    <div className="flex gap-3">
                        <input
                            type="text"
                            value={customQuestion}
                            onChange={e => setCustomQuestion(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && !asking && askQuestion()}
                            placeholder="Ask anything about your startup — the AI has access to all your data..."
                            className="flex-1 px-4 py-3 bg-slate-800/60 border border-slate-700/50 rounded-xl text-white text-sm placeholder-slate-500 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 outline-none transition-all"
                        />
                        <button
                            onClick={askQuestion}
                            disabled={asking || !customQuestion.trim()}
                            className="px-6 py-3 bg-gradient-to-r from-violet-600 to-pink-600 text-white font-semibold text-sm rounded-xl hover:from-violet-500 hover:to-pink-500 shadow-lg shadow-violet-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {asking ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white" />
                                    Thinking...
                                </>
                            ) : (
                                <>🤖 Ask AI</>
                            )}
                        </button>
                    </div>
                    {!context?.aiPowered && (
                        <p className="text-[10px] text-amber-400/60 mt-2">
                            💡 Set OPENROUTER_API_KEY in your .env file to enable AI-powered responses. Currently using rule-based analysis.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AIAdvisor;
