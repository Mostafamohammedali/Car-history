import { create } from 'zustand';
import { authService, UserProfile, AuthResponse, RegisterData } from '../services/authService';
import api from '../services/api';

interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  login: (loginField: string, password: string) => Promise<AuthResponse>;
  register: (data: RegisterData) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  updateProfile: (data: any) => Promise<any>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => {
  // الاستماع لحدث انتهاء الصلاحية من الـ API interceptor
  if (typeof window !== 'undefined') {
    window.addEventListener('unauthorized', () => {
      set({ user: null, isAuthenticated: false });
    });
  }

  return {
    user: null,
    isAuthenticated: !!localStorage.getItem('access_token'),
    loading: false,
    error: null,

    // Login
    login: async (loginField, password) => {
      set({ loading: true, error: null });
      try {
        const response = await authService.login(loginField, password);
        if (response.success && response.data?.user) {
          // حفظ التوكنات
          if (response.data.tokens) {
            localStorage.setItem('access_token', response.data.tokens.access);
            localStorage.setItem('refresh_token', response.data.tokens.refresh);
          }
          
          set({ 
            user: response.data.user, 
            isAuthenticated: true, 
            loading: false 
          });
        } else {
          set({ loading: false, error: response.message });
        }
        return response;
      } catch (error: any) {
        const errorMessage = error.message || 'فشل تسجيل الدخول';
        set({ 
          error: errorMessage, 
          loading: false 
        });
        throw error;
      }
    },

    // Register
    register: async (data) => {
      set({ loading: true, error: null });
      try {
        const response = await authService.registerWithVerification(data);
        if (response.success && response.data?.user) {
          // حفظ التوكنات
          if (response.data.tokens) {
            localStorage.setItem('access_token', response.data.tokens.access);
            localStorage.setItem('refresh_token', response.data.tokens.refresh);
          }
          
          set({ 
            user: response.data.user, 
            isAuthenticated: true,
            loading: false 
          });
        } else {
          set({ loading: false });
        }
        return response;
      } catch (error: any) {
        const errorMessage = error.message || 'فشل عملية التسجيل';
        set({ 
          error: errorMessage, 
          loading: false 
        });
        throw error;
      }
    },

    // Logout
    logout: async () => {
      try {
        await authService.logout();
      } catch (error) {
        console.error('Logout error:', error);
      } finally {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        set({ user: null, isAuthenticated: false, error: null });
      }
    },

    // Check auth status
    checkAuth: async () => {
      set({ loading: true });
      try {
        const response = await authService.checkAuthStatus();
        // الباك إند يُرجع { success, data: { authenticated, user }, message }
        // بعد response.data يصبح الشكل: { success, data: { authenticated, user }, message }
        const authenticated = response.data?.authenticated ?? response.success;
        const userData = response.data?.user || null;
        
        if (authenticated) {
          set({ 
            user: userData, 
            isAuthenticated: true,
            loading: false 
          });
        } else {
          // التوكن موجود لكن انتهت صلاحيته
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          set({ 
            user: null, 
            isAuthenticated: false,
            loading: false 
          });
        }
      } catch (error) {
        set({ 
          user: null, 
          isAuthenticated: false,
          loading: false 
        });
      }
    },

    // Update user profile
    updateProfile: async (data) => {
      set({ loading: true, error: null });
      try {
        const response = await authService.updateProfile(data);
        if (response.success && response.data?.user) {
          set({ user: response.data.user, loading: false });
        } else {
          set({ loading: false, error: response.message });
        }
        return response;
      } catch (error: any) {
        set({ error: error.message, loading: false });
        throw error;
      }
    },

    clearError: () => set({ error: null }),
  };
});

export default useAuthStore;
