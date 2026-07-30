import {
  buildDashboardNavigation,
  resolveDashboardPage,
  type DashboardNavItem,
} from "./dashboardNavigation";

const bottomItems: readonly DashboardNavItem[] = [
  ["home", "Início", "⌂"],
  ["notifications", "Notificações", "●"],
  ["agenda", "Agenda", "▦"],
  ["lists", "Listas", "☷"],
  ["reports", "Relatórios", "▥"],
  ["chips-users", "Chips e Usuários", "◉"],
  ["profile", "Mais", "•••"],
];

const drawerItems: readonly DashboardNavItem[] = [
  ["home", "Início", "⌂"],
  ["agenda", "Agenda", "▦"],
  ["lists", "Listas e Contatos", "☷"],
  ["templates", "Modelos de Mensagens", "✉"],
  ["reports", "Relatórios", "▥"],
  ["chips-users", "Chips e Usuários", "◉"],
  ["notifications", "Notificações", "●"],
  ["profile", "Meu Perfil", "•"],
];

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

const lawyerPermissions = {
  can_view_home: true,
  can_view_notifications: true,
  can_view_agenda: true,
  can_view_lists: true,
  can_view_message_templates: true,
  can_view_reports_overview: true,
  can_view_profile: true,
  can_manage_chips_users: false,
};

const lawyerNavigation = buildDashboardNavigation({
  role: "lawyer",
  permissions: lawyerPermissions,
  bottomItems,
  drawerItems,
});

assert(lawyerNavigation.initialPage === "agenda", "Advogado deve iniciar pela Agenda.");
assert(
  !lawyerNavigation.bottomNavigation.some(([page]) => page === "home"),
  "A barra inferior do Advogado não pode exibir a Home de prospecção.",
);
assert(
  !lawyerNavigation.bottomNavigation.some(([page]) => page === "chips-users"),
  "A barra inferior do Advogado não pode exibir Chips e Usuários.",
);
assert(
  lawyerNavigation.bottomNavigation.some(([page]) => page === "profile"),
  "A barra inferior do Advogado deve exibir Mais/Perfil.",
);
assert(
  resolveDashboardPage({
    requestedPage: "chips-users",
    role: "lawyer",
    permissions: lawyerPermissions,
  }) === "agenda",
  "Rota administrativa solicitada pelo Advogado deve cair na primeira rota permitida.",
);
assert(
  resolveDashboardPage({
    requestedPage: "reports",
    role: "lawyer",
    permissions: lawyerPermissions,
  }) === "reports",
  "Advogado deve conseguir abrir a Visão Geral dos relatórios.",
);

const adminNavigation = buildDashboardNavigation({
  role: "admin",
  permissions: {},
  bottomItems,
  drawerItems,
});
assert(adminNavigation.initialPage === "home", "Administradora deve iniciar pela Home.");
assert(
  adminNavigation.bottomNavigation.length === bottomItems.length,
  "Administradora deve manter todos os itens da barra inferior.",
);
