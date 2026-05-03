# ⚠️ DEPLOY SAFETY — Citește înainte de orice deploy

## Situația Edge Functions

### RISC CRITIC: Nu da niciodată `supabase functions deploy` din acest repo

Există un **drift major** între repo și producție:

| Locație | Funcții |
|---------|---------|
| Supabase Dashboard (PROD) | 224+ funcții deployate, toate funcționale |
| Acest repo | 66 funcții, din care **13 cu 0 bytes** |

### Funcții cu 0 bytes în repo (dar cu cod real în prod)

```
ad-settings              ← 16 referințe frontend — CRITIC
admin-dashboard          ← 8 referințe
admin-actions-log        ← 5 referințe
admin-cache-management   ← 4 referințe
admin-metrics            ← 4 referințe
admin-rate-limits        ← 3 referințe
collections-cover-upload ← 2 referințe
secure-file-upload       ← 2 referințe
admin-auth-manager       ← 2 referințe
guest-ad-image-upload    ← 1 referință
logged-in-ad-image-upload← 1 referință
invite-admin             ← 1 referință
collections-auto-thumbnail← 1 referință
```

### wallpaper-management — versiunea din repo e VECHE

Funcția `wallpaper-management` din repo uploadează pe **Supabase Storage**.
Versiunea din producție uploadează pe **Cloudflare R2** (cdn.bestfreewallpapers.com).

Dacă o deployezi din repo → imaginile nu mai ajung pe CDN → site-ul se rupe.

### Funcții Stripe — lipsesc complet din repo

`create-subscription`, `create-portal-session`, `stripe-webhook` există doar în Supabase prod.
Frontend-ul le apelează din PremiumPage.tsx și UpgradePage.tsx.

---

## Cum se deployează CORECT

✅ **Singura metodă sigură:**
```
Supabase Dashboard → Edge Functions → [funcția] → Code → editezi → Deploy
```

❌ **Niciodată:**
```bash
supabase functions deploy          # Suprascrie prod cu fișiere goale
supabase functions deploy --all    # Distruge toate funcțiile
```

---

## Cum faci backup din prod → repo

```
1. Supabase Dashboard → Edge Functions → [funcția] → Download as ZIP
2. Dezipezi → copiezi index.ts în supabase/functions/[functia]/
3. git add + git commit
4. NU dai deploy — e doar pentru source control
```

---

## Frontend deploy (Vercel)

Frontend-ul se deployează automat din GitHub → Vercel la orice push pe `main`. Asta e safe — nu afectează edge functions.

Variabile de environment necesare în Vercel:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

---

## Structura R2 (cdn.bestfreewallpapers.com)

```
wallpapers/          ← imagini originale full-size
thumbnails/          ← thumbnailuri 420px
ringtones/           ← fișiere MP3
```

Prefix-uri speciale:
- `category-preview-*` → cover categorii (în wallpapers/)
- `collection-cover-*` → cover colecții (în wallpapers/)

Reclame → Supabase Storage bucket `wallpaper-uploads` (NU pe R2)
