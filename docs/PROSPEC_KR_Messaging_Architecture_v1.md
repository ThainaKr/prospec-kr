# PROSPEC KR Messaging Architecture v1

## Objetivo

Este documento define a arquitetura oficial do módulo de mensagens do PROSPEC KR.

Seu objetivo é transformar o PROSPEC KR em um CRM completo, onde toda a operação de mensagens ocorre dentro do próprio sistema, sem depender da abertura do aplicativo do WhatsApp para o fluxo de trabalho.

Toda alteração nesta arquitetura deverá respeitar as decisões oficiais já aprovadas do PROSPEC KR.

---

## Princípios da Arquitetura

- O PROSPEC KR será o centro de toda a operação.
- As conversas serão realizadas dentro do CRM.
- O sistema deverá permitir conectar múltiplas sessões de WhatsApp.
- Não haverá limite fixo de sessões de WhatsApp definido pelo sistema; o limite dependerá apenas da capacidade do servidor.
- Cada sessão será independente, com seu próprio QR Code, status, histórico e estatísticas.
- Todos os módulos do PROSPEC KR (Listas, Contatos, Agenda, Relatórios, Notificações, Chips e Usuários) utilizarão o mesmo motor de mensagens.