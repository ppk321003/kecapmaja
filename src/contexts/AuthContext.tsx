import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface User {
  username: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USERS_SPREADSHEET_ID = "1kVxQHL3TPfDKJ1ZnZ_fxJECGctc1UBjU_8E--9UK938";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('simaja_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      localStorage.setItem('simaja_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('simaja_user');
    }
  }, [user]);

  const login = async (username: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: USERS_SPREADSHEET_ID,
          operation: "read",
          range: "user!A:C"
        }
      });

      if (error) {
        console.error("Error fetching users:", error);
        setIsLoading(false);
        return false;
      }

      if (data?.values && data.values.length > 1) {
        // Skip header row (index 0)
        const users = data.values.slice(1).map((row: string[]) => ({
          username: row[0]?.trim() || "",
          password: row[1]?.trim() || "",
          role: row[2]?.trim() || ""
        }));

        // Find matching user (case-insensitive username comparison)
        const foundUser = users.find(
          (u: { username: string; password: string; role: string }) => 
            u.username.toLowerCase() === username.toLowerCase() && 
            u.password === password
        );

        if (foundUser) {
          setUser({ username: foundUser.username, role: foundUser.role });
          setIsLoading(false);
          return true;
        }
      }

      setIsLoading(false);
      return false;
    } catch (err) {
      console.error("Login error:", err);
      setIsLoading(false);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, isLoading }}>
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
