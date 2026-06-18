import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface MonitoringMetadata {
  lastUpdated: string; // ISO format
  updatedBy: string;
}

const SPREADSHEET_ID = "1j1pYuz0lOMjufxtOw2jxD-aPCBNlCi7y0Ymh6k3Sn_o";
const SHEET_NAME = "REKAP_SCRP";
const METADATA_RANGE = "REKAP_SCRP!B1124"; // Cell B1124

export function useMonitoringMetadata() {
  const [metadata, setMetadata] = useState<MonitoringMetadata | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Format: jj:mm WIB - dd/mm/yyyy
  const formatTimestamp = (isoString: string): string => {
    try {
      const date = new Date(isoString);
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      
      return `${hours}:${minutes} WIB - ${day}/${month}/${year}`;
    } catch (err) {
      return 'Invalid date';
    }
  };

  // Parse display format back to ISO
  const parseTimestamp = (displayFormat: string): string => {
    try {
      // Format: "jj:mm WIB - dd/mm/yyyy"
      const match = displayFormat.match(/(\d{2}):(\d{2}).*?(\d{2})\/(\d{2})\/(\d{4})/);
      if (!match) throw new Error('Invalid format');
      
      const [_, hours, minutes, day, month, year] = match;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes));
      
      return date.toISOString();
    } catch (err) {
      console.error('Error parsing timestamp:', err);
      return new Date().toISOString();
    }
  };

  // Fetch metadata dari B1124
  const fetchMetadata = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: SPREADSHEET_ID,
          operation: "read",
          range: METADATA_RANGE
        }
      });

      if (fetchError) {
        throw new Error(`Error fetching metadata: ${fetchError}`);
      }

      // Parse response
      if (data?.values && data.values.length > 0) {
        const cellValue = data.values[0][0];
        if (cellValue) {
          // Format: "lastUpdated|updatedBy"
          const parts = cellValue.split('|');
          const lastUpdated = parts[0]?.trim() || new Date().toISOString();
          const updatedBy = parts[1]?.trim() || 'System';
          
          setMetadata({ lastUpdated, updatedBy });
        }
      }
    } catch (err: any) {
      console.error('Error fetching monitoring metadata:', err);
      setError(err.message || 'Failed to fetch metadata');
    } finally {
      setLoading(false);
    }
  }, []);

  // Update metadata ke B1124
  const updateMetadata = useCallback(async (username: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const now = new Date().toISOString();
      const metadataValue = `${now}|${username}`;

      const { error: updateError } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: SPREADSHEET_ID,
          operation: "update",
          range: METADATA_RANGE,
          values: [[metadataValue]]
        }
      });

      if (updateError) {
        throw new Error(`Error updating metadata: ${updateError}`);
      }

      setMetadata({
        lastUpdated: now,
        updatedBy: username
      });

      return true;
    } catch (err: any) {
      console.error('Error updating monitoring metadata:', err);
      setError(err.message || 'Failed to update metadata');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    metadata,
    loading,
    error,
    fetchMetadata,
    updateMetadata,
    formatTimestamp,
    parseTimestamp
  };
}
