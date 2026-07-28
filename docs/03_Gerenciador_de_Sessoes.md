# 03 - Gerenciador de Sessões

## Objetivo

O Gerenciador de Sessões é responsável por administrar todas as conexões de WhatsApp utilizadas pelo PROSPEC KR.

Cada sessão será totalmente independente, permitindo que o sistema opere com múltiplos números simultaneamente.

---

## Cadastro de Sessões

Cada nova sessão deverá possuir:

- ID único.
- Nome da sessão.
- Número do WhatsApp.
- Chip associado.
- Dispositivo de origem.
- Data de criação.
- Data da última conexão.
- Status da sessão.
- Observações.

---

## Processo de Conexão

Para adicionar uma nova sessão:

1. Clicar em "Adicionar WhatsApp".
2. Gerar um QR Code exclusivo.
3. Escanear o QR Code pelo WhatsApp correspondente.
4. Aguardar a confirmação da conexão.
5. Registrar automaticamente a sessão no sistema.

---

## Status da Sessão

Cada sessão poderá apresentar um dos seguintes estados:

- Conectando
- Conectado
- Desconectado
- Reconectando
- Pausado
- Restrito
- Banido
- Erro de autenticação

---

## Reconexão Automática

Caso uma sessão seja desconectada, o sistema deverá:

- tentar reconectar automaticamente;
- registrar todas as tentativas;
- informar a administradora quando a reconexão não for possível;
- solicitar um novo QR Code apenas quando necessário.

---

## Escalabilidade

O sistema não possuirá limite fixo de sessões.

Será possível conectar quantos WhatsApps a infraestrutura suportar, mantendo todas as sessões independentes e funcionando simultaneamente.

---

## Integração

Cada sessão ficará vinculada aos seguintes módulos:

- Central de Conversas
- Chips
- Contatos
- Listas
- Agenda
- Relatórios
- Notificações

---

## Registro de Eventos

Toda alteração de uma sessão será registrada, incluindo:

- conexão;
- desconexão;
- reconexão;
- mudança de status;
- erros;
- autenticações;
- troca de dispositivo;
- data e hora de cada evento.

Esses registros alimentarão os relatórios operacionais e o monitoramento da saúde dos chips.