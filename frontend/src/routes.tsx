import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/layout/Layout';
import Spinner from '@/components/common/Spinner';

// Public
import Login from '@/pages/Auth/Login';
import Register from '@/pages/Auth/Register';
import ForgotPassword from '@/pages/Auth/ForgotPassword';
import LandingPage from '@/pages/Landing/LandingPage';

// Dashboard
import ExecutiveDashboard from '@/pages/Dashboard/ExecutiveDashboard';
import PillarDashboard from '@/pages/Dashboard/PillarDashboard';

// Data
import DataManagement from '@/pages/Data/DataManagement';
import UploadData from '@/pages/Data/UploadData';
import DataQuality from '@/pages/Data/DataQuality';
import Connectors from '@/pages/Data/Connectors';
import EnedisConnector from '@/pages/Data/EnedisConnector';

// Indicators
import IndicatorsList from '@/pages/Indicators/IndicatorsList';
import IndicatorDetail from '@/pages/Indicators/IndicatorDetail';
import IndicatorComparison from '@/pages/Indicators/IndicatorComparison';

// Scores
import ScoreHistory from '@/pages/Scores/ScoreHistory';
import ScoresDashboard from '@/pages/Scores/ScoresDashboard';
import ScoreCalculation from '@/pages/Scores/ScoreCalculation';
import ScoreBreakdown from '@/pages/Scores/ScoreBreakdown';
import OrganizationScoring from '@/pages/Scores/OrganizationScoring';
import ScoresList from '@/pages/Scores/ScoresList';

// Reports
import ReportGeneration from '@/pages/Reporting/ReportGeneration';
import ReportsList from '@/pages/Reporting/ReportsList';
import ReportsUnified from '@/pages/Reports/ReportsUnified';
import ScheduledReports from '@/pages/Reporting/ScheduledReports';
import MultiStandardMapping from '@/pages/Reports/MultiStandardMapping';

// Organizations
import OrganizationsList from '@/pages/Organizations/OrganizationsList';
import OrganizationDetail from '@/pages/Organizations/OrganizationDetail';
import OrganizationComparator from '@/pages/Organizations/OrganizationComparator';

// Settings
import TenantSettings from '@/pages/Settings/TenantSettings';
import UserManagement from '@/pages/Settings/UserManagement';
import MethodologyConfig from '@/pages/Settings/MethodologyConfig';
import WebhookManagement from '@/pages/Webhooks/WebhookManagement';
import IntegrationManagement from '@/pages/Integrations/IntegrationManagement';
import EntreprisesINSEE from '@/pages/INSEE/EntreprisesINSEE';
import DataEnrichment from '@/pages/ESG/DataEnrichment';

// Materiality & Risks
import MaterialityMatrix from '@/pages/Materiality/MaterialityMatrix';
import RiskRegister from '@/pages/Risks/RiskRegister';

// Data Entry
import DataEntryForm from '@/pages/DataEntry/DataEntryForm';
import ImportCSV from '@/pages/DataEntry/ImportCSV';
import MyDataDashboard from '@/pages/DataEntry/MyDataDashboard';
import CalculatedMetrics from '@/pages/DataEntry/CalculatedMetrics';
import DataExport from '@/pages/DataEntry/DataExport';

// Analytics
import IntelligenceDashboard from '@/pages/Analytics/IntelligenceDashboard';
import AIInsights from '@/pages/Analytics/AIInsights';
import DataQualityDashboard from '@/pages/DataQuality/DataQualityDashboard';

// Carbon
import BilanCarbone from '@/pages/Carbon/BilanCarbone';

// New features
import TaxonomyAlignment from '@/pages/Compliance/TaxonomyAlignment';
import MultiRegulatoryCompliance from '@/pages/Compliance/MultiRegulatoryCompliance';
import ESRSGapAnalysis from '@/pages/Compliance/ESRSGapAnalysis';
import DecarbonationPlan from '@/pages/Decarbonation/DecarbonationPlan';
import SupplyChainESG from '@/pages/SupplyChain/SupplyChainESG';
import AuditTrail from '@/pages/Audit/AuditTrail';
import ValidationWorkflow from '@/pages/Validation/ValidationWorkflow';
import BenchmarkingDashboard from '@/pages/Benchmarking/BenchmarkingDashboard';
import APIDocumentation from '@/pages/Developer/APIDocumentation';

// Pages légales
import TermsOfService from '@/pages/Legal/TermsOfService';
import PrivacyPolicy from '@/pages/Legal/PrivacyPolicy';
import LegalNotice from '@/pages/Legal/LegalNotice';
import Support from '@/pages/Support/Support';

// Notifications
import NotificationsPage from '@/pages/Notifications/NotificationsPage';

// Onboarding
import FirstTimeSetup from '@/pages/Setup/FirstTimeSetup';

// Errors
import NotFound from '@/pages/Errors/NotFound';

// Demo & Help
import DemoPage from '@/pages/Demo/DemoPage';
import HelpCenter from '@/pages/Help/HelpCenter';

// Auth extras
import ResetPassword from '@/pages/Auth/ResetPassword';
import TwoFactorSetup from '@/pages/Auth/TwoFactorSetup';
import TwoFactorVerify from '@/pages/Auth/TwoFactorVerify';
import EmailVerification from '@/pages/Auth/EmailVerification';

// Billing
import BillingPage from '@/pages/Billing/BillingPage';

// Profile
import UserProfile from '@/pages/Profile/UserProfile';

// Supply chain portal
import SupplierPortal from '@/pages/SupplyChain/SupplierPortal';



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

