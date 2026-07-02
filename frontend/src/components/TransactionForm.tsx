import { useState } from "react"
import { api, endpoints } from "../services/api"
import { DollarSign, Plus, X } from "lucide-react"

export default function TransactionForm() {
  const [tipo, setTipo] = useState("cash")
  const [descripcion, setDescripcion] = useState("")
  const [metodo, setMetodo] = useState("1")
  const [items, setItems] = useState([{ descripcion: "", cantidad: 1, precio: 0, iva: 0 }])
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState("")
  const [error, setError] = useState("")

  const addItem = () => {
    setItems([...items, { descripcion: "", cantidad: 1, precio: 0, iva: 0 }])
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    setItems(newItems)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess("")

    try {
      const transactionData = {
        fecha: new Date(),
        descripcion,
        comprobante_tipo: "Egreso",
        metodo_pago_id: parseInt(metodo),
        items: items.map((item) => ({
          descripcion: item.descripcion,
          cantidad: item.cantidad,
          precio_unitario: item.precio,
          porcentaje_iva: item.iva,
        })),
      }

      const endpoint =
        tipo === "cash"
          ? endpoints.createCashPurchase
          : endpoints.createCreditPurchase

      const response = await api.post(endpoint, transactionData)

      if (response.data.success) {
        setSuccess(`Transacción creada exitosamente: ${response.data.data.id_asiento}`)
        setDescripcion("")
        setItems([{ descripcion: "", cantidad: 1, precio: 0, iva: 0 }])
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Error al crear la transacción")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
          <div className="flex items-center gap-3">
            <DollarSign className="h-6 w-6 text-white" />
            <h2 className="text-2xl font-bold text-white">Nueva Transacción</h2>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Transacción
              </label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="cash">Compra Contado</option>
                <option value="credit">Compra Crédito</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Método de Pago
              </label>
              <select
                value={metodo}
                onChange={(e) => setMetodo(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="1">Efectivo</option>
                <option value="2">Transferencia Bancaria</option>
                <option value="3">Nequi</option>
                <option value="4">Davivienda</option>
                <option value="5">Bancolombia</option>
                <option value="6">BBVA</option>
                <option value="7">Tarjeta de Débito</option>
                <option value="8">Tarjeta de Crédito</option>
                <option value="9">Cheque</option>
                <option value="10">PSE</option>
                <option value="11">Otros</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descripción
            </label>
            <input
              type="text"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Ej: Compra de supermercado"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Items</h3>
              <button
                type="button"
                onClick={addItem}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                Agregar Item
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="flex gap-3">
                  <input
                    type="text"
                    placeholder="Descripción"
                    value={item.descripcion}
                    onChange={(e) =>
                      updateItem(index, "descripcion", e.target.value)
                    }
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                  />
                  <input
                    type="number"
                    placeholder="Cant"
                    value={item.cantidad}
                    onChange={(e) =>
                      updateItem(index, "cantidad", parseFloat(e.target.value))
                    }
                    className="w-20 px-3 py-2 border border-gray-300 rounded-lg"
                  />
                  <input
                    type="number"
                    placeholder="Precio"
                    value={item.precio}
                    onChange={(e) =>
                      updateItem(index, "precio", parseFloat(e.target.value))
                    }
                    className="w-24 px-3 py-2 border border-gray-300 rounded-lg"
                  />
                  <input
                    type="number"
                    placeholder="IVA %"
                    value={item.iva}
                    onChange={(e) =>
                      updateItem(index, "iva", parseFloat(e.target.value))
                    }
                    className="w-20 px-3 py-2 border border-gray-300 rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white font-medium py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Procesando..." : "Crear Transacción"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
