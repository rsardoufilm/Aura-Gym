# Aura Gym em Cloudflare — aurapro.uk/auragym

## Arquitetura

- **Frontend:** Vite/React compilado em `frontend/dist` e servido por Workers Static Assets.
- **Endereço:** `https://aurapro.uk/auragym`.
- **API:** serviço Node existente, hospedado em um ambiente com filesystem persistente.
- **Worker:** encaminha apenas `/auragym/api/*` para a API e remove o prefixo `/auragym`.
- **SPA:** o fallback de assets serve `index.html` para rotas não encontradas.

O frontend usa `base: './'` e `appBase()`, portanto os assets e as chamadas API mantêm o prefixo `/auragym/`.

## Build do Cloudflare Workers Builds

Conecte o repositório `rsardoufilm/Aura-Gym` ao Worker com o nome exato `aura-gym-aurapro`.

- Root directory: `/` (raiz do repositório)
- Production branch: `main` (após aprovação e merge da PR)
- Build command:

```bash
npm --prefix frontend ci && npm --prefix frontend run build && node scripts/catalogue/stage-media.mjs frontend/dist
```

- Deploy command: `npx wrangler@latest deploy`
- Preview command: `npx wrangler@latest deploy --env preview` (opcional; o preview pode usar bindings separados)

A compilação NÃO deve definir `VITE_DEMO=1`: isso desativa login, passkeys e sincronização.

O projeto requer Wrangler 4.148.0 ou superior para `assets.base_path`.

## Configuração obrigatória da API

Em Workers > aura-gym-aurapro > Settings > Variables and Secrets, configure:

- `API_ORIGIN`: origem HTTPS do servidor Node (ex.: `https://aura-gym-api-production.up.railway.app`), sem caminho final.

No serviço Node, configure:

- `ORIGIN=https://aurapro.uk`
- `RP_ID=aurapro.uk`
- `TRUST_PROXY=1`
- `PORT=3000`
- `DATA_DIR=/data` (em um volume persistente)

A API atual grava perfis, passkeys, sessão, estado, auditoria e arquivos usando operações de filesystem. Não use um container Cloudflare com disco efêmero como armazenamento desses dados. O armazenamento precisa ser persistente e compatível com as operações de arquivo do servidor.

## Rota do domínio

O Wrangler declara a rota `aurapro.uk/auragym*`. O domínio precisa estar ativo e com proxy Cloudflare habilitado. A rota é específica e não deve substituir `aurapro.uk/*` nem a página raiz.

## Segurança e validação

- Não coloque segredos no repositório.
- Não habilite o Worker em produção antes de configurar `API_ORIGIN` e as variáveis do servidor.
- Teste `/auragym/`, assets, `/auragym/api/health`, login por passkey, cookies e sincronização.
- A API deve responder por HTTPS e aceitar a origem `https://aurapro.uk`.
