/**
 * Format a number with thousand separators (Indonesian format with dots)
 * e.g., 100000 -> "100.000"
 */
export const formatNumberWithSeparator = (value: string | number): string => {
  if (value === "" || value === null || value === undefined) return "";
  
  // Convert to string and remove non-digit characters
  const numericValue = String(value).replace(/[^\d]/g, "");
  
  if (!numericValue) return "";
  
  // Format with thousand separators (dots)
  return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

/**
 * Parse a formatted number string back to raw number string
 * e.g., "100.000" -> "100000"
 */
export const parseFormattedNumber = (formattedValue: string): string => {
  if (!formattedValue) return "";
  return formattedValue.replace(/\./g, "");
};

/**
 * Parse a formatted number string to actual number
 * e.g., "100.000" -> 100000
 */
export const parseFormattedNumberToInt = (formattedValue: string): number => {
  if (!formattedValue) return 0;
  const numericValue = formattedValue.replace(/[^\d]/g, "");
  return parseInt(numericValue) || 0;
};
