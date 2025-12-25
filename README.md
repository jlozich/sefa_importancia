# Controle de Estudos (GitHub Pages) — Auditor Fiscal

Este projeto é **100% estático (HTML/CSS/JS)** para hospedar no **GitHub Pages** e ainda assim salvar o progresso **no servidor** usando **Supabase** (Postgres + Auth).

## 1) Criar o projeto no Supabase (gratuito)
1. Crie uma conta e um projeto no Supabase.
2. Pegue em **Project Settings → API**:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`

## 2) Criar tabela e políticas (SQL)
No Supabase, vá em **SQL Editor** e rode o script abaixo:

```sql
create table if not exists public.progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id text not null,
  done boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

alter table public.progress enable row level security;

create policy "progress_select_own"
on public.progress for select
to authenticated
using (auth.uid() = user_id);

create policy "progress_insert_own"
on public.progress for insert
to authenticated
with check (auth.uid() = user_id);

create policy "progress_update_own"
on public.progress for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "progress_delete_own"
on public.progress for delete
to authenticated
using (auth.uid() = user_id);
```

## 3) Configurar as chaves do Supabase
Edite o arquivo `config.js` e cole suas chaves.

## 4) Subir no GitHub
- Crie um repositório
- Faça upload dos arquivos
- Em **Settings → Pages**, selecione:
  - Source: `Deploy from a branch`
  - Branch: `main` / folder `/ (root)`
- Abra a URL do Pages.

## 5) Uso
- Crie conta (email/senha) na tela
- Marque tópicos como estudados
- O progresso fica salvo no Supabase por usuário (persistente, servidor)

> Observação: GitHub Pages não executa backend. Por isso o salvamento server-side é feito via Supabase.
