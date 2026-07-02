/**
 * Carga PUC desde archivo CSV
 * Uso: node scripts/seed-puc-csv.js "Puc.csv"
 */

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Parse simple CSV (maneja comillas)
 */
function parseCSV(csvText) {
  const lines = csvText.split('\n');
  const headers = lines[0].split(',').map(h => h.trim());

  const data = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;

    const row = {};
    let currentValue = '';
    let insideQuotes = false;
    let valueIndex = 0;

    for (let j = 0; j < lines[i].length; j++) {
      const char = lines[i][j];

      if (char === '"' && (j === 0 || lines[i][j - 1] !== '\\')) {
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        row[headers[valueIndex]] = currentValue.replace(/^"|"$/g, '').replace(/""/g, '"');
        currentValue = '';
        valueIndex++;
      } else {
        currentValue += char;
      }
    }

    if (valueIndex < headers.length) {
      row[headers[valueIndex]] = currentValue.replace(/^"|"$/g, '').replace(/""/g, '"');
    }

    data.push(row);
  }

  return { headers, data };
}

/**
 * Detecta mapeo de columnas
 */
function detectColumnMapping(headers) {
  const mapping = {
    codigo: null,
    nombre: null,
    nivel: null,
    naturaleza: null,
    movimiento: null
  };

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

/**
 * Mapea valores de Excel a modelo
 */
function mapCSVToPUC(row, columnMapping) {
  return {
    codigo: String(row[columnMapping.codigo] || '').trim(),
    nombre: String(row[columnMapping.nombre] || '').trim(),
    nivel: parseInt(row[columnMapping.nivel]) || 0,
    naturaleza: String(row[columnMapping.naturaleza] || 'D').toUpperCase().charAt(0) === 'C' ? 'C' : 'D',
    movimiento: String(row[columnMapping.movimiento] || 'sí').toLowerCase() === 'sí' ||
               String(row[columnMapping.movimiento]).toLowerCase() === 'true' ||
               row[columnMapping.movimiento] === 1
  };
}

async function seedPUCfromCSV(csvPath) {
  try {
    console.log('📂 Leyendo archivo CSV...');

    if (!csvPath) {
      throw new Error('Por favor proporciona la ruta del archivo CSV');
    }

    // Leer CSV
    if (!fs.existsSync(csvPath)) {
      throw new Error(`Archivo no encontrado: ${csvPath}`);
    }

    const csvText = fs.readFileSync(csvPath, 'utf8');
    const { headers, data } = parseCSV(csvText);

    if (data.length === 0) {
      throw new Error('El archivo CSV está vacío');
    }

    console.log(`✅ ${data.length} registros leídos`);
    console.log(`🏷️ Columnas detectadas: ${headers.join(', ')}`);

    // Detectar mapeo
    const columnMapping = detectColumnMapping(headers);
    console.log('\n📋 Mapeo de columnas:');
    Object.entries(columnMapping).forEach(([key, value]) => {
      console.log(`  ${key}: ${value || '⚠️ NO DETECTADA'}`);
    });

    if (!columnMapping.codigo || !columnMapping.nombre) {
      throw new Error('No se detectaron columnas "código" y "nombre"');
    }

    // Validar datos
    console.log('\n🔍 Validando datos...');
    const pucsToInsert = [];
    const errors = [];

    data.forEach((row, idx) => {
      try {
        if (!row[columnMapping.codigo] || !row[columnMapping.nombre]) {
          return;
        }

        const puc = mapCSVToPUC(row, columnMapping);

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

    // Preview
    console.log('\n📝 Primeros 3 registros:');
    pucsToInsert.slice(0, 3).forEach((puc, idx) => {
      console.log(`\n${idx + 1}. Código: ${puc.codigo}`);
      console.log(`   Nombre: ${puc.nombre}`);
      console.log(`   Nivel: ${puc.nivel} | Naturaleza: ${puc.naturaleza} | Movimiento: ${puc.movimiento}`);
    });

    // Confirmar (saltar si viene --confirm en args)
    const skipConfirm = process.argv.includes('--confirm') || process.argv.includes('--skip-confirm');

    if (!skipConfirm) {
      console.log('\n⚠️ ADVERTENCIA: Esto eliminará todos los PUCs existentes');
      const answer = await askQuestion('¿Deseas continuar? (sí/no): ');

      if (answer.toLowerCase() !== 'sí' && answer.toLowerCase() !== 'yes') {
        console.log('Operación cancelada');
        process.exit(0);
      }
    } else {
      console.log('\n⚠️ Continuando sin confirmación (--confirm)');
    }

    // Limpiar y insertar
    console.log('\n🗑️ Eliminando PUCs existentes...');
    await prisma.pUC.deleteMany({});

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
const csvPath = process.argv[2];
seedPUCfromCSV(csvPath);
