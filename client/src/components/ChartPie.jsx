import React, { useEffect, useRef, useContext } from 'react';
import Chart from 'chart.js/auto';
import ThemeContext from '../context/ThemeContext';

export default function ChartPie({ data, height = 220, type = 'pie' }) {
  const canvasRef = useRef(null);
  const { dark } = useContext(ThemeContext);

  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    const labels = data.map((d) => d.label);
    const vals = data.map((d) => d.value);
    const palette = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#06b6d4'];

    const chart = new Chart(ctx, {
      type,
      data: {
        labels,
        datasets: [{
          data: vals,
          backgroundColor: palette,
          borderColor: dark ? '#0f172a' : '#ffffff',
          borderWidth: 2,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: dark ? '#94a3b8' : '#475569',
              padding: 12,
              usePointStyle: true,
              pointStyle: 'circle',
              boxWidth: 8
            }
          },
          tooltip: {
            backgroundColor: dark ? '#1e293b' : '#ffffff',
            titleColor: dark ? '#e2e8f0' : '#0f172a',
            bodyColor: dark ? '#cbd5e1' : '#334155',
            borderColor: 'rgba(148,163,184,0.2)',
            borderWidth: 1,
            padding: 10
          }
        }
      }
    });
    return () => chart.destroy();
  }, [data, dark, type]);

  return <div style={{ height }}><canvas ref={canvasRef} /></div>;
}
