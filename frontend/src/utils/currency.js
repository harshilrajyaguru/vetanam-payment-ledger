/**
 * Format minor unit integer (e.g. 50000 paise/cents) to formatted display currency string (e.g. "₹500.00").
 * @param {number} amount Minor unit integer
 * @param {string} [currency='INR'] Currency code
 * @returns {string} Formatted string
 */
export function formatMinorUnits(amount, currency = 'INR') {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return '₹0.00';
  }

  const majorUnit = amount / 100;
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency || 'INR',
      minimumFractionDigits: 2,
    }).format(majorUnit);
  } catch {
    return `₹${majorUnit.toFixed(2)}`;
  }
}

/**
 * Convert display currency value (e.g. 500.50) to minor unit integer (e.g. 50050).
 * @param {number|string} displayAmount
 * @returns {number} Minor unit integer
 */
export function toMinorUnits(displayAmount) {
  const parsed = parseFloat(displayAmount);
  if (isNaN(parsed) || parsed <= 0) {
    return 0;
  }
  return Math.round(parsed * 100);
}
