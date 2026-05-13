import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UploadRequest {
  fileName: string;
  fileData?: ArrayBuffer | number[];
  fileDataBase64?: string;
  mimeType: string;
  tahun: string;
  jenisDokumen: string;
  namaOrganik: string;
  folderDriveId: string;
  keterangan?: string;
  uploadedBy?: string;
}

// Metadata database Google Sheets
const METADATA_SPREADSHEET_ID = "1rq35tks1OEzyEYdMpc_mGCsS5kwIFGKSzb6j0HqTrz8";
const METADATA_SHEET_NAME = "Sheet1"; // Default sheet name
const TARGET_DRIVE_FOLDER_ID = "1CpAkfoxliks8Xi2CMmYbELSV3mDpKvLJ";
const GOOGLE_API_SCOPES = [
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/spreadsheets",
].join(" ");

// Utility untuk delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Utility untuk format timestamp Indonesia
function formatTimestampIndonesia(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const dd = pad(date.getDate());
  const MM = pad(date.getMonth() + 1);
  const yyyy = date.getFullYear();
  const HH = pad(date.getHours());
  const mm = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `${dd}/${MM}/${yyyy} ${HH}:${mm}:${ss}`;
}

function base64Url(input: string | Uint8Array): string {
  const binary = typeof input === "string" ? input : String.fromCharCode(...input);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function getGoogleCredentials(): { privateKey: string; serviceAccountEmail: string } {
  const privateKeyEnv = Deno.env.get("GOOGLE_PRIVATE_KEY") || "";
  const serviceAccountEmailEnv = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_EMAIL") || "";

  try {
    if (privateKeyEnv.includes('"type"')) {
      const serviceAccount = JSON.parse(privateKeyEnv);
      return {
        privateKey: serviceAccount.private_key.replace(/\\n/g, "\n"),
        serviceAccountEmail: serviceAccount.client_email,
      };
    }

    if (serviceAccountEmailEnv.includes('"type"')) {
      const serviceAccount = JSON.parse(serviceAccountEmailEnv);
      return {
        privateKey: serviceAccount.private_key.replace(/\\n/g, "\n"),
        serviceAccountEmail: serviceAccount.client_email,
      };
    }
  } catch (error) {
    console.error("[Google Auth] Failed to parse service account JSON:", error);
  }

  return {
    privateKey: privateKeyEnv.replace(/\\n/g, "\n"),
    serviceAccountEmail: serviceAccountEmailEnv,
  };
}

async function getGoogleAccessToken(): Promise<string> {
  const { privateKey, serviceAccountEmail } = getGoogleCredentials();
  if (!privateKey || !serviceAccountEmail) {
    throw new Error("Missing Google service account credentials");
  }

  const now = Math.floor(Date.now() / 1000);
  const encodedHeader = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const encodedPayload = base64Url(
    JSON.stringify({
      iss: serviceAccountEmail,
      scope: GOOGLE_API_SCOPES,
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    })
  );

  const pemContents = privateKey
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");
  const binaryDer = Uint8Array.from(atob(pemContents), (char) => char.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsignedToken)
  );
  const assertion = `${unsignedToken}.${base64Url(new Uint8Array(signature))}`;

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }).toString(),
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    throw new Error(`Failed to get Google access token: ${tokenResponse.statusText} - ${errorText}`);
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

