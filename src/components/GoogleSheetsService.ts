
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
  // Generate an ID for document submissions based on document type
  generateDocumentId: async (documentType: string): Promise<string> => {
    try {
      const today = new Date();
      const yy = today.getFullYear().toString().slice(-2);
      const mm = (today.getMonth() + 1).toString().padStart(2, '0');
      
      // Check the last ID from the database to increment
      const { data, error } = await supabase.functions.invoke('google-sheets', {
        body: {
          action: 'read',
          sheetName: documentType,
          range: 'A2:A1000' // Read the ID column to find the latest
        }
      });

      if (error) {
        console.error("Error reading document IDs:", error);
        throw new Error(error.message);
      }
      
      // Extract existing IDs
      const existingIds = data?.values?.map(row => row[0]) || [];
      
      // Find the highest counter
      let maxCounter = 0;
      const idPrefix = `${documentType.toLowerCase()}-${yy}${mm}`;
      
      existingIds.forEach(id => {
        if (id && id.startsWith(idPrefix)) {
          const counterPart = id.substring(idPrefix.length);
          const counter = parseInt(counterPart, 10);
          if (!isNaN(counter) && counter > maxCounter) {
            maxCounter = counter;
          }
        }
      });
      
      // Generate new ID with incremented counter
      const newCounter = maxCounter + 1;
      return `${idPrefix}${newCounter.toString().padStart(3, '0')}`;
    } catch (error: any) {
      console.error('Error generating document ID:', error);
      // Fallback ID generation if an error occurs
      const today = new Date();
      const yy = today.getFullYear().toString().slice(-2);
      const mm = (today.getMonth() + 1).toString().padStart(2, '0');
      const randomPart = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      return `${documentType.toLowerCase()}-${yy}${mm}${randomPart}`;
    }
  },

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
