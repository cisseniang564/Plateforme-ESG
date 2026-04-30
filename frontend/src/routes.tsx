import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/layout/Layout';
import Spinner from '@/components/common/Spinner';

// ── Eager (public — chargés immédiatement, avant toute auth) ─────────────────
import Login from '@/pages/Auth/Login';
import Register from '@/pages/Auth/Register';
import ForgotPassword from '@/pages/Auth/ForgotPassword';
import LandingPage from '@/pages/Landing/LandingPage';
import NotFound from '@/pages/Errors/NotFound';

// ── Lazy — Dashboard ─────────────────────────────────────────────────────────
const ExecutiveDashboard  = lazy(() => import('@/pages/Dashboard/ExecutiveDashboard'));
const PillarDashboard     = lazy(() => import('@/pages/Dashboard/PillarDashboard'));

// ── Lazy — Data ──────────────────────────────────────────────────────────────
const DataManagement   = lazy(() => import('@/pages/Data/DataManagement'));
const UploadData       = lazy(() => import('@/pages/Data/UploadData'));
const DataQuality      = lazy(() => import('@/pages/Data/DataQuality'));
const Connectors       = lazy(() => import('@/pages/Data/Connectors'));
const EnedisConnector  = lazy(() => import('@/pages/Data/EnedisConnector'));

// ── Lazy — Data Entry ────────────────────────────────────────────────────────
const DataEntryForm    = lazy(() => import('@/pages/DataEntry/DataEntryForm'));
const ImportCSV        = lazy(() => import('@/pages/DataEntry/ImportCSV'));
const MyDataDashboard  = lazy(() => import('@/pages/DataEntry/MyDataDashboard'));
const CalculatedMetrics = lazy(() => import('@/pages/DataEntry/CalculatedMetrics'));
const DataExport       = lazy(() => import('@/pages/DataEntry/DataExport'));

// ── Lazy — Indicators ────────────────────────────────────────────────────────
const IndicatorsList    = lazy(() => import('@/pages/Indicators/IndicatorsList'));
const IndicatorDetail   = lazy(() => import('@/pages/Indicators/IndicatorDetail'));
const IndicatorComparison = lazy(() => import('@/pages/Indicators/IndicatorComparison'));

// ── Lazy — Scores ────────────────────────────────────────────────────────────
const ScoresDashboard  = lazy(() => import('@/pages/Scores/ScoresDashboard'));
const ScoresList       = lazy(() => import('@/pages/Scores/ScoresList'));
const ScoreHistory     = lazy(() => import('@/pages/Scores/ScoreHistory'));
const ScoreCalculation = lazy(() => import('@/pages/Scores/ScoreCalculation'));
const ScoreBreakdown   = lazy(() => import('@/pages/Scores/ScoreBreakdown'));
const OrganizationScoring = lazy(() => import('@/pages/Scores/OrganizationScoring'));

// ── Lazy — Reports ───────────────────────────────────────────────────────────
const ReportsUnified      = lazy(() => import('@/pages/Reports/ReportsUnified'));
const ReportsList         = lazy(() => import('@/pages/Reporting/ReportsList'));
const ReportGeneration    = lazy(() => import('@/pages/Reporting/ReportGeneration'));
const ScheduledReports    = lazy(() => import('@/pages/Reporting/ScheduledReports'));
const MultiStandardMapping = lazy(() => import('@/pages/Reports/MultiStandardMapping'));

// ── Lazy — Organizations ─────────────────────────────────────────────────────
const OrganizationsList    = lazy(() => import('@/pages/Organizations/OrganizationsList'));
const OrganizationDetail   = lazy(() => import('@/pages/Organizations/OrganizationDetail'));
const OrganizationComparator = lazy(() => import('@/pages/Organizations/OrganizationComparator'));

// ── Lazy — Materiality & Risks ───────────────────────────────────────────────
const MaterialityMatrix = lazy(() => import('@/pages/Materiality/MaterialityMatrix'));
const RiskRegister      = lazy(() => import('@/pages/Risks/RiskRegister'));

// ── Lazy — Analytics ─────────────────────────────────────────────────────────
const IntelligenceDashboard = lazy(() => import('@/pages/Analytics/IntelligenceDashboard'));
const AIInsights            = lazy(() => import('@/pages/Analytics/AIInsights'));
const DataQualityDashboard  = lazy(() => import('@/pages/DataQuality/DataQualityDashboard'));

// ── Lazy — Carbon ────────────────────────────────────────────────────────────
const BilanCarbone = lazy(() => import('@/pages/Carbon/BilanCarbone'));

