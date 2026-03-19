// ============================================================================
// ESGFlow — API Type Definitions
// ============================================================================

// ── Primitives ───────────────────────────────────────────────────────────────

export type UUID = string;
export type ISO8601 = string; // "2024-01-15T10:30:00Z"
export type PlanTier = 'starter' | 'pro' | 'enterprise';
export type ESGPillar = 'environmental' | 'social' | 'governance';

// ── Generic wrappers ─────────────────────────────────────────────────────────

export interface ApiError {
  error: string;
  detail: string;
  type?: string;
}

export interface MessageResponse {
  message: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: 'bearer';
  expires_in: number; // seconds
}

export interface TokenRefreshRequest {
  refresh_token?: string; // optional — cookie used as fallback
}

export interface PasswordChangeRequest {
  current_password: string;
  new_password: string;
}

// ── User ─────────────────────────────────────────────────────────────────────

export interface User {
  id: UUID;
  tenant_id: UUID;
  email: string;
  first_name: string | null;
  last_name: string | null;
  /** Computed client-side: `${first_name} ${last_name}` or email fallback */
  full_name?: string;
  job_title: string | null;
  phone?: string | null;
  is_active: boolean;
  /** Backend returns `email_verified_at` (date), derived from it */
  email_verified_at?: ISO8601 | null;
  /** Convenience alias — true when email_verified_at is set */
  is_email_verified?: boolean;
  auth_provider?: 'local' | 'google' | 'microsoft' | 'auth0';
  locale?: string;
  timezone?: string;
  last_login_at?: ISO8601 | null;
  created_at: ISO8601;
}

export interface UserRegisterRequest {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
}

// ── Tenant ───────────────────────────────────────────────────────────────────

export interface Tenant {
  id: UUID;
  name: string;
  slug: string;
  plan_tier: PlanTier;
  status: 'active' | 'suspended' | 'trial';
  created_at: ISO8601;
}

export interface TenantStats {
  total_users: number;
  active_users: number;
  total_organizations: number;
  active_organizations: number;
  api_calls_last_30_days: number;
  max_users: number | null;
  users_remaining: number | null;
}

// ── Organization ─────────────────────────────────────────────────────────────

export interface Organization {
  id: UUID;
  tenant_id: UUID;
  name: string;
  org_type: string;
  siren: string | null;
  sector_code: string | null;
  country_code: string | null;
  employee_count: number | null;
  created_at: ISO8601;
}

// ── Onboarding ───────────────────────────────────────────────────────────────

export interface TenantOnboardRequest {
  tenant_name: string;
  tenant_slug: string;
  plan_tier: PlanTier;
  admin_email: string;
  admin_password: string;
  admin_first_name?: string;
  admin_last_name?: string;
  org_name?: string;
  org_siren?: string;
  org_sector_code?: string;
  org_country_code?: string;
  org_employee_count?: number;
}

export interface OnboardResponse {
  tenant_id: UUID;
  tenant_slug: string;
  admin_user_id: UUID;
  organization_id: UUID | null;
  api_key: string;
  onboarded_at: ISO8601;
  next_steps: string[];
}

// ── Auth composite ────────────────────────────────────────────────────────────

export interface LoginResponse {
  user: User;
  tokens: TokenResponse;
}

// ── ESG Scores ────────────────────────────────────────────────────────────────

export interface ESGScore {
  id: UUID;
  organization_id: UUID;
  pillar: ESGPillar;
  score: number;
  methodology: string;
  calculated_at: ISO8601;
}

export interface ESGScoreSummary {
  overall: number;
  environmental: number;
  social: number;
  governance: number;
  trend: number; // delta vs previous period
  calculated_at: ISO8601;
}
