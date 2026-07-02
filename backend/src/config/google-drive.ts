import { google } from 'googleapis';
import path from 'path';
import fs from 'fs';

/**
 * Configuración dual de Google Drive API:
 * - OAuth2: Para usuarios con sesión iniciada (crear carpetas personalizadas)
 * - Service Account: Para automatización del backend (uploads en background)
 */

// ==========================================
// OAUTH2 FLOW - Usuario Autenticado
// ==========================================

const OAUTH2_SCOPES = [
  'https://www.googleapis.com/auth/drive.file', // Acceso solo a archivos creados por la app
];

export const createOAuth2Client = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Google OAuth2 credentials missing in environment');
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
};

export const getOAuth2AuthUrl = () => {
  const oauth2Client = createOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: OAUTH2_SCOPES,
  });
};

export const exchangeOAuth2Code = async (code: string) => {
  const oauth2Client = createOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
};

// ==========================================
// SERVICE ACCOUNT - Automatización del Backend
// ==========================================

interface ServiceAccountKey {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
}

let serviceAccountAuth: any = null;

export const initServiceAccountAuth = () => {
  const serviceAccountPath = process.env.GOOGLE_SERVICE_ACCOUNT_PATH;

  if (!serviceAccountPath || !fs.existsSync(serviceAccountPath)) {
    console.warn(
      '⚠️ Service Account JSON no encontrado. La carga automática de archivos estará deshabilitada.'
    );
    return null;
  }

  const serviceAccountKey: ServiceAccountKey = JSON.parse(
    fs.readFileSync(serviceAccountPath, 'utf8')
  );

  serviceAccountAuth = new google.auth.JWT({
    email: serviceAccountKey.client_email,
    key: serviceAccountKey.private_key,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });

  return serviceAccountAuth;
};

export const getServiceAccountDrive = () => {
  if (!serviceAccountAuth) {
    serviceAccountAuth = initServiceAccountAuth();
  }

  if (!serviceAccountAuth) {
    throw new Error('Service Account no configurado');
  }

  return google.drive({ version: 'v3', auth: serviceAccountAuth });
};

export const getUserDrive = (accessToken: string) => {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.drive({ version: 'v3', auth });
};

// ==========================================
// OPERACIONES CLAVE DE GOOGLE DRIVE
// ==========================================

export interface DriveUploadResult {
  fileId: string;
  webViewLink: string;
  fileName: string;
  mimeType: string;
  createdTime: string;
}

/**
 * Crea o obtiene la carpeta raíz de la aplicación en Google Drive
 */
export const ensureAppFolder = async (drive: any): Promise<string> => {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (folderId) {
    // Validar que la carpeta existe
    try {
      await drive.files.get({ fileId: folderId, fields: 'id' });
      return folderId;
    } catch {
      console.error(`Carpeta ${folderId} no encontrada`);
    }
  }

  // Crear nueva carpeta
  const result = await drive.files.create({
    requestBody: {
      name: 'Contabilidad Personal',
      mimeType: 'application/vnd.google-apps.folder',
    },
    fields: 'id,webViewLink',
  });

  console.log(`📁 Nueva carpeta creada: ${result.data.id}`);
  return result.data.id;
};

/**
 * Crea subcarpetas por año/mes para organizar documentos
 */
export const ensureMonthFolder = async (
  drive: any,
  parentFolderId: string,
  year: number,
  month: number
): Promise<string> => {
  const monthName = new Date(year, month - 1).toLocaleDateString('es-CO', {
    month: 'long',
    year: 'numeric',
  });

  const query = `'${parentFolderId}' in parents and name='${monthName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const existing = await drive.files.list({
    q: query,
    spaces: 'drive',
    fields: 'files(id)',
  });

  if (existing.data.files && existing.data.files.length > 0) {
    return existing.data.files[0].id;
  }

  const result = await drive.files.create({
    requestBody: {
      name: monthName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId],
    },
    fields: 'id',
  });

  return result.data.id;
};

/**
 * Sube un archivo (PDF de factura) a Google Drive
 */
export const uploadInvoicePDF = async (
  drive: any,
  fileBuffer: Buffer,
  fileName: string,
  parentFolderId: string
): Promise<DriveUploadResult> => {
  const result = await drive.files.create({
    requestBody: {
      name: fileName,
      mimeType: 'application/pdf',
      parents: [parentFolderId],
      description: `Factura/comprobante: ${fileName}`,
    },
    media: {
      mimeType: 'application/pdf',
      body: fileBuffer,
    },
    fields: 'id,webViewLink,createdTime',
  });

  return {
    fileId: result.data.id,
    webViewLink: result.data.webViewLink,
    fileName: fileName,
    mimeType: 'application/pdf',
    createdTime: result.data.createdTime,
  };
};

/**
 * Genera un enlace público compartido (read-only)
 */
export const shareFilePublic = async (drive: any, fileId: string) => {
  await drive.permissions.create({
    fileId: fileId,
    requestBody: {
      role: 'reader',
      type: 'anyone',
    },
  });

  const file = await drive.files.get({
    fileId: fileId,
    fields: 'webViewLink',
  });

  return file.data.webViewLink;
};

/**
 * Elimina un archivo de Google Drive
 */
export const deleteFile = async (drive: any, fileId: string) => {
  await drive.files.delete({ fileId: fileId });
};
