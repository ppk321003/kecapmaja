
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

interface GoogleSheetsReadOptions {
  sheetName: string;
  range: string;
}

interface GoogleSheetsWriteOptions {
  sheetName: string;
  range: string;
  values: any[][];
}

export const GoogleSheetsService = {
  // Read data from Google Sheets
  async readData({ sheetName, range }: GoogleSheetsReadOptions) {
    try {
      const { data, error } = await supabase.functions.invoke('google-sheets', {
        body: {
          action: 'read',
          sheetName,
          range
        }
      });

      if (error) {
        console.error("Error from Google Sheets function:", error);
        throw new Error(error.message);
      }

      return data;
    } catch (error: any) {
      console.error('Error reading data from Google Sheets:', error);
      throw error;
    }
  },

  // Append data to Google Sheets
  async appendData({ sheetName, range, values }: GoogleSheetsWriteOptions) {
    try {
      console.log(`Appending data to ${sheetName}!${range}:`, values);
      
      const { data, error } = await supabase.functions.invoke('google-sheets', {
        body: {
          action: 'append',
          sheetName,
          range,
          values
        }
      });

      if (error) {
        console.error("Error from Google Sheets function:", error);
        throw new Error(error.message);
      }

      return data;
    } catch (error: any) {
      console.error('Error appending data to Google Sheets:', error);
      throw error;
    }
  },

  // Update data in Google Sheets
  async updateData({ sheetName, range, values }: GoogleSheetsWriteOptions) {
    try {
      console.log(`Updating data in ${sheetName}!${range}:`, values);
      
      const { data, error } = await supabase.functions.invoke('google-sheets', {
        body: {
          action: 'update',
          sheetName,
          range,
          values
        }
      });

      if (error) {
        console.error("Error from Google Sheets function:", error);
        throw new Error(error.message);
      }

      return data;
    } catch (error: any) {
      console.error('Error updating data in Google Sheets:', error);
      throw error;
    }
  }
};
