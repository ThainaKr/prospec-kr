# PROSPEC KR WhatsApp Connector

Serviço local para sessões de WhatsApp comum ou Business ligadas ao PROSPEC KR por QR Code.

## Windows

1. Copie `.env.example` para `.env` e preencha os segredos.
2. Instale com `npm.cmd install`.
3. Inicie com `npm.cmd start`.
4. Verifique `http://127.0.0.1:3000/health`.
5. Publique a porta local com `tailscale funnel --bg 3000`.

O arquivo `.env` e a pasta `sessions` nunca devem ser enviados ao GitHub ou ao Google Drive.
