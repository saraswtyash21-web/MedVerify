// MedVerify Authentication Pages
// Sign-in and Sign-up forms with validation

import { useState, FormEvent } from 'react';
import { useAuth } from '../contexts';
import { Shield, Eye, EyeOff, Mail, Lock, User, ArrowRight, AlertCircle, AlertTriangle, CheckCircle, Info } from 'lucide-react';

type AuthPage = 'signin' | 'signup';
type Language = 'en' | 'hi';

interface AuthPagesProps {
  language: Language;
  initialPage?: AuthPage;
  onSwitchPage: (page: AuthPage) => void;
}

export function SignInPage({ language, onSwitchPage }: AuthPagesProps) {
  const { signIn, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const result = await signIn(email, password);
    if (result.success) {
      setSuccess(language === 'hi' ? 'सफलतापूर्वक साइन इन हो गया!' : 'Successfully signed in!');
    } else {
      setError(result.error || (language === 'hi' ? 'साइन इन विफल रहा' : 'Sign in failed'));
    }
  };

  const isHi = language === 'hi';

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-ivory">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-deep rounded-2xl mb-4 shadow-lg">
            <Shield className="w-8 h-8 text-gold" />
          </div>
          <h1 className="font-display text-2xl font-bold text-charcoal">MedVerify</h1>
          <p className="text-sm text-text-main/60 mt-1">
            {isHi ? 'अपने अकाउंट में साइन इन करें' : 'Sign in to your account'}
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-sage/20 p-6 md:p-8">
          {/* Demo Notice — prominent and honest */}
          <div role="status" className="bg-gold/10 border border-gold/20 rounded-xl p-3 mb-5 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-gold mt-0.5 flex-shrink-0" aria-hidden="true" />
            <div>
              <p className="text-xs font-semibold text-gold mb-0.5">
                {isHi ? 'डेमो-केवल लॉगिन — सुरक्षित नहीं' : 'Demo-only login — NOT secure'}
              </p>
              <p className="text-xs text-text-main/70 leading-relaxed">
                {isHi 
                  ? 'यह UI-मात्र डेमो है। कोई वास्तविक प्रमाणीकरण सेवा कॉन्फ़िगर नहीं है। पासवर्ड सहेजे नहीं जाते — केवल ईमेल ट्रैक किया जाता है। किसी भी मान्य ईमेल और 6+ अक्षरों के पासवर्ड से प्रवेश करें।'
                  : 'This is a UI-only demo. No real authentication service is configured. Passwords are not stored — only the email address is tracked. Sign in with any valid email and password (6+ characters).'}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Email */}
            <div>
              <label htmlFor="signin-email" className="block text-sm font-medium text-charcoal mb-1.5">
                {isHi ? 'ईमेल पता' : 'Email address'}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-main/40" />
                <input
                  id="signin-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={isHi ? 'आपका ईमेल' : 'your@email.com'}
                  required
                  autoComplete="email"
                  aria-describedby={error ? 'signin-error' : undefined}
                  className="w-full pl-10 pr-4 py-3 border border-sage/30 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-deep/20 focus:border-emerald-deep/40 bg-ivory/50"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="signin-password" className="block text-sm font-medium text-charcoal mb-1.5">
                {isHi ? 'पासवर्ड' : 'Password'}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-main/40" />
                <input
                  id="signin-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isHi ? 'आपका पासवर्ड' : '••••••••'}
                  required
                  minLength={6}
                  autoComplete="current-password"
                  className="w-full pl-10 pr-12 py-3 border border-sage/30 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-deep/20 focus:border-emerald-deep/40 bg-ivory/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-text-main/40 hover:text-text-main/70 transition-colors"
                  aria-label={showPassword ? (isHi ? 'पासवर्ड छुपाएं' : 'Hide password') : (isHi ? 'पासवर्ड दिखाएं' : 'Show password')}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div id="signin-error" role="alert" className="flex items-center gap-2 p-3 bg-warning-light border border-warning/20 rounded-xl text-sm text-warning animate-fade-in">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div role="status" className="flex items-center gap-2 p-3 bg-positive-light border border-positive/20 rounded-xl text-sm text-positive animate-fade-in">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                {success}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-deep text-white rounded-xl font-semibold hover:bg-emerald-light transition-all shadow-lg shadow-emerald-deep/20 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {isHi ? 'साइन इन हो रहा है...' : 'Signing in...'}
                </>
              ) : (
                <>
                  {isHi ? 'साइन इन करें' : 'Sign In'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Switch to Sign Up */}
          <div className="mt-6 text-center">
            <p className="text-sm text-text-main/60">
              {isHi ? 'अकाउंट नहीं है?' : "Don't have an account?"}{' '}
              <button
                onClick={() => onSwitchPage('signup')}
                className="text-emerald-deep font-medium hover:underline"
              >
                {isHi ? 'साइन अप करें' : 'Sign Up'}
              </button>
            </p>
          </div>
        </div>

        {/* Configuration Note */}
        <p className="text-xs text-text-main/40 text-center mt-4 max-w-sm mx-auto">
          {isHi
            ? 'वास्तविक प्रमाणीकरण के लिए, Firebase Auth, Auth0, या Supabase Auth जैसी सेवा कॉन्फ़िगर करें।'
            : 'For real authentication, configure a service like Firebase Auth, Auth0, or Supabase Auth.'}
        </p>
      </div>
    </div>
  );
}

