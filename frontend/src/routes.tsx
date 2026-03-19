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

// Reports
import ReportGeneration from '@/pages/Reports/ReportGeneration';
import ReportsList from '@/pages/Reporting/ReportsList';
import ScheduledReports from '@/pages/Reporting/ScheduledReports';

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

// Analytics
import IntelligenceDashboard from '@/pages/Analytics/IntelligenceDashboard';
import DataQualityDashboard from '@/pages/DataQuality/DataQualityDashboard';

// Carbon
import BilanCarbone from '@/pages/Carbon/BilanCarbone';

// New features
import TaxonomyAlignment from '@/pages/Compliance/TaxonomyAlignment';
import ValidationWorkflow from '@/pages/Validation/ValidationWorkflow';
import BenchmarkingDashboard from '@/pages/Benchmarking/BenchmarkingDashboard';
import APIDocumentation from '@/pages/Developer/APIDocumentation';

// Pages légales
import TermsOfService from '@/pages/Legal/TermsOfService';
import PrivacyPolicy from '@/pages/Legal/PrivacyPolicy';
import LegalNotice from '@/pages/Legal/LegalNotice';
import Support from '@/pages/Support/Support';

// Onboarding
import FirstTimeSetup from '@/pages/Setup/FirstTimeSetup';



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
        
        {/* Data Entry */}
        <Route path="data-entry" element={<DataEntryForm />} />
        <Route path="import-csv" element={<ImportCSV />} />
        <Route path="my-data" element={<MyDataDashboard />} />
        <Route path="calculated-metrics" element={<CalculatedMetrics />} />
        
        {/* Indicators */}
        <Route path="indicators" element={<IndicatorsList />} />
        <Route path="indicators/compare" element={<IndicatorComparison />} />
        <Route path="indicators/:id" element={<IndicatorDetail />} />
        
        {/* Scores */}
        {/*<Route path="scores" element={<ScoresDashboard />} />*/}
        <Route path="scores/history" element={<ScoreHistory />} />
        <Route path="scores/calculate" element={<ScoreCalculation />} />
        <Route path="scores/breakdown" element={<ScoreBreakdown />} />
        <Route path="scores/:id" element={<OrganizationScoring />} />
        
         {/* Scores ESG */}
        <Route path="scores-dashboard" element={<ScoresDashboard />} /> 

        {/* Reports */}
        <Route path="reports" element={<ReportsList />} />
        <Route path="reports/generate" element={<ReportGeneration />} />
        <Route path="reports/scheduled" element={<ScheduledReports />} />

        {/* Materiality & Risks */}
        <Route path="materiality" element={<MaterialityMatrix />} />
        <Route path="risks" element={<RiskRegister />} />
        
        {/* Analytics & Intelligence */}
        <Route path="intelligence" element={<IntelligenceDashboard />} />
        <Route path="data-quality" element={<DataQualityDashboard />} />

        {/* Carbon */}
        <Route path="carbon" element={<BilanCarbone />} />

        {/* New features */}
        <Route path="taxonomy" element={<TaxonomyAlignment />} />
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
      </Route>

      {/* Redirect unknown routes depending on authentication */}
      <Route
        path="*"
        element={
          <PrivateRoute>
            <Navigate to="/app" />
          </PrivateRoute>
        }
      />
    </Routes>
  );
}