import { useState, useEffect } from "react"
import { api, endpoints } from "../services/api"
import { Plus, Edit2, Trash2 } from "lucide-react"

interface PaymentMethod {
  id_metodo: number
  nombre_comercial: string
  categoria_pago: string
  tipo_origen: string
  puc_codigo?: string
  banco_tercero_id?: number
  puc?: { codigo: string; nombre: string }
}

interface PUC {
  codigo: string
  nombre: string
  nivel: number
  naturaleza: string
  movimiento: boolean
}

export default function PaymentMethods() {
  const [metodos, setMetodos] = useState<PaymentMethod[]>([])
  const [pucs, setPucs] = useState<PUC[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)

  const [formData, setFormData] = useState({
    nombre_comercial: "",
    categoria_pago: "CONTADO",
    tipo_origen: "EFECTIVO",
    puc_codigo: "",
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [metodosRes, pucsRes] = await Promise.all([
        api.get(endpoints.getPaymentMethods),
        api.get(endpoints.getPUC),
      ])

      setMetodos(metodosRes.data.data)
      setPucs(pucsRes.data.data)
      setError("")
    } catch (err: any) {
      setError(err.response?.data?.error || "Error al cargar datos")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (editingId) {
        await api.put(endpoints.updatePaymentMethod(editingId), formData)
        setSuccess("Método de pago actualizado")
      } else {
        await api.post(endpoints.createPaymentMethod, formData)
        setSuccess("Método de pago creado")
      }

      setFormData({ nombre_comercial: "", categoria_pago: "CONTADO", tipo_origen: "EFECTIVO", puc_codigo: "" })
      setEditingId(null)
      setShowForm(false)
      fetchData()
    } catch (err: any) {
      setError(err.response?.data?.error || "Error al guardar")
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (metodo: PaymentMethod) => {
    setFormData({
      nombre_comercial: metodo.nombre_comercial,
      categoria_pago: metodo.categoria_pago,
      tipo_origen: metodo.tipo_origen,
      puc_codigo: metodo.puc_codigo || "",
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
    setFormData({ nombre_comercial: "", categoria_pago: "CONTADO", tipo_origen: "EFECTIVO", puc_codigo: "" })
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Nombre Comercial *</label>
            <input
              type="text"
              value={formData.nombre_comercial}
              onChange={(e) => setFormData({ ...formData, nombre_comercial: e.target.value })}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Ej: Nequi, Davivienda, etc"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Categoría</label>
              <select
                value={formData.categoria_pago}
                onChange={(e) => setFormData({ ...formData, categoria_pago: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="CONTADO">Contado</option>
                <option value="CREDITO">Crédito</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Origen</label>
              <select
                value={formData.tipo_origen}
                onChange={(e) => setFormData({ ...formData, tipo_origen: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="EFECTIVO">Efectivo</option>
                <option value="BANCO">Banco</option>
                <option value="TARJETA_CREDITO">Tarjeta de Crédito</option>
                <option value="PROVEEDOR">Proveedor</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Cuenta PUC Asociada</label>
            <select
              value={formData.puc_codigo}
              onChange={(e) => setFormData({ ...formData, puc_codigo: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Seleccionar --</option>
              {pucs
                .filter((p) => p.movimiento)
                .map((puc) => (
                  <option key={puc.codigo} value={puc.codigo}>
                    {puc.codigo} - {puc.nombre}
                  </option>
                ))}
            </select>
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
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Categoría</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Tipo</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Cuenta PUC</th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {metodos.map((metodo) => (
              <tr key={metodo.id_metodo} className="hover:bg-gray-50">
                <td className="px-6 py-3 text-sm text-gray-900">{metodo.nombre_comercial}</td>
                <td className="px-6 py-3 text-sm text-gray-600">{metodo.categoria_pago}</td>
                <td className="px-6 py-3 text-sm text-gray-600">{metodo.tipo_origen}</td>
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