// ── Lazy — Compliance & ESG ──────────────────────────────────────────────────
const TaxonomyAlignment        = lazy(() => import('@/pages/Compliance/TaxonomyAlignment'));
const MultiRegulatoryCompliance = lazy(() => import('@/pages/Compliance/MultiRegulatoryCompliance'));
const ESRSGapAnalysis          = lazy(() => import('@/pages/Compliance/ESRSGapAnalysis'));
const DecarbonationPlan        = lazy(() => import('@/pages/Decarbonation/DecarbonationPlan'));
const SupplyChainESG           = lazy(() => import('@/pages/SupplyChain/SupplyChainESG'));
const AuditTrail               = lazy(() => import('@/pages/Audit/AuditTrail'));
const ValidationWorkflow       = lazy(() => import('@/pages/Validation/ValidationWorkflow'));
const BenchmarkingDashboard    = lazy(() => import('@/pages/Benchmarking/BenchmarkingDashboard'));
const APIDocumentation         = lazy(() => import('@/pages/Developer/APIDocumentation'));

// ── Lazy — Settings ──────────────────────────────────────────────────────────
const TenantSettings       = lazy(() => import('@/pages/Settings/TenantSettings'));
const UserManagement       = lazy(() => import('@/pages/Settings/UserManagement'));
const MethodologyConfig    = lazy(() => import('@/pages/Settings/MethodologyConfig'));
const WebhookManagement    = lazy(() => import('@/pages/Webhooks/WebhookManagement'));
const IntegrationManagement = lazy(() => import('@/pages/Integrations/IntegrationManagement'));
const EntreprisesINSEE     = lazy(() => import('@/pages/INSEE/EntreprisesINSEE'));
const DataEnrichment       = lazy(() => import('@/pages/ESG/DataEnrichment'));

// ── Lazy — Divers ────────────────────────────────────────────────────────────
const NotificationsPage = lazy(() => import('@/pages/Notifications/NotificationsPage'));
const UserProfile       = lazy(() => import('@/pages/Profile/UserProfile'));
const BillingPage       = lazy(() => import('@/pages/Billing/BillingPage'));
const TwoFactorSetup    = lazy(() => import('@/pages/Auth/TwoFactorSetup'));
const TwoFactorVerify   = lazy(() => import('@/pages/Auth/TwoFactorVerify'));
const EmailVerification = lazy(() => import('@/pages/Auth/EmailVerification'));
const ResetPassword     = lazy(() => import('@/pages/Auth/ResetPassword'));
const FirstTimeSetup    = lazy(() => import('@/pages/Setup/FirstTimeSetup'));
const HelpCenter        = lazy(() => import('@/pages/Help/HelpCenter'));
const DemoPage          = lazy(() => import('@/pages/Demo/DemoPage'));
const Support           = lazy(() => import('@/pages/Support/Support'));
const SupplierPortal    = lazy(() => import('@/pages/SupplyChain/SupplierPortal'));
const TermsOfService    = lazy(() => import('@/pages/Legal/TermsOfService'));
const PrivacyPolicy     = lazy(() => import('@/pages/Legal/PrivacyPolicy'));
const LegalNotice       = lazy(() => import('@/pages/Legal/LegalNotice'));

// ── Fallback de chargement ───────────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-full min-h-[30vh]">
      <Spinner size="lg" />
    </div>
  );
}

/** Layout route qui enveloppe toutes les sous-routes dans un Suspense unique */
function SuspenseOutlet() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Outlet />
    </Suspense>
  );
}

// ── Auth guard ───────────────────────────────────────────────────────────────
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isInitializing } = useAuth();

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <Spinner size="lg" />
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

