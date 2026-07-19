# Changelog
## [1.2.1] - 2026-07-19

### Alterado
- paginação da lista de entidades
- navegação principal responsiva: sidebar vira menu hambúrguer com drawer em telas <640px; cabeçalho compacto (logo, busca, avatar) no mobile
- listagens de entidades em cards no celular; tabela com colunas essenciais no tablet e filtros empilhados no mobile
- formulários de entidade e modais no mobile: barra de ações sticky (`FormActions`) com alvos de toque ≥44px; modais quase tela cheia no celular via `ModalShell`
- dashboard responsivo: KPI em 1/2/4 colunas; gráficos com rótulos abreviados e rolagem horizontal suave no celular
- diagrama de vínculos touch-friendly: pinça/pan, toolbar em FAB no mobile, modo “Selecionar nós para caminho”, × com alvo ≥44px, minimapa/legenda sob demanda

### Corrigido
- erros apontados pela auditoria
- painel da busca global ajustado ao teclado virtual (visualViewport) em dispositivos móveis
- cabeçalho de listagens no mobile (<640px): busca colapsável em ícone e ações (“Nova …”, Importar, etc.) na segunda linha, sem rolagem horizontal
- diagrama de vínculos no mobile: toque no corpo do nó só expande/recolhe; ícone “i” abre o painel Resumo e o painel não reabre sozinho após fechar
## [1.2.0] - 2026-07-18

### Adicionado
- novos gráficos no dashboard, campo alcunha em pessoas e campo de status em casos

### Alterado
- o digrama de vínculos foi reestruturado, renomeada entidade para documentos


### Corrigido
- melhoria na imagem dos bunners
Todas as mudanças notáveis deste projeto são documentadas neste arquivo.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

A versão oficial do sistema está no campo `version` de `package.json`.

## [1.1.0] - 2026-07-18

### Alterado

- Entidade **Procedimentos** renomeada para **Documentos** em todo o sistema (UI, rotas `/documentos`, tipos, Supabase, busca global, dashboard e diagrama de vínculos)
- Migration SQL: tabela `procedimentos` → `documentos`; `entidade_tipo` `'procedimento'` → `'documento'`; RLS e `busca_global` atualizados
- Campo interno `tipo` do documento permanece com os valores de negócio (RCI, INFO, RDCI, OUTROS)

### Adicionado

- Visualizações salvas do diagrama de vínculos (salvar/abrir estado do canvas)
- Ajustes de UX do diagrama (cards compactos, avatar unificado, expansão em cascata, seleção Ctrl+clique para caminho)

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
