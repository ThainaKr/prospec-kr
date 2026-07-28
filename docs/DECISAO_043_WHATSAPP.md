# Decisão Aprovada nº 043 — Arquitetura Híbrida do WhatsApp

Status: aprovado e congelado.

O PROSPEC KR permite configurar individualmente o método de abertura de cada
chip, sem utilizar o PROSPEC KR Bridge e sem controlar clones por UID.

## Aplicativo

Usado para instalações oficiais do WhatsApp e WhatsApp Business.

Cadastro: identificação, package e component opcional.

Fluxo:

`Contato → chip responsável → aplicativo cadastrado → conversa do contato`

## WhatsApp Web

Usado quando o chip for associado a uma sessão do WhatsApp Web mantida em um
navegador específico do celular.

Cadastro: navegador, package opcional do navegador e link padrão. O link inicial
é:

`https://web.whatsapp.com/send?phone={PHONE}`

O navegador precisa permanecer autenticado e configurado em Modo Computador. Ao
abrir, `{PHONE}` é substituído pelo número do contato.

Fluxo:

`Contato → chip responsável → navegador cadastrado → WhatsApp Web → conversa do contato`

## Distribuição

Somente chips `active` e não suspensos recebem novos contatos. Chips pausados,
restritos, bloqueados/banidos ou suspensos saem da distribuição, preservam o
histórico e voltam a participar quando forem reativados.

O servidor revalida o status no momento do clique. A fila é recalculada entre os
chips ativos, sem alterar listas, contatos, agenda ou relatórios.
