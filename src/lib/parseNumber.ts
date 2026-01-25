/**
 * Parse Indonesian formatted number string to actual number
 * Handles formats like "100.000" -> 100000, "1.500.000" -> 1500000
 * Also handles plain numbers and numbers with commas as decimal separator
 */
export const parseIndonesianNumber = (value: string | number | undefined | null): number => {
  if (value === null || value === undefined || value === '') return 0;
  
  // If already a number, return it
  if (typeof value === 'number') return value;
  
  // Convert to string and trim
  let str = String(value).trim();
  
  if (!str) return 0;
  
  // Remove currency symbols and spaces
  str = str.replace(/[Rp\s]/gi, '');
  
  // Check if it looks like Indonesian format (dots as thousand separators)
  // Pattern: dots every 3 digits from the right, optionally ending with comma and decimals
  const indonesianPattern = /^-?\d{1,3}(\.\d{3})*(,\d+)?$/;
  
  if (indonesianPattern.test(str)) {
    // Indonesian format: dots are thousand separators, comma is decimal
    str = str.replace(/\./g, '').replace(',', '.');
    return parseFloat(str) || 0;
  }
  
  // Check if it contains only dots (could be either format)
  if (str.includes('.') && !str.includes(',')) {
    // Count dots - if multiple dots, it's thousand separators
    const dotCount = (str.match(/\./g) || []).length;
    if (dotCount > 1) {
      // Multiple dots = thousand separators
      str = str.replace(/\./g, '');
      return parseFloat(str) || 0;
    }
    
    // Single dot - check position to determine if decimal or thousand separator
    const parts = str.split('.');
    if (parts.length === 2) {
      // If right side has exactly 3 digits, treat as thousand separator
      if (parts[1].length === 3 && parts[0].length <= 3) {
        str = str.replace(/\./g, '');
        return parseFloat(str) || 0;
      }
    }
  }
  
  // Standard format or plain number
  str = str.replace(/,/g, ''); // Remove commas (English thousand separator)
  return parseFloat(str) || 0;
};

/**
 * Round number to nearest thousand
 */
export const roundToThousand = (value: number): number => {
  return Math.round(value / 1000) * 1000;
};

/**
 * Format number input for display with thousand separators (Indonesian format with dots)
 * e.g., 1500000 -> "1.500.000"
 */
export const formatNumberInput = (value: string | number): string => {
  if (value === "" || value === null || value === undefined) return "";
  
  const numericValue = typeof value === 'number' ? value : parseIndonesianNumber(value);
  
  if (numericValue === 0 && value !== 0 && value !== "0") return "";
  
  return numericValue.toLocaleString('id-ID');
};

/**
 * Parse formatted number string back to raw number
 * e.g., "1.500.000" -> 1500000
 */
export const parseFormattedNumber = (formattedValue: string): number => {
  return parseIndonesianNumber(formattedValue);
};
