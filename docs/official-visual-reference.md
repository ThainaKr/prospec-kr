# PROSPEC KR — Referência visual oficial

Status: APROVADA pela proprietária do projeto em 2026-07-30.

## Diretriz principal

A interface deve ser reconstruída usando como referência oficial as telas aprovadas pela proprietária do projeto, preservando integralmente as regras de negócio e funcionalidades já aprovadas.

## Identidade visual obrigatória

- Dark mode predominante.
- Fundo preto ou quase preto.
- Destaques principais em laranja.
- Textos principais em branco.
- Textos auxiliares em cinza.
- Cards com cantos arredondados, bordas discretas e espaçamento amplo.
- Botões principais preenchidos em laranja.
- Botões secundários com contorno laranja ou fundo escuro.
- Ícones coloridos conforme a função, incluindo verde, azul, roxo, amarelo, laranja e vermelho.
- Cabeçalho com menu, marca PROSPEC KR, notificações e avatar quando aplicável.
- Navegação inferior fixa, respeitando as permissões de cada perfil.
- Layout mobile first, com aparência de aplicativo CRM premium.

## Padrões de componentes

- Abas segmentadas com item ativo em laranja.
- Indicadores em cards compactos.
- Listas em cards com status, métricas e ações.
- Filtros e busca em campos escuros com bordas discretas.
- Badges de status em cores semânticas.
- Tabelas e gráficos com contraste alto e linhas discretas.
- Ações destrutivas em vermelho.
- Estados de atenção em amarelo ou laranja.
- Estados saudáveis e confirmados em verde.

## Regra de consistência

Agenda, Relatórios, Listas, Contatos, Recuperação de Contatos, Modelos de Mensagens, Chips e Usuários, Notificações e demais telas devem parecer partes do mesmo produto.

Não utilizar visual genérico de dashboard web, Material Design padrão ou símbolos provisórios como substitutos de ícones finais.

## Página inicial

A página inicial ainda precisa ser redesenhada para o novo formato CRM conectado ao WhatsApp. Ela deve seguir a mesma identidade visual oficial das demais telas, mantendo as regras operacionais já aprovadas.

## Segurança da implementação

- Não alterar regras de negócio durante a reconstrução visual.
- Não remover funcionalidades existentes.
- Não fazer merge antes da validação visual e funcional.
- Não alterar banco de dados, RLS ou dados apenas para acomodar o novo visual.
- Implementar em branch isolada e validar por etapas.
