
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { Textarea } from "@/components/ui/textarea";

interface EditKerangkaDialogProps {
  isOpen: boolean;
  onClose: () => void;
  data: any;
  onSave: (updatedData: any) => void;
}

export default function EditKerangkaDialog({ isOpen, onClose, data, onSave }: EditKerangkaDialogProps) {
  const [formData, setFormData] = useState<any>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (data) {
      setFormData({...data});
    }
  }, [data]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Here you would typically send the data to your backend
      // For now, we'll just simulate a successful update
      await new Promise(resolve => setTimeout(resolve, 1000));
      onSave(formData);
      toast({
        title: "Data updated",
        description: "The document data has been successfully updated.",
      });
      onClose();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update document data.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Kerangka Acuan Kerja</DialogTitle>
            <DialogDescription>
              Perbarui informasi kerangka acuan kerja berikut.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-2">
              <Label htmlFor="id" className="text-right">ID</Label>
              <Input
                id="id"
                name="Id"
                value={formData.Id || ""}
                onChange={handleChange}
                className="col-span-3"
                readOnly
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-2">
              <Label htmlFor="jenis_kak" className="text-right">Jenis KAK</Label>
              <Input
                id="jenis_kak"
                name="Jenis Kerangka Acuan Kerja"
                value={formData["Jenis Kerangka Acuan Kerja"] || ""}
                onChange={handleChange}
                className="col-span-3"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-2">
              <Label htmlFor="nama_kegiatan" className="text-right">Nama Kegiatan</Label>
              <Input
                id="nama_kegiatan"
                name="Nama Kegiatan-1"
                value={formData["Nama Kegiatan-1"] || ""}
                onChange={handleChange}
                className="col-span-3"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-2">
              <Label htmlFor="nama_pembuat" className="text-right">Nama Pembuat</Label>
              <Input
                id="nama_pembuat"
                name="Nama Pembuat Daftar"
                value={formData["Nama Pembuat Daftar"] || ""}
                onChange={handleChange}
                className="col-span-3"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-2">
              <Label htmlFor="link" className="text-right">Link</Label>
              <Input
                id="link"
                name="Link"
                value={formData.Link || ""}
                onChange={handleChange}
                className="col-span-3"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
