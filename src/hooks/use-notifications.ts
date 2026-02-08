import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSatkerConfigContext } from '@/contexts/SatkerConfigContext';
import { useNotificationsContext, NotificationsContextType } from '@/contexts/NotificationsContext';
import { Notification, PencairanNotification, SBMLNotification } from '@/types/notifications';

const POLLING_INTERVAL = 30000; // 30 seconds

export function useNotifications() {
  const { user } = useAuth();
  const satkerContext = useSatkerConfigContext();
  const notificationsContext = useNotificationsContext();
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
          range: 'Pengajuan!A:N',
        },
      });

      if (error) {
        console.error('[fetchPencairanNotifications] Error:', error);
        return [];
      }

      console.log('[fetchPencairanNotifications] API response:', JSON.stringify(data, null, 2));
      
      if (!data?.values) {
        console.log('[fetchPencairanNotifications] No data returned - values is', data?.values);
        return [];
      }

      const rows = data.values;
      console.log(`[fetchPencairanNotifications] Retrieved ${rows.length} rows`);
      console.log(`[fetchPencairanNotifications] Raw headers:`, JSON.stringify(rows[0], null, 2));
      const headers = rows[0] || [];
      const notifs: Notification[] = [];

      // Column indices
      const idxStatus = headers.findIndex((h: string) => h?.toLowerCase().includes('status'));
      const idxJudul = headers.findIndex((h: string) => h?.toLowerCase().includes('uraian') || h?.toLowerCase().includes('judul'));
      const idxId = headers.findIndex((h: string) => h?.toLowerCase().includes('id'));

      console.log(`[fetchPencairanNotifications] Header indices - status:${idxStatus}, judul:${idxJudul}, id:${idxId}`);

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || !row[idxStatus]) continue;

        const status = row[idxStatus]?.toString().toLowerCase().trim();
        const judul = row[idxJudul]?.toString() || 'Pengajuan';
        const submissionId = row[idxId]?.toString() || `pencairan-${i}`;

        let targetRoles: string[] = [];
        let message = '';

        // Draft or rejected by bendahara
        if (status === 'draft' || status === 'reject_bendahara') {
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
              createdAt: new Date(),
              judulPengajuan: judul,
              submissionStatus: status as any,
              actionUrl: '/usulan-pencairan',
            };
            notifs.push(notif);
            console.log(`[fetchPencairanNotifications] Added notification: ${notif.id}`);
          }
        }
      }

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

      // Fetch Cek SBML sheet
      console.log(`[fetchSBMLNotifications] Fetching Cek SBML...`);
      const { data: sbmlData, error: sbmlError } = await supabase.functions.invoke('google-sheets', {
        body: {
          spreadsheetId: spkBastSheetId,
          operation: 'read',
          range: 'Cek SBML!A:F',
        },
      });

      if (sbmlError) {
        console.error('[fetchSBMLNotifications] SBML Error:', sbmlError);
      } else if (!sbmlData?.values) {
        console.log('[fetchSBMLNotifications] No SBML data returned - values is', sbmlData?.values);
        console.log('[fetchSBMLNotifications] SBML API response:', JSON.stringify(sbmlData, null, 2));
      } else {
        const rows = sbmlData.values;
        console.log(`[fetchSBMLNotifications] Retrieved ${rows.length} SBML rows`);
        console.log(`[fetchSBMLNotifications] SBML raw data:`, JSON.stringify(rows.slice(0, 5), null, 2));
        const headers = rows[0] || [];

        const idxNama = headers.findIndex((h: string) => h?.toLowerCase().includes('nama') || h?.toLowerCase().includes('petugas'));
        const idxStatus = headers.findIndex((h: string) => h?.toLowerCase().includes('status'));
        const idxTtd = headers.findIndex((h: string) => h?.toLowerCase().includes('ttd'));
        const idxPeriode = headers.findIndex((h: string) => h?.toLowerCase().includes('periode') || h?.toLowerCase().includes('bulan'));

        console.log(`[fetchSBMLNotifications] Header indices - nama:${idxNama}, status:${idxStatus}, ttd:${idxTtd}, periode:${idxPeriode}`);

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || !row[idxNama]) continue;

          const nama = row[idxNama]?.toString() || '';
          const status = row[idxStatus]?.toString().toLowerCase().trim();
          const ttd = row[idxTtd]?.toString().toLowerCase().trim();
          const periode = row[idxPeriode]?.toString() || new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

          // Check if status indicates not signed yet
          if (ttd === 'belum' || ttd === 'tidak' || status === 'belum ttd') {
            console.log(`[fetchSBMLNotifications] SBML Row ${i}: nama=${nama}, ttd=${ttd}, periode=${periode}`);
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
      }

      // Fetch Rekap SPK-BAST sheet
      console.log(`[fetchSBMLNotifications] Fetching Rekap SPK-BAST...`);
      const { data: rekapData, error: rekapError } = await supabase.functions.invoke('google-sheets', {
        body: {
          spreadsheetId: spkBastSheetId,
          operation: 'read',
          range: 'Rekap SPK-BAST!A:F',
        },
      });

      if (rekapError) {
        console.error('[fetchSBMLNotifications] Rekap Error:', rekapError);
      } else if (!rekapData?.values) {
        console.log('[fetchSBMLNotifications] No Rekap data returned - values is', rekapData?.values);
        console.log('[fetchSBMLNotifications] Rekap API response:', JSON.stringify(rekapData, null, 2));
      } else {
        const rows = rekapData.values;
        console.log(`[fetchSBMLNotifications] Retrieved ${rows.length} Rekap rows`);
        console.log(`[fetchSBMLNotifications] Rekap raw data:`, JSON.stringify(rows.slice(0, 5), null, 2));
        const headers = rows[0] || [];

        const idxNama = headers.findIndex((h: string) => h?.toLowerCase().includes('nama') || h?.toLowerCase().includes('petugas'));
        const idxStatus = headers.findIndex((h: string) => h?.toLowerCase().includes('status'));
        const idxTtd = headers.findIndex((h: string) => h?.toLowerCase().includes('ttd'));
        const idxPeriode = headers.findIndex((h: string) => h?.toLowerCase().includes('periode') || h?.toLowerCase().includes('bulan'));

        console.log(`[fetchSBMLNotifications] Rekap header indices - nama:${idxNama}, status:${idxStatus}, ttd:${idxTtd}, periode:${idxPeriode}`);

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || !row[idxNama]) continue;

          const nama = row[idxNama]?.toString() || '';
          const status = row[idxStatus]?.toString().toLowerCase().trim();
          const ttd = row[idxTtd]?.toString().toLowerCase().trim();
          const periode = row[idxPeriode]?.toString() || new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

          // Check if status indicates not signed yet
          if (ttd === 'belum' || ttd === 'tidak' || status === 'belum ttd') {
            console.log(`[fetchSBMLNotifications] Rekap Row ${i}: nama=${nama}, ttd=${ttd}, periode=${periode}`);
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

  // Setup polling
  useEffect(() => {
    console.log(`[useNotifications] Setup polling - currentUser=${!!currentUser}, userSatker=${userSatker}, satkerConfigReady=${satkerConfigReady}`);
    if (!currentUser || !userSatker || !satkerConfigReady) {
      console.log('[useNotifications] Skipping polling - no currentUser, userSatker, or satkerConfig not ready');
      return;
    }

    // Fetch immediately
    console.log('[useNotifications] Polling started - calling fetchAllNotifications immediately');
    fetchAllNotifications();

    // Set up polling - every 30 seconds (when page is active)
    console.log('[useNotifications] Setting interval for polling every 30 seconds');
    pollIntervalRef.current = setInterval(() => {
      console.log('[useNotifications] Polling interval triggered');
      fetchAllNotifications();
    }, POLLING_INTERVAL);

    return () => {
      console.log('[useNotifications] Cleaning up polling interval');
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [currentUser, userSatker, satkerConfigReady, fetchAllNotifications]);
}
