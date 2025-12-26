import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types'; // Assuming User type is defined here or imported

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string, phoneNumber?: string) => Promise<boolean>;
  verifyOTP: (email: string, otp: string) => Promise<boolean>;
  logout: () => void;
  updateUser: (data: Partial<User>) => void;
  status: 'loading' | 'authenticated' | 'unauthenticated';
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE_URL = '/api'; // Using proxy in vite.config.ts

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');

  useEffect(() => {
    const loadUserFromStorage = async () => {
      const token = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      if (token && storedUser) {
        try {
          const parsedUser: User = JSON.parse(storedUser);
          if (!parsedUser.id || !parsedUser.email) throw new Error("Invalid user data");

          setUser(parsedUser);
          setStatus('authenticated');
        } catch (error) {
          console.error('Failed to parse stored user:', error);
          logout(); // Clear invalid data
        }
      } else {
        setStatus('unauthenticated');
      }
    };

    loadUserFromStorage();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'token' || e.key === 'user') {
        loadUserFromStorage();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setStatus('loading');
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if ((response.status === 403 || response.status === 400) && errorData.requiresVerification) {
          throw { message: errorData.message, requiresVerification: true, email: errorData.email };
        }
        throw new Error(errorData.message || 'Login failed');
      }

      const data = await response.json();
      const { token, userId, name, customId, role } = data; // Assuming backend returns token, userId, name
      const loggedInUser: User = { id: userId, name, email, customId: customId || userId, role }; // Construct user object
      setUser(loggedInUser);
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(loggedInUser));
      setStatus('authenticated');
      return true;
    } catch (error: any) {
      console.error('Login error:', error);
      setUser(null);
      setStatus('unauthenticated');
      if (error.requiresVerification) {
        throw error;
      }
      return false;
    }
  };

  const register = async (name: string, email: string, password: string, phoneNumber?: string): Promise<boolean> => {
    setStatus('loading');
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password, phoneNumber }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Registration failed');
      }

      // After successful registration, automatically log the user in
      // const loginSuccess = await login(email, password);
      // return loginSuccess;
      return true;
    } catch (error) {
      console.error('Registration error:', error);
      setUser(null);
      setStatus('unauthenticated');
      return false;
    }
  };

  const verifyOTP = async (email: string, otp: string): Promise<boolean> => {
    setStatus('loading');
    try {
      const response = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, otp }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Verification failed');
      }

      const data = await response.json();
      const { token, userId, name, customId, role } = data;
      const loggedInUser: User = { id: userId, name, email, customId: customId || userId, role };

      setUser(loggedInUser);
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(loggedInUser));
      setStatus('authenticated');
      return true;
    } catch (error) {
      console.error('Verification error:', error);
      // Do not clear user here, just fail verification
      setStatus('unauthenticated');
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('user');
    setStatus('unauthenticated');
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, register, verifyOTP, logout, status, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};