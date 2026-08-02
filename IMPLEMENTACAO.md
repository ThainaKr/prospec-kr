# PROSPEC KR — Implementação Final

Status: em implementação para produção.

## Prioridades congeladas

1. Login por convite, sem criação de senha.
2. Perfis Administradora e Advogado.
3. Controle de permissões.
4. Dashboard por perfil.
5. Listas, importação, contatos e distribuição.
6. Modelos de mensagens.
7. Agenda, notificações e relatórios.
8. Chips e usuários.
9. Recuperação de contatos.
10. Integração com WhatsApp e atalhos por chip.
11. Testes, correções e publicação.

## Regras inegociáveis

- Preservar todas as decisões aprovadas.
- Não simplificar funcionalidades.
- Não permitir cadastro manual de advogado.
- Convites enviados por e-mail.
- Dark mode, preto e laranja, mobile first.
- Advogado não acessa funções administrativas.
- Chip Restrito, Pausado ou Bloqueado sai da distribuição ativa.

## Estrutura de trabalho

- `app/`: aplicação web.
- `supabase/`: migrações, funções e tipos.
- `docs/`: documentação congelada e decisões.
- `tests/`: testes automatizados e critérios de aceite.

## Branch de implementação

`agent/prospec-kr-completo`
