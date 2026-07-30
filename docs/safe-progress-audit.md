# PROSPEC KR — Auditoria de avanço seguro

Data: 2026-07-29
Branch: `agent/prospec-kr-permissions-integration`
PR: #3

## Escopo desta etapa

Esta etapa foi executada sem substituir `src/ProspecDashboard.tsx`, sem alterar RLS, sem aplicar migrações, sem modificar dados e sem realizar merge.

## Supabase

- Projeto saudável.
- Tipos TypeScript gerados a partir do esquema atual.
- Quatro Edge Functions ativas:
  - `prospec-site-api`
  - `prospec-api`
  - `prospec-web`
  - `prospec-static-publisher`
- Todas exigem JWT.
- Logs de autenticação das últimas 24 horas sem eventos ou erros.
- Logs de API consultados com respostas 200.
- Logs de Edge Functions sem erros registrados nas últimas 24 horas.

## Observações sobre `prospec-api`

A função autentica o usuário, valida perfil ativo e carrega permissões antes de executar ações.

Algumas ações administrativas (`chips`, `save_chip`, `users`, `invite_user`, `update_user`, `recover_contact`) não aparecem no mapa central `permissionByAction`, mas são protegidas internamente por `requireAdmin(profile)`. O comportamento é seguro por papel, porém deve permanecer no checklist de testes para evitar regressões futuras.

## Navegação e permissões

O adaptador `dashboardNavigation.ts` continua isolado do dashboard principal.

Foi criado o teste `src/dashboardNavigation.check.ts` para validar:

- Administradora inicia pela Home.
- Advogado inicia pela Agenda.
- Advogado não vê Home de prospecção.
- Advogado não vê Chips e Usuários.
- Rota administrativa solicitada pelo Advogado é redirecionada.
- Advogado mantém acesso à Visão Geral dos relatórios.

Também foi identificado que o teste anterior usa `can_manage_chips_users: true` no objeto de permissões do Advogado. O bloqueio por papel continua funcionando, mas esse valor deve ser corrigido em uma futura alteração pequena para manter o teste semanticamente fiel às decisões aprovadas.

## Itens que permanecem bloqueados

- Substituir o dashboard inteiro por uma única chamada.
- Integrar o adaptador sem um mecanismo seguro de edição parcial.
- Fazer merge da PR #3.
- Alterar `agent/prospec-kr-completo`.
- Alterar `main`.
- Alterar RLS ou remover índices diretamente em produção.

## Próxima integração segura

Quando houver um método confiável para editar o dashboard, aplicar somente:

1. importação de `buildDashboardNavigation` e `resolveDashboardPage`;
2. filtragem das navegações inferior e lateral;
3. resolução segura da página solicitada;
4. uso das permissões retornadas pelo bootstrap;
5. execução da CI e testes manuais por perfil antes do merge.
