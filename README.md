# Rede Lince

Sistema interno de registro de dados e vínculos entre entidades (pessoas, empresas, endereços, veículos, procedimentos, casos e comunicações).

## Getting Started

```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) no navegador.

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
