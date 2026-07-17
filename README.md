# Rede Lince

Sistema interno de registro de dados e vínculos entre entidades (pessoas, empresas, endereços, veículos, procedimentos, casos, comunicações e orcrims).

**Versão atual:** o campo `version` em [`package.json`](./package.json) é a fonte oficial da versão do sistema (semver: `MAJOR.MINOR.PATCH`). O histórico de mudanças está em [`CHANGELOG.md`](./CHANGELOG.md).

No build, `next.config.ts` injeta automaticamente `NEXT_PUBLIC_APP_VERSION` (e metadados de deploy do Vercel, quando existirem). A versão aparece no rodapé da aplicação (`Rede Lince vX.Y.Z`) e no menu do usuário → **Sobre o sistema**.

## Getting Started

```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) no navegador.

## Versionamento e deploy

Sempre que terminar uma funcionalidade significativa e for fazer deploy, siga esta ordem:

1. **Atualize o `CHANGELOG.md`**  
   Inclua a nova seção `## [X.Y.Z] - AAAA-MM-DD` com o que entrou em **Adicionado**, **Alterado** e/ou **Corrigido**.

2. **Rode o script de nova versão**  
   ```bash
   npm run version:bump
   ```
   O script pergunta o tipo de mudança (`major`, `minor` ou `patch`), atualiza `package.json` e lembra de revisar o changelog.  
   Também é possível passar o tipo direto:
   ```bash
   npm run version:bump -- patch
   npm run version:bump -- minor
   npm run version:bump -- major
   ```

3. **Commit das mudanças de versão**  
   ```bash
   git add package.json CHANGELOG.md
   git commit -m "Release vX.Y.Z"
   ```

4. **Crie a tag Git e envie** (antes ou depois do push normal do código)  
   ```bash
   git tag vX.Y.Z
   git push
   git push --tags
   ```

Assim dá para identificar exatamente o que está em produção (versão no `package.json` + tag `vX.Y.Z` no repositório).

## Seed de dados fictícios (somente local)

Scripts em `scripts/` para popular e limpar dados de teste com prefixo `[TESTE]`.

**Nunca** rode esses comandos no build de produção (Vercel) nem em CI de deploy. Eles exigem `SUPABASE_SERVICE_ROLE_KEY` no `.env.local` (arquivo ignorado pelo Git).

### Pré-requisito

É preciso existir **pelo menos um usuário** em Authentication (Auth → Users no painel Supabase, ou login pela tela `/login` do app). O seed usa esse usuário em `usuario_cadastro`.

### Popular

```bash
npm run seed
# ou apontando um usuário específico:
npm run seed -- seu-email@exemplo.com
npm run seed -- <uuid-do-usuario>

# equivalente:
npx tsx --env-file=.env.local scripts/seed.ts
```

### Limpar só os dados [TESTE]

```bash
npm run seed:cleanup -- --yes

# equivalente:
npx tsx --env-file=.env.local scripts/seed-cleanup.ts --yes
```

### Variáveis no `.env.local`

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   # secret — nunca no frontend nem no Git
```
