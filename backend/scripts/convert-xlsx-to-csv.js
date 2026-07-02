/**
 * Convierte archivo Excel PUC a CSV
 * Uso: node scripts/convert-xlsx-to-csv.js "ruta/Puc aplicación.xlsx"
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const excelPath = process.argv[2];

if (!excelPath) {
  console.error('❌ Por favor proporciona la ruta del archivo Excel');
  console.error('Uso: node scripts/convert-xlsx-to-csv.js "ruta/Puc aplicación.xlsx"');
  process.exit(1);
}

try {
  console.log(`📂 Leyendo: ${excelPath}`);

  // Leer Excel
  const workbook = XLSX.readFile(excelPath);
  const firstSheet = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheet];
  const data = XLSX.utils.sheet_to_json(worksheet);

  if (data.length === 0) {
    throw new Error('El archivo Excel está vacío');
  }

  console.log(`✅ ${data.length} filas leídas`);

  // Detectar columnas
  const headers = Object.keys(data[0]);
  console.log(`🏷️ Columnas: ${headers.join(', ')}`);

  // Crear CSV
  const csvPath = path.join(path.dirname(excelPath), 'Puc.csv');

  let csv = headers.join(',') + '\n';

  data.forEach(row => {
    const valores = headers.map(h => {
      const valor = row[h];
      // Escapar comillas y envolver en comillas si contiene coma
      if (valor === undefined || valor === null) return '';
      const str = String(valor);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    });
    csv += valores.join(',') + '\n';
  });

  // Guardar CSV
  fs.writeFileSync(csvPath, csv, 'utf8');

  console.log(`\n✅ CSV creado: ${csvPath}`);
  console.log(`📊 ${data.length} registros exportados`);
  console.log(`\n💡 Próximo paso:`);
  console.log(`node scripts/seed-puc-csv.js "${path.basename(csvPath)}"`);

} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
