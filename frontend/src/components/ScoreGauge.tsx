import React from 'react';

interface Props {
    score: number;
    size?: number;
}

const ScoreGauge: React.FC<Props> = ({ score, size = 180 }) => {
    const radius = (size - 20) / 2;
    const circumference = radius * Math.PI; // half circle
    const progress = (score / 100) * circumference;
    const center = size / 2;

    const getColor = () => {
        if (score >= 75) return '#10b981';
        if (score >= 50) return '#f59e0b';
        if (score >= 25) return '#f97316';
        return '#ef4444';
    };

    const getLabel = () => {
        if (score >= 75) return 'Excellent';
        if (score >= 50) return 'Good';
        if (score >= 25) return 'Fair';
        return 'Needs Attention';
    };

    return (
        <div className="flex flex-col items-center">
            <svg width={size} height={size / 2 + 20} viewBox={`0 0 ${size} ${size / 2 + 20}`}>
                {/* Background arc */}
                <path
                    d={`M 10 ${center} A ${radius} ${radius} 0 0 1 ${size - 10} ${center}`}
                    fill="none"
                    stroke="#1e293b"
                    strokeWidth="12"
                    strokeLinecap="round"
                />
                {/* Progress arc */}
                <path
                    d={`M 10 ${center} A ${radius} ${radius} 0 0 1 ${size - 10} ${center}`}
                    fill="none"
                    stroke={getColor()}
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray={`${progress} ${circumference}`}
                    className="transition-all duration-1000 ease-out"
                    style={{ filter: `drop-shadow(0 0 8px ${getColor()}40)` }}
                />
                {/* Score text */}
                <text x={center} y={center - 10} textAnchor="middle" className="fill-white text-3xl font-bold" style={{ fontSize: '36px', fontWeight: 800 }}>
                    {score}
                </text>
                <text x={center} y={center + 14} textAnchor="middle" className="fill-slate-400" style={{ fontSize: '12px' }}>
                    out of 100
                </text>
            </svg>
            <span className="text-sm font-semibold mt-1" style={{ color: getColor() }}>{getLabel()}</span>
        </div>
    );
};

export default ScoreGauge;
