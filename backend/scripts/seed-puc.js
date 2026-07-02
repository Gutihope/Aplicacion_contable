/**
 * Seeder para cargar PUC desde archivo Excel
 * Uso: node scripts/seed-puc.js "/ruta/Puc aplicación.xlsx"
 */

const XLSX = require('xlsx');
const { PrismaClient } = require('@prisma/client');
const path = require('path');

const prisma = new PrismaClient();

/**
 * Mapea columnas del Excel a campos de BD
 * Ajusta según la estructura de tu archivo
 */
function mapExcelToPUC(row, columnMapping) {
  return {
    codigo: row[columnMapping.codigo] || '',
    nombre: row[columnMapping.nombre] || '',
    nivel: parseInt(row[columnMapping.nivel]) || 0,
    naturaleza: row[columnMapping.naturaleza]?.toUpperCase() === 'C' ? 'C' : 'D',
    movimiento: row[columnMapping.movimiento]?.toLowerCase() === 'sí' ||
               row[columnMapping.movimiento] === true ||
               row[columnMapping.movimiento] === 1
  };
}

/**
 * Detecta automáticamente el mapeo de columnas
 */
function detectColumnMapping(headers) {
  const mapping = {
    codigo: null,
    nombre: null,
    nivel: null,
    naturaleza: null,
    movimiento: null
  };

  // Palabras clave para detectar columnas
  const patterns = {
    codigo: ['código', 'code', 'puc', 'cuenta'],
    nombre: ['nombre', 'name', 'descripción', 'desc'],
    nivel: ['nivel', 'level', 'jerarquía'],
    naturaleza: ['naturaleza', 'nature', 'tipo', 'débito', 'crédito'],
    movimiento: ['movimiento', 'puede', 'movement', 'saldo', 'activo']
  };

  headers.forEach((header) => {
    const lowerHeader = header.toLowerCase().trim();

    Object.entries(patterns).forEach(([key, keywords]) => {
      if (keywords.some(kw => lowerHeader.includes(kw))) {
        mapping[key] = header;
      }
    });
  });

  return mapping;
}

async function seedPUC(excelPath) {
  try {
    console.log('📂 Leyendo archivo Excel...');

    if (!excelPath) {
      throw new Error('Por favor proporciona la ruta del archivo Excel');
    }

    // Leer Excel
    const workbook = XLSX.readFile(excelPath);
    const firstSheet = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheet];
    const data = XLSX.utils.sheet_to_json(worksheet);

    if (data.length === 0) {
      throw new Error('El archivo Excel está vacío');
    }

    // Detectar mapeo de columnas
    const headers = Object.keys(data[0]);
    console.log('\n🏷️ Columnas detectadas:', headers);

    const columnMapping = detectColumnMapping(headers);
    console.log('\n📋 Mapeo de columnas:');
    Object.entries(columnMapping).forEach(([key, value]) => {
      console.log(`  ${key}: ${value || '⚠️ NO DETECTADA'}`);
    });

    // Validar que se detectaron las columnas principales
    if (!columnMapping.codigo || !columnMapping.nombre) {
      console.error('\n❌ No se pudieron detectar las columnas "código" y "nombre"');
      console.error('Por favor verifica la estructura del archivo');
      process.exit(1);
    }

    // Procesar y validar datos
    console.log('\n🔍 Validando datos...');
    const pucsToInsert = [];
    const errors = [];

    data.forEach((row, idx) => {
      try {
        // Saltar filas vacías
        if (!row[columnMapping.codigo] || !row[columnMapping.nombre]) {
          return;
        }

        const puc = mapExcelToPUC(row, columnMapping);

        // Validaciones
        if (!puc.codigo || puc.codigo.trim() === '') {
          throw new Error('Código vacío');
        }
        if (!puc.nombre || puc.nombre.trim() === '') {
          throw new Error('Nombre vacío');
        }
        if (puc.nivel < 1) {
          throw new Error('Nivel debe ser mayor a 0');
        }

        pucsToInsert.push(puc);
      } catch (err) {
        errors.push(`Fila ${idx + 2}: ${err.message}`);
      }
    });

    if (errors.length > 0 && errors.length < pucsToInsert.length) {
      console.warn('\n⚠️ Algunos errores encontrados (continuando):');
      errors.slice(0, 5).forEach(err => console.warn(`  - ${err}`));
      if (errors.length > 5) {
        console.warn(`  ... y ${errors.length - 5} más`);
      }
    }

    console.log(`\n✅ ${pucsToInsert.length} registros válidos para insertar`);

    if (pucsToInsert.length === 0) {
      throw new Error('No hay datos válidos para insertar');
    }

    // Mostrar preview
    console.log('\n📝 Primeros 3 registros a insertar:');
    pucsToInsert.slice(0, 3).forEach((puc, idx) => {
      console.log(`\n${idx + 1}. Código: ${puc.codigo}`);
      console.log(`   Nombre: ${puc.nombre}`);
      console.log(`   Nivel: ${puc.nivel} | Naturaleza: ${puc.naturaleza} | Movimiento: ${puc.movimiento}`);
    });

    // Confirmar antes de insertar
    console.log('\n⚠️ ADVERTENCIA: Esto eliminará todos los PUCs existentes');
    const answer = await askQuestion('¿Deseas continuar? (sí/no): ');

    if (answer.toLowerCase() !== 'sí' && answer.toLowerCase() !== 'yes') {
      console.log('Operación cancelada');
      process.exit(0);
    }

    // Limpiar PUCs existentes
    console.log('\n🗑️ Eliminando PUCs existentes...');
    await prisma.pUC.deleteMany({});

    // Insertar nuevos PUCs
    console.log('💾 Insertando PUCs en base de datos...');
    const inserted = await prisma.pUC.createMany({
      data: pucsToInsert,
      skipDuplicates: false
    });

    console.log('\n✅ ¡ÉXITO! Datos cargados:');
    console.log(`  Total de PUCs insertados: ${inserted.count}`);

    // Estadísticas
    const stats = await prisma.pUC.groupBy({
      by: ['nivel'],
      _count: true
    });

    console.log('\n📊 Distribución por nivel:');
    stats.forEach(stat => {
      console.log(`  Nivel ${stat.nivel}: ${stat._count} cuentas`);
    });

    const naturalezaStats = await prisma.pUC.groupBy({
      by: ['naturaleza'],
      _count: true
    });

    console.log('\n📊 Distribución por naturaleza:');
    naturalezaStats.forEach(stat => {
      const tipo = stat.naturaleza === 'D' ? 'Débito' : 'Crédito';
      console.log(`  ${tipo}: ${stat._count} cuentas`);
    });

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Helper para preguntar al usuario
 */
function askQuestion(question) {
  return new Promise((resolve) => {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

// Ejecutar
const excelPath = process.argv[2];
seedPUC(excelPath);
