import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import {
  createCashPurchaseTransaction,
  createCreditPurchaseTransaction,
  TransactionData,
} from '../../services/AccountingService';
import { googleDriveService } from '../../services/GoogleDriveService';

const router = Router();

// Configurar multer para recibir PDFs en memoria
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos PDF'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// ==========================================
// POST /transactions/cash-purchase
// ==========================================
/**
 * Crear transacción de compra en CONTADO
 *
 * Body:
 * {
 *   "fecha": "2024-07-02",
 *   "descripcion": "Compra de mercancía en Carrefour",
 *   "metodo_pago_id": 1,  // Referencia a metodos_pago_cuentas
 *   "items": [
 *     {
 *       "id_producto": 5,
 *       "cantidad": 2,
 *       "precio_unitario": 15000,
 *       "porcentaje_iva": 19
 *     }
 *   ]
 * }
 */
router.post(
  '/cash-purchase',
  upload.single('invoice_pdf'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        fecha,
        descripcion,
        metodo_pago_id,
        items,
      } = req.body;

      // Validar campos obligatorios
      if (!fecha || !descripcion || !metodo_pago_id) {
        return res.status(400).json({
          error: 'Faltan campos obligatorios: fecha, descripcion, metodo_pago_id',
        });
      }

      // Parsear items (vienen como JSON string)
      const parsedItems = typeof items === 'string' ? JSON.parse(items) : items;

      // Subir PDF a Google Drive si existe
      let googleDriveFileId: string | undefined;
      let googleDriveWebviewLink: string | undefined;

      if (req.file) {
        const fileName = `${new Date(fecha).getTime()}-${req.file.originalname}`;
        const driveResult = await googleDriveService.uploadInvoiceFile(
          req.file.buffer,
          fileName,
          new Date(fecha)
        );

        googleDriveFileId = driveResult.fileId;
        googleDriveWebviewLink = driveResult.webViewLink;
      }

      // Crear transacción
      const transactionData: TransactionData = {
        fecha: new Date(fecha),
        descripcion,
        comprobante_tipo: 'Egreso',
        metodo_pago_id: parseInt(metodo_pago_id),
        items: parsedItems,
        google_drive_file_id: googleDriveFileId,
        google_drive_webview_link: googleDriveWebviewLink,
      };

      const asiento = await createCashPurchaseTransaction(transactionData);

      res.status(201).json({
        success: true,
        message: 'Transacción de compra en contado creada exitosamente',
        asiento_id: asiento.id_asiento,
        google_drive_file_id: googleDriveFileId,
        asiento,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ==========================================
// POST /transactions/credit-purchase
// ==========================================
/**
 * Crear transacción de compra a CRÉDITO (Tarjeta o Proveedor)
 *
 * Body:
 * {
 *   "fecha": "2024-07-02",
 *   "descripcion": "Compra en Amazon",
 *   "tipo_credito": "TARJETA",  // o "PROVEEDOR"
 *   "id_tarjeta": 2,  // Si es TARJETA
 *   "establecimiento_tercero_id": 10,
 *   "cuotas_totales": 3,  // Para compras diferidas
 *   "items": [...]
 * }
 */
router.post(
  '/credit-purchase',
  upload.single('invoice_pdf'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        fecha,
        descripcion,
        tipo_credito,
        id_tarjeta,
        establecimiento_tercero_id,
        cuotas_totales,
        items,
      } = req.body;

      // Subir PDF
      let googleDriveFileId: string | undefined;
      let googleDriveWebviewLink: string | undefined;

      if (req.file) {
        const fileName = `${new Date(fecha).getTime()}-${req.file.originalname}`;
        const driveResult = await googleDriveService.uploadInvoiceFile(
          req.file.buffer,
          fileName,
          new Date(fecha)
        );

        googleDriveFileId = driveResult.fileId;
        googleDriveWebviewLink = driveResult.webViewLink;
      }

      const parsedItems = typeof items === 'string' ? JSON.parse(items) : items;

      const transactionData: TransactionData = {
        fecha: new Date(fecha),
        descripcion,
        comprobante_tipo: 'Egreso',
        id_tarjeta: id_tarjeta ? parseInt(id_tarjeta) : undefined,
        establecimiento_tercero_id: establecimiento_tercero_id
          ? parseInt(establecimiento_tercero_id)
          : undefined,
        cuotas_totales: cuotas_totales ? parseInt(cuotas_totales) : undefined,
        items: parsedItems,
        google_drive_file_id: googleDriveFileId,
        google_drive_webview_link: googleDriveWebviewLink,
      };

      const asiento = await createCreditPurchaseTransaction(transactionData);

      res.status(201).json({
        success: true,
        message: 'Transacción de compra a crédito creada exitosamente',
        asiento_id: asiento.id_asiento,
        google_drive_file_id: googleDriveFileId,
        asiento,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ==========================================
// GET /transactions/:id
// ==========================================
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    // Aquí iría la lógica de obtener un asiento específico
    res.json({ message: `Obteniendo transacción ${id}` });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// DELETE /transactions/:id
// ==========================================
router.delete(
  '/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      // Aquí iría la lógica de eliminar un asiento
      res.json({ message: `Eliminando transacción ${id}` });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
