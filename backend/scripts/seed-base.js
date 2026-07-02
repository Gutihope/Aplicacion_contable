/**
 * Seeder de datos base: Terceros, Métodos de Pago, etc.
 * Uso: node scripts/seed-base.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const TERCEROS_BASE = [
  {
    nit_o_documento: '860002743',
    nombre_completo: 'Bancolombia S.A.',
    pais: 'Colombia',
    ciudad: 'Medellín',
    tipo_servicio_presta: 'Servicios Financieros',
    tipo_persona: 'JURIDICA'
  },
  {
    nit_o_documento: '860034405',
    nombre_completo: 'Banco de Bogotá S.A.',
    pais: 'Colombia',
    ciudad: 'Bogotá',
    tipo_servicio_presta: 'Servicios Financieros',
    tipo_persona: 'JURIDICA'
  },
  {
    nit_o_documento: '890316000',
    nombre_completo: 'Davivienda S.A.',
    pais: 'Colombia',
    ciudad: 'Bogotá',
    tipo_servicio_presta: 'Servicios Financieros',
    tipo_persona: 'JURIDICA'
  },
  {
    nit_o_documento: '860052670',
    nombre_completo: 'BBVA Colombia',
    pais: 'Colombia',
    ciudad: 'Bogotá',
    tipo_servicio_presta: 'Servicios Financieros',
    tipo_persona: 'JURIDICA'
  },
  {
    nit_o_documento: '9999999999',
    nombre_completo: 'Efectivo (Uso Interno)',
    pais: 'Colombia',
    ciudad: 'Medellín',
    tipo_servicio_presta: 'Efectivo',
    tipo_persona: 'PERSONA'
  }
];

const METODOS_PAGO_BASE = [
  {
    nombre_comercial: 'Efectivo',
    categoria_pago: 'CONTADO',
    tipo_origen: 'EFECTIVO',
    puc_codigo: '110101'
  },
  {
    nombre_comercial: 'Nequi',
    categoria_pago: 'CONTADO',
    tipo_origen: 'BANCO',
    puc_codigo: '110105'
  },
  {
    nombre_comercial: 'Bancolombia',
    categoria_pago: 'CONTADO',
    tipo_origen: 'BANCO',
    puc_codigo: '110105'
  },
  {
    nombre_comercial: 'Davivienda',
    categoria_pago: 'CONTADO',
    tipo_origen: 'BANCO',
    puc_codigo: '110105'
  },
  {
    nombre_comercial: 'Visa Débito',
    categoria_pago: 'CONTADO',
    tipo_origen: 'BANCO',
    puc_codigo: '110105'
  }
];

async function seedBase() {
  try {
    console.log('🌱 Iniciando seed de datos base...\n');

    // 1. Insertar Terceros
    console.log('👥 Insertando Terceros...');
    const terceros = await prisma.tercero.createMany({
      data: TERCEROS_BASE,
      skipDuplicates: true
    });
    console.log(`   ✅ ${terceros.count} terceros insertados/actualizados`);

    // 2. Obtener el ID del banco Bancolombia para vincular en métodos de pago
    const bancolombia = await prisma.tercero.findUnique({
      where: { nit_o_documento: '860002743' }
    });

    // 3. Insertar Métodos de Pago con referencia a tercero
    console.log('💳 Insertando Métodos de Pago...');

    const metodosConTercero = METODOS_PAGO_BASE.map(metodo => ({
      ...metodo,
      banco_tercero_id: bancolombia ? bancolombia.id_tercero : null
    }));

    const metodos = await prisma.metodoPagoCuenta.createMany({
      data: metodosConTercero,
      skipDuplicates: true
    });
    console.log(`   ✅ ${metodos.count} métodos de pago insertados`);

    // 4. Estadísticas
    console.log('\n📊 Estadísticas:');
    const terceroCount = await prisma.tercero.count();
    const metodoCount = await prisma.metodoPagoCuenta.count();
    const pucCount = await prisma.pUC.count();

    console.log(`   Terceros en BD: ${terceroCount}`);
    console.log(`   Métodos de Pago: ${metodoCount}`);
    console.log(`   PUCs en BD: ${pucCount}`);

    console.log('\n✅ ¡Seed completado exitosamente!');
    console.log('\n📝 Próximos pasos:');
    console.log('   1. Cargar PUC: node scripts/seed-puc.js "ruta/Puc aplicación.xlsx"');
    console.log('   2. Verificar datos: npm run db:studio');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedBase();