export function SignUpPage({ language, onSwitchPage }: AuthPagesProps) {
  const { signUp, isLoading } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password !== confirmPassword) {
      setError(language === 'hi' ? 'पासवर्ड मेल नहीं खाते।' : 'Passwords do not match.');
      return;
    }

    const result = await signUp(name, email, password);
    if (result.success) {
      setSuccess(language === 'hi' ? 'अकाउंट सफलतापूर्वक बनाया गया!' : 'Account created successfully!');
    } else {
      setError(result.error || (language === 'hi' ? 'साइन अप विफल रहा' : 'Sign up failed'));
    }
  };

  const isHi = language === 'hi';

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-ivory">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-deep rounded-2xl mb-4 shadow-lg">
            <Shield className="w-8 h-8 text-gold" />
          </div>
          <h1 className="font-display text-2xl font-bold text-charcoal">MedVerify</h1>
          <p className="text-sm text-text-main/60 mt-1">
            {isHi ? 'नया अकाउंट बनाएं' : 'Create a new account'}
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-sage/20 p-6 md:p-8">
          {/* Demo Notice — prominent and honest */}
          <div role="status" className="bg-gold/10 border border-gold/20 rounded-xl p-3 mb-5 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-gold mt-0.5 flex-shrink-0" aria-hidden="true" />
            <div>
              <p className="text-xs font-semibold text-gold mb-0.5">
                {isHi ? 'डेमो-केवल — सुरक्षित नहीं' : 'Demo-only — NOT secure'}
              </p>
              <p className="text-xs text-text-main/70 leading-relaxed">
                {isHi 
                  ? 'यह UI-मात्र डेमो है। कोई वास्तविक बैकएंड नहीं। पासवर्ड सहेजे नहीं जाते — केवल ईमेल ट्रैक किया जाता है। उत्पादन के लिए उपयुक्त नहीं।'
                  : 'This is a UI-only demo. No real backend. Passwords are not stored — only the email address is tracked. Not suitable for production.'}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Name */}
            <div>
              <label htmlFor="signup-name" className="block text-sm font-medium text-charcoal mb-1.5">
                {isHi ? 'पूरा नाम' : 'Full name'}
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-main/40" />
                <input
                  id="signup-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={isHi ? 'आपका नाम' : 'Your name'}
                  required
                  minLength={2}
                  autoComplete="name"
                  className="w-full pl-10 pr-4 py-3 border border-sage/30 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-deep/20 focus:border-emerald-deep/40 bg-ivory/50"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="signup-email" className="block text-sm font-medium text-charcoal mb-1.5">
                {isHi ? 'ईमेल पता' : 'Email address'}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-main/40" />
                <input
                  id="signup-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={isHi ? 'आपका ईमेल' : 'your@email.com'}
                  required
                  autoComplete="email"
                  className="w-full pl-10 pr-4 py-3 border border-sage/30 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-deep/20 focus:border-emerald-deep/40 bg-ivory/50"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="signup-password" className="block text-sm font-medium text-charcoal mb-1.5">
                {isHi ? 'पासवर्ड' : 'Password'}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-main/40" />
                <input
                  id="signup-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isHi ? 'कम से कम 6 अक्षर' : 'At least 6 characters'}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="w-full pl-10 pr-12 py-3 border border-sage/30 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-deep/20 focus:border-emerald-deep/40 bg-ivory/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-text-main/40 hover:text-text-main/70 transition-colors"
                  aria-label={showPassword ? (isHi ? 'पासवर्ड छुपाएं' : 'Hide password') : (isHi ? 'पासवर्ड दिखाएं' : 'Show password')}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="signup-confirm" className="block text-sm font-medium text-charcoal mb-1.5">
                {isHi ? 'पासवर्ड की पुष्टि करें' : 'Confirm password'}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-main/40" />
                <input
                  id="signup-confirm"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={isHi ? 'पासवर्ड दोबारा दर्ज करें' : 'Re-enter password'}
                  required
                  autoComplete="new-password"
                  className="w-full pl-10 pr-4 py-3 border border-sage/30 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-deep/20 focus:border-emerald-deep/40 bg-ivory/50"
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div role="alert" className="flex items-center gap-2 p-3 bg-warning-light border border-warning/20 rounded-xl text-sm text-warning animate-fade-in">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div role="status" className="flex items-center gap-2 p-3 bg-positive-light border border-positive/20 rounded-xl text-sm text-positive animate-fade-in">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                {success}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-deep text-white rounded-xl font-semibold hover:bg-emerald-light transition-all shadow-lg shadow-emerald-deep/20 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {isHi ? 'अकाउंट बनाया जा रहा है...' : 'Creating account...'}
                </>
              ) : (
                <>
                  {isHi ? 'साइन अप करें' : 'Create Account'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Switch to Sign In */}
          <div className="mt-6 text-center">
            <p className="text-sm text-text-main/60">
              {isHi ? 'पहले से अकाउंट है?' : 'Already have an account?'}{' '}
              <button
                onClick={() => onSwitchPage('signin')}
                className="text-emerald-deep font-medium hover:underline"
              >
                {isHi ? 'साइन इन करें' : 'Sign In'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
