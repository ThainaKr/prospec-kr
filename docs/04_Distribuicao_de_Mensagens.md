# 04 - Distribuição de Mensagens

## Objetivo

O módulo de Distribuição de Mensagens será responsável por decidir automaticamente qual sessão de WhatsApp enviará cada mensagem do PROSPEC KR.

Seu objetivo é distribuir a carga entre as sessões ativas, preservar o histórico das conversas e reduzir riscos operacionais.

---

## Regras Gerais

- Apenas sessões ativas poderão enviar mensagens.
- Sessões pausadas não participarão da distribuição.
- Sessões restritas não participarão da distribuição.
- Sessões banidas não participarão da distribuição.
- A distribuição será automática.

---

## Continuidade da Conversa

Após a primeira mensagem enviada, todas as mensagens futuras daquele contato deverão utilizar a mesma sessão de WhatsApp.

O histórico permanecerá vinculado à mesma conversa, evitando mudanças de número durante o atendimento.

---

## Balanceamento

O sistema deverá distribuir os novos contatos entre todas as sessões ativas.

Serão considerados:

- quantidade de mensagens enviadas;
- tempo de utilização;
- saúde da sessão;
- disponibilidade.

O objetivo é evitar concentração excessiva em um único WhatsApp.

---

## Troca Automática

Caso uma sessão fique indisponível antes do primeiro envio, o sistema poderá redistribuir automaticamente o contato para outra sessão ativa.

Após o início da conversa, a troca somente poderá ocorrer mediante ação da administradora.

---

## Monitoramento

A distribuição será atualizada continuamente conforme:

- novas conexões;
- desconexões;
- alterações de status;
- bloqueios;
- pausas;
- recuperação de sessões.

---

## Integração

Este módulo permanecerá integrado com:

- WhatsApp Engine;
- Gerenciador de Sessões;
- Central de Conversas;
- Chips;
- Contatos;
- Agenda;
- Relatórios;
- Notificações.