import { useState, useEffect } from "react"
import { api, endpoints } from "../services/api"
import { Plus, Edit2, Trash2, ChevronDown } from "lucide-react"

interface PaymentMethod {
  id_metodo: number
  nombre: string
  tipo: string
  puc_codigo?: string
  id_tercero?: number
  puc?: { codigo: string; nombre: string }
  tercero?: { id_tercero: number; nombre: string; tipo: string }
}

interface PUC {
  codigo: string
  nombre: string
  nivel: number
  naturaleza: string
  movimiento?: boolean
  tipo?: string
}

interface Tercero {
  id_tercero: number
  nombre: string
  tipo: string
}

export default function PaymentMethods() {
  const [metodos, setMetodos] = useState<PaymentMethod[]>([])
  const [pucs, setPucs] = useState<PUC[]>([])
  const [terceros, setTerceros] = useState<Tercero[]>([])
  const [bancosTerceros, setBancosTerceros] = useState<Tercero[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [showCreateNewPuc, setShowCreateNewPuc] = useState(false)
  const [newPucName, setNewPucName] = useState("")

  const [formData, setFormData] = useState({
    nombre: "",
    tipo: "EFECTIVO",
    puc_codigo: "",
    id_tercero: undefined as number | undefined,
  })
  const [showPucDropdown, setShowPucDropdown] = useState(false)
  const [pucSearch, setPucSearch] = useState("")

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [metodosRes, pucsRes, tercerosRes] = await Promise.all([
        api.get(endpoints.getPaymentMethods),
        api.get(endpoints.getPUC),
        api.get(endpoints.getTerceros),
      ])

      console.log("📦 Terceros cargados:", tercerosRes.data.data)
      setMetodos(metodosRes.data.data)
      setPucs(pucsRes.data.data)
      setTerceros(tercerosRes.data.data)
      setError("")
    } catch (err: any) {
      console.error("❌ Error al cargar datos:", err)
      setError(err.response?.data?.error || "Error al cargar datos")
    } finally {
      setLoading(false)
    }
  }

  // Filtrar terceros según el tipo seleccionado
  useEffect(() => {
    console.log("🔍 Verificando tipo:", formData.tipo, "Terceros disponibles:", terceros)
    if (formData.tipo === "BANCARIA") {
      const bancos = terceros.filter((t) => t.tipo === "BANCO")
      console.log("🏦 Bancos filtrados:", bancos)
      setBancosTerceros(bancos)
    } else if (formData.tipo === "TARJETA") {
      // Para tarjetas, mostrar todos los terceros (no filtrar por tipo)
      console.log("💳 Terceros para tarjeta:", terceros)
      setBancosTerceros(terceros)
    }
  }, [formData.tipo, terceros])

  // Obtener PUCs dinámicamente según el tipo
  const getFilteredPucs = (): PUC[] => {
    let filtered: PUC[] = []

    if (formData.tipo === "EFECTIVO") {
      // Para efectivo, solo mostrar 110101
      filtered = pucs.filter((p) => p.codigo === "110101")
    } else if (formData.tipo === "BANCARIA") {
      // Para banco, mostrar todas las 1102* (6 dígitos)
      filtered = pucs.filter((p) => p.codigo.startsWith("1102") && p.codigo.length === 6)
    } else if (formData.tipo === "TARJETA") {
      // Para tarjeta de crédito, mostrar todas las 2101* (6 dígitos)
      filtered = pucs.filter((p) => p.codigo.startsWith("2101") && p.codigo.length === 6)
    } else {
      // Para otros tipos, mostrar todas las PUCs
      filtered = pucs
    }

    return filtered.filter(
      (p) =>
        p.codigo.includes(pucSearch.toUpperCase()) ||
        p.nombre.toLowerCase().includes(pucSearch.toLowerCase())
    )
  }

  // Crear nueva cuenta PUC
  const handleCreateNewPuc = async () => {
    if (!newPucName.trim()) {
      setError("Ingresa un nombre para la nueva cuenta")
      return
    }

    setLoading(true)
    try {
      // Determinar la serie según el tipo
      const seriePrefix = formData.tipo === "BANCARIA" ? "1102" : "2101"

      // Obtener el máximo código de la serie
      const existingSerie = pucs
        .filter((p) => p.codigo.startsWith(seriePrefix) && p.codigo.length === 6)
        .map((p) => parseInt(p.codigo))
        .sort((a, b) => b - a)

      const nextCode = existingSerie.length > 0 ? existingSerie[0] + 1 : parseInt(seriePrefix + "01")
      const nextCodeStr = nextCode.toString()

      // Obtener la naturaleza de la cuenta padre
      const parentCode = seriePrefix === "1102" ? "1102" : "2101"
      const parentAccount = pucs.find((p) => p.codigo === parentCode)
      const naturaleza = parentAccount?.naturaleza || "D"

      // Crear la nueva PUC en el backend
      const response = await api.post(endpoints.createPUC, {
        codigo: nextCodeStr,
        nombre: newPucName,
        nivel: 6,
        naturaleza,
        tipo: seriePrefix === "1102" ? "ACTIVO" : "PASIVO",
      })

      // Agregar a la lista local
      setPucs([...pucs, response.data.data])

      // Seleccionar automáticamente la nueva PUC
      setFormData({ ...formData, puc_codigo: nextCodeStr })
      setShowCreateNewPuc(false)
      setNewPucName("")
      setSuccess(`Cuenta ${nextCodeStr} creada exitosamente`)
      setError("")
    } catch (err: any) {
      setError(err.response?.data?.error || "Error al crear la nueva cuenta PUC")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Asignar automáticamente PUC según tipo
      let submitData = { ...formData }
      if (submitData.tipo === "EFECTIVO") {
        submitData.puc_codigo = "110101"
      }

      if (!submitData.puc_codigo) {
        setError("Debes seleccionar una cuenta PUC")
        setLoading(false)
        return
      }

      if (editingId) {
        await api.put(endpoints.updatePaymentMethod(editingId), submitData)
        setSuccess("Método de pago actualizado")
      } else {
        await api.post(endpoints.createPaymentMethod, submitData)
        setSuccess("Método de pago creado")
      }

      setFormData({ nombre: "", tipo: "EFECTIVO", puc_codigo: "", id_tercero: undefined })
      setEditingId(null)
      setShowForm(false)
      setShowCreateNewPuc(false)
      setNewPucName("")
      fetchData()
    } catch (err: any) {
      setError(err.response?.data?.error || "Error al guardar")
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (metodo: PaymentMethod) => {
    setFormData({
      nombre: metodo.nombre,
      tipo: metodo.tipo,
      puc_codigo: metodo.puc_codigo || "",
      id_tercero: metodo.id_tercero,
    })
    setEditingId(metodo.id_metodo)
    setShowForm(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm("¿Estás seguro de eliminar este método de pago?")) return

    try {
      await api.delete(endpoints.deletePaymentMethod(id))
      setSuccess("Método de pago eliminado")
      fetchData()
    } catch (err: any) {
      setError(err.response?.data?.error || "Error al eliminar")
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingId(null)
    setFormData({ nombre: "", tipo: "EFECTIVO", puc_codigo: "", id_tercero: undefined })
    setShowCreateNewPuc(false)
    setNewPucName("")
  }

  return (
    <div className="space-y-6">
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">{success}</div>}

      {!showForm ? (
        <div className="flex justify-end">
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Nuevo Método de Pago
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-4">
          <h3 className="text-lg font-semibold">{editingId ? "Editar" : "Nuevo"} Método de Pago</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nombre *</label>
            <input
              type="text"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Ej: Nequi, Davivienda, Efectivo, etc"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tipo *</label>
            <select
              value={formData.tipo}
              onChange={(e) => {
                setFormData({ ...formData, tipo: e.target.value, puc_codigo: "", id_tercero: undefined })
                setShowCreateNewPuc(false)
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="EFECTIVO">Efectivo</option>
              <option value="BANCARIA">Bancaria</option>
              <option value="TARJETA">Tarjeta de Crédito</option>
            </select>
          </div>

          {/* Selector de Tercero si es BANCARIA o TARJETA */}
          {(formData.tipo === "BANCARIA" || formData.tipo === "TARJETA") && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {formData.tipo === "BANCARIA" ? "Banco (Tercero)" : "Entidad Emisora (Tercero)"} *
              </label>
              <select
                value={formData.id_tercero || ""}
                onChange={(e) => setFormData({ ...formData, id_tercero: parseInt(e.target.value) || undefined, puc_codigo: "" })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Seleccionar {formData.tipo === "BANCARIA" ? "Banco" : "Entidad"} --</option>
                {bancosTerceros.map((tercero) => (
                  <option key={tercero.id_tercero} value={tercero.id_tercero}>
                    {tercero.nombre}
                  </option>
                ))}
              </select>
              {bancosTerceros.length === 0 && (
                <p className="text-sm text-orange-600 mt-2">
                  ⚠️ No hay {formData.tipo === "BANCARIA" ? "bancos" : "terceros"} creados. Crea uno en el módulo de Terceros.
                </p>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Cuenta PUC Asociada</label>

            {formData.tipo === "EFECTIVO" ? (
              <div className="px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700">
                110101 - Efectivo
              </div>
            ) : showCreateNewPuc ? (
              <div className="space-y-2 p-4 border border-blue-300 rounded-lg bg-blue-50">
                <p className="text-sm font-medium text-gray-700">
                  Crear nueva cuenta {formData.tipo === "BANCARIA" ? "(1102)" : "(2101)"}
                </p>
                <input
                  type="text"
                  placeholder={formData.tipo === "BANCARIA" ? "Ej: Cuenta de ahorros 0365" : "Ej: Tarjeta Visa 0123"}
                  value={newPucName}
                  onChange={(e) => setNewPucName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleCreateNewPuc}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
                  >
                    Crear
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateNewPuc(false)
                      setNewPucName("")
                    }}
                    className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 text-sm"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative">
                <div
                  onClick={() => setShowPucDropdown(!showPucDropdown)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 cursor-pointer bg-white flex justify-between items-center"
                >
                  <span>
                    {formData.puc_codigo
                      ? `${formData.puc_codigo} - ${pucs.find((p) => p.codigo === formData.puc_codigo)?.nombre}`
                      : "-- Seleccionar --"}
                  </span>
                  <ChevronDown className="h-4 w-4" />
                </div>

                {showPucDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
                    <input
                      type="text"
                      placeholder="Buscar cuenta..."
                      value={pucSearch}
                      onChange={(e) => setPucSearch(e.target.value)}
                      className="w-full px-4 py-2 border-b border-gray-300 focus:outline-none"
                    />
                    <div className="max-h-64 overflow-y-auto">
                      {getFilteredPucs().length > 0 ? (
                        <>
                          {getFilteredPucs().map((puc) => (
                            <div
                              key={puc.codigo}
                              onClick={() => {
                                setFormData({ ...formData, puc_codigo: puc.codigo })
                                setShowPucDropdown(false)
                                setPucSearch("")
                              }}
                              className="px-4 py-2 hover:bg-blue-50 cursor-pointer flex items-center gap-2 border-b last:border-b-0"
                            >
                              <span className="font-mono font-bold text-gray-900">{puc.codigo}</span>
                              <span className="text-gray-700">{puc.nombre}</span>
                            </div>
                          ))}
                          {(formData.tipo === "BANCARIA" || formData.tipo === "TARJETA") && (
                            <div
                              onClick={() => {
                                setShowPucDropdown(false)
                                setShowCreateNewPuc(true)
                                setPucSearch("")
                              }}
                              className="px-4 py-2 hover:bg-green-50 cursor-pointer border-t-2 border-gray-200 text-green-600 font-medium flex items-center gap-2"
                            >
                              <Plus className="h-4 w-4" />
                              Crear nueva cuenta ({formData.tipo === "BANCARIA" ? "1102" : "2101"})
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="px-4 py-3 text-gray-500 text-sm">No hay cuentas disponibles</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Guardando..." : "Guardar"}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Nombre</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Tipo</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Tercero</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Cuenta PUC</th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {metodos.map((metodo) => (
              <tr key={metodo.id_metodo} className="hover:bg-gray-50">
                <td className="px-6 py-3 text-sm text-gray-900">{metodo.nombre}</td>
                <td className="px-6 py-3 text-sm text-gray-600">{metodo.tipo}</td>
                <td className="px-6 py-3 text-sm text-gray-600">
                  {metodo.tercero ? metodo.tercero.nombre : "-"}
                </td>
                <td className="px-6 py-3 text-sm text-gray-600">
                  {metodo.puc ? `${metodo.puc.codigo} - ${metodo.puc.nombre}` : "-"}
                </td>
                <td className="px-6 py-3 text-right text-sm flex justify-end gap-2">
                  <button
                    onClick={() => handleEdit(metodo)}
                    className="text-blue-600 hover:bg-blue-50 p-2 rounded"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(metodo.id_metodo)}
                    className="text-red-600 hover:bg-red-50 p-2 rounded"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
