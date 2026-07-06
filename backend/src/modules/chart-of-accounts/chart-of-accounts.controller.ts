import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import multer from 'multer'

const prisma = new PrismaClient()

const router = Router()
const upload = multer({ storage: multer.memoryStorage() })

// POST upload CSV (antes de las rutas dinámicas)
router.post('/upload-csv', upload.single('file'), async (req: Request, res: Response) => {
  console.log('📤 Upload request received')
  console.log('📄 File:', req.file ? `${req.file.originalname} (${req.file.size} bytes)` : 'No file')

  try {
    if (!req.file) {
      console.error('❌ No file in request')
      return res.status(400).json({ success: false, error: 'No file uploaded' })
    }

    const csvText = req.file.buffer.toString('utf-8')
    const lines = csvText.split('\n').filter(line => line.trim())
    
    // Detectar separador automáticamente (coma o punto y coma)
    const firstLine = lines[0]
    const separator = firstLine.includes(';') ? ';' : ','
    const headers = firstLine.split(separator).map(h => h.trim().replace(/^"|"$/g, ''))

    console.log(`📊 CSV parsed: ${lines.length} lines, ${headers.length} columns (separator: '${separator}')`)
    console.log('📋 Headers:', headers)

    // Detectar nombres de columnas (flexible)
    const codigoCol = headers.find(h => h.toLowerCase().includes('código') || h.toLowerCase().includes('codigo'))
    const nombreCol = headers.find(h => h.toLowerCase().includes('nombre'))
    const nivelCol = headers.find(h => h.toLowerCase().includes('nivel'))
    const naturalezaCol = headers.find(h => h.toLowerCase().includes('naturaleza'))

    if (!codigoCol || !nombreCol || !nivelCol || !naturalezaCol) {
      return res.status(400).json({
        success: false,
        error: 'CSV must contain columns: Código, Nombre, Nivel, Naturaleza',
        foundColumns: headers,
      })
    }

    const validRows = lines.slice(1).filter(line => line.trim())
    let createdCount = 0
    let updatedCount = 0
    const errors: string[] = []

    for (const line of validRows) {
      try {
        const values = line.split(separator).map(v => v.trim().replace(/^"|"$/g, ''))
        const row: Record<string, string> = {}

        headers.forEach((header, index) => {
          row[header] = values[index] || ''
        })

        const codigo = row[codigoCol]?.toString().trim()
        const nombre = row[nombreCol]?.toString().trim()

        if (!codigo || !nombre) continue

        const nivel = parseInt(row[nivelCol]) || 1
        const naturaleza = row[naturalezaCol]?.toString().toUpperCase().charAt(0) || 'D'
        const tipo = row['Tipo']?.toString() || 'GASTOS'

        const existing = await prisma.pUC.findUnique({
          where: { codigo },
        })

        if (existing) {
          await prisma.pUC.update({
            where: { codigo },
            data: { nombre, nivel, naturaleza, tipo },
          })
          updatedCount++
        } else {
          await prisma.pUC.create({
            data: { codigo, nombre, nivel, naturaleza, tipo },
          })
          createdCount++
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        errors.push(msg)
      }
    }

    console.log(`✅ Upload successful: ${createdCount} created, ${updatedCount} updated`)

    res.json({
      success: true,
      message: `Carga completada: ${createdCount} creados, ${updatedCount} actualizados`,
      data: {
        totalRows: validRows.length,
        createdCount,
        updatedCount,
        errors: errors.slice(0, 10), // Limitar a 10 errores
      },
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('❌ Error in upload:', msg)
    res.status(500).json({ success: false, error: msg })
  }
})

// GET all PUC accounts
router.get('/', async (req: Request, res: Response) => {
  try {
    const pucs = await prisma.pUC.findMany({
      orderBy: [{ nivel: 'asc' }, { codigo: 'asc' }],
    })

    res.json({ success: true, data: pucs })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    res.status(500).json({ success: false, error: msg })
  }
})

// GET PUC by code
router.get('/:codigo', async (req: Request, res: Response) => {
  try {
    const { codigo } = req.params

    const puc = await prisma.pUC.findUnique({
      where: { codigo },
    })

    if (!puc) {
      return res.status(404).json({ success: false, error: 'Cuenta PUC no encontrada' })
    }

    res.json({ success: true, data: puc })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    res.status(500).json({ success: false, error: msg })
  }
})

// POST create a single PUC account
router.post('/', async (req: Request, res: Response) => {
  try {
    const { codigo, nombre, nivel, naturaleza, tipo } = req.body

    if (!codigo || !nombre) {
      return res.status(400).json({
        success: false,
        error: 'Código y nombre son obligatorios',
      })
    }

    const newPuc = await prisma.pUC.create({
      data: {
        codigo,
        nombre,
        nivel: nivel || 6,
        naturaleza: naturaleza || 'D',
        tipo: tipo || 'ACTIVO',
      },
    })

    console.log(`✅ PUC creada: ${codigo} - ${nombre}`)
    res.status(201).json({
      success: true,
      message: `Cuenta PUC ${codigo} creada exitosamente`,
      data: newPuc,
    })
  } catch (error: any) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('❌ Error creating PUC:', msg)

    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: `Ya existe una PUC con código ${req.body.codigo}`,
      })
    }

    res.status(500).json({ success: false, error: msg })
  }
})

// DELETE all PUC accounts
router.delete('/', async (req: Request, res: Response) => {
  console.log('🗑️ Delete all PUC accounts request received')
  try {
    const result = await prisma.pUC.deleteMany()
    console.log(`✅ Deleted ${result.count} PUC accounts`)
    res.json({
      success: true,
      message: `Se eliminaron ${result.count} cuentas del Plan de Cuentas.`,
    })
  } catch (error: any) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('❌ Error deleting PUC:', msg)
    
    // Check if it's a foreign key constraint violation
    if (error.code === 'P2003') {
      return res.status(400).json({
        success: false,
        error: 'No se puede eliminar el Plan de Cuentas porque tiene transacciones, métodos de pago o inversiones vinculados.',
      })
    }
    
    res.status(500).json({ success: false, error: msg })
  }
})

export default router
