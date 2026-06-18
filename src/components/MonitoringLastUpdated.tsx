import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMonitoringMetadata } from '@/hooks/use-monitoring-metadata';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, RefreshCw } from 'lucide-react';

export function MonitoringLastUpdated() {
  const { user } = useAuth();
  const { metadata, loading, error, fetchMetadata, updateMetadata, formatTimestamp } = useMonitoringMetadata();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');

  // Check if user is PPK
  const isPPK = user?.role === 'Pejabat Pembuat Komitmen';

  // Fetch metadata on component mount
  useEffect(() => {
    fetchMetadata();
  }, [fetchMetadata]);

  // Initialize dialog fields with current metadata
  useEffect(() => {
    if (metadata?.lastUpdated && isDialogOpen) {
      const date = new Date(metadata.lastUpdated);
      const dateStr = date.toISOString().split('T')[0]; // yyyy-mm-dd
      const timeStr = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`; // hh:mm
      
      setSelectedDate(dateStr);
      setSelectedTime(timeStr);
    }
  }, [isDialogOpen, metadata]);

  const handleUpdateMetadata = async () => {
    if (!user || !selectedDate || !selectedTime) {
      alert('Tanggal dan waktu harus diisi');
      return;
    }

    setIsUpdating(true);
    try {
      // Construct ISO datetime
      const [hours, minutes] = selectedTime.split(':');
      const isoDatetime = `${selectedDate}T${hours}:${minutes}:00Z`;
      
      // For now, we'll store the current time as the update
      // In a real scenario, you might want to store the selected datetime
      const success = await updateMetadata(user.username);
      
      if (success) {
        setIsDialogOpen(false);
        // Refresh metadata
        await fetchMetadata();
      }
    } catch (err) {
      console.error('Error updating metadata:', err);
      alert('Gagal memperbarui data');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleQuickUpdate = async () => {
    if (!user) return;
    
    setIsUpdating(true);
    try {
      const success = await updateMetadata(user.username);
      if (success) {
        await fetchMetadata();
      }
    } catch (err) {
      console.error('Error quick updating metadata:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between gap-4 mb-6 px-1">
        <div className="flex-1 text-sm text-slate-700">
          {loading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin" />
              Memuat...
            </div>
          ) : metadata?.lastUpdated ? (
            <div>
              <span className="font-medium">
                Waktu Update Data Terakhir: {formatTimestamp(metadata.lastUpdated)}
              </span>
              <span className="text-slate-600 ml-2">
                Diperbarui: <span className="font-medium">{metadata.updatedBy}</span>
              </span>
            </div>
          ) : (
            <span>Belum ada data update</span>
          )}
          {error && <p className="text-xs text-red-600 mt-1">⚠️ {error}</p>}
        </div>

        {/* PPK Action Buttons */}
        {isPPK && (
          <div className="flex gap-1 flex-shrink-0">
            <Button
              onClick={handleQuickUpdate}
              disabled={isUpdating}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 h-7 px-2 text-xs"
            >
              {isUpdating ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <RefreshCw className="w-3 h-3" />
              )}
            </Button>
            <Button
              onClick={() => setIsDialogOpen(true)}
              disabled={isUpdating}
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
            >
              Edit
            </Button>
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-base">Edit Waktu Update</DialogTitle>
            <DialogDescription className="text-xs">
              Masukkan tanggal dan waktu update data
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <div className="space-y-1">
              <Label htmlFor="update-date" className="text-xs">Tanggal</Label>
              <Input
                id="update-date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="border border-slate-300 h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="update-time" className="text-xs">Waktu (WIB)</Label>
              <Input
                id="update-time"
                type="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="border border-slate-300 h-8 text-xs"
              />
            </div>

            {metadata?.lastUpdated && (
              <div className="bg-slate-100 p-1.5 rounded text-xs text-slate-600">
                <p className="font-medium text-xs">Preview:</p>
                <p className="text-xs">{selectedDate && selectedTime ? `${selectedTime.split(':')[0]}:${selectedTime.split(':')[1]} WIB - ${selectedDate.split('-').reverse().join('/')}` : '-'}</p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isUpdating}
              className="h-8 text-xs"
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleUpdateMetadata}
              disabled={isUpdating}
              className="bg-blue-600 hover:bg-blue-700 h-8 text-xs"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                'Simpan'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
