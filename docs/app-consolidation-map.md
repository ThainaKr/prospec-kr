# Mapa de Consolidação do PROSPEC KR

## Objetivo

Consolidar o aplicativo principal em uma única experiência autenticada, preservando as regras de negócio aprovadas e impedindo acesso público às rotas de validação visual.

## Rota principal

- `/` ou `/app`: dashboard operacional principal, conectado à Edge Function `prospec-api`.

## Rotas reais autenticadas

- `/inicio`: início operacional com dados reais.
- `/listas-contatos`: listas, contatos e recuperação com dados reais.
- `/agenda`: agenda real.
- `/agenda-notificacoes`: agenda e notificações reais.
- `/relatorios`: relatórios reais com separação por perfil.
- `/chips-usuarios`: chips e usuários reais, restritos à Administradora.
- `/dados-reais`: diagnóstico autenticado dos dados visíveis ao usuário.

## Previews internas autenticadas

As rotas abaixo permanecem temporariamente disponíveis apenas após login, para comparação visual durante a consolidação:

- `/visual-preview`
- `/agenda-preview`
- `/atendimento-preview`
- `/funil-preview`
- `/chips-inteligencia-preview`
- `/relatorios-preview`
- `/notificacoes-preview`
- `/todas-as-telas-preview`

## Regras de segurança

1. Nenhuma rota de preview pode abrir antes da autenticação.
2. A interface não substitui as regras do banco. RLS e permissões continuam obrigatórias.
3. Rotas administrativas devem validar perfil e permissões.
4. Dados fictícios não podem ser usados em telas operacionais.
5. Previews devem ser removidas antes da publicação final, depois da validação visual.

## Próximas etapas

1. Incorporar os componentes visuais aprovados ao dashboard principal.
2. Remover duplicações entre telas reais e previews.
3. Automatizar saúde dos chips e notificações.
4. Executar testes por perfil e aparelho.
5. Remover rotas temporárias.
6. Retirar a PR do modo rascunho somente após homologação.
