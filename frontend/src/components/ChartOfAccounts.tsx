import { useState, useEffect } from "react"
import { api, endpoints } from "../services/api"
import { Search, Upload, ChevronDown, ChevronRight } from "lucide-react"

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
  const [success, setSuccess] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [expandedCodes, setExpandedCodes] = useState<Set<string>>(new Set())
  const [uploading, setUploading] = useState(false)
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

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
      // Expandir nivel 1 por defecto
      const level1Codes = response.data.data.filter((p: PUC) => p.nivel === 1).map((p: PUC) => p.codigo)
      setExpandedCodes(new Set(level1Codes))
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

  const toggleExpand = (code: string) => {
    const newExpanded = new Set(expandedCodes)
    if (newExpanded.has(code)) {
      newExpanded.delete(code)
    } else {
      newExpanded.add(code)
    }
    setExpandedCodes(newExpanded)
  }

  const getChildren = (parentCode: string): PUC[] => {
    return filteredPucs.filter(puc => {
      if (puc.nivel <= 1) return false
      const parent = puc.codigo.substring(0, puc.codigo.length - 1)
      return parent === parentCode
    }).sort((a, b) => a.codigo.localeCompare(b.codigo))
  }

  const getNaturalezaLabel = (naturaleza: string) => {
    return naturaleza === "D" ? "Débito" : "Crédito"
  }

  const getNaturalezaColor = (naturaleza: string) => {
    return naturaleza === "D" ? "text-blue-600" : "text-red-600"
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFile(e.target.files?.[0] || null)
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      setError("Selecciona un archivo primero")
      return
    }

    setUploading(true)
    setError("")
    setSuccess("")

    try {
      console.log("Uploading file:", selectedFile.name)
      const formData = new FormData()
      formData.append("file", selectedFile)

      const response = await api.post("/chart-of-accounts/upload-csv", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })

      console.log("Response:", response.data)

      if (response.data.success) {
        setSuccess(
          `✅ ${response.data.data.createdCount} creados, ${response.data.data.updatedCount} actualizados`
        )
        setShowUploadForm(false)
        setSelectedFile(null)
        setTimeout(() => {
          fetchPucs()
          setSuccess("")
        }, 1500)
      }
    } catch (err: any) {
      console.error("Upload error:", err)
      console.error("Response status:", err.response?.status)
      console.error("Response data:", err.response?.data)

      let errorMsg = "Error al cargar el archivo"

      if (err.response?.status === 404) {
        errorMsg = "Endpoint no encontrado (404). Verifica que el backend esté actualizado."
      } else if (err.response?.data?.error) {
        errorMsg = typeof err.response.data.error === 'string'
          ? err.response.data.error
          : "Error en el servidor"
      } else if (err.response?.data?.message) {
        errorMsg = err.response.data.message
      } else if (err.message) {
        errorMsg = err.message
      }

      setError(`❌ ${errorMsg}`)
    } finally {
      setUploading(false)
    }
  }

  const renderPUCNode = (puc: PUC, depth: number = 0): React.ReactNode => {
    const children = getChildren(puc.codigo)
    const hasChildren = children.length > 0
    const isExpanded = expandedCodes.has(puc.codigo)

    return (
      <div key={puc.codigo}>
        <div
          className="flex items-center gap-2 px-3 py-2 hover:bg-blue-50 border-b border-gray-100 transition-colors"
          style={{ paddingLeft: `${depth * 20 + 12}px` }}
        >
          {hasChildren ? (
            <button
              onClick={() => toggleExpand(puc.codigo)}
              className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-gray-500 hover:text-gray-700"
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          ) : (
            <div className="flex-shrink-0 w-5" />
          )}

          <span className="font-mono font-bold text-gray-900 w-28 text-sm">{puc.codigo}</span>
          <span className="flex-1 text-gray-700 text-sm">{puc.nombre}</span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded whitespace-nowrap ${getNaturalezaColor(puc.naturaleza)}`}>
            {getNaturalezaLabel(puc.naturaleza)}
          </span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded whitespace-nowrap ${
            puc.movimiento ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
          }`}>
            {puc.movimiento ? "Movible" : "Fijo"}
          </span>
        </div>

        {hasChildren && isExpanded && (
          <div>
            {children.map(child => renderPUCNode(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  const getRootPUCs = () => {
    return filteredPucs.filter(p => p.nivel === 1).sort((a, b) => a.codigo.localeCompare(b.codigo))
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}

      <div className="flex justify-end mb-4">
        {!showUploadForm ? (
          <button
            onClick={() => setShowUploadForm(true)}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            <Upload className="h-4 w-4" />
            Cargar CSV del PUC
          </button>
        ) : (
          <div className="bg-white rounded-lg shadow p-4 w-full max-w-md">
            <h3 className="font-semibold mb-3">Cargar archivo CSV</h3>
            <p className="text-sm text-gray-600 mb-4">
              El archivo debe contener las columnas: <strong>Código, Nombre, Nivel, Naturaleza, Movimiento</strong>
            </p>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              disabled={uploading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            />
            {selectedFile && (
              <p className="text-sm text-green-600 mt-2">✅ Archivo: {selectedFile.name}</p>
            )}
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={handleUpload}
                disabled={uploading || !selectedFile}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? "Cargando..." : "Cargar"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowUploadForm(false)
                  setSelectedFile(null)
                }}
                disabled={uploading}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Search className="h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por código o nombre..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-gray-600 text-sm">Cargando Plan de Cuentas...</p>
            </div>
          </div>
        ) : pucs.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded text-sm m-4">
            📁 No hay cuentas PUC cargadas. Carga un archivo CSV para empezar.
          </div>
        ) : (
          <div className="overflow-y-auto max-h-96">
            {getRootPUCs().map(puc => renderPUCNode(puc))}
          </div>
        )}

        <div className="border-t border-gray-200 p-4 text-sm text-gray-600">
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-blue-600"></span>
              <span>Débito</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-red-600"></span>
              <span>Crédito</span>
            </div>
          </div>
          <p><strong>Total:</strong> {filteredPucs.length} cuentas</p>
        </div>
      </div>
    </div>
  )
}
