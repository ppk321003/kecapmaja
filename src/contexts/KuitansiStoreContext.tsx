import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface KuitansiStoreProfile {
  id: string;
  storageName: string;
  storeAddress: string;
  storePhone: string;
  storeEmail?: string;
  storeFooter?: string;
  storeLogoId: string;
  storeType: "compact" | "professional";
}

interface KuitansiStoreContextType {
  storeProfile: KuitansiStoreProfile;
  availableStores: KuitansiStoreProfile[];
  activeStoreId: string;
  updateStoreProfile: (profile: Partial<KuitansiStoreProfile>) => void;
  switchStore: (storeId: string) => void;
  isLoading: boolean;
}

export const defaultKuitansiStores: KuitansiStoreProfile[] = [
  {
    id: "adreena-store",
    storageName: "Adreena Store",
    storeAddress: "Alamat Adreena Store",
    storePhone: "No. Telepon Adreena",
    storeEmail: "",
    storeFooter: "Terima kasih atas kepercayaan Anda",
    storeLogoId: "7c3e6dd6-4c74-4738-a182-0aa8daefc1d9",
    storeType: "compact",
  },
  {
    id: "alzena-point",
    storageName: "Alzena Point",
    storeAddress: "Jl. Pahlawan No.12, Majalengka",
    storePhone: "085351881777",
    storeEmail: "",
    storeFooter: "Terima kasih telah berbelanja di Alzena Point",
    storeLogoId: "fbf25b87-5923-42c4-a574-1fc45fe58e7c",
    storeType: "professional",
  },
];

const KuitansiStoreContext = createContext<KuitansiStoreContextType | undefined>(
  undefined
);

export const KuitansiStoreProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();
  const [availableStores, setAvailableStores] = useState<KuitansiStoreProfile[]>(
    defaultKuitansiStores
  );
  const [activeStoreId, setActiveStoreId] = useState<string>("adreena-store");
  const [isLoading, setIsLoading] = useState(true);

  const storeProfile =
    availableStores.find((store) => store.id === activeStoreId) ||
    availableStores[0];

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const storedStores = localStorage.getItem("kuitansi_available_stores");
      const storedActiveStoreId = localStorage.getItem("kuitansi_active_store_id");

      if (storedStores) {
        setAvailableStores(JSON.parse(storedStores));
      }

      if (storedActiveStoreId) {
        setActiveStoreId(storedActiveStoreId);
      }
    } catch (error) {
      console.error("Error loading store configuration:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateStoreProfile = (profile: Partial<KuitansiStoreProfile>) => {
    try {
      const updatedStores = availableStores.map((store) =>
        store.id === activeStoreId ? { ...store, ...profile } : store
      );

      setAvailableStores(updatedStores);
      localStorage.setItem(
        "kuitansi_available_stores",
        JSON.stringify(updatedStores)
      );
      toast.success("Pengaturan toko berhasil disimpan");
    } catch (error) {
      console.error("Error saving store profile:", error);
      toast.error("Gagal menyimpan pengaturan toko");
    }
  };

  const switchStore = (storeId: string) => {
    if (availableStores.some((store) => store.id === storeId)) {
      setActiveStoreId(storeId);
      localStorage.setItem("kuitansi_active_store_id", storeId);
      console.log("Switched to store:", storeId);
    }
  };

  return (
    <KuitansiStoreContext.Provider
      value={{
        storeProfile,
        availableStores,
        activeStoreId,
        updateStoreProfile,
        switchStore,
        isLoading,
      }}
    >
      {children}
    </KuitansiStoreContext.Provider>
  );
};

export const useKuitansiStore = (): KuitansiStoreContextType => {
  const context = useContext(KuitansiStoreContext);
  if (!context) {
    throw new Error(
      "useKuitansiStore must be used within KuitansiStoreProvider"
    );
  }
  return context;
};
