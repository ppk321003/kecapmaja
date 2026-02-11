import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSatkerConfigContext } from "@/contexts/SatkerConfigContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export interface Kuitansi {
  [key: string]: any;
  no_kuitansi: string;
  penerima: string;
  jumlah: string;
  keterangan?: string;
  tanggal: string;
  id?: string;
}

interface KuitansiContextType {
  kuitansiList: Kuitansi[];
  addKuitansi: (data: Omit<Kuitansi, "id">) => Promise<void>;
  updateKuitansi: (id: string, data: Partial<Kuitansi>) => Promise<void>;
  deleteKuitansi: (id: string) => Promise<void>;
  getKuitansi: (id: string) => Kuitansi | undefined;
  isLoading: boolean;
  refetch: () => Promise<void>;
}

const KuitansiContext = createContext<KuitansiContextType | undefined>(undefined);

export const KuitansiProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();
  const satkerContext = useSatkerConfigContext();
  const [kuitansiList, setKuitansiList] = useState<Kuitansi[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const sheetId = satkerContext?.configs?.find(
    (c: any) => c.satker_id === "3210"
  )?.kuitansi_sheet_id;

  // Load kuitansi from Google Sheets on mount
  useEffect(() => {
    if (!sheetId) {
      console.warn("KuitansiProvider: sheetId not available");
      setIsLoading(false);
      return;
    }
    if (user?.role === "Pejabat Pembuat Komitmen" && user?.satker === "3210") {
      console.log("KuitansiProvider: Loading kuitansi");
      loadKuitansi();
    } else {
      console.warn("KuitansiProvider: User not authorized");
      setIsLoading(false);
    }
  }, [sheetId, user?.role, user?.satker]);

  const loadKuitansi = async () => {
    if (!sheetId) {
      console.warn("sheetId not available");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      console.log("Loading kuitansi from sheet:", sheetId);
      
      const { data, error } = await supabase.functions.invoke(
        "google-sheets",
        {
          body: {
            operation: "read",
            spreadsheetId: sheetId,
            range: "Sheet1!A1:E1000",
          },
        }
      );

      if (error) {
        console.error("Error loading kuitansi:", error);
        toast.error("Gagal memuat data kuitansi: " + (error.message || "Unknown error"));
        return;
      }

      if (!data?.values || !Array.isArray(data.values) || data.values.length === 0) {
        console.log("No data found in sheet");
        setKuitansiList([]);
        return;
      }

      const headers = data.values[0] || [
        "no_kuitansi",
        "penerima",
        "jumlah",
        "keterangan",
        "tanggal",
      ];
      const rows = data.values.slice(1).filter((row: any[]) => row.length > 0 && row.some((cell: any) => cell));

      const formattedData: Kuitansi[] = rows.map((row: any[], idx: number) => {
        const obj: any = { id: `${row[0] || `row_${idx}`}` };
        headers.forEach((header: string, colIdx: number) => {
          obj[header] = row[colIdx] || "";
        });
        return obj as Kuitansi;
      });

      console.log("Loaded kuitansi:", formattedData.length, "items");
      setKuitansiList(formattedData);
    } catch (error) {
      console.error("Error loading kuitansi:", error);
      toast.error("Gagal memuat data kuitansi");
    } finally {
      setIsLoading(false);
    }
  };

  const addKuitansi = async (data: Omit<Kuitansi, "id">) => {
    if (!sheetId) {
      toast.error("Sheet ID tidak tersedia");
      throw new Error("Sheet ID not available");
    }

    try {
      const newRow = [
        data.no_kuitansi,
        data.penerima,
        data.jumlah,
        data.keterangan || "",
        data.tanggal,
      ];

      console.log("Adding kuitansi:", newRow, "to sheet:", sheetId);

      const { data: result, error } = await supabase.functions.invoke("google-sheets", {
        body: {
          operation: "append",
          spreadsheetId: sheetId,
          range: "Sheet1!A:E",
          values: [newRow],
        },
      });

      if (error) {
        console.error("Append error:", error);
        throw error;
      }

      console.log("Append result:", result);
      toast.success("Kuitansi berhasil dibuat");
      await loadKuitansi();
    } catch (error) {
      console.error("Error adding kuitansi:", error);
      toast.error("Gagal menyimpan kuitansi: " + (error instanceof Error ? error.message : "Unknown error"));
      throw error;
    }
  };

  const updateKuitansi = async (id: string, data: Partial<Kuitansi>) => {
    if (!sheetId) {
      toast.error("Sheet ID tidak tersedia");
      throw new Error("Sheet ID not available");
    }

    try {
      const kuitansiIndex = kuitansiList.findIndex((k) => k.id === id);
      if (kuitansiIndex === -1) throw new Error("Kuitansi tidak ditemukan");

      const updatedKuitansi = {
        ...kuitansiList[kuitansiIndex],
        ...data,
      };

      const newRow = [
        updatedKuitansi.no_kuitansi,
        updatedKuitansi.penerima,
        updatedKuitansi.jumlah,
        updatedKuitansi.keterangan || "",
        updatedKuitansi.tanggal,
      ];

      const rowIndex = kuitansiIndex + 2;

      console.log("Updating kuitansi at row:", rowIndex, "with:", newRow);

      const { error } = await supabase.functions.invoke("google-sheets", {
        body: {
          operation: "update",
          spreadsheetId: sheetId,
          range: `Sheet1!A${rowIndex}:E${rowIndex}`,
          values: [newRow],
        },
      });

      if (error) throw error;

      toast.success("Kuitansi berhasil diperbarui");
      await loadKuitansi();
    } catch (error) {
      console.error("Error updating kuitansi:", error);
      toast.error("Gagal memperbarui kuitansi: " + (error instanceof Error ? error.message : "Unknown error"));
      throw error;
    }
  };

  const deleteKuitansi = async (id: string) => {
    if (!sheetId) {
      toast.error("Sheet ID tidak tersedia");
      throw new Error("Sheet ID not available");
    }

    try {
      const kuitansiIndex = kuitansiList.findIndex((k) => k.id === id);
      if (kuitansiIndex === -1) throw new Error("Kuitansi tidak ditemukan");

      const rowIndex = kuitansiIndex + 2;

      console.log("Deleting kuitansi at row:", rowIndex);

      const { error } = await supabase.functions.invoke("google-sheets", {
        body: {
          operation: "update",
          spreadsheetId: sheetId,
          range: `Sheet1!A${rowIndex}:E${rowIndex}`,
          values: [["", "", "", "", ""]],
        },
      });

      if (error) throw error;

      toast.success("Kuitansi berhasil dihapus");
      await loadKuitansi();
    } catch (error) {
      console.error("Error deleting kuitansi:", error);
      toast.error("Gagal menghapus kuitansi: " + (error instanceof Error ? error.message : "Unknown error"));
      throw error;
    }
  };

  const getKuitansi = (id: string): Kuitansi | undefined => {
    return kuitansiList.find((k) => k.id === id);
  };

  const refetch = async () => {
    await loadKuitansi();
  };

  return (
    <KuitansiContext.Provider
      value={{
        kuitansiList,
        addKuitansi,
        updateKuitansi,
        deleteKuitansi,
        getKuitansi,
        isLoading,
        refetch,
      }}
    >
      {children}
    </KuitansiContext.Provider>
  );
};

export const useKuitansi = () => {
  const context = useContext(KuitansiContext);
  if (!context) {
    throw new Error("useKuitansi must be used within KuitansiProvider");
  }
  return context;
};
