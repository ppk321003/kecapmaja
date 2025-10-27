import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import simajaLogo from '@/assets/simaja-logo.png';
export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const {
    login
  } = useAuth();
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (login(username, password)) {
      toast({
        title: "Login berhasil",
        description: "Selamat datang di aplikasi Aki Maja BPS3210"
      });
      navigate('/');
    } else {
      toast({
        title: "Login gagal",
        description: "Username atau password salah",
        variant: "destructive"
      });
    }
  };
  return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary to-accent p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4 px-[32px] py-0 mx-[22px]">
          <div className="flex justify-center mx-0 my-0 py-[30px]">
            <img src={simajaLogo} alt="SIMAJA Logo" className="w-full max-w-md h-auto" />
          </div>
          
          <CardDescription className="text-center text-stone-700">
            Masukkan username dan password Anda
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" type="text" value={username} onChange={e => setUsername(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full">
              Login
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>;
}