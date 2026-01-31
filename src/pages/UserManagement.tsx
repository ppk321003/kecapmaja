import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { 
  Users, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  RefreshCw,
  Circle,
  Clock,
  UserPlus,
  Shield,
  Eye,
  EyeOff
} from "lucide-react";

const USERS_SPREADSHEET_ID = "1kVxQHL3TPfDKJ1ZnZ_fxJECGctc1UBjU_8E--9UK938";

const ROLE_OPTIONS = [
  { value: "Pejabat Pembuat Komitmen", label: "Pejabat Pembuat Komitmen" },
  { value: "Pejabat Penandatangan Surat Perintah Membayar", label: "Pejabat Penandatangan Surat Perintah Membayar" },
  { value: "Pejabat Pengadaan", label: "Pejabat Pengadaan" },
  { value: "Bendahara", label: "Bendahara" },
  { value: "Fungsi Sosial", label: "Fungsi Sosial" },
  { value: "Fungsi Neraca", label: "Fungsi Neraca" },
  { value: "Fungsi Produksi", label: "Fungsi Produksi" },
  { value: "Fungsi Distribusi", label: "Fungsi Distribusi" },
  { value: "Fungsi IPDS", label: "Fungsi IPDS" },
  { value: "Organik BPS", label: "Organik BPS" },
];

interface UserData {
  rowIndex: number;
  username: string;
  password: string;
  role: string;
  lastLogin: string;
  satker: string;
}

interface GroupedUserData {
  role: string;
  usernames: string[];
  satkers: string[];
  lastLogin: string;
  isOnline: boolean;
  allRows: UserData[]; // Menyimpan semua user dalam group ini
}

