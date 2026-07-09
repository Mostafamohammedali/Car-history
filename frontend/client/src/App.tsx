/**
 * @file App.tsx
 * @description المكون الرئيسي - يدير حالة المصادقة من الباك إند
 */

import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import Header from './components/Header';
import Footer from './components/Footer';

import NotFound from '@/pages/NotFound';
import Home from '@/pages/Home';
import ReportSample from '@/pages/ReportSample';
import VINDecoder from '@/pages/VINDecoder';
import CheckVinReport from '@/pages/CheckVinReport';
import DecodedVinResult from '@/pages/DecodedVinResult';
import AboutUs from '@/pages/AboutUs';
import ContactUs from '@/pages/ContactUs';
import ForgotPassword from '@/pages/ForgotPassword';
import OTPVerification from '@/pages/OTPVerification';
import ResetPassword from '@/pages/ResetPassword';
import Profile from '@/pages/Profile';
import VINDecoderPage from '@/pages/VINDecoderPage';
import Login from '@/pages/Login';

import { Route, Switch, useLocation } from 'wouter';
import { useState, useEffect, useCallback } from 'react';

import ErrorBoundary from './components/ErrorBoundary';
import { ThemeProvider } from './contexts/ThemeContext';
import AIChatInterface from './components/AIChatInterface';
import { useAuthStore } from './store/authStore';

// ===== Router =====

function Router({
  loginModalOpen, setLoginModalOpen, signupModalOpen, setSignupModalOpen,
}: {
  loginModalOpen: boolean; setLoginModalOpen: (v: boolean) => void;
  signupModalOpen: boolean; setSignupModalOpen: (v: boolean) => void;
}) {
  const { user, isAuthenticated, checkAuth } = useAuthStore();
  const [location, setLocation] = useLocation();
  
  const userProfile = user ? {
    name: [user.first_name, user.last_name].filter(val => val && val !== 'undefined').join(' ').trim() || user.username,
    email: user.email,
    avatar: '/images/logo.png',
    isAdmin: user.is_staff || user.is_superuser
  } : undefined;

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  }, [location]);

  // دالة مشتركة تُمرَّر للـ Login
  const handleLoginSuccess = useCallback(async () => {
    await checkAuth();
    setLocation('/');
  }, [checkAuth, setLocation]);

  return (
    <Switch>
      <Route path="/">
        {() => (
          <Home
            loginModalOpen={loginModalOpen} setLoginModalOpen={setLoginModalOpen}
            signupModalOpen={signupModalOpen} setSignupModalOpen={setSignupModalOpen}
            isLoggedIn={isAuthenticated} setIsLoggedIn={() => {}}
            userProfile={userProfile} setUserProfile={() => {}}
            onLoginSuccess={handleLoginSuccess}
          />
        )}
      </Route>

      <Route path="/reports">
        {() => (
          <ReportSample
            loginModalOpen={loginModalOpen} setLoginModalOpen={setLoginModalOpen}
            signupModalOpen={signupModalOpen} setSignupModalOpen={setSignupModalOpen}
          />
        )}
      </Route>

      <Route path="/vin-decoder" component={VINDecoder} />

      <Route path="/vin-info">
        {() => (
          <VINDecoderPage
            loginModalOpen={loginModalOpen} setLoginModalOpen={setLoginModalOpen}
            signupModalOpen={signupModalOpen} setSignupModalOpen={setSignupModalOpen}
          />
        )}
      </Route>

      <Route path="/check-vin-report">
        {() => (
          <CheckVinReport
            loginModalOpen={loginModalOpen} setLoginModalOpen={setLoginModalOpen}
            signupModalOpen={signupModalOpen} setSignupModalOpen={setSignupModalOpen}
          />
        )}
      </Route>

      <Route path="/decoded-vin-result">
        {() => (
          <DecodedVinResult
            loginModalOpen={loginModalOpen} setLoginModalOpen={setLoginModalOpen}
            signupModalOpen={signupModalOpen} setSignupModalOpen={setSignupModalOpen}
          />
        )}
      </Route>

      <Route path="/about">
        {() => (
          <AboutUs
            loginModalOpen={loginModalOpen} setLoginModalOpen={setLoginModalOpen}
            signupModalOpen={signupModalOpen} setSignupModalOpen={setSignupModalOpen}
            isLoggedIn={isAuthenticated}
          />
        )}
      </Route>

      <Route path="/contact">
        {() => (
          <ContactUs
            loginModalOpen={loginModalOpen} setLoginModalOpen={setLoginModalOpen}
            signupModalOpen={signupModalOpen} setSignupModalOpen={setSignupModalOpen}
          />
        )}
      </Route>

      <Route path="/profile" component={Profile} />

      <Route path="/forgotpassword">
        {() => <ForgotPassword isOpen={true} onClose={() => setLocation('/')} />}
      </Route>
      <Route path="/otp-verification">
        {() => <OTPVerification isOpen={true} onClose={() => setLocation('/')} onVerificationSuccess={handleLoginSuccess} />}
      </Route>
      <Route path="/reset-password">
        {() => <ResetPassword isOpen={true} onClose={() => setLocation('/')} />}
      </Route>

      {/* Admin Routes */}
      <Route path="/admin-login">
        {() => <Login isAdminLogin={true} onLoginSuccess={handleLoginSuccess} />}
      </Route>

      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

// ===== App =====

function App() {
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [signupModalOpen, setSignupModalOpen] = useState(false);
  const { 
    user, 
    isAuthenticated, 
    checkAuth, 
    logout, 
    loading: authLoading 
  } = useAuthStore();
  const [authChecked, setAuthChecked] = useState(false);

  // التحقق من حالة المصادقة عند تحميل التطبيق
  useEffect(() => {
    const initAuth = async () => {
      await checkAuth();
      setAuthChecked(true);
    };
    initAuth();
  }, [checkAuth]);

  const handleLogout = useCallback(async () => {
    await logout();
  }, [logout]);

  if (!authChecked) {
    // انتظار التحقق من المصادقة قبل عرض التطبيق
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const userProfile = user ? {
    name: [user.first_name, user.last_name].filter(val => val && val !== 'undefined').join(' ').trim() || user.username,
    email: user.email,
    avatar: '/images/logo.png',
    isAdmin: user.is_staff || user.is_superuser
  } : undefined;

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster position="top-center" richColors />
          <div className="min-h-screen flex flex-col">
            <Header
              onLoginClick={() => setLoginModalOpen(true)}
              onSignupClick={() => setSignupModalOpen(true)}
              isLoggedIn={isAuthenticated}
              userProfile={userProfile}
              onProfileClick={() => { }}
              onLogout={handleLogout}
            />
            <main className="flex-1">
              <Router
                loginModalOpen={loginModalOpen} setLoginModalOpen={setLoginModalOpen}
                signupModalOpen={signupModalOpen} setSignupModalOpen={setSignupModalOpen}
              />
            </main>
            <Footer />
          </div>
          <AIChatInterface />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
