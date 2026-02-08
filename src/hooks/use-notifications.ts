import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSatkerConfigContext } from '@/contexts/SatkerConfigContext';
import { useNotificationsContext, NotificationsContextType } from '@/contexts/NotificationsContext';
import { Notification, PencairanNotification, SBMLNotification } from '@/types/notifications';

const POLLING_INTERVAL = 3600000; // 1 hour - polling interval
const MIN_REQUEST_INTERVAL = 60000; // 1 minute - minimum time between requests to debounce

export function useNotifications() {
  const { user } = useAuth();
  const satkerContext = useSatkerConfigContext();
  const notificationsContext = useNotificationsContext();
  const lastFetchRef = useRef<number>(0);
  const quotaExceededRef = useRef<boolean>(false);
  const hasInitialFetchRef = useRef<boolean>(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Get current user data
  const currentUser = user ? user : null;
  const userRole = currentUser?.role || '';
  const userSatker = currentUser?.satker || '';

  // Check if satker config is ready
  const satkerConfigReady = satkerContext?.configs && satkerContext.configs.length > 0;
  console.log(`[useNotifications] satkerContext ready: ${satkerConfigReady}, configs length: ${satkerContext?.configs?.length || 0}`);

  // Function to check if role matches target role
  const roleMatches = (userRole: string, targetRoles: string[]): boolean => {
    return targetRoles.some(targetRole => {
      if (targetRole.includes('Fungsi')) {
        return userRole.includes('Fungsi');
      }
      return userRole === targetRole;
    });
  };

  // Fetch Pencairan submissions and generate notifikasi
  const fetchPencairanNotifications = useCallback(async (): Promise<Notification[]> => {
    try {
      // Only fetch for current satker
      if (!userSatker) {
        console.log('[fetchPencairanNotifications] No satker');
        return [];
      }

      const pencairanSheetId = satkerContext?.getUserSatkerSheetId('pencairan') || '';
      console.log(`[fetchPencairanNotifications] userSatker=${userSatker}, sheetId=${pencairanSheetId ? 'found' : 'NOT_FOUND'}`);
      if (!pencairanSheetId) return [];

      console.log(`[fetchPencairanNotifications] Fetching from sheet...`);
      const { data, error } = await supabase.functions.invoke('google-sheets', {
        body: {
          spreadsheetId: pencairanSheetId,
          operation: 'read',
          range: 'data!A:N',
        },
      });

      if (error) {
        console.error('[fetchPencairanNotifications] Error:', error);
        return [];
      }

      console.log('[fetchPencairanNotifications] API response:', JSON.stringify(data, null, 2));
      
      // Check for quota exceeded error (429)
      if (data?.error?.code === 429) {
        console.warn('[fetchPencairanNotifications] Google Sheets API quota exceeded (429) - will backoff for 10 minutes');
        quotaExceededRef.current = true;
        return [];
      }
      
      if (!data?.values) {
        console.log('[fetchPencairanNotifications] No data returned - values is', data?.values);
        return [];
      }

      const rows = data.values;
      console.log(`[fetchPencairanNotifications] Retrieved ${rows.length} rows`);
      console.log(`[fetchPencairanNotifications] Raw headers:`, JSON.stringify(rows[0], null, 2));
      const headers = rows[0] || [];
      const notifs: Notification[] = [];

      // Column indices - Status Pengajuan is in column G (index 6)
      const idxStatus = 6; // Column G
      const idxJudul = headers.findIndex((h: string) => h?.toLowerCase().includes('uraian') || h?.toLowerCase().includes('judul') || h?.toLowerCase().includes('pengajuan'));
      const idxId = headers.findIndex((h: string) => h?.toLowerCase().includes('id'));
      const idxUpdateTime = headers.findIndex((h: string) => h?.toLowerCase().includes('update') || h?.toLowerCase().includes('waktu') || h?.toLowerCase().includes('terakhir'));

      console.log(`[fetchPencairanNotifications] Using fixed column indices - status:${idxStatus}(col G), judul:${idxJudul}, id:${idxId}, updateTime:${idxUpdateTime}`);

      // Collect all unique statuses found
      const allStatuses = new Set<string>();
      
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || !row[idxStatus]) continue;

        const status = row[idxStatus]?.toString().toLowerCase().trim();
        allStatuses.add(status);
        
        const judul = row[idxJudul]?.toString() || 'Pengajuan';
        const submissionId = row[idxId]?.toString() || `pencairan-${i}`;
        const updateTimeStr = row[idxUpdateTime]?.toString() || '';
        
        // Parse update time - try to convert to Date
        let updateTime = new Date();
        if (updateTimeStr) {
          const parsed = new Date(updateTimeStr);
          if (!isNaN(parsed.getTime())) {
            updateTime = parsed;
          }
        }

        let targetRoles: string[] = [];
        let message = '';

        // Map actual statuses to notification rules
        // incomplete_sm, incomplete_staff, incomplete_finance = incomplete, needs completion
        if (status?.includes('incomplete') || status === 'draft' || status === 'reject_bendahara') {
          targetRoles = ['Fungsi']; // Any role containing "Fungsi"
          message = `${judul} masih belum dilengkapi`;
        }
        // Pending at bendahara or rejected by PPK
        else if (status === 'pending_bendahara' || status === 'reject_ppk') {
          targetRoles = ['Bendahara'];
          message = `Tugas bendahara ${judul} harus diperiksa`;
        }
        // Pending at PPK or rejected by PPSPM
        else if (status === 'pending_ppk' || status === 'reject_ppspm') {
          targetRoles = ['PPK'];
          message = `${judul} untuk diperiksa`;
        }
        // Pending at PPSPM
        else if (status === 'pending_ppspm') {
          targetRoles = ['PPSPM'];
          message = `${judul} untuk diperiksa`;
        }
        // Sent to KPPN
        else if (status === 'sent_kppn') {
          targetRoles = ['Arsip'];
          message = `${judul} untuk di arsipkan`;
        }

        if (targetRoles.length > 0) {
          const matches = roleMatches(userRole, targetRoles);
          console.log(`[fetchPencairanNotifications] Row ${i}: status=${status}, judul=${judul}, targetRoles=${targetRoles}, userRole=${userRole}, matches=${matches}`);
          
          if (matches) {
            const notif: PencairanNotification = {
              id: `pencairan-${submissionId}`,
              type: 'pencairan',
              title: 'Pencairan - Pengajuan Baru',
              message,
              priority: status === 'pending_ppspm' ? 'high' : 'medium',
              targetRoles,
              relatedId: submissionId,
              status: status as any,
              createdAt: updateTime,
              judulPengajuan: judul,
              submissionStatus: status as any,
              actionUrl: '/usulan-pencairan',
            };
            notifs.push(notif);
            console.log(`[fetchPencairanNotifications] Added notification: ${notif.id}`);
          }
        }
      }

      console.log(`[fetchPencairanNotifications] All statuses found in sheet:`, Array.from(allStatuses));
      console.log(`[fetchPencairanNotifications] Total notifications: ${notifs.length}`);
      return notifs;
    } catch (error) {
      console.error('Error fetching pencairan notifications:', error);
      return [];
    }
  }, [satkerContext, userRole, userSatker]);

  // Fetch SBML & SPK-BAST data and generate notifikasi
  const fetchSBMLNotifications = useCallback(async (): Promise<Notification[]> => {
    try {
      // Only fetch for current satker
      if (!userSatker) {
        console.log('[fetchSBMLNotifications] No satker');
        return [];
      }

      // Check if user is in excluded roles
      if (userRole === 'PPSPM' || userRole === 'PPK' || userRole === 'Arsip') {
        console.log(`[fetchSBMLNotifications] User role ${userRole} is excluded`);
        return [];
      }

      const spkBastSheetId = satkerContext?.getUserSatkerSheetId('entrikegiatan') || '';
      console.log(`[fetchSBMLNotifications] userSatker=${userSatker}, sheetId=${spkBastSheetId ? 'found' : 'NOT_FOUND'}`);
      if (!spkBastSheetId) return [];

      const notifs: Notification[] = [];

      // Fetch signature data from Sheet1
      console.log(`[fetchSBMLNotifications] Fetching TTD data from Sheet1...`);
      const { data: sbmlData, error: sbmlError } = await supabase.functions.invoke('google-sheets', {
        body: {
          spreadsheetId: spkBastSheetId,
          operation: 'read',
          range: 'Sheet1!A:Z',
        },
      });

      if (sbmlError) {
        console.error('[fetchSBMLNotifications] SBML Error:', sbmlError);
      } else if (sbmlData?.error?.code === 429) {
        console.warn('[fetchSBMLNotifications] Google Sheets API quota exceeded (429) - will backoff for 10 minutes');
        quotaExceededRef.current = true;
        // Early return to avoid further API calls when quota is exceeded
        console.log('[fetchSBMLNotifications] Total SBML notifications: 0 (quota exceeded)');
        return notifs;
      } else if (!sbmlData?.values) {
        console.log('[fetchSBMLNotifications] No SBML data returned - values is', sbmlData?.values);
        console.log('[fetchSBMLNotifications] SBML API response:', JSON.stringify(sbmlData, null, 2));
      } else {
        const rows = sbmlData.values;
        console.log(`[fetchSBMLNotifications] Retrieved ${rows.length} SBML rows`);
        console.log(`[fetchSBMLNotifications] SBML raw data:`, JSON.stringify(rows.slice(0, 5), null, 2));
        const headers = rows[0] || [];

        const idxNama = headers.findIndex((h: string) => h?.toLowerCase().includes('nama'));
        const idxStatus = headers.findIndex((h: string) => h?.toLowerCase().includes('status') && !h?.toLowerCase().includes('ttd'));
        const idxTtd = headers.findIndex((h: string) => h?.toLowerCase().includes('status ttd') || h?.toLowerCase().includes('status') && h?.toLowerCase().includes('ttd'));
        const idxPeriode = headers.findIndex((h: string) => h?.toLowerCase().includes('periode') || h?.toLowerCase().includes('bulan'));

        console.log(`[fetchSBMLNotifications] Header indices - nama:${idxNama}, status:${idxStatus}, ttd:${idxTtd}, periode:${idxPeriode}`);

        // Collect all unique TTD statuses found
        const allTtdStatuses = new Set<string>();

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || !row[idxNama]) continue;

          const nama = row[idxNama]?.toString() || '';
          const status = row[idxStatus]?.toString().toLowerCase().trim();
          const ttdRaw = row[idxTtd]?.toString().toLowerCase().trim();
          const periode = row[idxPeriode]?.toString() || new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

          // Handle pipe-separated values (multiple signers) - extract unique statuses
          const ttdStatuses = ttdRaw?.split('|').map(s => s.trim()) || [];
          ttdStatuses.forEach(t => allTtdStatuses.add(t));

          // Check if ANY of the TTD statuses indicate not signed yet
          // Matches: "belum", "tidak", "belum ditandatangani", "tidak ditandatangani"
          const hasPendingTtd = ttdStatuses.some(t => 
            t.includes('belum') || t.includes('tidak') || status?.includes('belum ttd')
          );
          
          if (hasPendingTtd) {
            console.log(`[fetchSBMLNotifications] SBML Row ${i}: nama=${nama}, ttd=${ttdRaw}, periode=${periode}`);
            const notif: SBMLNotification = {
              id: `sbml-${i}-${nama}`,
              type: 'sbml_spk',
              title: 'SPK-BAST - Tanda Tangan Dibutuhkan',
              message: `${nama} belum ttd SPK BAST ${periode}`,
              priority: 'high',
              targetRoles: [], // Will be checked at user level
              relatedId: `${nama}-${periode}`,
              createdAt: new Date(),
              namaPetugas: nama,
              periode,
              sheetName: 'Cek SBML',
              actionUrl: '/spk-bast/entri-sbml',
            };
            notifs.push(notif);
            console.log(`[fetchSBMLNotifications] Added SBML notification: ${notif.id}`);
          }
        }
        
        console.log(`[fetchSBMLNotifications] All TTD statuses found in SBML:`, Array.from(allTtdStatuses));
      }

      // Fetch Rekap SPK-BAST data (reuse Sheet1 data from above)
      console.log(`[fetchSBMLNotifications] Reusing Sheet1 data for rekap analysis...`);
      const rekapData = sbmlData; // Reuse the same data to reduce API calls
      const rekapError = sbmlError;

      if (rekapError) {
        console.error('[fetchSBMLNotifications] Rekap Error:', rekapError);
      } else if (rekapData?.error?.code === 429) {
        console.warn('[fetchSBMLNotifications] Google Sheets API quota exceeded (429) - will backoff for 10 minutes');
        quotaExceededRef.current = true;
        // Early return when quota is exceeded
        console.log('[fetchSBMLNotifications] Total SBML notifications: 0 (quota exceeded)');
        return notifs;
      } else if (!rekapData?.values) {
        console.log('[fetchSBMLNotifications] No Rekap data returned - values is', rekapData?.values);
        console.log('[fetchSBMLNotifications] Rekap API response:', JSON.stringify(rekapData, null, 2));
      } else {
        const rows = rekapData.values;
        console.log(`[fetchSBMLNotifications] Retrieved ${rows.length} Rekap rows`);
        console.log(`[fetchSBMLNotifications] Rekap raw data:`, JSON.stringify(rows.slice(0, 5), null, 2));
        const headers = rows[0] || [];

        const idxNama = headers.findIndex((h: string) => h?.toLowerCase().includes('nama'));
        const idxStatus = headers.findIndex((h: string) => h?.toLowerCase().includes('status') && !h?.toLowerCase().includes('ttd'));
        const idxTtd = headers.findIndex((h: string) => h?.toLowerCase().includes('status ttd') || h?.toLowerCase().includes('status') && h?.toLowerCase().includes('ttd'));
        const idxPeriode = headers.findIndex((h: string) => h?.toLowerCase().includes('periode') || h?.toLowerCase().includes('bulan'));

        console.log(`[fetchSBMLNotifications] Rekap header indices - nama:${idxNama}, status:${idxStatus}, ttd:${idxTtd}, periode:${idxPeriode}`);

        // Collect all unique TTD statuses found
        const allRekCapTtdStatuses = new Set<string>();

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || !row[idxNama]) continue;

          const nama = row[idxNama]?.toString() || '';
          const status = row[idxStatus]?.toString().toLowerCase().trim();
          const ttdRaw = row[idxTtd]?.toString().toLowerCase().trim();
          const periode = row[idxPeriode]?.toString() || new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

          // Handle pipe-separated values (multiple signers) - extract unique statuses
          const ttdStatuses = ttdRaw?.split('|').map(s => s.trim()) || [];
          ttdStatuses.forEach(t => allRekCapTtdStatuses.add(t));

          // Check if ANY of the TTD statuses indicate not signed yet
          // Matches: "belum", "tidak", "belum ditandatangani", "tidak ditandatangani"
          const hasPendingTtd = ttdStatuses.some(t => 
            t.includes('belum') || t.includes('tidak') || status?.includes('belum ttd')
          );
          
          if (hasPendingTtd) {
            console.log(`[fetchSBMLNotifications] Rekap Row ${i}: nama=${nama}, ttd=${ttdRaw}, periode=${periode}`);
            const notif: SBMLNotification = {
              id: `rekap-${i}-${nama}`,
              type: 'sbml_spk',
              title: 'SPK-BAST - Tanda Tangan Dibutuhkan',
              message: `${nama} belum ttd SPK BAST ${periode}`,
              priority: 'high',
              targetRoles: [],
              relatedId: `${nama}-${periode}`,
              createdAt: new Date(),
              namaPetugas: nama,
              periode,
              sheetName: 'Rekap SPK-BAST',
              actionUrl: '/spk-bast/rekap-spk',
            };
            notifs.push(notif);
            console.log(`[fetchSBMLNotifications] Added Rekap notification: ${notif.id}`);
          }
        }
        
        console.log(`[fetchSBMLNotifications] All TTD statuses found in Rekap:`, Array.from(allRekCapTtdStatuses));
      }

      console.log(`[fetchSBMLNotifications] Total SBML notifications: ${notifs.length}`);
      return notifs;
    } catch (error) {
      console.error('Error fetching SBML notifications:', error);
      return [];
    }
  }, [satkerContext, userRole, userSatker]);

  // Main fetch function
  const fetchAllNotifications = useCallback(async () => {
    console.log(`[fetchAllNotifications] Starting - currentUser=${!!currentUser}, userSatker=${userSatker}, satkerConfigReady=${satkerConfigReady}`);
    if (!currentUser || !userSatker || !satkerConfigReady) {
      console.log('[fetchAllNotifications] Skipping - no currentUser, userSatker, or satkerConfig not ready');
      return;
    }

    try {
      const pencairanNotifs = await fetchPencairanNotifications();
      console.log(`[fetchAllNotifications] Pencairan: ${pencairanNotifs.length} notifications`);
      
      const sbmlNotifs = await fetchSBMLNotifications();
      console.log(`[fetchAllNotifications] SBML: ${sbmlNotifs.length} notifications`);
      
      const allNotifs = [...pencairanNotifs, ...sbmlNotifs];
      console.log(`[fetchAllNotifications] Total: ${allNotifs.length} notifications to set`);
      
      notificationsContext._setNotifications(allNotifs);
      console.log(`[fetchAllNotifications] Notifications updated in context`);
    } catch (error) {
      console.error('Error in fetchAllNotifications:', error);
    }
  }, [currentUser, userSatker, userRole, satkerConfigReady, notificationsContext, fetchPencairanNotifications, fetchSBMLNotifications]);

  // Fetch notifications on page load and set up polling every 1 hour
  useEffect(() => {
    console.log(`[useNotifications] Effect triggered - currentUser=${!!currentUser}, userSatker=${userSatker}, satkerConfigReady=${satkerConfigReady}`);
    
    if (!currentUser || !userSatker || !satkerConfigReady) {
      console.log('[useNotifications] Skipping - no currentUser, userSatker, or satkerConfig not ready');
      return;
    }

    // Only fetch once on initial mount + config ready
    if (!hasInitialFetchRef.current) {
      console.log('[useNotifications] Initial fetch on config ready');
      hasInitialFetchRef.current = true;
      fetchAllNotifications();
    }

    // Set up polling interval - every 1 hour (only if not already set)
    if (!pollIntervalRef.current) {
      console.log('[useNotifications] Starting polling interval - 1 hour');
      pollIntervalRef.current = setInterval(() => {
        console.log('[useNotifications] Polling interval triggered - fetching...');
        fetchAllNotifications();
      }, POLLING_INTERVAL);
    }

    // Cleanup on unmount
    return () => {
      console.log('[useNotifications] Cleanup on unmount');
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
    
  }, [satkerConfigReady]); // Only depend on satkerConfigReady to prevent infinite loops
}
