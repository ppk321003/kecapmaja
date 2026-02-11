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
    if (sheetId && user?.role === "Pejabat Pembuat Komitmen" && user?.satker === "3210") {
      loadKuitansi();
    } else {
      setIsLoading(false);
    }
  }, [sheetId, user?.role, user?.satker]);

  const loadKuitansi = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.functions.invoke(
        "google-sheets",
        {
          body: {
            action: "read",
            spreadsheetId: sheetId,
            range: "Sheet1!A:X",
          },
        }
      );

      if (error) {
        console.error("Error loading kuitansi:", error);
        toast.error("Gagal memuat data kuitansi");
        return;
      }

      if (data?.values && Array.isArray(data.values)) {
        const headers = data.values[0] || [
          "no_kuitansi",
          "penerima",
          "jumlah",
          "keterangan",
          "tanggal",
        ];
        const rows = data.values.slice(1);

        const formattedData: Kuitansi[] = rows.map((row: any[], idx: number) => {
          const obj: any = { id: `row_${idx}` };
          headers.forEach((header: string, colIdx: number) => {
            obj[header] = row[colIdx] || "";
          });
          return obj as Kuitansi;
        });

        // Add unique IDs based on no_kuitansi
        const uniqueData = formattedData.map((item, idx) => ({
          ...item,
          id:
            item.no_kuitansi ||
            `kuitansi_${Date.now()}_${idx}`,
        }));

        setKuitansiList(uniqueData);
      }
    } catch (error) {
      console.error("Error loading kuitansi:", error);
      toast.error("Gagal memuat data kuitansi");
    } finally {
      setIsLoading(false);
    }
  };

  const addKuitansi = async (data: Omit<Kuitansi, "id">) => {
    try {
      const newRow = [
        data.no_kuitansi,
        data.penerima,
        data.jumlah,
        data.keterangan || "",
        data.tanggal,
      ];

      const { error } = await supabase.functions.invoke("google-sheets", {
        body: {
          action: "append",
          spreadsheetId: sheetId,
          range: "Sheet1!A:E",
          values: [newRow],
        },
      });

      if (error) throw error;

      toast.success("Kuitansi berhasil dibuat");
      await loadKuitansi();
    } catch (error) {
      console.error("Error adding kuitansi:", error);
      toast.error("Gagal menyimpan kuitansi");
      throw error;
    }
  };

  const updateKuitansi = async (id: string, data: Partial<Kuitansi>) => {
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

      const rowIndex = kuitansiIndex + 2; // +1 for header, +1 for A1:E1

      const { error } = await supabase.functions.invoke("google-sheets", {
        body: {
          action: "update",
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
      toast.error("Gagal memperbarui kuitansi");
      throw error;
    }
  };

  const deleteKuitansi = async (id: string) => {
    try {
      const kuitansiIndex = kuitansiList.findIndex((k) => k.id === id);
      if (kuitansiIndex === -1) throw new Error("Kuitansi tidak ditemukan");

      // Since Google Sheets doesn't have a direct delete row function,
      // we'll clear the row instead
      const rowIndex = kuitansiIndex + 2;

      const { error } = await supabase.functions.invoke("google-sheets", {
        body: {
          action: "update",
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
      toast.error("Gagal menghapus kuitansi");
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
