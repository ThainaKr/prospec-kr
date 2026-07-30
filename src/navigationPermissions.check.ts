import {
  canAccessPage,
  firstAllowedPage,
  filterNavigation,
  type ProspecPageKey,
} from "./navigationPermissions";

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

const lawyerNav: Array<[ProspecPageKey, string, string]> = [
  ["home", "Início", "⌂"],
  ["notifications", "Notificações", "●"],
  ["agenda", "Agenda", "▦"],
  ["lists", "Listas", "☷"],
  ["reports", "Relatórios", "▥"],
  ["chips-users", "Chips e Usuários", "◉"],
  ["profile", "Mais", "•••"],
];

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

assert(
  firstAllowedPage("lawyer", lawyerPermissions) === "agenda",
  "Advogado deve iniciar pela Agenda.",
);
assert(
  !canAccessPage("home", "lawyer", lawyerPermissions),
  "Advogado não deve acessar a página inicial de prospecção.",
);
assert(
  !canAccessPage("chips-users", "lawyer", lawyerPermissions),
  "Advogado não deve acessar Chips e Usuários.",
);
assert(
  canAccessPage("reports", "lawyer", lawyerPermissions),
  "Advogado deve acessar a Visão Geral dos relatórios.",
);

const filtered = filterNavigation(lawyerNav, "lawyer", lawyerPermissions).map(
  ([page]) => page,
);
assert(!filtered.includes("home"), "A navegação do Advogado não pode exibir Início.");
assert(
  !filtered.includes("chips-users"),
  "A navegação do Advogado não pode exibir Chips e Usuários.",
);
assert(filtered.includes("agenda"), "A navegação do Advogado deve exibir Agenda.");

const noPermissions = {};
assert(
  firstAllowedPage("lawyer", noPermissions) === "profile",
  "Advogado sem permissões deve cair no Meu Perfil.",
);
assert(
  !canAccessPage("agenda", "lawyer", noPermissions),
  "Advogado sem permissão não deve acessar Agenda.",
);
assert(
  !canAccessPage("reports", "lawyer", noPermissions),
  "Advogado sem permissão não deve acessar Relatórios.",
);
assert(
  !canAccessPage("templates", "lawyer", noPermissions),
  "Advogado sem permissão não deve acessar Modelos.",
);

const adminPages: ProspecPageKey[] = [
  "home",
  "notifications",
  "agenda",
  "lists",
  "templates",
  "reports",
  "chips-users",
  "profile",
];
for (const page of adminPages) {
  assert(
    canAccessPage(page, "admin", {}),
    `Administradora deve acessar ${page}.`,
  );
}
assert(
  firstAllowedPage("admin", {}) === "home",
  "Administradora deve iniciar pela Home.",
);
