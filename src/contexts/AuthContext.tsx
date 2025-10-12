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
  { username: 'ppk3210', password: 'bellamy', role: 'PPK' },
  { username: 'PPK3210', password: 'bellamy', role: 'PPK' },
  { username: 'user3210', password: 'terhormat', role: 'User' },
  { username: 'USER3210', password: 'terhormat', role: 'User' },
  { username: 'bendahara3210', password: 'terhormat', role: 'Bendahara' },
  { username: 'BENDAHARA3210', password: 'terhormat', role: 'Bendahara' },
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
