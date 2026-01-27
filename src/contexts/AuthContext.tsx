import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface User {
  username: string;
  role: string;
  satker: string;
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
const IDLE_TIMEOUT_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('simaja_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [isLoading, setIsLoading] = useState(false);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  // Logout function
  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('simaja_user');
    localStorage.removeItem('simaja_last_activity');
  }, []);

  // Reset idle timer on user activity
  const resetIdleTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    localStorage.setItem('simaja_last_activity', lastActivityRef.current.toString());
    
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }
    
    if (user) {
      idleTimerRef.current = setTimeout(() => {
        console.log('User idle for 24 hours, logging out...');
        logout();
      }, IDLE_TIMEOUT_MS);
    }
  }, [user, logout]);

  // Check if user was idle for too long on app load
  useEffect(() => {
    const lastActivity = localStorage.getItem('simaja_last_activity');
    if (lastActivity && user) {
      const timeSinceLastActivity = Date.now() - parseInt(lastActivity, 10);
      if (timeSinceLastActivity >= IDLE_TIMEOUT_MS) {
        console.log('User was idle for more than 24 hours, logging out...');
        logout();
        return;
      }
    }
  }, []);

  // Set up activity listeners
  useEffect(() => {
    if (!user) {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
      return;
    }

    // Activity events to track
    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    
    // Throttle activity updates to prevent excessive writes
    let lastUpdate = 0;
    const throttledReset = () => {
      const now = Date.now();
      if (now - lastUpdate > 60000) { // Update at most once per minute
        lastUpdate = now;
        resetIdleTimer();
      }
    };

    // Add event listeners
    activityEvents.forEach(event => {
      document.addEventListener(event, throttledReset, { passive: true });
    });

    // Initialize timer
    resetIdleTimer();

    // Cleanup
    return () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, throttledReset);
      });
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
    };
  }, [user, resetIdleTimer]);

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
          range: "user!A:D"
        }
      });

      if (error) {
        console.error("Error fetching users:", error);
        setIsLoading(false);
        return false;
      }

      if (data?.values && data.values.length > 1) {
        // Skip header row (index 0)
        const users = data.values.slice(1).map((row: string[], index: number) => ({
          rowIndex: index + 2, // +2 because we skip header and array is 0-indexed
          username: row[0]?.trim() || "",
          password: row[1]?.trim() || "",
          role: row[2]?.trim() || "",
          satker: row[5]?.trim() || "" // Kolom F = index 5
        }));

        // Find matching user (case-insensitive username comparison)
        const foundUser = users.find(
          (u: { username: string; password: string; role: string; satker: string }) => 
            u.username.toLowerCase() === username.toLowerCase() && 
            u.password === password
        );

        if (foundUser) {
          setUser({ username: foundUser.username, role: foundUser.role, satker: foundUser.satker });
          
          // Record login timestamp to Column D
          const loginTimestamp = new Date().toISOString();
          try {
            await supabase.functions.invoke("google-sheets", {
              body: {
                spreadsheetId: USERS_SPREADSHEET_ID,
                operation: "update",
                range: `user!D${foundUser.rowIndex}`,
                values: [[loginTimestamp]]
              }
            });
          } catch (updateErr) {
            console.error("Error updating login timestamp:", updateErr);
            // Don't fail login if timestamp update fails
          }
          
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

  // logout is now defined above with useCallback

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
