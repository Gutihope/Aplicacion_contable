import { useState, useEffect } from "react"
import { api, endpoints } from "../services/api"
import { Search, Upload } from "lucide-react"

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
      let errorMsg = "Error al cargar el archivo"
      if (err.response?.status === 404) {
        errorMsg = "Endpoint no encontrado (404)"
      } else if (err.response?.data?.error) {
        errorMsg = typeof err.response.data.error === 'string'
          ? err.response.data.error
          : "Error en el servidor"
      } else if (err.message) {
        errorMsg = err.message
      }
      setError(`❌ ${errorMsg}`)
    } finally {
      setUploading(false)
    }
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
              El archivo debe contener: <strong>Código, Nombre, Nivel, Naturaleza, Movimiento</strong>
            </p>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              disabled={uploading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
            {selectedFile && (
              <p className="text-sm text-green-600 mt-2">✅ {selectedFile.name}</p>
            )}
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleUpload}
                disabled={uploading || !selectedFile}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg disabled:opacity-50"
              >
                {uploading ? "Cargando..." : "Cargar"}
              </button>
              <button
                onClick={() => {
                  setShowUploadForm(false)
                  setSelectedFile(null)
                }}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg"
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
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-gray-600 text-sm">Cargando...</p>
            </div>
          </div>
        ) : pucs.length === 0 ? (
          <div className="bg-yellow-50 text-yellow-700 px-4 py-3 m-4 rounded">
            📁 No hay cuentas. Carga un CSV.
          </div>
        ) : (
          <div className="overflow-y-auto max-h-96">
            <table className="w-full text-sm">
              <tbody className="divide-y">
                {filteredPucs.map((puc) => (
                  <tr key={puc.codigo} className="hover:bg-blue-50">
                    <td
                      className="px-4 py-3 font-mono font-bold text-gray-900"
                      style={{ paddingLeft: `${(puc.nivel - 1) * 24 + 16}px` }}
                    >
                      {puc.codigo}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{puc.nombre}</td>
                    <td className={`px-4 py-3 font-semibold ${getNaturalezaColor(puc.naturaleza)}`}>
                      {getNaturalezaLabel(puc.naturaleza)}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {puc.movimiento ? "Movible" : "Fijo"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="border-t border-gray-200 p-4 text-sm text-gray-600">
          <p><strong>Total:</strong> {filteredPucs.length} cuentas</p>
        </div>
      </div>
    </div>
  )
}