// ── Routes ───────────────────────────────────────────────────────────────────
export default function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* PUBLIC                                                             */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <Route path="/"                  element={<LandingPage />} />
        <Route path="/login"             element={<Login />} />
        <Route path="/register"          element={<Register />} />
        <Route path="/forgot-password"   element={<ForgotPassword />} />
        <Route path="/reset-password"    element={<ResetPassword />} />
        <Route path="/2fa/verify"        element={<TwoFactorVerify />} />
        <Route path="/verify-email"      element={<EmailVerification />} />
        <Route path="/terms-of-service"  element={<TermsOfService />} />
        <Route path="/privacy-policy"    element={<PrivacyPolicy />} />
        <Route path="/legal-notice"      element={<LegalNotice />} />
        <Route path="/support"           element={<Support />} />
        <Route path="/demo"              element={<DemoPage />} />
        <Route path="/help"              element={<HelpCenter />} />

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* ONBOARDING — sans sidebar/header                                   */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <Route
          path="/app/setup"
          element={<PrivateRoute><FirstTimeSetup /></PrivateRoute>}
        />

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* APP — routes privées avec Layout                                   */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <Route
          path="/app"
          element={<PrivateRoute><Layout /></PrivateRoute>}
        >
          {/* SuspenseOutlet applique un seul Suspense à toutes les sous-routes */}
          <Route element={<SuspenseOutlet />}>

            {/* Dashboard */}
            <Route index                           element={<ExecutiveDashboard />} />
            <Route path="dashboard/pillar/:pillar" element={<PillarDashboard />} />

            {/* Data Management */}
            <Route path="data"              element={<DataManagement />} />
            <Route path="data/upload"       element={<UploadData />} />
            <Route path="data/quality"      element={<DataQuality />} />
            <Route path="data/connectors"   element={<Connectors />} />
            <Route path="connectors/enedis" element={<EnedisConnector />} />

            {/* Data Entry */}
            <Route path="data-entry"         element={<DataEntryForm />} />
            <Route path="import-csv"         element={<ImportCSV />} />
            <Route path="my-data"            element={<MyDataDashboard />} />
            <Route path="calculated-metrics" element={<CalculatedMetrics />} />
            <Route path="data-export"        element={<DataExport />} />

            {/* Indicators */}
            <Route path="indicators"         element={<IndicatorsList />} />
            <Route path="indicators/compare" element={<IndicatorComparison />} />
            <Route path="indicators/:id"     element={<IndicatorDetail />} />

            {/* Scores */}
            <Route path="scores"             element={<ScoresDashboard />} />
            <Route path="scores/list"        element={<ScoresList />} />
            <Route path="scores/history"     element={<ScoreHistory />} />
            <Route path="scores/calculate"   element={<ScoreCalculation />} />
            <Route path="scores/breakdown"   element={<ScoreBreakdown />} />
            <Route path="scores/:id"         element={<OrganizationScoring />} />

            {/* Reports */}
            <Route path="reports"                element={<ReportsUnified />} />
            <Route path="reports/list"           element={<ReportsList />} />
            <Route path="reports/generate"       element={<ReportGeneration />} />
            <Route path="reports/scheduled"      element={<ScheduledReports />} />
            <Route path="reports/multi-standards" element={<MultiStandardMapping />} />

            {/* Materiality & Risks */}
            <Route path="materiality" element={<MaterialityMatrix />} />
            <Route path="risks"       element={<RiskRegister />} />

            {/* Analytics & Intelligence */}
            <Route path="intelligence"  element={<IntelligenceDashboard />} />
            <Route path="ai-insights"   element={<AIInsights />} />
            <Route path="data-quality"  element={<DataQualityDashboard />} />

            {/* Carbon */}
            <Route path="carbon" element={<BilanCarbone />} />

            {/* ESG avancé */}
            <Route path="taxonomy"     element={<TaxonomyAlignment />} />
            <Route path="compliance"   element={<MultiRegulatoryCompliance />} />
            <Route path="esrs-gap"     element={<ESRSGapAnalysis />} />
            <Route path="decarbonation" element={<DecarbonationPlan />} />
            <Route path="supply-chain" element={<SupplyChainESG />} />
            <Route path="audit-trail"  element={<AuditTrail />} />
            <Route path="validation"   element={<ValidationWorkflow />} />
            <Route path="benchmarking" element={<BenchmarkingDashboard />} />
            <Route path="api-docs"     element={<APIDocumentation />} />

            {/* Organizations */}
            <Route path="organizations"         element={<OrganizationsList />} />
            <Route path="organizations/compare" element={<OrganizationComparator />} />
            <Route path="organizations/:id"     element={<OrganizationDetail />} />

            {/* Settings */}
            <Route path="settings"                  element={<TenantSettings />} />
            <Route path="settings/users"            element={<UserManagement />} />
            <Route path="settings/methodology"      element={<MethodologyConfig />} />
            <Route path="settings/webhooks"         element={<WebhookManagement />} />
            <Route path="settings/integrations"     element={<IntegrationManagement />} />
            <Route path="settings/insee"            element={<EntreprisesINSEE />} />
            <Route path="settings/esg-enrichment"   element={<DataEnrichment />} />

            {/* Divers */}
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="profile"       element={<UserProfile />} />
            <Route path="billing"       element={<BillingPage />} />
            <Route path="2fa/setup"     element={<TwoFactorSetup />} />

          </Route>{/* /SuspenseOutlet */}
        </Route>

        {/* Portail fournisseur — public, sans auth */}
        <Route path="/supplier-portal/:token" element={<SupplierPortal />} />

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
