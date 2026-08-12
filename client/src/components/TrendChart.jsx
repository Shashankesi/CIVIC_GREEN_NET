import React, { useEffect, useRef, useContext } from 'react';
import Chart from 'chart.js/auto';
import ThemeContext from '../context/ThemeContext';

export default function TrendChart({ data, height = 260 }) {
  const canvasRef = useRef(null);
  const { dark } = useContext(ThemeContext);

  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    const labels = data.map((d) => d.label);
    const vals = data.map((d) => d.count);
    const gridColor = dark ? 'rgba(148,163,184,0.12)' : 'rgba(100,116,139,0.12)';
    const textColor = dark ? '#94a3b8' : '#64748b';

    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Complaints',
          data: vals,
          fill: true,
          borderColor: '#10b981',
          backgroundColor: dark ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.1)',
          tension: 0.4,
          pointBackgroundColor: '#10b981',
          pointBorderColor: dark ? '#0f172a' : '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: dark ? '#1e293b' : '#ffffff',
            titleColor: dark ? '#e2e8f0' : '#0f172a',
            bodyColor: dark ? '#cbd5e1' : '#334155',
            borderColor: 'rgba(148,163,184,0.2)',
            borderWidth: 1,
            padding: 10,
            displayColors: false
          }
        },
        scales: {
          x: {
            grid: { color: gridColor },
            ticks: { color: textColor, maxTicksLimit: 8 }
          },
          y: {
            grid: { color: gridColor },
            ticks: { color: textColor, precision: 0 },
            beginAtZero: true
          }
        }
      }
    });
    return () => { chart.destroy(); };
  }, [data, dark]);

  return <div style={{ height }}><canvas ref={canvasRef} /></div>;
}