export default function UserManagement() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [groupedUsers, setGroupedUsers] = useState<GroupedUserData[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  
  // Form states
  const [formUsername, setFormUsername] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRole, setFormRole] = useState("");
  const [formSatker, setFormSatker] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showAddPassword, setShowAddPassword] = useState(false);
  
  // Check if current user is PPK
  const isPPK = user?.role === "Pejabat Pembuat Komitmen";
  const isSuperAdmin = user?.satker === "3210"; // PPK 3210 is super admin
  const userSatker = user?.satker || "";

  useEffect(() => {
    if (isPPK) {
      fetchUsers();
    }
  }, [isPPK]);

  // Auto-fill satker when role is PPK and user is not super admin
  useEffect(() => {
    if (formRole === "Pejabat Pembuat Komitmen" && !isSuperAdmin) {
      setFormSatker(userSatker);
    }
  }, [formRole, isSuperAdmin, userSatker]);

  // Fungsi untuk mengelompokkan user berdasarkan role dan satker
  const groupUsersByRole = (usersData: UserData[]): GroupedUserData[] => {
    const roleMap = new Map<string, GroupedUserData>();
    
    usersData.forEach(user => {
      // Gunakan kombinasi role + satker sebagai key untuk memisahkan per satker
      const roleKey = `${user.role.trim()}|${user.satker.trim()}`;
      
      if (!roleMap.has(roleKey)) {
        roleMap.set(roleKey, {
          role: user.role.trim(),
          usernames: [user.username],
          satkers: [user.satker],
          lastLogin: user.lastLogin,
          isOnline: isUserOnline(user.lastLogin),
          allRows: [user]
        });
      } else {
        const existing = roleMap.get(roleKey)!;
        
        // Tambahkan username jika belum ada
        if (!existing.usernames.includes(user.username)) {
          existing.usernames.push(user.username);
        }
        
        // Tambahkan satker jika belum ada
        if (!existing.satkers.includes(user.satker)) {
          existing.satkers.push(user.satker);
        }
        
        // Update lastLogin ke yang paling baru
        if (user.lastLogin) {
          if (existing.lastLogin) {
            const existingDate = new Date(existing.lastLogin);
            const newDate = new Date(user.lastLogin);
            if (newDate > existingDate) {
              existing.lastLogin = user.lastLogin;
              existing.isOnline = isUserOnline(user.lastLogin);
            }
          } else {
            existing.lastLogin = user.lastLogin;
            existing.isOnline = isUserOnline(user.lastLogin);
          }
        }
        
        existing.allRows.push(user);
      }
    });
    
    return Array.from(roleMap.values());
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: USERS_SPREADSHEET_ID,
          operation: "read",
          range: "user!A:F"
        }
      });

      if (error) {
        toast.error("Gagal memuat data pengguna");
        console.error(error);
        return;
      }

      if (data?.values && data.values.length > 1) {
        const usersData: UserData[] = data.values.slice(1).map((row: string[], index: number) => ({
          rowIndex: index + 2, // +2 karena skip header dan array 0-indexed
          username: row[0]?.trim() || "",
          password: row[1]?.trim() || "",
          role: row[2]?.trim() || "",
          lastLogin: row[3]?.trim() || "",
          satker: row[5]?.trim() || ""
        })).filter((u: UserData) => u.username && u.role); // Filter baris kosong

        setUsers(usersData);
        // Buat grouped users untuk tampilan
        const grouped = groupUsersByRole(usersData);
        setGroupedUsers(grouped);
      }
    } catch (err) {
      console.error("Error fetching users:", err);
      toast.error("Terjadi kesalahan saat memuat data");
    } finally {
      setLoading(false);
    }
  };

  const isUserOnline = (lastLogin: string): boolean => {
    if (!lastLogin) return false;
    try {
      const lastLoginDate = new Date(lastLogin);
      const now = new Date();
      const diffMinutes = (now.getTime() - lastLoginDate.getTime()) / (1000 * 60);
      return diffMinutes <= 30; // Online jika login dalam 30 menit terakhir
    } catch {
      return false;
    }
  };

  const formatLastLogin = (lastLogin: string): string => {
    if (!lastLogin) return "Belum pernah login";
    try {
      const date = new Date(lastLogin);
      return date.toLocaleString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return lastLogin;
    }
  };

  const getTimeSinceLogin = (lastLogin: string): string => {
    if (!lastLogin) return "";
    try {
      const lastLoginDate = new Date(lastLogin);
      const now = new Date();
      const diffMs = now.getTime() - lastLoginDate.getTime();
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMinutes < 1) return "Baru saja";
      if (diffMinutes < 60) return `${diffMinutes} menit lalu`;
      if (diffHours < 24) return `${diffHours} jam lalu`;
      return `${diffDays} hari lalu`;
    } catch {
      return "";
    }
  };

  const resetForm = () => {
    setFormUsername("");
    setFormPassword("");
    setFormRole("");
    setFormSatker("");
    setShowPassword(false);
    setShowAddPassword(false);
  };

  const handleAddUser = async () => {
    if (!formUsername || !formPassword || !formRole || !formSatker) {
      toast.error("Semua field harus diisi");
      return;
    }

    // Check if username already exists
    if (users.some(u => u.username.toLowerCase() === formUsername.toLowerCase())) {
      toast.error("Username sudah digunakan");
      return;
    }

    // Prevent PPK non-admin from adding users to other satkers
    if (!isSuperAdmin && formSatker !== userSatker) {
      toast.error(`Anda hanya bisa menambahkan user untuk satker ${userSatker}`);
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: USERS_SPREADSHEET_ID,
          operation: "append",
          range: "user!A:F",
          values: [[formUsername, formPassword, formRole, "", "", formSatker]]
        }
      });

      if (error) {
        toast.error("Gagal menambahkan pengguna");
        return;
      }

      toast.success("Pengguna berhasil ditambahkan");
      setIsAddDialogOpen(false);
      resetForm();
      fetchUsers();
    } catch (err) {
      console.error("Error adding user:", err);
      toast.error("Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = async () => {
    if (!selectedUser || !formUsername || !formPassword || !formRole || !formSatker) {
      toast.error("Semua field harus diisi");
      return;
    }

    // Prevent PPK non-admin from editing users from other satkers
    if (!isSuperAdmin && selectedUser.satker !== userSatker) {
      toast.error(`Anda hanya bisa mengedit user dari satker ${userSatker}`);
      return;
    }

    // Check if username already exists (excluding current user)
    // Only check if username was actually changed
    if (formUsername.toLowerCase() !== selectedUser.username.toLowerCase()) {
      if (users.some(u => u.username.toLowerCase() === formUsername.toLowerCase())) {
        toast.error("Username sudah digunakan");
        return;
      }
    }

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: USERS_SPREADSHEET_ID,
          operation: "update",
          range: `user!A${selectedUser.rowIndex}:F${selectedUser.rowIndex}`,
          values: [[formUsername, formPassword, formRole, selectedUser.lastLogin, "", formSatker]]
        }
      });

      if (error) {
        toast.error("Gagal memperbarui pengguna");
        return;
      }

      toast.success("Pengguna berhasil diperbarui");
      setIsEditDialogOpen(false);
      setSelectedUser(null);
      resetForm();
      fetchUsers();
    } catch (err) {
      console.error("Error updating user:", err);
      toast.error("Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userData: UserData) => {
    // Mencegah penghapusan akun sendiri
    if (userData.username.toLowerCase() === user?.username.toLowerCase()) {
      toast.error("Tidak dapat menghapus akun Anda sendiri");
      return;
    }

    // Prevent PPK non-admin from deleting users from other satkers
    if (!isSuperAdmin && userData.satker !== userSatker) {
      toast.error(`Anda hanya bisa menghapus user dari satker ${userSatker}`);
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: USERS_SPREADSHEET_ID,
          operation: "delete",
          range: "user",
          rowIndex: userData.rowIndex
        }
      });

      if (error) {
        toast.error("Gagal menghapus pengguna");
        return;
      }

      toast.success("Pengguna berhasil dihapus");
      fetchUsers();
    } catch (err) {
      console.error("Error deleting user:", err);
      toast.error("Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (userData: UserData) => {
    setSelectedUser(userData);
    setFormUsername(userData.username);
    setFormPassword(userData.password);
    setFormRole(userData.role);
    setFormSatker(userData.satker);
    setIsEditDialogOpen(true);
  };

  // Filter grouped users berdasarkan search term dan satker
  const filteredGroupedUsers = groupedUsers
    .map(group => ({
      ...group,
      allRows: isSuperAdmin 
        ? group.allRows 
        : group.allRows.filter(row => row.satker === userSatker)
    }))
    .filter(group => group.allRows.length > 0) // Remove groups with no visible rows
    .filter(group => 
      group.usernames.some(username => 
        username.toLowerCase().includes(searchTerm.toLowerCase())
      ) ||
      group.role.toLowerCase().includes(searchTerm.toLowerCase())
    );

  // Filter users berdasarkan satker (kecuali super admin)
  const visibleUsers = isSuperAdmin 
    ? users 
    : users.filter(u => u.satker === userSatker);

  // Hitung total user dan online count dari visible users
  const onlineCount = visibleUsers.filter(u => isUserOnline(u.lastLogin)).length;

  // Hitung total role dari visible users
  const totalRoles = new Set(visibleUsers.map(u => u.role.trim())).size;

  if (!isPPK) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <Shield className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Akses Ditolak</h2>
            <p className="text-muted-foreground">
              Halaman ini hanya dapat diakses oleh Pejabat Pembuat Komitmen (PPK).
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manajemen Pengguna</h1>
          <p className="text-muted-foreground mt-1">
            Kelola akun pengguna dan pantau aktivitas login
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setIsAddDialogOpen(true); }}>
              <UserPlus className="h-4 w-4 mr-2" />
              Tambah Pengguna
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tambah Pengguna Baru</DialogTitle>
              <DialogDescription>
                Masukkan informasi untuk membuat akun pengguna baru.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="add-username">Username</Label>
                <Input
                  id="add-username"
                  placeholder="Masukkan username"
                  value={formUsername}
                  onChange={(e) => setFormUsername(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-password">Password</Label>
                <div className="relative">
                  <Input
                    id="add-password"
                    type={showAddPassword ? "text" : "password"}
                    placeholder="Masukkan password"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowAddPassword(!showAddPassword)}
                  >
                    {showAddPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-role">Role</Label>
                <Select value={formRole} onValueChange={setFormRole}>
                  <SelectTrigger id="add-role">
                    <SelectValue placeholder="Pilih role" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-satker">Satker</Label>
                <Input
                  id="add-satker"
                  placeholder="Masukkan satker (contoh: 3210)"
                  value={formSatker}
                  onChange={(e) => setFormSatker(e.target.value)}
                  disabled={!isSuperAdmin}
                  title={!isSuperAdmin ? `Anda hanya bisa menambahkan user untuk satker ${userSatker}` : ""}
                />
                {!isSuperAdmin && (
                  <p className="text-xs text-muted-foreground">
                    Anda hanya bisa menambahkan user untuk satker {userSatker}
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Batal
              </Button>
              <Button onClick={handleAddUser} disabled={loading}>
                {loading ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Role</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRoles}</div>
            <p className="text-xs text-muted-foreground">Jumlah role berbeda</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Akun</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{visibleUsers.length}</div>
            <p className="text-xs text-muted-foreground">Akun terdaftar</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Online Sekarang</CardTitle>
            <Circle className="h-4 w-4 text-green-500 fill-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{onlineCount}</div>
            <p className="text-xs text-muted-foreground">Aktif dalam 30 menit terakhir</p>
          </CardContent>
        </Card>
      </div>

      {/* User Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Daftar Pengguna (Dikelompokkan per Role)</CardTitle>
              <CardDescription>Setiap baris menampilkan semua username dengan role yang sama</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari username atau role..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-[300px]"
                />
              </div>
              <Button variant="outline" size="icon" onClick={fetchUsers} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">No</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Satker</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Terakhir Login</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && groupedUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                      <p className="text-muted-foreground">Memuat data...</p>
                    </TableCell>
                  </TableRow>
                ) : filteredGroupedUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <Users className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        {searchTerm ? "Tidak ada pengguna yang cocok" : "Belum ada pengguna"}
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredGroupedUsers.map((group, index) => {
                    // Cek apakah current user ada dalam group ini
                    const isCurrentUserInGroup = group.allRows.some(
                      userData => userData.username.toLowerCase() === user?.username.toLowerCase()
                    );
                    
                    return (
                      <TableRow key={group.role} className={isCurrentUserInGroup ? "bg-primary/5" : ""}>
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <span className="font-medium block">
                              {group.usernames.join(' / ')}
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {isCurrentUserInGroup && (
                                <Badge variant="secondary" className="text-xs">Anda</Badge>
                              )}
                              <Badge variant="outline" className="text-xs">
                                {group.allRows.length} akun
                              </Badge>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-medium">
                            {group.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {group.satkers.map(satker => (
                              <Badge key={satker} variant="secondary" className="text-xs">
                                {satker}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Circle 
                              className={`h-2.5 w-2.5 ${group.isOnline ? "text-green-500 fill-green-500" : "text-muted-foreground"}`} 
                            />
                            <span className={group.isOnline ? "text-green-600 font-medium" : "text-muted-foreground"}>
                              {group.isOnline ? "Online" : "Offline"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 text-sm">
                              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                              {formatLastLogin(group.lastLogin)}
                            </div>
                            {group.lastLogin && (
                              <p className="text-xs text-muted-foreground">
                                {getTimeSinceLogin(group.lastLogin)}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(group.allRows[0])}
                              title="Edit user pertama dalam group"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:text-destructive"
                                  disabled={isCurrentUserInGroup}
                                  title="Hapus semua user dalam group"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Hapus Semua User dengan Role ini?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    <div className="space-y-2">
                                      <p>
                                        Anda akan menghapus <strong>semua {group.allRows.length} akun</strong> dengan role <strong>{group.role}</strong>.
                                      </p>
                                      <p className="font-medium">Usernames yang akan dihapus:</p>
                                      <ul className="list-disc pl-4 text-sm">
                                        {group.usernames.map(username => (
                                          <li key={username}>{username}</li>
                                        ))}
                                      </ul>
                                      <p className="text-destructive font-medium mt-2">
                                        Tindakan ini tidak dapat dibatalkan.
                                      </p>
                                    </div>
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Batal</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => {
                                      // Hapus semua user dalam group
                                      group.allRows.forEach(userData => {
                                        if (userData.username.toLowerCase() !== user?.username.toLowerCase()) {
                                          handleDeleteUser(userData);
                                        }
                                      });
                                    }}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Hapus Semua
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Pengguna</DialogTitle>
            <DialogDescription>
              Perbarui informasi akun pengguna.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-username">Username</Label>
              <Input
                id="edit-username"
                placeholder="Masukkan username"
                value={formUsername}
                onChange={(e) => setFormUsername(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-password">Password</Label>
              <div className="relative">
                <Input
                  id="edit-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Masukkan password"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role">Role</Label>
              <Select value={formRole} onValueChange={setFormRole}>
                <SelectTrigger id="edit-role">
                  <SelectValue placeholder="Pilih role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-satker">Satker</Label>
              <Input
                id="edit-satker"
                placeholder="Masukkan satker"
                value={formSatker}
                onChange={(e) => setFormSatker(e.target.value)}
                disabled={!isSuperAdmin}
                title={!isSuperAdmin ? `Anda hanya bisa mengedit satker sendiri` : ""}
              />
              {!isSuperAdmin && (
                <p className="text-xs text-muted-foreground">
                  Anda hanya bisa mengedit user dari satker {userSatker}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleEditUser} disabled={loading}>
              {loading ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}