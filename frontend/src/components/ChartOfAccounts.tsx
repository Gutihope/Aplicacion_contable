import { useState, useEffect } from "react"
import { api, endpoints } from "../services/api"
import { Search } from "lucide-react"

interface PUC {
  codigo: string
  nombre: string
  nivel: number
  naturaleza: string
  movimiento: boolean
}

export default function ChartOfAccounts() {
  const [pucs, setPucs] = useState<PUC[]>([])
  const [filteredPucs, setFilteredPucs] = useState<PUC[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [expandedLevels, setExpandedLevels] = useState<Set<string>>(new Set(["1", "2", "3"]))

  useEffect(() => {
    fetchPucs()
  }, [])

  useEffect(() => {
    filterPucs()
  }, [searchTerm, pucs])

  const fetchPucs = async () => {
    setLoading(true)
    try {
      const response = await api.get(endpoints.getPUC)
      setPucs(response.data.data)
      setError("")
    } catch (err: any) {
      setError(err.response?.data?.error || "Error al cargar el PUC")
    } finally {
      setLoading(false)
    }
  }

  const filterPucs = () => {
    if (!searchTerm.trim()) {
      setFilteredPucs(pucs)
    } else {
      const term = searchTerm.toLowerCase()
      setFilteredPucs(
        pucs.filter(
          (p) =>
            p.codigo.toLowerCase().includes(term) ||
            p.nombre.toLowerCase().includes(term)
        )
      )
    }
  }

  const toggleLevel = (code: string) => {
    const newExpanded = new Set(expandedLevels)
    if (newExpanded.has(code)) {
      newExpanded.delete(code)
    } else {
      newExpanded.add(code)
    }
    setExpandedLevels(newExpanded)
  }

  const getParentCode = (code: string, nivel: number) => {
    if (nivel === 1) return null
    return code.substring(0, code.length - 1)
  }

  const isExpanded = (code: string) => expandedLevels.has(code)

  const getPUCsByLevel = (level: number) => {
    return filteredPucs.filter((p) => p.nivel === level)
  }

  const getNaturalezaLabel = (naturaleza: string) => {
    return naturaleza === "D" ? "Débito" : "Crédito"
  }

  const getNaturalezaColor = (naturaleza: string) => {
    return naturaleza === "D" ? "text-blue-600" : "text-red-600"
  }

  const getIndent = (nivel: number) => {
    return `ml-${Math.min(nivel - 1, 5) * 4}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando Plan de Cuentas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-3 mb-6">
          <Search className="h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por código o nombre..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="bg-gray-50 rounded-lg overflow-y-auto max-h-96">
          <div className="min-w-full">
            {pucs.map((puc, index) => (
              <div
                key={puc.codigo}
                className={`border-b border-gray-200 ${index % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
              >
                <div
                  className={`px-4 py-3 flex items-center gap-3 hover:bg-blue-50 transition-colors`}
                  style={{ paddingLeft: `${(puc.nivel - 1) * 24 + 16}px` }}
                >
                  <span className={`font-mono font-semibold text-gray-900 w-20`}>
                    {puc.codigo}
                  </span>
                  <span className="flex-1 text-gray-700">{puc.nombre}</span>
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded ${getNaturalezaColor(
                      puc.naturaleza
                    )}`}
                  >
                    {getNaturalezaLabel(puc.naturaleza)}
                  </span>
                  <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                    N{puc.nivel}
                  </span>
                  <span className={`text-xs font-semibold px-2 py-1 rounded ${
                    puc.movimiento ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                  }`}>
                    {puc.movimiento ? "Mov." : "No Mov."}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-blue-600"></span>
            <span>Débito</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-red-600"></span>
            <span>Crédito</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-green-500"></span>
            <span>Movimiento Permitido</span>
          </div>
        </div>

        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-900">
            Total de cuentas: <span className="font-semibold">{filteredPucs.length}</span>
          </p>
          <p className="text-sm text-blue-900 mt-1">
            Filtrando: <span className="font-semibold">{searchTerm || "todas"}</span>
          </p>
        </div>
      </div>
    </div>
  )
}
