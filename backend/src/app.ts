import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

// Importar routers
import transactionsRouter from './modules/transactions/transactions.controller';
import investmentsRouter from './modules/investments/investments.controller';
import creditCardsRouter from './modules/credit-cards/credit-cards.controller';
import inventoryRouter from './modules/inventory/inventory.controller';
import reportingRouter from './modules/reporting/reporting.controller';

// Inicializar Google Drive
import { initServiceAccountAuth } from './config/google-drive';

const app: Express = express();

// ==========================================
// MIDDLEWARE GLOBAL
// ==========================================

// Seguridad
app.use(helmet());

// CORS
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  })
);

// Logging
app.use(morgan('combined'));

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// ==========================================
// HEALTH CHECK
// ==========================================
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// ==========================================
// INICIALIZAR SERVICIOS
// ==========================================

// Inicializar autenticación con Google Drive
console.log('🔧 Inicializando Google Drive Service Account...');
const driveAuth = initServiceAccountAuth();
if (driveAuth) {
  console.log('✅ Google Drive Service Account configurado');
} else {
  console.warn('⚠️ Google Drive Service Account no disponible - uploads deshabilitados');
}

// ==========================================
// RUTAS DE API
// ==========================================

// Versión 1 de API
const apiV1 = express.Router();

// Módulos de negocio
apiV1.use('/transactions', transactionsRouter);
apiV1.use('/investments', investmentsRouter);
apiV1.use('/credit-cards', creditCardsRouter);
apiV1.use('/inventory', inventoryRouter);
apiV1.use('/reports', reportingRouter);

// Registrar rutas con prefijo /api/v1
app.use('/api/v1', apiV1);

// ==========================================
// MANEJO DE ERRORES GLOBAL
// ==========================================

interface ApiError extends Error {
  status?: number;
  message: string;
}

app.use((err: ApiError, req: Request, res: Response, next: NextFunction) => {
  console.error('❌ Error:', err.message);

  const status = err.status || 500;
  const message = err.message || 'Error interno del servidor';

  res.status(status).json({
    error: true,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ==========================================
// RUTA 404
// ==========================================

app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: true,
    message: `Ruta no encontrada: ${req.method} ${req.path}`,
  });
});

export default app;
