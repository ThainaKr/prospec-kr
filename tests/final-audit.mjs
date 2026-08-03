import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const dashboard = readFileSync(new URL("../src/ProspecDashboard.tsx", import.meta.url), "utf8");
const api = readFileSync(new URL("../supabase/functions/prospec-api/index.ts", import.meta.url), "utf8");
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const manifest = readFileSync(new URL("../public/manifest.webmanifest", import.meta.url), "utf8");

for (const marker of ["central-atendimento-v1", "settings-official-v1", "secure-login-v1"]) assert.ok(dashboard.includes(marker), `marcador ausente: ${marker}`);
for (const label of ["Início", "Atendimento", "Agenda", "Listas e Contatos", "Funis", "Modelos de Mensagens e Áudios", "Notificações", "Relatórios", "Chips e Usuários", "Configurações", "Sair"]) assert.ok(dashboard.includes(label), `menu ausente: ${label}`);
for (const forbidden of ["DIRECT_ADMIN_PROFILE_ID", "?? DIRECT_ADMIN", "profileId !== DIRECT_ADMIN"]) assert.ok(!api.includes(forbidden), `fallback administrativo inseguro: ${forbidden}`);
for (const marker of ["prospec-kr-icon.png", "prospec-kr-horizontal.png", "manifest.webmanifest"]) assert.ok(html.includes(marker) || manifest.includes(marker) || dashboard.includes(marker), `marca ausente: ${marker}`);
assert.ok(api.includes('throw new Error("Sessão inválida ou expirada.")'), "API precisa rejeitar token inválido");
assert.ok(api.includes('case "save_settings"'), "persistência de configurações ausente");
console.log("final-audit: 6 grupos aprovados");
