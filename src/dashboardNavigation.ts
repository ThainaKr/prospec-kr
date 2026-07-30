import {
  canAccessPage,
  firstAllowedPage,
  filterNavigation,
  type ProspecPageKey,
  type ProspecPermissions,
} from "./navigationPermissions";

export type DashboardNavItem = readonly [ProspecPageKey, string, string];

export type DashboardNavigationState = {
  initialPage: ProspecPageKey;
  bottomNavigation: DashboardNavItem[];
  drawerNavigation: DashboardNavItem[];
};

export function buildDashboardNavigation({
  role,
  permissions = {},
  bottomItems,
  drawerItems,
}: {
  role: string;
  permissions?: ProspecPermissions;
  bottomItems: readonly DashboardNavItem[];
  drawerItems: readonly DashboardNavItem[];
}): DashboardNavigationState {
  return {
    initialPage: firstAllowedPage(role, permissions),
    bottomNavigation: filterNavigation(bottomItems, role, permissions),
    drawerNavigation: filterNavigation(drawerItems, role, permissions),
  };
}

export function resolveDashboardPage({
  requestedPage,
  role,
  permissions = {},
}: {
  requestedPage: ProspecPageKey;
  role: string;
  permissions?: ProspecPermissions;
}): ProspecPageKey {
  return canAccessPage(requestedPage, role, permissions)
    ? requestedPage
    : firstAllowedPage(role, permissions);
}
