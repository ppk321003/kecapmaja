# 🔑 Dapatkan Supabase Access Token

Saya perlu **Supabase Access Token** untuk deploy functions otomatis.

## 📝 Cara Dapatkan Token (2 menit):

### Step 1: Buka Supabase Dashboard
- Website: https://app.supabase.com
- Login dengan akun Anda

### Step 2: Ke Settings
1. Di sidebar kanan bawah, klik **profile picture**
2. Pilih **Settings**
3. Atau langsung: https://app.supabase.com/account/tokens

### Step 3: Generate Token
1. Klik **Access Tokens** (atau **Personal Access Tokens**)
2. Klik **Generate new token**
3. Nama: `deployment` (atau sembarang)
4. Expiration: Set ke 30 hari atau lebih (atau "Never")
5. Click **Generate**

### Step 4: Copy Token
- Copy token yang di-generate (ini adalah **satu-satunya waktu** token ditampilkan)
- Format: `sbp_...` atau `sap_...`

---

## ✅ Setelah Dapat Token

Paste token di bawah, atau reply: `Token: <paste_token_anda>`

Contoh format:
```
Token: sbp_1234567890abcdef1234567890abcdef1234567890abcdef
```

Saya akan langsung deploy 3 functions!

---

## ⚠️ Security Notes
- Token ini adalah **SECRET** - jangan share ke siapa-siapa
- Token berakses semua projek Supabase Anda
- Saya hanya gunakan untuk deploy, tidak disimpan di mana-mana
- Bisa di-revoke kapan saja di dashboard

