const decimalFormatter = new Intl.NumberFormat('it-IT', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  useGrouping: 'always',
});
const percentFormatter = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 1 });
export const formatMoney = (minor) => decimalFormatter.format(minor / 100);
export const formatMultiplier = (value) => decimalFormatter.format(value);
export const formatPercent = (probability) => percentFormatter.format(probability * 100);
