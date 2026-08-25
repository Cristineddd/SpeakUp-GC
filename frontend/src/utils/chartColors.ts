/** SpeakUp GC chart colors — brand green scale so charts match the rest of admin. */

export const CHART = {
  rose: '#0F6E56',
  amber: '#1D9E75',
  indigo: '#4DB894',
  sky: '#7DCEB3',
  violet: '#9FE1CB',
  slate: '#7A8F82',
  blue: '#1D9E75',
  orange: '#F59E0B',
  red: '#DC6B6B',
  green: '#1D9E75',
} as const;

const CATEGORY_CYCLE = [
  CHART.rose,
  CHART.amber,
  CHART.indigo,
  CHART.sky,
  CHART.violet,
  CHART.slate,
];

export function getComplaintCategoryColor(_name: string, index = 0): string {
  return CATEGORY_CYCLE[index % CATEGORY_CYCLE.length];
}

export function getCaseStatusColor(name: string): string {
  const key = name.toLowerCase().replace(/[\s-]+/g, '');
  if (key.includes('pending') || key.includes('submitted')) return CHART.orange;
  if (key.includes('progress') || key.includes('investigat')) return '#3B82F6';
  if (key.includes('resolved') || key.includes('closed')) return CHART.green;
  if (key.includes('dismiss')) return CHART.red;
  return CHART.slate;
}

export const CATEGORY_CHART_COLORS = CATEGORY_CYCLE;
export const STATUS_CHART_COLORS = [
  CHART.orange,
  '#3B82F6',
  CHART.green,
  CHART.red,
  CHART.indigo,
  CHART.slate,
];
