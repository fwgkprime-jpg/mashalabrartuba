import styles from './ui.module.css';

interface SparklineProps {
  values: readonly number[];
  label: string;
  tone?: 'cyan' | 'purple' | 'green' | 'orange';
}

export function Sparkline({ values, label, tone = 'cyan' }: SparklineProps) {
  if (values.length < 2) return null;
  const width = 160;
  const height = 42;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - ((value - min) / range) * (height - 8) - 4;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg className={`${styles.sparkline} ${styles[`spark-${tone}`]}`} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>
      <polyline points={points} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

