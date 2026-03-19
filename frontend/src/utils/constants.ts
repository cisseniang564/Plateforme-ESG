// ESG Constants
export const ESG_PILLARS = ['environmental', 'social', 'governance'] as const;

export const PILLAR_NAMES = {
  environmental: 'Environmental',
  social: 'Social',
  governance: 'Governance',
};

export const PILLAR_COLORS = {
  environmental: {
    bg: 'bg-green-100',
    text: 'text-green-600',
    border: 'border-green-600',
  },
  social: {
    bg: 'bg-blue-100',
    text: 'text-blue-600',
    border: 'border-blue-600',
  },
  governance: {
    bg: 'bg-purple-100',
    text: 'text-purple-600',
    border: 'border-purple-600',
  },
};

// Plan Tiers
export const PLAN_TIERS = ['starter', 'pro', 'enterprise'] as const;

export const PLAN_LIMITS = {
  starter: { users: 5, orgs: 10, api_calls: 1000 },
  pro: { users: 50, orgs: 100, api_calls: 10000 },
  enterprise: { users: -1, orgs: -1, api_calls: -1 }, // unlimited
};

// Organization Types
export const ORG_TYPES = ['group', 'business_unit', 'site', 'department'] as const;

// Report Types
export const REPORT_TYPES = ['summary', 'detailed', 'regulatory'] as const;

// Score Statuses
export const SCORE_STATUSES = ['draft', 'validated', 'published'] as const;

// Data Upload Statuses
export const UPLOAD_STATUSES = ['pending', 'processing', 'completed', 'failed'] as const;

// API Pagination
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
