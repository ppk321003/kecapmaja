import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface KuitansiStoreProfile {
  storageName: string;
  storeAddress: string;
  storePhone: string;
  storeEmail?: string;
  storeFooter?: string;
}

interface KuitansiStoreContextType {
  storeProfile: KuitansiStoreProfile;
  updateStoreProfile: (profile: KuitansiStoreProfile) => void;
}

const defaultStoreProfile: KuitansiStoreProfile = {
  storageName: "PPK Satker 3210",
  storeAddress: "Alamat Toko",
  storePhone: "No. Telepon",
  storeEmail: "",
  storeFooter: "Terima kasih atas kepercayaan Anda",
};

const KuitansiStoreContext = createContext<KuitansiStoreContextType | undefined>(
  undefined
);

export const KuitansiStoreProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();
  const [storeProfile, setStoreProfile] = useState<KuitansiStoreProfile>(
    defaultStoreProfile
  );

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("kuitansi_store_profile");
      if (saved) {
        setStoreProfile(JSON.parse(saved));
      }
    } catch (error) {
      console.error("Error loading store profile:", error);
    }
  }, []);

  const updateStoreProfile = (profile: KuitansiStoreProfile) => {
    try {
      setStoreProfile(profile);
      localStorage.setItem("kuitansi_store_profile", JSON.stringify(profile));
      toast.success("Pengaturan toko berhasil disimpan");
    } catch (error) {
      console.error("Error saving store profile:", error);
      toast.error("Gagal menyimpan pengaturan toko");
    }
  };

  return (
    <KuitansiStoreContext.Provider value={{ storeProfile, updateStoreProfile }}>
      {children}
    </KuitansiStoreContext.Provider>
  );
};

export const useKuitansiStore = () => {
  const context = useContext(KuitansiStoreContext);
  if (!context) {
    throw new Error("useKuitansiStore must be used within KuitansiStoreProvider");
  }
  return context;
};
