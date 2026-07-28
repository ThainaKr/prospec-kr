# 06 - Modelo de Dados

## Objetivo

Este documento define a estrutura lógica do banco de dados do PROSPEC KR.

Todas as tabelas do Supabase deverão ser criadas seguindo este modelo.

Nenhuma funcionalidade poderá possuir dados isolados. Todo relacionamento deverá ocorrer através das entidades descritas neste documento.

---

# Entidades Principais

O banco de dados será composto inicialmente pelas seguintes entidades:

- Usuários
- Convites
- Perfis
- Advogados
- Chips
- Sessões de WhatsApp
- Listas
- Contatos
- Telefones
- Empresas
- Conversas
- Mensagens
- Modelos de Mensagens
- Agenda
- Notificações
- Relatórios
- Timeline
- Recuperação de Contatos
- Configurações
- Logs do Sistema

---

# Relacionamentos

As entidades deverão permanecer relacionadas entre si.

Exemplos:

Usuário
→ possui um perfil.

Advogado
→ é um usuário.

Chip
→ possui uma sessão de WhatsApp.

Sessão
→ envia mensagens.

Lista
→ possui diversos contatos.

Contato
→ pode possuir vários telefones.

Contato
→ pertence a uma empresa.

Contato
→ possui uma conversa.

Conversa
→ possui diversas mensagens.

Mensagem
→ utiliza uma sessão de WhatsApp.

Contato
→ pode possuir diversos eventos na agenda.

Contato
→ possui histórico na timeline.

Contato
→ pode entrar em recuperação.

Usuário
→ recebe notificações.

Relatórios
→ são gerados a partir de todas as entidades operacionais.

---

# Integridade

Todos os relacionamentos deverão utilizar identificadores únicos.

Nenhuma informação poderá ser duplicada desnecessariamente.

Sempre que possível serão utilizadas referências entre tabelas.

---

# Auditoria

As principais entidades deverão registrar:

- data de criação;
- data de atualização;
- usuário responsável;
- histórico de alterações.

---

# Escalabilidade

O modelo deverá permitir crescimento sem necessidade de remodelagem estrutural.

Novos módulos poderão ser adicionados futuramente utilizando os mesmos padrões de relacionamento.

---

# Banco de Dados

O banco oficial do PROSPEC KR será o Supabase (PostgreSQL).

Toda a modelagem futura deverá respeitar este documento como referência principal.