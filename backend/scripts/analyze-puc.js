/**
 * Script para analizar la estructura del archivo PUC.xlsx
 * Uso: node scripts/analyze-puc.js "/ruta/al/Puc aplicación.xlsx"
 */

const XLSX = require('xlsx');
const path = require('path');

const filePath = process.argv[2];

if (!filePath) {
  console.error('❌ Por favor proporciona la ruta del archivo Excel');
  console.error('Uso: node scripts/analyze-puc.js "/ruta/Puc aplicación.xlsx"');
  process.exit(1);
}

try {
  console.log(`📂 Leyendo archivo: ${filePath}`);

  // Leer el archivo Excel
  const workbook = XLSX.readFile(filePath);

  // Listar hojas disponibles
  console.log('\n📋 Hojas disponibles:');
  workbook.SheetNames.forEach((name, idx) => {
    console.log(`  ${idx + 1}. ${name}`);
  });

  // Analizar la primera hoja
  const firstSheet = workbook.SheetNames[0];
  console.log(`\n🔍 Analizando hoja: "${firstSheet}"`);

  const worksheet = workbook.Sheets[firstSheet];
  const data = XLSX.utils.sheet_to_json(worksheet);

  console.log(`\n📊 Total de filas: ${data.length}`);

  if (data.length > 0) {
    console.log('\n🏷️ Columnas detectadas:');
    const columns = Object.keys(data[0]);
    columns.forEach((col, idx) => {
      console.log(`  ${idx + 1}. ${col}`);
    });

    console.log('\n📝 Primeras 3 filas:');
    data.slice(0, 3).forEach((row, idx) => {
      console.log(`\nFila ${idx + 1}:`);
      Object.entries(row).forEach(([key, value]) => {
        console.log(`  ${key}: ${value}`);
      });
    });
  }

  // Guardar análisis en JSON
  const output = {
    totalRows: data.length,
    columns: Object.keys(data[0] || {}),
    sampleRows: data.slice(0, 3)
  };

  const fs = require('fs');
  fs.writeFileSync(
    path.join(__dirname, 'puc-analysis.json'),
    JSON.stringify(output, null, 2)
  );

  console.log('\n✅ Análisis guardado en: scripts/puc-analysis.json');

} catch (error) {
  console.error('❌ Error al leer el archivo:', error.message);
  process.exit(1);
}
