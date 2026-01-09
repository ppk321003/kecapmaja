import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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

interface UserData {
  rowIndex: number;
  username: string;
  password: string;
  role: string;
  lastLogin: string;
}

export default function UserManagement() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  
  // Form states
  const [formUsername, setFormUsername] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRole, setFormRole] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showAddPassword, setShowAddPassword] = useState(false);
  // Check if current user is PPK
  const isPPK = user?.role === "Pejabat Pembuat Komitmen";

  useEffect(() => {
    if (isPPK) {
      fetchUsers();
    }
  }, [isPPK]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: USERS_SPREADSHEET_ID,
          operation: "read",
          range: "user!A:D"
        }
      });

      if (error) {
        toast.error("Gagal memuat data pengguna");
        console.error(error);
        return;
      }

      if (data?.values && data.values.length > 1) {
        const usersData: UserData[] = data.values.slice(1).map((row: string[], index: number) => ({
          rowIndex: index + 2, // +2 because we skip header and array is 0-indexed
          username: row[0]?.trim() || "",
          password: row[1]?.trim() || "",
          role: row[2]?.trim() || "",
          lastLogin: row[3]?.trim() || ""
        })).filter((u: UserData) => u.username); // Filter out empty rows

        setUsers(usersData);
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
      return diffMinutes <= 30; // Consider online if last login within 30 minutes
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
    setShowPassword(false);
    setShowAddPassword(false);
  };

  const handleAddUser = async () => {
    if (!formUsername || !formPassword || !formRole) {
      toast.error("Semua field harus diisi");
      return;
    }

    // Check if username already exists
    if (users.some(u => u.username.toLowerCase() === formUsername.toLowerCase())) {
      toast.error("Username sudah digunakan");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: USERS_SPREADSHEET_ID,
          operation: "append",
          range: "user!A:D",
          values: [[formUsername, formPassword, formRole, ""]]
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
    if (!selectedUser || !formUsername || !formPassword || !formRole) {
      toast.error("Semua field harus diisi");
      return;
    }

    // Check if username already exists (excluding current user)
    if (users.some(u => 
      u.username.toLowerCase() === formUsername.toLowerCase() && 
      u.rowIndex !== selectedUser.rowIndex
    )) {
      toast.error("Username sudah digunakan");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: USERS_SPREADSHEET_ID,
          operation: "update",
          range: `user!A${selectedUser.rowIndex}:D${selectedUser.rowIndex}`,
          values: [[formUsername, formPassword, formRole, selectedUser.lastLogin]]
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
    // Prevent deleting own account
    if (userData.username.toLowerCase() === user?.username.toLowerCase()) {
      toast.error("Tidak dapat menghapus akun Anda sendiri");
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
    setIsEditDialogOpen(true);
  };

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const onlineCount = users.filter(u => isUserOnline(u.lastLogin)).length;

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
                <Input
                  id="add-role"
                  placeholder="Masukkan role (contoh: Fungsi Sosial)"
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value)}
                />
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
            <CardTitle className="text-sm font-medium">Total Pengguna</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Offline</CardTitle>
            <Circle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length - onlineCount}</div>
            <p className="text-xs text-muted-foreground">Tidak aktif</p>
          </CardContent>
        </Card>
      </div>

      {/* User Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Daftar Pengguna</CardTitle>
              <CardDescription>Lihat dan kelola semua akun pengguna</CardDescription>
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
                  <TableHead>Status</TableHead>
                  <TableHead>Terakhir Login</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                      <p className="text-muted-foreground">Memuat data...</p>
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <Users className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        {searchTerm ? "Tidak ada pengguna yang cocok" : "Belum ada pengguna"}
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((userData, index) => {
                    const online = isUserOnline(userData.lastLogin);
                    const isCurrentUser = userData.username.toLowerCase() === user?.username.toLowerCase();
                    
                    return (
                      <TableRow key={userData.rowIndex} className={isCurrentUser ? "bg-primary/5" : ""}>
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{userData.username}</span>
                            {isCurrentUser && (
                              <Badge variant="secondary" className="text-xs">Anda</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{userData.role}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Circle 
                              className={`h-2.5 w-2.5 ${online ? "text-green-500 fill-green-500" : "text-muted-foreground"}`} 
                            />
                            <span className={online ? "text-green-600 font-medium" : "text-muted-foreground"}>
                              {online ? "Online" : "Offline"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 text-sm">
                              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                              {formatLastLogin(userData.lastLogin)}
                            </div>
                            {userData.lastLogin && (
                              <p className="text-xs text-muted-foreground">
                                {getTimeSinceLogin(userData.lastLogin)}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(userData)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:text-destructive"
                                  disabled={isCurrentUser}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Hapus Pengguna?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Apakah Anda yakin ingin menghapus akun <strong>{userData.username}</strong>? 
                                    Tindakan ini tidak dapat dibatalkan.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Batal</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteUser(userData)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Hapus
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
              <Input
                id="edit-role"
                placeholder="Masukkan role"
                value={formRole}
                onChange={(e) => setFormRole(e.target.value)}
              />
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
