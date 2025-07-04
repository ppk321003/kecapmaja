
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

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
      
      // Set prefix based on document type
      let prefix: string;
      switch (documentType) {
        case "KerangkaAcuanKerja":
          prefix = "kak"; 
          break;
        case "DaftarHadir":
          prefix = "dh"; 
          break;
        case "SPJHonor":
          prefix = "spj"; 
          break;
        case "TransportLokal":
          prefix = "trl"; 
          break;
        case "UangHarianTransport":
          prefix = "uh";
          break;
        case "KuitansiPerjalananDinas":
          prefix = "kui";
          break;
        case "DokumenPengadaan":
          prefix = "pbj";
          break;
        case "TandaTerima":
          prefix = "tt";
          break;
        default:
          prefix = documentType.toLowerCase().slice(0, 2);
      }

      // Check the last ID from the database to increment
      try {
        const { data, error } = await supabase.functions.invoke('google-sheets', {
          body: {
            action: 'read',
            documentType: documentType,
            sheetName: documentType,
            range: 'A2:A1000' // Read the ID column to find the latest
          }
        });

        if (error) {
          console.warn("Warning reading document IDs:", error);
          // Continue with fallback ID generation
        }
        
        // Extract existing IDs
        const existingIds = data?.values?.map(row => row[0]) || [];
        
        // Find the highest counter
        let maxCounter = 0;
        const idPrefix = `${prefix}-${yy}${mm}`;
        
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
      } catch (error) {
        console.warn('Warning generating document ID from existing ids:', error);
        // Continue with fallback ID generation
      }
      
      // Fallback ID generation
      const randomPart = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      return `${prefix}-${yy}${mm}${randomPart}`;
    } catch (error: any) {
      console.error('Error generating document ID:', error);
      // Fallback ID generation if an error occurs
      const today = new Date();
      const yy = today.getFullYear().toString().slice(-2);
      const mm = (today.getMonth() + 1).toString().padStart(2, '0');
      const randomPart = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      
      // Set prefix based on document type for fallback
      let prefix: string;
      switch (documentType) {
        case "KerangkaAcuanKerja":
          prefix = "kak"; 
          break;
        case "DaftarHadir":
          prefix = "dh"; 
          break;
        case "SPJHonor":
          prefix = "spj"; 
          break;
        case "TransportLokal":
          prefix = "trl"; 
          break;
        case "UangHarianTransport":
          prefix = "uh";
          break;
        case "KuitansiPerjalananDinas":
          prefix = "kui";
          break;
        case "DokumenPengadaan":
          prefix = "pbj";
          break;
        case "TandaTerima":
          prefix = "tt";
          break;
        default:
          prefix = documentType.toLowerCase().slice(0, 2);
      }

      return `${prefix}-${yy}${mm}${randomPart}`;
    }
  },

  // Read data from Google Sheets
  async readData({ sheetName, range }: GoogleSheetsReadOptions) {
    try {
      const { data, error } = await supabase.functions.invoke('google-sheets', {
        body: {
          action: 'read',
          documentType: sheetName, // Add documentType parameter
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

  // Append data to Google Sheets - FIXED: now includes documentType
  async appendData({ sheetName, range, values }: GoogleSheetsWriteOptions) {
    try {
      console.log(`Appending data to ${sheetName}!${range}:`, values);
      
      // Add a delay to ensure any sheet creation has time to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const { data, error } = await supabase.functions.invoke('google-sheets', {
        body: {
          documentType: sheetName, // ADD THIS - documentType is required by edge function
          data: {
            // Format data structure expected by the edge function
            values: values
          }
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
          documentType: sheetName, // Add documentType parameter
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
