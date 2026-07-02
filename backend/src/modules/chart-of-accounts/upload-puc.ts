import { Router, Request, Response } from 'express'
import multer from 'multer'
import { prisma } from '../../db'
import { Readable } from 'stream'

const router = Router()
const upload = multer({ storage: multer.memoryStorage() })

function parseCSV(csvText: string) {
  const lines = csvText.split('\n').filter(line => line.trim())
  const headers = lines[0].split(',').map(h => h.trim())

  const headerMap: Record<string, number> = {}
  headers.forEach((header, index) => {
    headerMap[header.toLowerCase()] = index
  })

  const data = []
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''))
    const row: any = {}

    headers.forEach((header, index) => {
      row[header] = values[index] || ''
    })

    data.push(row)
  }

  return { headers, data }
}

router.post('/upload-csv', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' })
    }

    const csvText = req.file.buffer.toString('utf-8')
    const { headers, data } = parseCSV(csvText)

    // Detectar nombres de columnas
    const codigoCol = headers.find(h => h.toLowerCase().includes('código') || h.toLowerCase().includes('codigo'))
    const nombreCol = headers.find(h => h.toLowerCase().includes('nombre'))
    const nivelCol = headers.find(h => h.toLowerCase().includes('nivel'))
    const naturalezaCol = headers.find(h => h.toLowerCase().includes('naturaleza'))
    const movimientoCol = headers.find(h => h.toLowerCase().includes('movimiento'))

    if (!codigoCol || !nombreCol || !nivelCol || !naturalezaCol || !movimientoCol) {
      return res.status(400).json({
        success: false,
        error: 'CSV must contain: Código, Nombre, Nivel, Naturaleza, Movimiento',
      })
    }

    const validRows = data.filter(row => row[codigoCol] && row[nombreCol])
    let createdCount = 0
    let updatedCount = 0
    const errors: string[] = []

    for (const row of validRows) {
      try {
        const codigo = row[codigoCol].toString()
        const nombre = row[nombreCol].toString()
        const nivel = parseInt(row[nivelCol]) || 1
        const naturaleza = row[naturalezaCol].toString().toUpperCase().charAt(0) // D o C
        const movimiento = row[movimientoCol].toString().toLowerCase().startsWith('s') || row[movimientoCol].toString() === '1'

        const existing = await prisma.pUC.findUnique({
          where: { codigo },
        })

        if (existing) {
          await prisma.pUC.update({
            where: { codigo },
            data: { nombre, nivel, naturaleza, movimiento },
          })
          updatedCount++
        } else {
          await prisma.pUC.create({
            data: { codigo, nombre, nivel, naturaleza, movimiento },
          })
          createdCount++
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        errors.push(`Row ${row[codigoCol]}: ${msg}`)
      }
    }

    res.json({
      success: true,
      message: `Carga completada: ${createdCount} creados, ${updatedCount} actualizados`,
      data: {
        totalRows: validRows.length,
        createdCount,
        updatedCount,
        errors,
      },
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    res.status(500).json({ success: false, error: msg })
  }
})

export default router
