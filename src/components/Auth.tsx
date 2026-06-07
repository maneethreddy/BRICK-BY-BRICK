import React, { useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../firebase';
import { KeyRound, Mail, Sparkles, CheckSquare, AlertTriangle } from 'lucide-react';

export const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email.trim(), password);
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
    } catch (err: any) {
      console.error('Email Auth Error:', err);
      // Clean up Firebase error messages to be user-friendly
      const rawCode = err.code || '';
      if (rawCode === 'auth/invalid-credential') {
        setError('Invalid email or password. Please try again.');
      } else if (rawCode === 'auth/email-already-in-use') {
        setError('This email is already registered. Try logging in.');
      } else if (rawCode === 'auth/weak-password') {
        setError('Password should be at least 6 characters long.');
      } else if (rawCode === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else {
        setError(err.message || 'Authentication failed. Please check credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError('');
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error('Google Auth Error:', err);
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(err.message || 'Failed to authenticate with Google.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen text-gray-100 flex flex-col items-center justify-center p-4 bg-dark-bg selection:bg-emerald-500/30 selection:text-white">
      
      {/* Configuration Missing Warning */}
      {!isFirebaseConfigured && (
        <div className="max-w-md w-full mb-6 p-4 rounded-xl border border-amber-500/30 bg-amber-950/10 backdrop-blur-md flex gap-3 text-sm text-amber-200">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <div>
            <h5 className="font-bold">Configuration Required</h5>
            <p className="text-xs text-amber-300/80 mt-0.5">
              Please copy the credentials from your Firebase Console and paste them into the <code className="bg-black/40 px-1 py-0.5 rounded">.env.local</code> file to run the app.
            </p>
          </div>
        </div>
      )}

      {/* Main Auth Panel */}
      <div className="w-full max-w-md p-8 rounded-2xl border border-white/5 glass-panel shadow-2xl animate-zoom-in">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center gap-3 text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-950/40">
            <CheckSquare className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
              Brick by Brick
            </h1>
            <p className="text-[10px] text-emerald-400 font-bold tracking-wider uppercase mt-1">
              Sign in to sync your progress
            </p>
          </div>
        </div>

        {/* Display Error Message */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-semibold leading-relaxed">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleEmailAuth} className="flex flex-col gap-4">
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5 pl-1">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={loading || !isFirebaseConfigured}
                className="w-full pl-9 pr-4 py-3 rounded-xl border border-white/10 bg-black/20 focus:border-emerald-500/50 focus:bg-black/30 focus:ring-1 focus:ring-emerald-500/50 text-white text-sm outline-none transition-all placeholder-gray-600"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5 pl-1">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                <KeyRound className="w-4 h-4" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading || !isFirebaseConfigured}
                className="w-full pl-9 pr-4 py-3 rounded-xl border border-white/10 bg-black/20 focus:border-emerald-500/50 focus:bg-black/30 focus:ring-1 focus:ring-emerald-500/50 text-white text-sm outline-none transition-all placeholder-gray-600"
              />
            </div>
          </div>

          {/* Action button */}
          <button
            type="submit"
            disabled={loading || !isFirebaseConfigured}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:pointer-events-none text-sm font-bold text-white shadow-lg shadow-emerald-950/40 hover:shadow-emerald-900/50 transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                {isSignUp ? 'Create Account' : 'Sign In with Email'}
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-6 flex items-center">
          <div className="flex-grow border-t border-white/5" />
          <span className="flex-shrink mx-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
            or continue with
          </span>
          <div className="flex-grow border-t border-white/5" />
        </div>

        {/* OAuth Buttons */}
        <div className="flex flex-col gap-3">
          {/* Google Button */}
          <button
            type="button"
            onClick={handleGoogleAuth}
            disabled={loading || !isFirebaseConfigured}
            className="w-full py-3 px-4 rounded-xl bg-white/5 border border-white/5 text-sm font-semibold hover:bg-white/10 text-gray-300 hover:text-white transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
          >
            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Google Account
          </button>
        </div>

        {/* Switch Sign-in Modes */}
        <div className="mt-8 text-center text-xs text-gray-500 font-semibold tracking-wider uppercase">
          {isSignUp ? (
            <span>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setError('');
                  setIsSignUp(false);
                }}
                className="text-emerald-400 hover:text-emerald-300 underline underline-offset-4 cursor-pointer font-bold ml-1"
              >
                Sign In
              </button>
            </span>
          ) : (
            <span>
              Need an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setError('');
                  setIsSignUp(true);
                }}
                className="text-emerald-400 hover:text-emerald-300 underline underline-offset-4 cursor-pointer font-bold ml-1"
              >
                Sign Up
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
