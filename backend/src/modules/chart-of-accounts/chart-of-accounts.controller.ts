import { Router, Request, Response } from 'express'
import { prisma } from '../../db'

const router = Router()

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

export default router
