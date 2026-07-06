import { useState, useEffect } from "react"
import { api, endpoints } from "../services/api"
import { Plus, Edit2, Trash2, Eye, Search, ChevronRight } from "lucide-react"

interface Tercero {
  id_tercero: number
  nombre: string
  tipo: string
  identificacion?: string
  email?: string
  telefono?: string
  direccion?: string
  ciudad?: string
  pais?: string
}

export default function Terceros() {
  const [terceros, setTerceros] = useState<Tercero[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [selectedTercero, setSelectedTercero] = useState<Tercero | null>(null)
  const [showDetails, setShowDetails] = useState(false)

  // Filtros y búsqueda
  const [searchTerm, setSearchTerm] = useState("")
  const [filterTipo, setFilterTipo] = useState("")
  const [pagination, setPagination] = useState({
    pagina: 1,
    limite: 10,
    total: 0,
    totalPaginas: 0,
  })

  const [formData, setFormData] = useState({
    nombre: "",
    tipo: "PROVEEDOR",
    identificacion: "",
    email: "",
    telefono: "",
    direccion: "",
    ciudad: "",
    pais: "Colombia",
    nit_o_documento: "",
  })

  useEffect(() => {
    fetchTerceros()
  }, [pagination.pagina, filterTipo, searchTerm])

  const fetchTerceros = async () => {
    setLoading(true)
    setError("")
    try {
      const params = new URLSearchParams({
        pagina: pagination.pagina.toString(),
        limite: pagination.limite.toString(),
      })

      if (filterTipo) params.append("tipo", filterTipo)
      if (searchTerm) params.append("buscar", searchTerm)

      const response = await api.get(`${endpoints.getTerceros}?${params.toString()}`)

      setTerceros(response.data.data)
      setPagination((prev) => ({
        ...prev,
        total: response.data.paginacion.total,
        totalPaginas: response.data.paginacion.totalPaginas,
      }))
    } catch (err: any) {
      setError(err.response?.data?.error || "Error al cargar terceros")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (!formData.nombre || !formData.tipo) {
        setError("Nombre y tipo son requeridos")
        setLoading(false)
        return
      }

      if (editingId) {
        await api.put(endpoints.updateTercero(editingId), formData)
        setSuccess("Tercero actualizado exitosamente")
      } else {
        await api.post(endpoints.createTercero, formData)
        setSuccess("Tercero creado exitosamente")
      }

      setFormData({
        nombre: "",
        tipo: "PROVEEDOR",
        identificacion: "",
        email: "",
        telefono: "",
        direccion: "",
        ciudad: "",
        pais: "Colombia",
        nit_o_documento: "",
      })
      setEditingId(null)
      setShowForm(false)
      setPagination((prev) => ({ ...prev, pagina: 1 }))
      fetchTerceros()
    } catch (err: any) {
      setError(err.response?.data?.error || "Error al guardar tercero")
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (tercero: Tercero) => {
    setFormData({
      nombre: tercero.nombre,
      tipo: tercero.tipo,
      identificacion: tercero.identificacion || "",
      email: tercero.email || "",
      telefono: tercero.telefono || "",
      direccion: tercero.direccion || "",
      ciudad: tercero.ciudad || "",
      pais: tercero.pais || "Colombia",
      nit_o_documento: tercero.identificacion || "",
    })
    setEditingId(tercero.id_tercero)
    setShowForm(true)
    setShowDetails(false)
  }

  const handleDelete = async (id: number) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este tercero?")) return

    try {
      await api.delete(endpoints.deleteTercero(id))
      setSuccess("Tercero eliminado exitosamente")
      setSelectedTercero(null)
      setShowDetails(false)
      fetchTerceros()
    } catch (err: any) {
      setError(err.response?.data?.error || "Error al eliminar tercero")
    }
  }

  const handleViewDetails = async (tercero: Tercero) => {
    setSelectedTercero(tercero)
    setShowDetails(true)
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingId(null)
    setFormData({
      nombre: "",
      tipo: "PROVEEDOR",
      identificacion: "",
      email: "",
      telefono: "",
      direccion: "",
      ciudad: "",
      pais: "Colombia",
      nit_o_documento: "",
    })
  }

  const getTipoColor = (tipo: string) => {
    const colors: Record<string, string> = {
      PROVEEDOR: "bg-blue-100 text-blue-800",
      CLIENTE: "bg-green-100 text-green-800",
      BANCO: "bg-purple-100 text-purple-800",
      EMPLEADO: "bg-orange-100 text-orange-800",
      OTRO: "bg-gray-100 text-gray-800",
    }
    return colors[tipo] || "bg-gray-100 text-gray-800"
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex justify-between items-center">
          {error}
          <button onClick={() => setError("")} className="text-red-700 hover:text-red-900">
            ✕
          </button>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded flex justify-between items-center">
          {success}
          <button onClick={() => setSuccess("")} className="text-green-700 hover:text-green-900">
            ✕
          </button>
        </div>
      )}

      {!showForm && !showDetails && (
        <>
          {/* Barra de búsqueda y filtros */}
          <div className="bg-white rounded-lg shadow p-4 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Terceros</h2>
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                Nuevo Tercero
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por nombre o identificación..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setPagination((prev) => ({ ...prev, pagina: 1 }))
                  }}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <select
                value={filterTipo}
                onChange={(e) => {
                  setFilterTipo(e.target.value)
                  setPagination((prev) => ({ ...prev, pagina: 1 }))
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Todos los tipos --</option>
                <option value="PROVEEDOR">Proveedor</option>
                <option value="CLIENTE">Cliente</option>
                <option value="BANCO">Banco</option>
                <option value="EMPLEADO">Empleado</option>
                <option value="OTRO">Otro</option>
              </select>

              <div className="text-sm text-gray-600 py-2">
                Mostrando <span className="font-semibold">{terceros.length}</span> de{" "}
                <span className="font-semibold">{pagination.total}</span> terceros
              </div>
            </div>
          </div>

          {/* Tabla de terceros */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Cargando terceros...</div>
            ) : terceros.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No hay terceros registrados. {searchTerm && "Intenta con otro término de búsqueda."}
              </div>
            ) : (
              <>
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Nombre</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Tipo</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Identificación</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Teléfono</th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {terceros.map((tercero) => (
                      <tr key={tercero.id_tercero} className="hover:bg-gray-50">
                        <td className="px-6 py-3 text-sm font-medium text-gray-900">{tercero.nombre}</td>
                        <td className="px-6 py-3 text-sm">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getTipoColor(tercero.tipo)}`}>
                            {tercero.tipo}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-600">
                          {tercero.identificacion || "-"}
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-600">
                          {tercero.email ? (
                            <a href={`mailto:${tercero.email}`} className="text-blue-600 hover:underline">
                              {tercero.email}
                            </a>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-600">
                          {tercero.telefono ? (
                            <a href={`tel:${tercero.telefono}`} className="text-blue-600 hover:underline">
                              {tercero.telefono}
                            </a>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="px-6 py-3 text-right text-sm flex justify-end gap-2">
                          <button
                            onClick={() => handleViewDetails(tercero)}
                            className="text-blue-600 hover:bg-blue-50 p-2 rounded"
                            title="Ver detalles"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(tercero)}
                            className="text-amber-600 hover:bg-amber-50 p-2 rounded"
                            title="Editar"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(tercero.id_tercero)}
                            className="text-red-600 hover:bg-red-50 p-2 rounded"
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Paginación */}
                {pagination.totalPaginas > 1 && (
                  <div className="bg-gray-50 border-t px-6 py-3 flex justify-between items-center">
                    <button
                      onClick={() =>
                        setPagination((prev) => ({ ...prev, pagina: Math.max(1, prev.pagina - 1) }))
                      }
                      disabled={pagination.pagina === 1}
                      className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-white"
                    >
                      Anterior
                    </button>

                    <span className="text-sm text-gray-600">
                      Página <span className="font-semibold">{pagination.pagina}</span> de{" "}
                      <span className="font-semibold">{pagination.totalPaginas}</span>
                    </span>

                    <button
                      onClick={() =>
                        setPagination((prev) => ({
                          ...prev,
                          pagina: Math.min(prev.totalPaginas, prev.pagina + 1),
                        }))
                      }
                      disabled={pagination.pagina === pagination.totalPaginas}
                      className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-white"
                    >
                      Siguiente
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* Formulario de crear/editar */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {editingId ? "Editar Tercero" : "Nuevo Tercero"}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre *
              </label>
              <input
                type="text"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: Supermercado ABC"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo *
              </label>
              <select
                value={formData.tipo}
                onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="PROVEEDOR">Proveedor</option>
                <option value="CLIENTE">Cliente</option>
                <option value="BANCO">Banco</option>
                <option value="EMPLEADO">Empleado</option>
                <option value="OTRO">Otro</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Identificación (NIT/Cédula)
              </label>
              <input
                type="text"
                value={formData.identificacion}
                onChange={(e) => setFormData({ ...formData, identificacion: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: 900123456-7"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="correo@ejemplo.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Teléfono
              </label>
              <input
                type="tel"
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="3001234567"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ciudad
              </label>
              <input
                type="text"
                value={formData.ciudad}
                onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Bogotá"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                País
              </label>
              <input
                type="text"
                value={formData.pais}
                onChange={(e) => setFormData({ ...formData, pais: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Colombia"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dirección
              </label>
              <input
                type="text"
                value={formData.direccion}
                onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Cra 5 #10-20"
              />
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
            >
              {loading ? "Guardando..." : "Guardar"}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 font-medium"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Detalles del tercero */}
      {showDetails && selectedTercero && (
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div className="flex justify-between items-start">
            <h3 className="text-lg font-semibold text-gray-900">{selectedTercero.nombre}</h3>
            <button
              onClick={() => {
                setShowDetails(false)
                setSelectedTercero(null)
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
              <div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getTipoColor(selectedTercero.tipo)}`}>
                  {selectedTercero.tipo}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Identificación</label>
              <p className="text-gray-900">{selectedTercero.identificacion || "-"}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <p className="text-gray-900">
                {selectedTercero.email ? (
                  <a href={`mailto:${selectedTercero.email}`} className="text-blue-600 hover:underline">
                    {selectedTercero.email}
                  </a>
                ) : (
                  "-"
                )}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Teléfono</label>
              <p className="text-gray-900">
                {selectedTercero.telefono ? (
                  <a href={`tel:${selectedTercero.telefono}`} className="text-blue-600 hover:underline">
                    {selectedTercero.telefono}
                  </a>
                ) : (
                  "-"
                )}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ciudad</label>
              <p className="text-gray-900">{selectedTercero.ciudad || "-"}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">País</label>
              <p className="text-gray-900">{selectedTercero.pais || "-"}</p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Dirección</label>
              <p className="text-gray-900">{selectedTercero.direccion || "-"}</p>
            </div>
          </div>

          <div className="flex gap-4 pt-4 border-t">
            <button
              onClick={() => handleEdit(selectedTercero)}
              className="flex items-center gap-2 bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700"
            >
              <Edit2 className="h-4 w-4" />
              Editar
            </button>
            <button
              onClick={() => handleDelete(selectedTercero.id_tercero)}
              className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
            >
              <Trash2 className="h-4 w-4" />
              Eliminar
            </button>
            <button
              onClick={() => {
                setShowDetails(false)
                setSelectedTercero(null)
              }}
              className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
