import { lazy, Suspense, useEffect, useState } from 'react';
import { Routes, Route, Navigate, Outlet, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { usePlan, FeatureKey } from '@/hooks/usePlan';
import PlanGate from '@/components/common/PlanGate';
import Layout from '@/components/layout/Layout';
import Spinner from '@/components/common/Spinner';
import LoadingSkeleton from '@/components/common/LoadingSkeleton';
import api from '@/services/api';
import { ShieldAlert } from 'lucide-react';

// ── Eager (public — chargés immédiatement, avant toute auth) ─────────────────
import Login from '@/pages/Auth/Login';
import Register from '@/pages/Auth/Register';
import ForgotPassword from '@/pages/Auth/ForgotPassword';
import LandingPage from '@/pages/Landing/LandingPage';
import NotFound from '@/pages/Errors/NotFound';

// ── Lazy — Public marketing pages ────────────────────────────────────────────
const ComparisonPage  = lazy(() => import('@/pages/Compare/ComparisonPage'));
const SecurityPage    = lazy(() => import('@/pages/Security/SecurityPage'));
const StatusPage      = lazy(() => import('@/pages/Status/StatusPage'));
const GuideCsrdPmePage      = lazy(() => import('@/pages/Resources/GuideCsrdPmePage'));
const GuideBilanCarbonePage = lazy(() => import('@/pages/Resources/GuideBilanCarbonePage'));
const GuideCsdddPage        = lazy(() => import('@/pages/Resources/GuideCsdddPage'));
const ChecklistCsrdPage  = lazy(() => import('@/pages/Resources/ChecklistCsrdPage'));
const PartnersPage       = lazy(() => import('@/pages/Resources/PartnersPage'));
const RoadmapPage        = lazy(() => import('@/pages/Resources/RoadmapPage'));
const OmnibusCsrdPage = lazy(() => import('@/pages/Resources/OmnibusCsrdPage'));
const Scope3FecPage   = lazy(() => import('@/pages/Resources/Scope3FecPage'));
const TaxonomiePage   = lazy(() => import('@/pages/Resources/TaxonomiePage'));
const ResourcesIndex  = lazy(() => import('@/pages/Resources/ResourcesIndex'));

const ContactPage = lazy(() => import('@/pages/Contact/ContactPage'));

// ── Lazy — Feature detail pages ─────────────────────────────────────────────
const BilanCarboneFeature     = lazy(() => import('@/pages/Features/BilanCarbonePage'));
const CSRDReportingFeature    = lazy(() => import('@/pages/Features/CSRDReportingPage'));
const SupplyChainFeature      = lazy(() => import('@/pages/Features/SupplyChainPage'));
const DecarbonationFeature    = lazy(() => import('@/pages/Features/DecarbonationPage'));
const DoubleMaterialiteFeature = lazy(() => import('@/pages/Features/DoubleMaterialitePage'));
const TaxonomieUEFeature      = lazy(() => import('@/pages/Features/TaxonomieUEPage'));
const AIAutomationFeature     = lazy(() => import('@/pages/Features/AIAutomationPage'));
const AuditTrailFeature       = lazy(() => import('@/pages/Features/AuditTrailPage'));
const VigilanceFeature        = lazy(() => import('@/pages/Features/VigilancePage'));
const CabinetFeature          = lazy(() => import('@/pages/Features/CabinetPage'));
const IXBRLFeature            = lazy(() => import('@/pages/Features/IXBRLPage'));
const StandardsPage           = lazy(() => import('@/pages/Features/StandardsPage'));

// ── Lazy — Dashboard ─────────────────────────────────────────────────────────
const ExecutiveDashboard  = lazy(() => import('@/pages/Dashboard/ExecutiveDashboard'));
const PillarDashboard     = lazy(() => import('@/pages/Dashboard/PillarDashboard'));

// ── Lazy — Data ──────────────────────────────────────────────────────────────
const DataManagement   = lazy(() => import('@/pages/Data/DataManagement'));
const UploadData       = lazy(() => import('@/pages/Data/UploadData'));
// DataQuality (legacy /app/data/quality) removed — use DataQualityDashboard at /app/data-quality
const Connectors       = lazy(() => import('@/pages/Data/Connectors'));
const ConnectorMarketplace = lazy(() => import('@/pages/Data/ConnectorMarketplace'));
const EnedisConnector      = lazy(() => import('@/pages/Data/EnedisConnector'));
const PennylaneConnector   = lazy(() => import('@/pages/Data/PennylaneConnector'));
const QontoConnector       = lazy(() => import('@/pages/Data/QontoConnector'));
const HRImport             = lazy(() => import('@/pages/Data/HRImport'));

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
const CSRDBuilder          = lazy(() => import('@/pages/Reports/CSRDBuilder'));
const DPEFReport           = lazy(() => import('@/pages/Reports/DPEFReport'));

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
const Scope3Calculator = lazy(() => import('@/pages/Carbon/Scope3Calculator'));

// ── Lazy — Compliance & ESG ──────────────────────────────────────────────────
const TaxonomyAlignment        = lazy(() => import('@/pages/Compliance/TaxonomyAlignment'));
const MultiRegulatoryCompliance = lazy(() => import('@/pages/Compliance/MultiRegulatoryCompliance'));
const ESRSGapAnalysis          = lazy(() => import('@/pages/Compliance/ESRSGapAnalysis'));
const CSRDProgress             = lazy(() => import('@/pages/Compliance/CSRDProgress'));
const ConsolidatedView         = lazy(() => import('@/pages/Organizations/ConsolidatedView'));
const VigilancePlan            = lazy(() => import('@/pages/Compliance/VigilancePlan'));
const PublicWhistleblowing     = lazy(() => import('@/pages/Public/PublicWhistleblowing'));
const SectoralTemplates        = lazy(() => import('@/pages/Templates/SectoralTemplates'));
const FECWizard                = lazy(() => import('@/pages/Carbon/FECWizard'));
const TCFDBuilder              = lazy(() => import('@/pages/Compliance/TCFDBuilder'));
const SBTiWorkflow             = lazy(() => import('@/pages/Compliance/SBTiWorkflow'));
const ESRSEnvironmental        = lazy(() => import('@/pages/Compliance/ESRSEnvironmental'));
const ESRSSocial               = lazy(() => import('@/pages/Compliance/ESRSSocial'));
const ESRSGovernance           = lazy(() => import('@/pages/Compliance/ESRSGovernance'));
const SFDRDisclosure           = lazy(() => import('@/pages/Compliance/SFDRDisclosure'));
const BCorp                    = lazy(() => import('@/pages/Compliance/BCorp'));
const GRIDisclosure            = lazy(() => import('@/pages/Compliance/GRIDisclosure'));
const ESRSWaterWaste           = lazy(() => import('@/pages/Compliance/ESRSWaterWaste'));
const CDPReporting             = lazy(() => import('@/pages/Compliance/CDPReporting'));
const CSDDD                    = lazy(() => import('@/pages/Compliance/CSDDD'));

// ── Lazy — Sustainability ────────────────────────────────────────────────────
const SDGMapping               = lazy(() => import('@/pages/Sustainability/SDGMapping'));
const StakeholderSurveys       = lazy(() => import('@/pages/Stakeholders/StakeholderSurveys'));

// ── Lazy — Enterprise (long-term) ────────────────────────────────────────────
const ClimateScenarios         = lazy(() => import('@/pages/Compliance/ClimateScenarios'));
const InvestorRelations        = lazy(() => import('@/pages/InvestorRelations/InvestorRelations'));
const IXBRLTagging             = lazy(() => import('@/pages/Compliance/IXBRLTagging'));

// ── Lazy — Cabinet ───────────────────────────────────────────────────────────
const CabinetDashboard         = lazy(() => import('@/pages/Cabinet/CabinetDashboard'));
const DecarbonationPlan        = lazy(() => import('@/pages/Decarbonation/DecarbonationPlan'));
const LCADashboard             = lazy(() => import('@/pages/LCA/LCADashboard'));
const SupplyChainESG           = lazy(() => import('@/pages/SupplyChain/SupplyChainESG'));
const AuditTrail               = lazy(() => import('@/pages/Audit/AuditTrail'));
const AuditorReview            = lazy(() => import('@/pages/Audit/AuditorReview'));
const PublicSurvey             = lazy(() => import('@/pages/Stakeholders/PublicSurvey'));
const AuditPreparation         = lazy(() => import('@/pages/Audit/AuditPreparation'));
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
const CGV               = lazy(() => import('@/pages/Legal/CGV'));

// ── Fallback de chargement ───────────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-full min-h-[30vh]">
      <Spinner size="lg" />
    </div>
  );
}

