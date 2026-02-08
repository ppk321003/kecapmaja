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
      if (!userSatker) return [];

      const pencairanSheetId = satkerContext?.getUserSatkerSheetId('pencairan') || '';
      if (!pencairanSheetId) return [];

      const { data, error } = await supabase.functions.invoke('google-sheets', {
        body: {
          spreadsheetId: pencairanSheetId,
          operation: 'read',
          range: 'Pengajuan!A:N',
        },
      });

      if (error || !data?.values) return [];

      const rows = data.values;
      const headers = rows[0] || [];
      const notifs: Notification[] = [];

      // Column indices
      const idxStatus = headers.findIndex((h: string) => h?.toLowerCase().includes('status'));
      const idxJudul = headers.findIndex((h: string) => h?.toLowerCase().includes('uraian') || h?.toLowerCase().includes('judul'));
      const idxId = headers.findIndex((h: string) => h?.toLowerCase().includes('id'));

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

        if (targetRoles.length > 0 && roleMatches(userRole, targetRoles)) {
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
        }
      }

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
      if (!userSatker) return [];

      // Check if user is in excluded roles
      if (userRole === 'PPSPM' || userRole === 'PPK' || userRole === 'Arsip') {
        return [];
      }

      const spkBastSheetId = satkerContext?.getUserSatkerSheetId('entrikegiatan') || '';
      if (!spkBastSheetId) return [];

      const notifs: Notification[] = [];

      // Fetch Cek SBML sheet
      const { data: sbmlData, error: sbmlError } = await supabase.functions.invoke('google-sheets', {
        body: {
          spreadsheetId: spkBastSheetId,
          operation: 'read',
          range: 'Cek SBML!A:F',
        },
      });

      if (!sbmlError && sbmlData?.values) {
        const rows = sbmlData.values;
        const headers = rows[0] || [];

        const idxNama = headers.findIndex((h: string) => h?.toLowerCase().includes('nama') || h?.toLowerCase().includes('petugas'));
        const idxStatus = headers.findIndex((h: string) => h?.toLowerCase().includes('status'));
        const idxTtd = headers.findIndex((h: string) => h?.toLowerCase().includes('ttd'));
        const idxPeriode = headers.findIndex((h: string) => h?.toLowerCase().includes('periode') || h?.toLowerCase().includes('bulan'));

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || !row[idxNama]) continue;

          const nama = row[idxNama]?.toString() || '';
          const status = row[idxStatus]?.toString().toLowerCase().trim();
          const ttd = row[idxTtd]?.toString().toLowerCase().trim();
          const periode = row[idxPeriode]?.toString() || new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

          // Check if status indicates not signed yet
          if (ttd === 'belum' || ttd === 'tidak' || status === 'belum ttd') {
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
          }
        }
      }

      // Fetch Rekap SPK-BAST sheet
      const { data: rekapData, error: rekapError } = await supabase.functions.invoke('google-sheets', {
        body: {
          spreadsheetId: spkBastSheetId,
          operation: 'read',
          range: 'Rekap SPK-BAST!A:F',
        },
      });

      if (!rekapError && rekapData?.values) {
        const rows = rekapData.values;
        const headers = rows[0] || [];

        const idxNama = headers.findIndex((h: string) => h?.toLowerCase().includes('nama') || h?.toLowerCase().includes('petugas'));
        const idxStatus = headers.findIndex((h: string) => h?.toLowerCase().includes('status'));
        const idxTtd = headers.findIndex((h: string) => h?.toLowerCase().includes('ttd'));
        const idxPeriode = headers.findIndex((h: string) => h?.toLowerCase().includes('periode') || h?.toLowerCase().includes('bulan'));

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || !row[idxNama]) continue;

          const nama = row[idxNama]?.toString() || '';
          const status = row[idxStatus]?.toString().toLowerCase().trim();
          const ttd = row[idxTtd]?.toString().toLowerCase().trim();
          const periode = row[idxPeriode]?.toString() || new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

          // Check if status indicates not signed yet
          if (ttd === 'belum' || ttd === 'tidak' || status === 'belum ttd') {
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
          }
        }
      }

      return notifs;
    } catch (error) {
      console.error('Error fetching SBML notifications:', error);
      return [];
    }
  }, [satkerContext, userRole, userSatker]);

  // Main fetch function
  const fetchAllNotifications = useCallback(async () => {
    if (!currentUser || !userSatker) return;

    try {
      const pencairanNotifs = await fetchPencairanNotifications();
      const sbmlNotifs = await fetchSBMLNotifications();
      const allNotifs = [...pencairanNotifs, ...sbmlNotifs];
      
      notificationsContext._setNotifications(allNotifs);
    } catch (error) {
      console.error('Error in fetchAllNotifications:', error);
    }
  }, [currentUser, userSatker, notificationsContext, fetchPencairanNotifications, fetchSBMLNotifications]);

  // Initial fetch on mount
  useEffect(() => {
    fetchAllNotifications();
  }, [fetchAllNotifications]);

  // Setup polling
  useEffect(() => {
    if (!currentUser || !userSatker) return;

    // Fetch immediately
    fetchAllNotifications();

    // Set up polling - every 30 seconds (when page is active)
    pollIntervalRef.current = setInterval(() => {
      fetchAllNotifications();
    }, POLLING_INTERVAL);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [currentUser, userSatker, fetchAllNotifications]);
}
