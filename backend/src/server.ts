import app from './app';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

/**
 * Inicia el servidor Express
 */
async function startServer() {
  try {
    // Verificar conexión a la base de datos
    console.log('🔌 Verificando conexión a PostgreSQL...');
    await prisma.$connect();
    console.log('✅ Conectado a la base de datos');

    // Iniciar servidor
    app.listen(PORT, () => {
      console.log(`🚀 Servidor iniciado en puerto ${PORT}`);
      console.log(`📍 API disponible en http://localhost:${PORT}/api/v1`);
      console.log(`🏥 Health check: http://localhost:${PORT}/health`);

      // Documentación de endpoints
      console.log('\n📚 ENDPOINTS DISPONIBLES:');
      console.log('---');
      console.log('Transacciones:');
      console.log('  POST   /api/v1/transactions/cash-purchase');
      console.log('  POST   /api/v1/transactions/credit-purchase');
      console.log('  GET    /api/v1/transactions/:id');
      console.log('  DELETE /api/v1/transactions/:id');
      console.log('');
      console.log('Inversiones:');
      console.log('  GET    /api/v1/investments');
      console.log('  POST   /api/v1/investments/:id/record-interest');
      console.log('  POST   /api/v1/investments/month-close');
      console.log('');
      console.log('Tarjetas de Crédito:');
      console.log('  GET    /api/v1/credit-cards');
      console.log('  GET    /api/v1/credit-cards/:id/purchases');
      console.log('  POST   /api/v1/credit-cards/:id/month-close');
      console.log('');
      console.log('Inventario:');
      console.log('  GET    /api/v1/inventory/products');
      console.log('  GET    /api/v1/inventory/alerts');
      console.log('  POST   /api/v1/inventory/products/:id/consume');
      console.log('  POST   /api/v1/inventory/products/:id/restock');
      console.log('');
      console.log('Reportes:');
      console.log('  GET    /api/v1/reports/balance-sheet');
      console.log('  GET    /api/v1/reports/income-statement');
      console.log('  GET    /api/v1/reports/forecast');
      console.log('  GET    /api/v1/reports/inventory-value');
      console.log('---\n');
    });
  } catch (error) {
    console.error('❌ Error al iniciar servidor:', error);
    process.exit(1);
  }
}

// Manejo de señales de cierre
process.on('SIGINT', async () => {
  console.log('\n📤 Cerrando conexiones...');
  await prisma.$disconnect();
  process.exit(0);
});

startServer();
