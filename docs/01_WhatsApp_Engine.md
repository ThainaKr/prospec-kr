# 01 - WhatsApp Engine

## Objetivo

O WhatsApp Engine é o núcleo responsável por toda a comunicação do PROSPEC KR.

Ele gerencia todas as conexões com o WhatsApp, mantendo cada sessão independente e integrada ao CRM.

---

## Responsabilidades

- Conectar novos WhatsApps através de QR Code.
- Manter múltiplas sessões simultaneamente.
- Reconectar automaticamente sessões desconectadas.
- Enviar mensagens.
- Receber mensagens.
- Receber áudios, imagens, documentos e vídeos.
- Atualizar o status das sessões em tempo real.
- Informar falhas de conexão.
- Disponibilizar eventos para os demais módulos do sistema.

---

## Sessões

Cada WhatsApp conectado será tratado como uma sessão independente.

Cada sessão possuirá:

- ID único.
- Nome definido pela administradora.
- Número do WhatsApp.
- Chip associado.
- Status da sessão.
- Data da conexão.
- Última atividade.
- Estatísticas de utilização.
- Histórico completo.

---

## Status possíveis

- Conectado
- Desconectado
- Reconectando
- Pausado
- Restrito
- Banido

---

## Escalabilidade

O PROSPEC KR não possuirá limite fixo de sessões de WhatsApp.

A quantidade de sessões dependerá apenas da capacidade do servidor utilizado.

Novas sessões poderão ser adicionadas a qualquer momento sem necessidade de alterar o sistema.

---

## Integração

O WhatsApp Engine fornecerá comunicação para:

- Central de Conversas
- Listas
- Contatos
- Agenda
- Notificações
- Relatórios
- Chips
- Usuários