/** Skeleton contextuel pour les pages internes — impression de vitesse */
function AppPageSkeleton() {
  return <LoadingSkeleton type="dashboard" />;
}

/** Layout route qui enveloppe toutes les sous-routes dans un Suspense unique */
function SuspenseOutlet() {
  return (
    <Suspense fallback={<AppPageSkeleton />}>
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

// ── Admin role guard ─────────────────────────────────────────────────────────
// Module-level cache — avoids repeating the API call on each navigation.
// Resets when the tab is closed (sessionStorage lifetime).
const ADMIN_ROLES = new Set(['tenant_admin', 'esg_admin', 'admin']);
let _cachedRole: string | null | undefined = undefined; // undefined = not fetched yet

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const { isAuthenticated, isInitializing, user } = useAuth();
  const [roleName, setRoleName] = useState<string | null | undefined>(_cachedRole);
  const [checking, setChecking] = useState(_cachedRole === undefined);

  useEffect(() => {
    // Already cached — nothing to do
    if (_cachedRole !== undefined) { setChecking(false); return; }
    if (!isAuthenticated || !user) return;

    // 1) Try /auth/me (may already include role in some backend versions)
    api.get('/auth/me')
      .then(res => {
        const r: string | null = res.data?.role?.name ?? null;
        if (r) {
          _cachedRole = r;
          setRoleName(r);
          setChecking(false);
        } else {
          // 2) Fall back: load users list and match by current user id
          return api.get('/users/').then(usersRes => {
            const list: Array<{ id: string; role?: { name: string } }> =
              usersRes.data?.users ?? usersRes.data ?? [];
            const found = list.find(u => u.id === user.id);
            const rName = found?.role?.name ?? null;
            _cachedRole = rName;
            setRoleName(rName);
            setChecking(false);
          });
        }
      })
      .catch(() => {
        // Network error — allow access; backend will enforce permissions
        _cachedRole = null;
        setRoleName(null);
        setChecking(false);
      });
  }, [isAuthenticated, user]);

  if (isInitializing || checking) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" />;

  // If no role found from API let through — backend 403 is the authoritative gate
  if (roleName !== null && !ADMIN_ROLES.has(roleName ?? '')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 px-6 text-center">
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{ background: '#fef2f2' }}>
          <ShieldAlert className="h-10 w-10 text-red-500" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">{t('routes.accessDenied', 'Accès non autorisé')}</h2>
          <p className="text-sm text-gray-500 mt-1 max-w-sm">
            {t('routes.accessDeniedDesc', "Cette section est réservée aux administrateurs de l'organisation. Contactez votre administrateur si vous pensez avoir besoin d'un accès.")}
          </p>
        </div>
        <Link
          to="/app"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
          style={{ background: '#111827' }}
        >
          {t('routes.backToDashboard', 'Retour au tableau de bord')}
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}

// ── Plan / subscription guard ────────────────────────────────────────────────
function PlanRoute({ feature, children }: { feature: FeatureKey; children: React.ReactNode }) {
  const { can, loading } = usePlan();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!can(feature)) {
    return (
      <div className="p-8">
        <PlanGate feature={feature} />
      </div>
    );
  }

  return <>{children}</>;
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
        <Route path="/signalement"       element={<PublicWhistleblowing />} />
        <Route path="/forgot-password"   element={<ForgotPassword />} />
        <Route path="/reset-password"    element={<ResetPassword />} />
        <Route path="/2fa/verify"        element={<TwoFactorVerify />} />
        <Route path="/verify-email"      element={<EmailVerification />} />
        <Route path="/terms-of-service"  element={<TermsOfService />} />
        <Route path="/privacy-policy"    element={<PrivacyPolicy />} />
        <Route path="/legal-notice"      element={<LegalNotice />} />
        <Route path="/cgv"               element={<CGV />} />
        <Route path="/support"           element={<Support />} />
        <Route path="/demo"              element={<DemoPage />} />
        <Route path="/help"              element={<HelpCenter />} />
        <Route path="/compare/:slug"     element={<ComparisonPage />} />
        <Route path="/security"          element={<SecurityPage />} />
        <Route path="/status"                  element={<StatusPage />} />
        <Route path="/guide/csrd-pme"          element={<GuideCsrdPmePage />} />
        <Route path="/guide/bilan-carbone-entreprise" element={<GuideBilanCarbonePage />} />
        <Route path="/guide/csddd-supply-chain"       element={<GuideCsdddPage />} />
        <Route path="/ressources/checklist-csrd" element={<ChecklistCsrdPage />} />
        <Route path="/partenaires"             element={<PartnersPage />} />
        <Route path="/roadmap"                 element={<RoadmapPage />} />
        <Route path="/omnibus-csrd"      element={<OmnibusCsrdPage />} />
        <Route path="/guide/scope3-fec"  element={<Scope3FecPage />} />
        <Route path="/guide/taxonomie"   element={<TaxonomiePage />} />
        <Route path="/resources"         element={<ResourcesIndex />} />

        <Route path="/contact"            element={<ContactPage />} />

        {/* Feature detail pages */}
        <Route path="/features/bilan-carbone"       element={<BilanCarboneFeature />} />
        <Route path="/features/csrd-reporting"      element={<CSRDReportingFeature />} />
        <Route path="/features/supply-chain"        element={<SupplyChainFeature />} />
        <Route path="/features/decarbonation"       element={<DecarbonationFeature />} />
        <Route path="/features/double-materialite"  element={<DoubleMaterialiteFeature />} />
        <Route path="/features/taxonomie-ue"        element={<TaxonomieUEFeature />} />
        <Route path="/features/ia-automatisation"    element={<AIAutomationFeature />} />
        <Route path="/features/audit-trail"         element={<AuditTrailFeature />} />
        <Route path="/features/vigilance"           element={<VigilanceFeature />} />
        <Route path="/features/cabinet"             element={<CabinetFeature />} />
        <Route path="/features/ixbrl"               element={<IXBRLFeature />} />
        <Route path="/normes"                        element={<StandardsPage />} />

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
            {/* Legacy /app/data/quality → permanent redirect to current page.
                Keeps old bookmarks, in-app shortcuts and translated tutorials working. */}
            <Route path="data/quality" element={<Navigate to="/app/data-quality" replace />} />
            <Route path="data/connectors"   element={<Connectors />} />
            <Route path="data/hr-import"    element={<HRImport />} />
            <Route path="connectors"             element={<ConnectorMarketplace />} />
            <Route path="connectors/enedis"     element={<EnedisConnector />} />
            <Route path="connectors/pennylane"  element={<PennylaneConnector />} />
            <Route path="connectors/qonto"      element={<QontoConnector />} />

            {/* Data Entry */}
            <Route path="data-entry"         element={<DataEntryForm />} />
            <Route path="import-csv"         element={<ImportCSV />} />
            <Route path="my-data"            element={<MyDataDashboard />} />
            <Route path="calculated-metrics" element={<CalculatedMetrics />} />
            <Route path="data-export"        element={<PlanRoute feature="data_export"><DataExport /></PlanRoute>} />

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
            <Route path="reports"                    element={<ReportsUnified />} />
            <Route path="reports/list"             element={<ReportsList />} />
            <Route path="reports/generate"         element={<ReportGeneration />} />
            <Route path="reports/scheduled"        element={<ScheduledReports />} />
            <Route path="reports/multi-standards"  element={<PlanRoute feature="multi_standard"><MultiStandardMapping /></PlanRoute>} />
            <Route path="reports/csrd-builder"     element={<PlanRoute feature="csrd_report"><CSRDBuilder /></PlanRoute>} />
            <Route path="reports/dpef"            element={<PlanRoute feature="dpef_report"><DPEFReport /></PlanRoute>} />

            {/* Materiality & Risks */}
            <Route path="materiality" element={<MaterialityMatrix />} />
            <Route path="risks"       element={<RiskRegister />} />

            {/* Analytics & Intelligence */}
            <Route path="intelligence"  element={<PlanRoute feature="ai_narrative"><IntelligenceDashboard /></PlanRoute>} />
            <Route path="ai-insights"   element={<PlanRoute feature="ai_narrative"><AIInsights /></PlanRoute>} />
            <Route path="data-quality"  element={<DataQualityDashboard />} />

            {/* Carbon */}
            <Route path="carbon" element={<PlanRoute feature="carbon_report"><BilanCarbone /></PlanRoute>} />
            <Route path="scope3" element={<PlanRoute feature="carbon_report"><Scope3Calculator /></PlanRoute>} />

            {/* Cabinet */}
            <Route path="cabinet" element={<CabinetDashboard />} />

            {/* ESG avancé */}
            <Route path="taxonomy"          element={<TaxonomyAlignment />} />
            <Route path="compliance"        element={<MultiRegulatoryCompliance />} />
            <Route path="compliance/sbti"              element={<SBTiWorkflow />} />
            <Route path="compliance/esrs-environmental" element={<ESRSEnvironmental />} />
            <Route path="compliance/esrs-social"        element={<ESRSSocial />} />
            <Route path="compliance/esrs-governance"    element={<ESRSGovernance />} />
            <Route path="compliance/sfdr"              element={<PlanRoute feature="sfdr_report"><SFDRDisclosure /></PlanRoute>} />
            <Route path="compliance/bcorp"             element={<BCorp />} />
            <Route path="compliance/gri"               element={<GRIDisclosure />} />
            <Route path="compliance/esrs-e3-e5"        element={<ESRSWaterWaste />} />
            <Route path="compliance/cdp"               element={<CDPReporting />} />
            <Route path="compliance/csddd"             element={<CSDDD />} />
            <Route path="sdgs"                         element={<SDGMapping />} />
            <Route path="stakeholders"                 element={<StakeholderSurveys />} />
            <Route path="climate-scenarios"            element={<ClimateScenarios />} />
            <Route path="investor-relations"           element={<InvestorRelations />} />
            <Route path="compliance/ixbrl"             element={<IXBRLTagging />} />
            <Route path="esrs-gap"          element={<PlanRoute feature="esrs_gap_analysis"><ESRSGapAnalysis /></PlanRoute>} />
            <Route path="vigilance"         element={<PlanRoute feature="risk_register"><VigilancePlan /></PlanRoute>} />
            <Route path="templates"         element={<SectoralTemplates />} />
            <Route path="carbon/fec-wizard" element={<PlanRoute feature="fec_import"><FECWizard /></PlanRoute>} />
            <Route path="csrd-progress"     element={<PlanRoute feature="csrd_report"><CSRDProgress /></PlanRoute>} />
            <Route path="tcfd"              element={<TCFDBuilder />} />
            <Route path="decarbonation" element={<PlanRoute feature="carbon_report"><DecarbonationPlan /></PlanRoute>} />
            <Route path="lca"           element={<PlanRoute feature="carbon_report"><LCADashboard /></PlanRoute>} />
            <Route path="supply-chain" element={<PlanRoute feature="supply_chain_esg"><SupplyChainESG /></PlanRoute>} />
            <Route path="audit-trail"       element={<AdminRoute><AuditTrail /></AdminRoute>} />
            <Route path="audit/preparation" element={<AuditPreparation />} />
            <Route path="validation"        element={<ValidationWorkflow />} />
            <Route path="benchmarking" element={<PlanRoute feature="benchmark"><BenchmarkingDashboard /></PlanRoute>} />
            <Route path="api-docs"     element={<AdminRoute><PlanRoute feature="api_access"><APIDocumentation /></PlanRoute></AdminRoute>} />

            {/* Organizations */}
            <Route path="organizations"                  element={<OrganizationsList />} />
            <Route path="organizations/compare"          element={<OrganizationComparator />} />
            <Route path="organizations/:id"              element={<OrganizationDetail />} />
            <Route path="organizations/:id/consolidated" element={<ConsolidatedView />} />

            {/* Settings — admin only */}
            <Route path="settings"                  element={<AdminRoute><TenantSettings /></AdminRoute>} />
            <Route path="settings/users"            element={<AdminRoute><UserManagement /></AdminRoute>} />
            <Route path="settings/methodology"      element={<AdminRoute><MethodologyConfig /></AdminRoute>} />
            <Route path="settings/webhooks"         element={<AdminRoute><WebhookManagement /></AdminRoute>} />
            <Route path="settings/integrations"     element={<AdminRoute><IntegrationManagement /></AdminRoute>} />
            <Route path="settings/insee"            element={<AdminRoute><EntreprisesINSEE /></AdminRoute>} />
            <Route path="settings/esg-enrichment"   element={<AdminRoute><DataEnrichment /></AdminRoute>} />

            {/* Divers */}
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="profile"       element={<UserProfile />} />
            <Route path="billing"       element={<AdminRoute><BillingPage /></AdminRoute>} />
            <Route path="2fa/setup"     element={<TwoFactorSetup />} />

          </Route>{/* /SuspenseOutlet */}
        </Route>

        {/* Portail fournisseur — public, sans auth */}
        <Route path="/supplier-portal/:token" element={<SupplierPortal />} />
        <Route path="/audit/review/:token"    element={<AuditorReview />} />
        <Route path="/survey/:token"          element={<PublicSurvey />} />

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
