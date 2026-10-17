import { createContext, type ReactNode, useContext, useState } from 'react';

type AuthContextValue = {
  isSignedIn: boolean;
  signIn: () => void;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

// Mock auth until the backend exists. Starts signed in so screens can be built
// without going through the sign-in flow; use "Sign out" in Account to test it.
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isSignedIn, setIsSignedIn] = useState(true);

  const value: AuthContextValue = {
    isSignedIn,
    signIn: () => setIsSignedIn(true),
    signOut: () => setIsSignedIn(false),
  };

  return <AuthContext value={value}>{children}</AuthContext>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
};
