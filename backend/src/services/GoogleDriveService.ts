import {
  getServiceAccountDrive,
  getUserDrive,
  ensureAppFolder,
  ensureMonthFolder,
  uploadInvoicePDF,
  shareFilePublic,
  deleteFile,
  DriveUploadResult,
} from '../config/google-drive';

export class GoogleDriveService {
  /**
   * Sube un archivo de factura a Google Drive usando Service Account
   * Crea la estructura de carpetas automáticamente (Año/Mes)
   */
  async uploadInvoiceFile(
    fileBuffer: Buffer,
    fileName: string,
    date: Date,
    userAccessToken?: string
  ): Promise<DriveUploadResult> {
    try {
      // Usar Service Account para automatización de backend
      const drive = getServiceAccountDrive();

      // 1. Obtener/crear carpeta raíz
      const rootFolderId = await ensureAppFolder(drive);

      // 2. Crear estructura Año/Mes
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const monthFolderId = await ensureMonthFolder(drive, rootFolderId, year, month);

      // 3. Subir archivo
      const result = await uploadInvoicePDF(
        drive,
        fileBuffer,
        fileName,
        monthFolderId
      );

      console.log(`✅ Archivo ${fileName} subido a Google Drive: ${result.fileId}`);

      return result;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('❌ Error al subir archivo a Google Drive:', error);
      throw new Error(`Google Drive upload failed: ${msg}`);
    }
  }

  /**
   * Obtiene un archivo de Google Drive por su ID
   */
  async getFileInfo(fileId: string, userAccessToken?: string) {
    try {
      const drive = getServiceAccountDrive();
      const file = await drive.files.get({
        fileId,
        fields: 'id,name,webViewLink,createdTime,size,mimeType',
      });

      return file.data;
    } catch (error) {
      console.error('Error al obtener info del archivo:', error);
      throw error;
    }
  }

  /**
   * Elimina un archivo de Google Drive
   */
  async removeFile(fileId: string): Promise<void> {
    try {
      const drive = getServiceAccountDrive();
      await deleteFile(drive, fileId);
      console.log(`🗑️ Archivo ${fileId} eliminado de Google Drive`);
    } catch (error) {
      console.error('Error al eliminar archivo:', error);
      throw error;
    }
  }

  /**
   * Comparte un archivo públicamente (read-only)
   */
  async shareFilePublicly(fileId: string): Promise<string> {
    try {
      const drive = getServiceAccountDrive();
      const link = await shareFilePublic(drive, fileId);
      return link;
    } catch (error) {
      console.error('Error al compartir archivo:', error);
      throw error;
    }
  }

  /**
   * Obtiene una lista de archivos de una carpeta
   */
  async listFolderFiles(
    folderId: string,
    pageSize: number = 50
  ): Promise<any[]> {
    try {
      const drive = getServiceAccountDrive();
      const result = await drive.files.list({
        q: `'${folderId}' in parents and trashed=false`,
        spaces: 'drive',
        fields: 'files(id, name, createdTime, size, webViewLink)',
        pageSize,
      });

      return result.data.files || [];
    } catch (error) {
      console.error('Error al listar archivos:', error);
      throw error;
    }
  }

  /**
   * Descarga el contenido de un archivo (para previsualizaciones)
   */
  async downloadFile(fileId: string): Promise<Buffer> {
    try {
      const drive = getServiceAccountDrive();
      const response = await drive.files.get(
        { fileId, alt: 'media' },
        { responseType: 'stream' }
      );

      return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        response.data.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });
        response.data.on('end', () => {
          resolve(Buffer.concat(chunks));
        });
        response.data.on('error', reject);
      });
    } catch (error) {
      console.error('Error al descargar archivo:', error);
      throw error;
    }
  }
}

export const googleDriveService = new GoogleDriveService();
