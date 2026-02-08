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
          range: 'data!A:Q', // Include column Q (Update Terakhir)
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

      // Column indices - use hardcoded indices based on sheet structure (A:Q = 17 columns)
      // A(0)=ID, B(1)=Title, C(2)=Submitter, D(3)=Jenis, E(4)=Documents, F(5)=Notes, G(6)=Status
      // H(7)=WaktuPengajuan, I(8)=WaktuBendahara, J(9)=WaktuPPK, K(10)=WaktuPPSPM, L(11)=WaktuKPPN
      // M(12)=StatusBendahara, N(13)=StatusPPK, O(14)=StatusPPSPM, P(15)=StatusArsip, Q(16)=UpdateTerakhir
      const idxId = 0; // Column A
      const idxTitle = 1; // Column B
      const idxStatus = 6; // Column G
      const idxUpdateTime = 16; // Column Q - Update Terakhir

      console.log(`[fetchPencairanNotifications] Using column indices - id:${idxId}(A), title:${idxTitle}(B), status:${idxStatus}(G), updateTime:${idxUpdateTime}(Q)`);
      console.log(`[fetchPencairanNotifications] Status column (G) header: "${headers[idxStatus]}", UpdateTime column (Q) header: "${headers[idxUpdateTime]}"`);

      // Collect all unique statuses found
      const allStatuses = new Set<string>();
      
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || !row[idxStatus]) continue;

        // Detect structure: OLD (16 cols, P=Update) or NEW (17+ cols, Q=Update)
        let idxUpdateTimeActual = idxUpdateTime;
        if (row.length <= 16) {
          // OLD STRUCTURE - update is at column P (index 15)
          idxUpdateTimeActual = 15;
          if (i === 1) console.log(`[fetchPencairanNotifications] Detected OLD STRUCTURE (${row.length} cols), Update at P(15)`);
        } else {
          // NEW STRUCTURE - update is at column Q (index 16)
          idxUpdateTimeActual = 16;
          if (i === 1) console.log(`[fetchPencairanNotifications] Detected NEW STRUCTURE (${row.length} cols), Update at Q(16)`);
        }

        const statusRaw = row[idxStatus]?.toString() || '';
        const status = statusRaw.toLowerCase().trim();
        allStatuses.add(status);
        console.log(`[fetchPencairanNotifications] Row ${i}: statusRaw="${statusRaw}", status="${status}"`);
        
        const judul = row[idxTitle]?.toString() || 'Pengajuan';
        const submissionId = row[idxId]?.toString() || `pencairan-${i}`;
        const updateTimeStr = row[idxUpdateTimeActual]?.toString() || '';
        
        // Use timestamp text as-is from database
        let updateTime = new Date();
        let displayTime = updateTimeStr?.trim() ? `update: ${updateTimeStr.trim()}` : 'Baru saja';
        
        console.log(`[fetchPencairanNotifications] Row ${i}: id=${submissionId}, title=${judul}, status=${status}, updateTimeStr="${updateTimeStr}", displayTime="${displayTime}"`);

        let targetRoles: string[] = [];
        let message = '';
        let title = 'Pencairan - Pengajuan Baru';

        // Map actual statuses to notification rules
        // incomplete_sm = Ditolak ke SM (needs correction by submitter)
        if (status === 'incomplete_sm') {
          title = 'Pencairan - Pengajuan Ditolak';
          targetRoles = ['Fungsi']; // Any role containing "Fungsi"
          message = `${judul} ditolak. Mohon segera memperbaiki`;
        }
        // Draft status
        else if (status === 'draft') {
          targetRoles = ['Fungsi']; // Any role containing "Fungsi"
          message = `${judul} masih belum dilengkapi`;
        }
        // Rejected by bendahara, PPK, or PPSPM - needs correction
        else if (status === 'incomplete_bendahara') {
          title = 'Pencairan - Pengajuan Ditolak';
          targetRoles = ['Bendahara'];
          message = `${judul} ditolak. Mohon segera memperbaiki`;
        }
        else if (status === 'incomplete_ppk') {
          title = 'Pencairan - Pengajuan Ditolak';
          targetRoles = ['PPK'];
          message = `${judul} ditolak. Mohon segera memperbaiki`;
        }
        else if (status === 'incomplete_ppspm') {
          title = 'Pencairan - Pengajuan Ditolak';
          targetRoles = ['PPSPM'];
          message = `${judul} ditolak. Mohon segera memperbaiki`;
        }
        else if (status === 'incomplete_kppn') {
          title = 'Pencairan - Pengajuan Ditolak';
          targetRoles = ['Arsip'];
          message = `${judul} ditolak. Mohon segera memperbaiki`;
        }
        // Pending at bendahara
        else if (status === 'pending_bendahara') {
          targetRoles = ['Bendahara'];
          message = `Tugas bendahara ${judul} harus diperiksa`;
        }
        // Pending at PPK
        else if (status === 'pending_ppk') {
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
              title,
              message,
              priority: (status?.includes('incomplete') || status === 'pending_ppspm') ? 'high' : 'medium',
              targetRoles,
              relatedId: submissionId,
              status: status as any,
              createdAt: updateTime,
              displayTime,
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
        const idxPeriode = 2; // Column C - Periode
        const idxStatusNotif = 24; // Column Y - Status Notif
        
        console.log(`[fetchSBMLNotifications] Header indices - nama:${idxNama}, status:${idxStatus}, ttd:${idxTtd}, periode:${idxPeriode}(C), statusNotif:${idxStatusNotif}(Y)`);

        // Collect all unique TTD statuses found
        const allTtdStatuses = new Set<string>();
        // Map to group petugas by periode
        const petugarByPeriode = new Map<string, string[]>();

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || !row[idxNama]) continue;

          const nama = row[idxNama]?.toString() || '';
          const status = row[idxStatus]?.toString().toLowerCase().trim();
          const ttdRaw = row[idxTtd]?.toString().toLowerCase().trim();
          const periode = row[idxPeriode]?.toString() || 'Unknown';
          const statusNotifRaw = row[idxStatusNotif]?.toString().toLowerCase().trim() || '';

          // Check Status Notif (column Y) - only process if contains 'sudah'
          // If blank or 'belum', skip this row
          const statusNotifValues = statusNotifRaw?.split('|').map(s => s.trim()) || [];
          const hasSudahNotif = statusNotifValues.some(s => s.includes('sudah'));
          
          if (!hasSudahNotif) {
            console.log(`[fetchSBMLNotifications] SBML Row ${i}: Skip - Status Notif is blank or doesn't contain 'sudah': "${statusNotifRaw}"`);
            continue;
          }

          // Handle pipe-separated values (multiple signers) - extract unique statuses
          const ttdStatuses = ttdRaw?.split('|').map(s => s.trim()) || [];
          ttdStatuses.forEach(t => allTtdStatuses.add(t));

          // Check if ANY of the TTD statuses indicate not signed yet
          // Matches: "belum", "tidak", "belum ditandatangani", "tidak ditandatangani"
          const hasPendingTtd = ttdStatuses.some(t => 
            t.includes('belum') || t.includes('tidak') || status?.includes('belum ttd')
          );
          
          if (hasPendingTtd) {
            console.log(`[fetchSBMLNotifications] SBML Row ${i}: nama=${nama}, ttd=${ttdRaw}, statusNotif=${statusNotifRaw}, periode=${periode}`);
            // Group by periode
            if (!petugarByPeriode.has(periode)) {
              petugarByPeriode.set(periode, []);
            }
            petugarByPeriode.get(periode)?.push(nama);
          }
        }
        
        // Create one notification per periode, combining all petugas
        // SBML CEKTD notifications are NOT displayed - only Rekap SPK-BAST is shown
        // petugarByPeriode is still collected but notifications are skipped
        console.log(`[fetchSBMLNotifications] Cek SBML TTTD notifications suppressed - only Rekap SPK-BAST will be displayed`);
        
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
        const idxStatusNotif = 24; // Column Y - Status Notif

        console.log(`[fetchSBMLNotifications] Rekap header indices - nama:${idxNama}, status:${idxStatus}, ttd:${idxTtd}, periode:${idxPeriode}, statusNotif:${idxStatusNotif}(Y)`);

        // Collect all unique TTD statuses found
        const allRekCapTtdStatuses = new Set<string>();
        // Map to group petugas by periode
        const rekapPetuargByPeriode = new Map<string, string[]>();

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || !row[idxNama]) continue;

          const nama = row[idxNama]?.toString() || '';
          const status = row[idxStatus]?.toString().toLowerCase().trim();
          const ttdRaw = row[idxTtd]?.toString().toLowerCase().trim();
          const periode = row[idxPeriode]?.toString() || 'Unknown';
          const statusNotifRaw = row[idxStatusNotif]?.toString().toLowerCase().trim() || '';

          // Check Status Notif (column Y) - only process if contains 'sudah'
          // If blank or 'belum', skip this row
          const statusNotifValues = statusNotifRaw?.split('|').map(s => s.trim()) || [];
          const hasSudahNotif = statusNotifValues.some(s => s.includes('sudah'));
          
          if (!hasSudahNotif) {
            console.log(`[fetchSBMLNotifications] Rekap Row ${i}: Skip - Status Notif is blank or doesn't contain 'sudah': "${statusNotifRaw}"`);
            continue;
          }

          // Handle pipe-separated values (multiple signers) - extract unique statuses
          const ttdStatuses = ttdRaw?.split('|').map(s => s.trim()) || [];
          ttdStatuses.forEach(t => allRekCapTtdStatuses.add(t));

          // Check if ANY of the TTD statuses indicate not signed yet
          // Matches: "belum", "tidak", "belum ditandatangani", "tidak ditandatangani"
          const hasPendingTtd = ttdStatuses.some(t => 
            t.includes('belum') || t.includes('tidak') || status?.includes('belum ttd')
          );
          
          if (hasPendingTtd) {
            console.log(`[fetchSBMLNotifications] Rekap Row ${i}: nama=${nama}, ttd=${ttdRaw}, statusNotif=${statusNotifRaw}, periode=${periode}`);
            // Group by periode
            if (!rekapPetuargByPeriode.has(periode)) {
              rekapPetuargByPeriode.set(periode, []);
            }
            rekapPetuargByPeriode.get(periode)?.push(nama);
          }
        }
        
        // Create one notification per periode, combining all petugas
        rekapPetuargByPeriode.forEach((petugas, periode) => {
          const notif: SBMLNotification = {
            id: `rekap-periode-${periode}`,
            type: 'sbml_spk',
            title: 'Rekap SPK-BAST - TTD Mitra Belum Lengkap',
            message: `Periode SPK-BAST ${periode}`,
            priority: 'high',
            targetRoles: [],
            relatedId: `periode-${periode}`,
            createdAt: new Date(),
            namaPetugas: petugas.join(', '),
            periode,
            sheetName: 'Rekap SPK-BAST',
            actionUrl: '/spk-bast/rekap-spk',
          };
          notifs.push(notif);
          console.log(`[fetchSBMLNotifications] Added grouped Rekap notification for ${periode}: ${petugas.length} petugas`);
        });
        
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
      
      // Show TTD notifications first, then Pencairan
      const allNotifs = [...sbmlNotifs, ...pencairanNotifs];
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
