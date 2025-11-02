/**
 * Helper function to convert form data object to array for Google Sheets submission
 */
export const convertToSheetRow = (data: any): any[] => {
  // Check if data is already an array
  if (Array.isArray(data)) {
    return data;
  }
  
  // Convert object to array of values
  return Object.values(data);
};

/**
 * Helper to format data dengan timestamp
 */
export const addTimestamp = (data: any) => {
  return {
    ...data,
    timestamp: new Date().toISOString()
  };
};
