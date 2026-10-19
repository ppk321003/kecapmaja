import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LockKeyhole } from 'lucide-react';
export function MeetingAccount() {
  const [mode, setMode] = useState('login'), [email, setEmail] = useState(''), [password, setPassword] = useState(''), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMessage('');
    try {
      if (mode === 'login') { const { error } = await supabase.auth.signInWithPassword({ email, password }); if (error) throw error; }
      else { const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/e-dokumen/administrasi-meeting` } }); if (error) throw error; if (!data.session) setMessage('Periksa email Anda untuk konfirmasi akun, lalu masuk.'); }
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Tidak dapat masuk.'); }
    finally { setBusy(false); }
  }
  return <div className="max-w-md mx-auto py-12 space-y-6"><LockKeyhole className="w-10 h-10 text-primary" /><h2 className="text-2xl font-semibold">Akun Administrasi Meeting</h2><Tabs value={mode} onValueChange={setMode}><TabsList><TabsTrigger value="login">Masuk</TabsTrigger><TabsTrigger value="signup">Daftar akun</TabsTrigger></TabsList></Tabs><form onSubmit={submit} className="space-y-4"><div className="space-y-2"><Label htmlFor="meeting-email">Email</Label><Input id="meeting-email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required /></div><div className="space-y-2"><Label htmlFor="meeting-password">Kata sandi</Label><Input id="meeting-password" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={8} value={password} onChange={e => setPassword(e.target.value)} required /></div><Button type="submit" disabled={busy} className="w-full">{busy ? 'Memproses…' : mode === 'login' ? 'Masuk ke meeting' : 'Daftar akun meeting'}</Button></form>{message && <Alert><AlertDescription>{message}</AlertDescription></Alert>}</div>;
}
