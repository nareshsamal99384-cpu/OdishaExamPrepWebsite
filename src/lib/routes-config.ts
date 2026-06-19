export const ROUTE_PATHS = {
  HOME: '/',
  ADMIN_LOGIN: '/admin-login',
  PRIVACY_POLICY: '/privacy-policy',
  TERMS_OF_SERVICE: '/terms-of-service',
  REFUND_POLICY: '/refund-policy',
  BLOG: '/blog',
  BLOG_DETAIL: '/blog/:id',
  ADMIN: '/admin',
  NOT_FOUND: '/404'
} as const;

export const ROUTE_LIST = Object.values(ROUTE_PATHS) as string[];
