export type ProspecPageKey =
  | "home"
  | "notifications"
  | "agenda"
  | "lists"
  | "templates"
  | "reports"
  | "chips-users"
  | "profile";

export type ProspecPermissions = Record<string, boolean | null | undefined>;

const PAGE_PERMISSION: Record<ProspecPageKey, string | null> = {
  home: "can_view_home",
  notifications: "can_view_notifications",
  agenda: "can_view_agenda",
  lists: "can_view_lists",
  templates: "can_view_message_templates",
  reports: "can_view_reports_overview",
  "chips-users": "can_manage_chips_users",
  profile: "can_view_profile",
};

export function canAccessPage(
  page: ProspecPageKey,
  role: string,
  permissions: ProspecPermissions = {},
) {
  if (role === "admin") return true;
  const permissionKey = PAGE_PERMISSION[page];
  return permissionKey ? permissions[permissionKey] === true : false;
}

export function filterNavigation<T extends readonly [ProspecPageKey, string, string]>(
  items: readonly T[],
  role: string,
  permissions: ProspecPermissions = {},
) {
  return items.filter(([page]) => canAccessPage(page, role, permissions));
}

export function firstAllowedPage(
  role: string,
  permissions: ProspecPermissions = {},
): ProspecPageKey {
  const preferred: ProspecPageKey[] = [
    "home",
    "notifications",
    "agenda",
    "lists",
    "reports",
    "templates",
    "profile",
  ];
  return preferred.find((page) => canAccessPage(page, role, permissions)) || "profile";
}

export function canManageLists(permissions: ProspecPermissions = {}) {
  return permissions.can_manage_lists === true;
}

export function canManageTemplates(
  role: string,
  permissions: ProspecPermissions = {},
) {
  return role === "admin" || permissions.can_manage_templates === true;
}
