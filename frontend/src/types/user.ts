// ============================================================================
// Types Utilisateur
// ============================================================================

export interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  job_title?: string;
  role: 'admin' | 'manager' | 'contributor' | 'viewer';
  tenant_id: string;
  permissions: string[];
}

export interface UserRole {
  id: string;
  name: string;
  description?: string;
  permissions: Permission[];
}

export interface Permission {
  id: string;
  code: string;
  name: string;
  resource: string;
  action: string;
}
