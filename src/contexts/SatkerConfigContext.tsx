import React, { createContext, useContext } from 'react';
import { useSatkerConfig, SatkerConfig, getSheetIdBySatkerAndModule } from '@/hooks/use-satker-config';
import { useAuth } from './AuthContext';

interface SatkerConfigContextType {
  configs: SatkerConfig[] | undefined;
  isLoading: boolean;
  error: Error | null;
  /**
   * Dapatkan sheet ID untuk user's satker dan specific module
   */
  getUserSatkerSheetId: (module: 'pencairan' | 'pengadaan' | 'entrikegiatan' | 'tagging') => string | null;
  /**
   * Dapatkan satker config untuk user
   */
  getUserSatkerConfig: () => SatkerConfig | undefined;
}

const SatkerConfigContext = createContext<SatkerConfigContextType | undefined>(undefined);

export function SatkerConfigProvider({ children }: { children: React.ReactNode }) {
  const { data: configs, isLoading, error } = useSatkerConfig();
  const { user } = useAuth();

  const getUserSatkerSheetId = (module: 'pencairan' | 'pengadaan' | 'entrikegiatan' | 'tagging'): string | null => {
    if (!user || !user.satker || !configs) {
      return null;
    }
    return getSheetIdBySatkerAndModule(configs, user.satker, module);
  };

  const getUserSatkerConfig = (): SatkerConfig | undefined => {
    if (!user || !user.satker || !configs) {
      return undefined;
    }
    return configs.find(c => c.satker_id === user.satker);
  };

  return (
    <SatkerConfigContext.Provider
      value={{
        configs,
        isLoading,
        error: error as Error | null,
        getUserSatkerSheetId,
        getUserSatkerConfig,
      }}
    >
      {children}
    </SatkerConfigContext.Provider>
  );
}

export function useSatkerConfigContext() {
  const context = useContext(SatkerConfigContext);
  if (context === undefined) {
    throw new Error('useSatkerConfigContext must be used within a SatkerConfigProvider');
  }
  return context;
}
