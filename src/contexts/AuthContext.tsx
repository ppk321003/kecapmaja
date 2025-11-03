import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  username: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Hardcoded users
const users = [
  { username: 'ppk3210', password: 'bellamy', role: 'Pejabat Pembuat Komitmen' },
  { username: 'PPK3210', password: 'bellamy', role: 'Pejabat Pembuat Komitmen' },
  { username: 'bendahara3210', password: 'terhormat', role: 'Bendahara' },
  { username: 'BENDAHARA3210', password: 'terhormat', role: 'Bendahara' },
  { username: 'sosial3210', password: 'terhormat', role: 'Fungsi Sosial' },
  { username: 'SOSIAL3210', password: 'terhormat', role: 'Fungsi Sosial' },
  { username: 'neraca3210', password: 'terhormat', role: 'Fungsi Neraca' },
  { username: 'NERACA3210', password: 'terhormat', role: 'Fungsi Neraca' },
  { username: 'produksi3210', password: 'terhormat', role: 'Fungsi Produksi' },
  { username: 'PRODUKSI3210', password: 'terhormat', role: 'Fungsi Produksi' },  
  { username: 'distribusi3210', password: 'terhormat', role: 'Fungsi Distribusi' },
  { username: 'DISTRIBUSI3210', password: 'terhormat', role: 'Fungsi Distribusi' },
  { username: 'ipds3210', password: 'terhormat', role: 'Fungsi IPDS' },
  { username: 'IPDS3210', password: 'terhormat', role: 'Fungsi IPDS' },
  { username: 'pbj3210', password: 'terhormat', role: 'Pejabat Pengadaan' },
  { username: 'PBJ3210', password: 'terhormat', role: 'Pejabat Pengadaan' }, 
  { username: 'Padamel3210', password: 'Terhormat', role: 'Padamel BPS 3210' },  
];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('simaja_user');
    return stored ? JSON.parse(stored) : null;
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('simaja_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('simaja_user');
    }
  }, [user]);

  const login = (username: string, password: string): boolean => {
    const foundUser = users.find(
      u => u.username === username && u.password === password
    );
    
    if (foundUser) {
      setUser({ username: foundUser.username, role: foundUser.role });
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
