# Setup Guide: Linkers Page Configuration

## Overview
The Linkers page now requires configuration in your **satker_config** Google Sheet to load and manage linker data dynamically.

## Configuration Steps

### 1. **Locate Your satker_config Sheet**
- **Spreadsheet ID**: `1CBpS-rhb5pSSHFoleUoRa8D8CGeMh61tCoF82S0W0cQ`
- **Sheet Name**: `satker_config`
- This sheet contains configuration for all satkers

### 2. **Find Your Satker Row**
- Look for the row with your **satker_id** (e.g., "3210")
- You need to add data to **Column U** (linkers_sheet_id)

### 3. **Create Your Linkers Google Sheet**
Create a new Google Sheet with the following structure:

#### Sheet Details:
- **Sheet Name**: `Linkers` (exact spelling, case-sensitive)
- **Columns**: 4 columns (A, B, C, D)

#### Header Row (Row 1):
| A | B | C | D |
|---|---|---|---|
| judul | deskripsi | link | icon |

#### Example Data (Rows 2+):
| A (judul) | B (deskripsi) | C (link) | D (icon) |
|---|---|---|---|
| DIPA | Document Anggaran | https://drive.google.com/... | Archive |
| Photo of The Days | Galeri Foto | https://photos.app.goo.gl/... | Image |
| Kertas Kerja Excel | Riwayat Kertas Kerja | https://drive.google.com/... | FileText |

### 4. **Get Your Linkers Sheet ID**
- Open your newly created Linkers Google Sheet
- Copy the ID from the URL: `https://docs.google.com/spreadsheets/d/**[THIS_IS_YOUR_ID]**/edit`
- The ID looks like: `1aG743mQVL7iR6NDbulDBPsFAQJCMGZH0nj9RLWTtPvE`

### 5. **Update satker_config Sheet**
- Go to your satker_config sheet (ID: `1CBpS-rhb5pSSHFoleUoRa8D8CGeMh61tCoF82S0W0cQ`)
- Find your satker row (e.g., satker_id = "3210")
- Paste the Linkers sheet ID into **Column U** (linkers_sheet_id)

## Column Reference in satker_config

| Column | Field | Purpose |
|--------|-------|---------|
| A | satker_id | Satker identifier (e.g., "3210") |
| B | satker_nama | Satker name |
| C | pencairan_sheet_id | Pencairan sheet |
| D | pengadaan_sheet_id | Pengadaan sheet |
| E | entrikegiatan_sheet_id | Entry Kegiatan sheet |
| ... | ... | ... (other modules) |
| U | **linkers_sheet_id** | **Linkers sheet (NEW)** |

## Icon Options (Column D in Linkers Sheet)

You can use any of these icon names in the **icon** column:

1. **Archive** - Filing/storage icon
2. **Database** - Database icon
3. **FileText** - Document icon
4. **Image** - Picture/gallery icon
5. **DollarSign** - Finance/money icon
6. **Link2** - Link icon
7. **ExternalLink** - Open in new tab icon
8. **Globe** - World/website icon
9. **Download** - Download arrow icon
10. **Upload** - Upload arrow icon
11. **Settings** - Gear/settings icon
12. **Bell** - Notification icon

## Access Control

### Role-Based Permissions:
- **PPK Users** (`Pejabat Pembuat Komitmen`): Can Add, Edit, Delete linkers
- **Other Users**: Can only view linkers (read-only)

## Troubleshooting

### Issue: "Linkers sheet ID not configured"

**Solution**: 
1. Ensure Column U in satker_config has a value for your satker row
2. The value must be a valid Google Sheets ID (not a URL)
3. Clear browser cache and refresh the page

### Issue: Data doesn't load

**Solution**:
1. Verify the Linkers sheet exists and is named exactly "Linkers"
2. Check that the sheet has data in columns A-D
3. Ensure the Google service account has access to the Linkers spreadsheet
4. Check browser console (F12 → Console tab) for detailed error messages

### Issue: "Gagal memuat data linkers" (Failed to load linkers data)

**Solution**:
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for detailed error messages
4. Share the error with your admin for diagnosis

## Data Auto-Sorting

- Linkers are automatically sorted by **judul** (title) in alphabetical order
- Sorting happens automatically when data is loaded or updated

## Save Changes

After adding/editing linkers, changes are saved immediately to Google Sheets. A success/error toast message will appear.

## Support

For issues or questions, check:
1. Browser Console (F12 → Console) for error messages
2. Verify Google Sheets permissions
3. Contact your system administrator

---

**Last Updated**: January 31, 2026
**Version**: 1.0
