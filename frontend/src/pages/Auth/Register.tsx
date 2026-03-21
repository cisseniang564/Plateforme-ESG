import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Mail,
  Lock,
  User,
  Building2,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Shield
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import Button from '@/components/common/Button';
import api from '@/services/api';

export default function Register() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    companyName: '',
    acceptTerms: false
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) newErrors.firstName = t('auth.firstNameRequired');
    if (!formData.lastName.trim()) newErrors.lastName = t('auth.lastNameRequired');
    if (!formData.email.trim()) {
      newErrors.email = t('auth.emailRequired');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('auth.emailInvalid');
    }
    if (!formData.password) {
      newErrors.password = t('auth.passwordRequired');
    } else if (formData.password.length < 8) {
      newErrors.password = t('auth.passwordMinLength');
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = t('auth.passwordComplexity');
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = t('auth.passwordMismatch');
    }
    if (!formData.companyName.trim()) newErrors.companyName = t('auth.companyRequired');
    if (!formData.acceptTerms) newErrors.acceptTerms = t('auth.termsRequired');

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error(t('auth.fixErrors'));
      return;
    }

    setLoading(true);
    try {
      // Generate a URL-safe slug from the company name
      const tenantSlug = formData.companyName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 100) || 'company';

      // Onboarding API call (creates tenant + admin user)
      await api.post('/auth/onboard', {
        tenant_name: formData.companyName,
        tenant_slug: tenantSlug,
        plan_tier: 'starter',
        admin_email: formData.email,
        admin_password: formData.password,
        admin_first_name: formData.firstName,
        admin_last_name: formData.lastName,
        org_name: formData.companyName,
      });

      toast.success(t('auth.registrationSuccess'));
      navigate('/login');
    } catch (error: any) {
      const detail = error.response?.data?.detail;
      const message = Array.isArray(detail)
        ? detail[0]?.msg || t('auth.registrationError')
        : detail || t('auth.registrationError');
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = () => {
    const password = formData.password;
    if (!password) return { strength: 0, label: '', color: '' };

    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    const levels = [
      { label: t('auth.passwordStrengthVeryWeak'), color: 'bg-red-500' },
      { label: t('auth.passwordStrengthWeak'), color: 'bg-orange-500' },
      { label: t('auth.passwordStrengthMedium'), color: 'bg-yellow-500' },
      { label: t('auth.passwordStrengthGood'), color: 'bg-green-500' },
      { label: t('auth.passwordStrengthExcellent'), color: 'bg-green-600' }
    ];

    return { strength, ...levels[Math.min(strength, 4)] };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Left Side - Branding */}
        <div className="hidden lg:flex flex-col justify-center p-12 bg-gradient-to-br from-primary-600 to-primary-800 rounded-2xl text-white">
          <div className="mb-8">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-sm">
              <Sparkles className="h-8 w-8" />
            </div>
            <h1 className="text-4xl font-bold mb-4">{t('auth.joinEsgflow')}</h1>
            <p className="text-xl text-white/90 mb-8">
              {t('auth.platformTagline')}
            </p>
          </div>

          <div className="space-y-6">
            {[
              { icon: Shield, titleKey: 'auth.featureMaxSecurity', descKey: 'auth.featureMaxSecurityDesc' },
              { icon: Sparkles, titleKey: 'auth.featureAI', descKey: 'auth.featureAIDesc' },
              { icon: CheckCircle, titleKey: 'auth.featureCompliance', descKey: 'auth.featureComplianceDesc' }
            ].map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <div key={idx} className="flex items-start gap-4">
                  <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{t(feature.titleKey)}</h3>
                    <p className="text-sm text-white/80">{t(feature.descKey)}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-12 p-6 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20">
            <p className="text-sm text-white/90">
              "ESGFlow a transformé notre approche ESG. En 3 mois, nous avons amélioré notre score de 40%."
            </p>
            <p className="text-sm font-semibold mt-2">— Marie Dupont, Directrice RSE</p>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 lg:p-12">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">{t('auth.createAccount')}</h2>
            <p className="text-gray-600">
              {t('auth.alreadyRegistered')}{' '}
              <Link to="/login" className="text-primary-600 hover:text-primary-700 font-semibold">
                {t('auth.signIn')}
              </Link>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* First name & Last name */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('auth.firstName')} *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className={`w-full pl-11 pr-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-primary-500 transition-all ${
                      errors.firstName ? 'border-red-300' : 'border-gray-200'
                    }`}
                    placeholder="Jean"
                  />
                </div>
                {errors.firstName && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.firstName}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('auth.lastName')} *
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-primary-500 transition-all ${
                    errors.lastName ? 'border-red-300' : 'border-gray-200'
                  }`}
                  placeholder="Dupont"
                />
                {errors.lastName && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.lastName}
                  </p>
                )}
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {t('auth.professionalEmail')} *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`w-full pl-11 pr-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-primary-500 transition-all ${
                    errors.email ? 'border-red-300' : 'border-gray-200'
                  }`}
                  placeholder="jean.dupont@entreprise.com"
                />
              </div>
              {errors.email && (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.email}
                </p>
              )}
            </div>

            {/* Company */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {t('auth.companyName')} *
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  className={`w-full pl-11 pr-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-primary-500 transition-all ${
                    errors.companyName ? 'border-red-300' : 'border-gray-200'
                  }`}
                  placeholder="Acme Corp"
                />
              </div>
              {errors.companyName && (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.companyName}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {t('auth.password')} *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className={`w-full pl-11 pr-12 py-3 border-2 rounded-xl focus:ring-2 focus:ring-primary-500 transition-all ${
                    errors.password ? 'border-red-300' : 'border-gray-200'
                  }`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>

              {/* Password Strength */}
              {formData.password && (
                <div className="mt-2">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-2 ${passwordStrength().color} transition-all duration-300`}
                        style={{ width: `${(passwordStrength().strength / 5) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-600">
                      {passwordStrength().label}
                    </span>
                  </div>
                </div>
              )}

              {errors.password && (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.password}
                </p>
              )}
            </div>

            {/* Confirm password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {t('auth.confirmPassword')} *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className={`w-full pl-11 pr-12 py-3 border-2 rounded-xl focus:ring-2 focus:ring-primary-500 transition-all ${
                    errors.confirmPassword ? 'border-red-300' : 'border-gray-200'
                  }`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            {/* Terms */}
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="terms"
                checked={formData.acceptTerms}
                onChange={(e) => setFormData({ ...formData, acceptTerms: e.target.checked })}
                className="mt-1 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor="terms" className="text-sm text-gray-600">
                {t('auth.acceptTerms')}{' '}
                <Link to="/terms-of-service" className="text-primary-600 hover:underline font-medium">
                  {t('auth.termsOfUse')}
                </Link>
                {' '}{t('auth.and')}{' '}
                <Link to="/privacy-policy" className="text-primary-600 hover:underline font-medium">
                  {t('auth.privacyPolicy')}
                </Link>
              </label>
            </div>
            {errors.acceptTerms && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.acceptTerms}
              </p>
            )}

            {/* Submit */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full py-4 text-base font-semibold"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2" />
                  {t('auth.creatingAccount')}
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5 mr-2" />
                  {t('auth.createMyAccount')}
                </>
              )}
            </Button>
          </form>

          <p className="text-xs text-center text-gray-500 mt-6">
            {t('auth.trialInfo')}
          </p>
        </div>
      </div>
    </div>
  );
}
