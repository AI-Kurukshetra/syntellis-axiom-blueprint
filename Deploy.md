# Deploy

## Requirements

- Vercel CLI access in your shell
- Project already linked to Vercel in `.vercel/project.json`
- Production environment variables configured in Vercel

## Redeploy Production

Run this from the project root:

```powershell
npx vercel --prod
```

This creates a new production deployment for the linked Vercel project.

## Create Preview Deployment

```powershell
npx vercel
```

This creates a preview deployment instead of updating production.

## Useful Checks

Verify the project is linked:

```powershell
Get-Content .vercel\project.json
```

List Vercel environment variables:

```powershell
npx vercel env ls
```

Run a local production build before deploying:

```powershell
npm run build
```

## When Environment Variables Change

Add or update a variable in Vercel:

```powershell
npx vercel env add VARIABLE_NAME production
```

Then redeploy:

```powershell
npx vercel --prod
```

## Current Production URL

`https://syntellis-axiom-blueprint.vercel.app`