export default function AppRoutes() {
  return (
    <Routes>
      {/* ═══════════════════════════════════════ */}
      {/* PUBLIC ROUTES - Landing + Auth */}
      {/* ═══════════════════════════════════════ */}
      
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/terms-of-service" element={<TermsOfService />} />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      <Route path="/legal-notice" element={<LegalNotice />} />
      <Route path="/support" element={<Support />} />
      <Route path="/demo" element={<DemoPage />} />
      <Route path="/help" element={<HelpCenter />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/2fa/verify" element={<TwoFactorVerify />} />
      <Route path="/verify-email" element={<EmailVerification />} />
      {/* ═══════════════════════════════════════ */}
      {/* ONBOARDING - Sans sidebar/header */}
      {/* ═══════════════════════════════════════ */}
      <Route
        path="/app/setup"
        element={
          <PrivateRoute>
            <FirstTimeSetup />
          </PrivateRoute>
        }
      />

      {/* ═══════════════════════════════════════ */}
      {/* PRIVATE ROUTES - Dashboard & App */}
      {/* ═══════════════════════════════════════ */}

      <Route
        path="/app"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        {/* Dashboard */}
        <Route index element={<ExecutiveDashboard />} />
        <Route path="dashboard/pillar/:pillar" element={<PillarDashboard />} />
        
        {/* Data Management */}
        <Route path="data" element={<DataManagement />} />
        <Route path="data/upload" element={<UploadData />} />
        <Route path="data/quality" element={<DataQuality />} />
        <Route path="data/connectors" element={<Connectors />} />
        <Route path="connectors/enedis" element={<EnedisConnector />} />
        
        {/* Data Entry */}
        <Route path="data-entry" element={<DataEntryForm />} />
        <Route path="import-csv" element={<ImportCSV />} />
        <Route path="my-data" element={<MyDataDashboard />} />
        <Route path="calculated-metrics" element={<CalculatedMetrics />} />
        <Route path="data-export" element={<DataExport />} />
        
        {/* Indicators */}
        <Route path="indicators" element={<IndicatorsList />} />
        <Route path="indicators/compare" element={<IndicatorComparison />} />
        <Route path="indicators/:id" element={<IndicatorDetail />} />
        
        {/* Scores */}
        <Route path="scores" element={<ScoresDashboard />} />
        <Route path="scores/list" element={<ScoresList />} />
        <Route path="scores/history" element={<ScoreHistory />} />
        <Route path="scores/calculate" element={<ScoreCalculation />} />
        <Route path="scores/breakdown" element={<ScoreBreakdown />} />
        <Route path="scores/:id" element={<OrganizationScoring />} />

        {/* Reports */}
        <Route path="reports" element={<ReportsUnified />} />
        <Route path="reports/csrd-builder" element={<ReportsUnified />} />
        <Route path="reports/list" element={<ReportsList />} />
        <Route path="reports/generate" element={<ReportGeneration />} />
        <Route path="reports/scheduled" element={<ScheduledReports />} />
        <Route path="reports/multi-standards" element={<MultiStandardMapping />} />

        {/* Materiality & Risks */}
        <Route path="materiality" element={<MaterialityMatrix />} />
        <Route path="risks" element={<RiskRegister />} />
        
        {/* Analytics & Intelligence */}
        <Route path="intelligence" element={<IntelligenceDashboard />} />
        <Route path="ai-insights" element={<AIInsights />} />
        <Route path="data-quality" element={<DataQualityDashboard />} />

        {/* Carbon */}
        <Route path="carbon" element={<BilanCarbone />} />

        {/* New features */}
        <Route path="taxonomy" element={<TaxonomyAlignment />} />
        <Route path="compliance" element={<MultiRegulatoryCompliance />} />
        <Route path="esrs-gap" element={<ESRSGapAnalysis />} />
        <Route path="decarbonation" element={<DecarbonationPlan />} />
        <Route path="supply-chain" element={<SupplyChainESG />} />
        <Route path="audit-trail" element={<AuditTrail />} />
        <Route path="validation" element={<ValidationWorkflow />} />
        <Route path="benchmarking" element={<BenchmarkingDashboard />} />
        <Route path="api-docs" element={<APIDocumentation />} />
        
        {/* Organizations */}
        <Route path="organizations/compare" element={<OrganizationComparator />} />
        <Route path="organizations/:id" element={<OrganizationDetail />} />
        <Route path="organizations" element={<OrganizationsList />} />

        {/* Settings */}
        <Route path="settings" element={<TenantSettings />} />
        <Route path="settings/users" element={<UserManagement />} />
        <Route path="settings/methodology" element={<MethodologyConfig />} />
        <Route path="settings/webhooks" element={<WebhookManagement />} />
        <Route path="settings/integrations" element={<IntegrationManagement />} />
        <Route path="settings/insee" element={<EntreprisesINSEE />} />
        <Route path="settings/esg-enrichment" element={<DataEnrichment />} />

        {/* Notifications */}
        <Route path="notifications" element={<NotificationsPage />} />

        {/* Profil utilisateur */}
        <Route path="profile" element={<UserProfile />} />

        {/* Facturation */}
        <Route path="billing" element={<BillingPage />} />

        {/* 2FA Setup (route privée — nécessite d'être connecté) */}
        <Route path="2fa/setup" element={<TwoFactorSetup />} />
      </Route>

      {/* Portail fournisseur self-service — public, no auth */}
      <Route path="/supplier-portal/:token" element={<SupplierPortal />} />

      {/* 404 — catch-all */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}