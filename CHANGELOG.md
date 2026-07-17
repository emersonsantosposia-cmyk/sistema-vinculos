# Changelog

Todas as mudanças notáveis deste projeto são documentadas neste arquivo.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

A versão oficial do sistema está no campo `version` de `package.json`.

## [1.0.0] - 2026-07-17

Primeira versão estável do **Rede Lince**, consolidando o que já está em produção.

### Adicionado

- Cadastro e detalhe das entidades: pessoas, empresas, endereços, veículos, procedimentos, casos, comunicações e orcrims
- Vínculos entre entidades (tipos padronizados + tipo livre), com listagem, edição e remoção
- Diagrama interativo de vínculos em tela cheia (layout radial estilo exploração de rede, expansão/recolhimento, tema claro/escuro)
- Timeline de observações por entidade, com edição e exclusão restritas ao autor
- Dashboard institucional com indicadores e gráficos
- Busca global aproximada (`pg_trgm` + `unaccent`) em todos os campos textuais das entidades
- Controle de acesso por perfil (administrador / analista) e por unidade, com RLS no Supabase
- Gestão de usuários (criação, edição, credenciamento) exclusiva para administradores
- Auditoria de alterações nas entidades
- Temas claro e escuro (`next-themes`)
- Autenticação via Supabase Auth e shell de navegação do sistema
- Importação em massa de procedimentos (fluxo existente no app)
- Scripts locais de seed/cleanup para desenvolvimento (não usados em produção)
- Exibição da versão no rodapé (`Rede Lince vX.Y.Z`) e modal **Sobre o sistema** (menu do usuário), com data de build e link para o CHANGELOG no GitHub

### Alterado

- Tipos de vínculo: removidos “testemunha de”, “frequentador de” e “outros”; incluídos “alvo” e a opção “Outro (digitar)…”
- Placeholder da busca global padronizado como “Busca global”
- Diagrama sem legenda/minimapa, priorizando área útil para a rede

### Corrigido

- Políticas RLS de observações: apenas o autor pode atualizar ou excluir o próprio registro
