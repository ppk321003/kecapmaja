import React, { createContext, useContext, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useSatkerConfig, SatkerConfig, getSheetIdBySatkerAndModule } from '@/hooks/use-satker-config';
import { useAuth } from './AuthContext';

interface SatkerConfigContextType {
  configs: SatkerConfig[] | undefined;
  isLoading: boolean;
  error: Error | null;
  /**
   * Dapatkan sheet ID untuk user's satker dan specific module
   */
  getUserSatkerSheetId: (module: 'pencairan' | 'pengadaan' | 'entrikegiatan' | 'tagging' | 'masterorganik' | 'perjalanan' | 'daftarhadir' | 'dokpengadaan' | 'kak' | 'kuiperjadin' | 'kuitranport' | 'lembur' | 'spjhonor' | 'sk' | 'super' | 'tandaterima' | 'spjtranslok' | 'uh' | 'linkers' | 'kecaptobendahara' | 'kuitansi' | 'bahanrevisi' | 'spkoutput' | 'pulsa' | 'aula' | 'suratdisposisi' | 'sitatan') => string | null;
  /**
   * Dapatkan satker config untuk user
   */
  getUserSatkerConfig: () => SatkerConfig | undefined;
}

const SatkerConfigContext = createContext<SatkerConfigContextType | null | undefined>(undefined);

export function SatkerConfigProvider({ children }: { children: React.ReactNode }) {
  const isPublicPortal = useLocation().pathname === '/portal-mitra';
  const { data: configs, isLoading, error } = useSatkerConfig(!isPublicPortal);
  const { user } = useAuth();

  const getUserSatkerSheetId = useCallback((module: 'pencairan' | 'pengadaan' | 'entrikegiatan' | 'tagging' | 'masterorganik' | 'perjalanan' | 'daftarhadir' | 'dokpengadaan' | 'kak' | 'kuiperjadin' | 'kuitranport' | 'lembur' | 'spjhonor' | 'sk' | 'super' | 'tandaterima' | 'spjtranslok' | 'uh' | 'linkers' | 'kecaptobendahara' | 'kuitansi' | 'bahanrevisi' | 'spkoutput' | 'pulsa' | 'aula' | 'suratdisposisi' | 'sitatan'): string | null => {
    if (!user || !user.satker || !configs) {
      console.log(`[SatkerConfigContext.getUserSatkerSheetId(${module})] Missing: user=${!!user}, satker=${user?.satker}, configs=${!!configs}`);
      return null;
    }
    const sheetId = getSheetIdBySatkerAndModule(configs, user.satker, module);
    console.log(`[SatkerConfigContext.getUserSatkerSheetId(${module})] user.satker=${user.satker}, found_sheetId=${!!sheetId}, sheetId=${sheetId ? sheetId.substring(0, 20) + '...' : 'NOT_FOUND'}`);
    return sheetId;
  }, [user, configs]);

  const getUserSatkerConfig = useCallback((): SatkerConfig | undefined => {
    if (!user || !user.satker || !configs) {
      return undefined;
    }
    return configs.find(c => c.satker_id === user.satker);
  }, [user, configs]);

  const contextValue = useMemo(() => ({
    configs: isPublicPortal ? undefined : configs,
    isLoading: isPublicPortal ? false : isLoading,
    error: error as Error | null,
    getUserSatkerSheetId,
    getUserSatkerConfig,
  }), [configs, isLoading, error, getUserSatkerSheetId, getUserSatkerConfig, isPublicPortal]);

  return (
    <SatkerConfigContext.Provider value={contextValue}>
      {children}
    </SatkerConfigContext.Provider>
  );
}

export function useSatkerConfigContext(): SatkerConfigContextType | null {
  const context = useContext(SatkerConfigContext);
  if (context === undefined) {
    console.warn('useSatkerConfigContext: Not within SatkerConfigProvider, returning null context');
    return null;
  }
  return context;
}