// Fungsi untuk find atau create folder di Google Drive
async function findOrCreateFolder(
  accessToken: string,
  folderName: string,
  parentFolderId: string
): Promise<string> {
  // Search untuk folder yang sudah ada
  const searchQuery = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and '${parentFolderId}' in parents and trashed=false`;
  const searchUrl = new URL("https://www.googleapis.com/drive/v3/files");
  searchUrl.searchParams.set("q", searchQuery);
  searchUrl.searchParams.set("spaces", "drive");
  searchUrl.searchParams.set("fields", "files(id, name)");

  const searchResponse = await fetch(searchUrl.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!searchResponse.ok) {
    throw new Error(`Failed to search folder: ${searchResponse.statusText}`);
  }

  const searchData = await searchResponse.json();

  // Jika folder sudah ada, return ID-nya
  if (searchData.files && searchData.files.length > 0) {
    console.log(`[Google Drive] Found existing folder: ${folderName}`);
    return searchData.files[0].id;
  }

  // Create folder baru
  console.log(`[Google Drive] Creating new folder: ${folderName}`);
  const createResponse = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentFolderId],
    }),
  });

  if (!createResponse.ok) {
    throw new Error(`Failed to create folder: ${createResponse.statusText}`);
  }

  const folderData = await createResponse.json();
  return folderData.id;
}

// Fungsi untuk upload file ke Google Drive
async function uploadFileToDrive(
  accessToken: string,
  fileName: string,
  fileData: Uint8Array,
  mimeType: string,
  parentFolderId: string
): Promise<string> {
  console.log(`[Google Drive] Uploading file: ${fileName}`);

  const metadata = {
    name: fileName,
    parents: [parentFolderId],
    mimeType: mimeType,
  };

  // Create multipart body
  const boundary = "===============7330845974216740156==";
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadataBody = new TextEncoder().encode(JSON.stringify(metadata));
  let multipartBody = new Uint8Array();

  // Add metadata part
  multipartBody = new Uint8Array([
    ...multipartBody,
    ...new TextEncoder().encode(delimiter),
    ...new TextEncoder().encode(
      'Content-Type: application/json; charset=UTF-8\r\n\r\n'
    ),
    ...metadataBody,
    ...new TextEncoder().encode(delimiter),
    ...new TextEncoder().encode("Content-Type: " + mimeType + "\r\n\r\n"),
  ]);

  // Add file data part
  multipartBody = new Uint8Array([...multipartBody, ...fileData]);

  // Add closing boundary
  multipartBody = new Uint8Array([
    ...multipartBody,
    ...new TextEncoder().encode(closeDelimiter),
  ]);

  const uploadResponse = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: multipartBody,
    }
  );

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    throw new Error(
      `Failed to upload file: ${uploadResponse.statusText} - ${errorText}`
    );
  }

  const uploadedFile = await uploadResponse.json();
  console.log(`[Google Drive] File uploaded successfully: ${uploadedFile.id}`);
  return uploadedFile.id;
}

// Fungsi untuk append metadata ke Google Sheets
async function appendMetadataToSheet(
  accessToken: string,
  fileId: string,
  fileName: string,
  jenisDokumen: string,
  uploadedBy: string,
  targetFolderId: string,
  keterangan?: string
): Promise<void> {
  console.log(`[Metadata] Saving to Google Sheets: ${fileName}`);

  const timestamp = formatTimestampIndonesia(new Date());
  const fileLink = `https://drive.google.com/file/d/${fileId}/view`;

  const values = [
    [
      fileId,           // A: File ID
      fileName,         // B: Nama file
      timestamp,        // C: Waktu upload (DD/MM/YYYY HH:mm:ss)
      uploadedBy || "", // D: User yang upload
      jenisDokumen,     // E: Jenis dokumen
      fileLink,         // F: Link
      targetFolderId,   // G: Folder tujuan
      keterangan || "", // H: Keterangan
    ],
  ];

  const appendResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${METADATA_SPREADSHEET_ID}/values/${METADATA_SHEET_NAME}!A:H:append?valueInputOption=USER_ENTERED`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        values: values,
      }),
    }
  );

  if (!appendResponse.ok) {
    const errorText = await appendResponse.text();
    console.error(
      `[Metadata] Failed to append: ${appendResponse.statusText} - ${errorText}`
    );
    throw new Error(`Failed to save metadata: ${appendResponse.statusText}`);
  }

  console.log(`[Metadata] Successfully saved to Google Sheets`);
}

// Main handler
serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const requestBody: UploadRequest = await req.json();

    const {
      fileName,
      fileData,
      fileDataBase64,
      mimeType,
      tahun,
      jenisDokumen,
      namaOrganik,
      folderDriveId,
      keterangan,
      uploadedBy,
    } = requestBody;

    console.log(`[Upload Dokumen] Processing upload: ${fileName}`);
    console.log(
      `[Upload Dokumen] Details - Tahun: ${tahun}, Jenis: ${jenisDokumen}, Mitra: ${namaOrganik}`
    );

    // Validasi input
    if (
      !fileName ||
      (!fileData && !fileDataBase64) ||
      !tahun ||
      !jenisDokumen ||
      !namaOrganik
    ) {
      throw new Error("Missing required fields");
    }

    const rootFolderId = TARGET_DRIVE_FOLDER_ID;

    // Get Google access token
    const accessToken = await getGoogleAccessToken();
    console.log("[Google Drive] Access token acquired");

    // Convert input ke Uint8Array (support base64 atau array)
    let fileDataArray: Uint8Array;
    if (fileDataBase64) {
      const binary = atob(fileDataBase64);
      fileDataArray = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        fileDataArray[i] = binary.charCodeAt(i);
      }
    } else if (Array.isArray(fileData)) {
      fileDataArray = new Uint8Array(fileData);
    } else {
      fileDataArray = new Uint8Array(fileData as ArrayBuffer);
    }

    // Step 1: Create/Find Tahun folder
    const tahunFolderId = await findOrCreateFolder(
      accessToken,
      tahun,
      rootFolderId
    );
    await delay(200); // Rate limiting

    // Step 2: Create/Find Nama Organik folder
    const mitraFolderId = await findOrCreateFolder(
      accessToken,
      namaOrganik,
      tahunFolderId
    );
    await delay(200); // Rate limiting

    // Step 3: Create/Find Jenis Dokumen folder
    const jenisFolderId = await findOrCreateFolder(
      accessToken,
      jenisDokumen,
      mitraFolderId
    );
    await delay(200); // Rate limiting

    // Step 4: Upload file
    const fileId = await uploadFileToDrive(
      accessToken,
      fileName,
      fileDataArray,
      mimeType,
      jenisFolderId
    );

    console.log(`[Upload Dokumen] Successfully uploaded: ${fileId}`);

    // Step 5: Append metadata to Google Sheets
    await appendMetadataToSheet(
      accessToken,
      fileId,
      fileName,
      jenisDokumen,
      uploadedBy || "Unknown",
      jenisFolderId,
      keterangan
    );
    await delay(200); // Rate limiting

    return new Response(
      JSON.stringify({
        success: true,
        fileId: fileId,
        fileName: fileName,
        message: "File berhasil diupload",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("[Upload Dokumen] Error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Unknown error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
