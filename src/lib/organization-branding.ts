export function getDefaultOrganizationLogoUrl() {
  return "/api/logo?v=2";
}

export function getOrganizationLogoUrl(logoUrl?: string | null) {
  return logoUrl || getDefaultOrganizationLogoUrl();
}
