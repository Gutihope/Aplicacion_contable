import { useState, useEffect } from "react"
import { api, endpoints } from "../services/api"
import { BarChart3, TrendingUp, AlertTriangle } from "lucide-react"

export default function Dashboard() {
  const [balanceSheet, setBalanceSheet] = useState<any>(null)
  const [incomeStatement, setIncomeStatement] = useState<any>(null)
  const [alerts, setAlerts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const [balance, income, invAlerts] = await Promise.all([
        api.get(endpoints.getBalanceSheet),
        api.get(endpoints.getIncomeStatement),
        api.get(endpoints.getInventoryAlerts),
      ])
      setBalanceSheet(balance.data.balance)
      setIncomeStatement(income.data.estado_resultados)
      setAlerts(invAlerts.data.alertas || invAlerts.data.data || [])
    } catch (error) {
      console.error("Error loading dashboard:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center py-12">Cargando datos...</div>
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Activos Totales</p>
              <p className="text-3xl font-bold text-gray-900">
                ${balanceSheet?.activos?.total?.toLocaleString() || 0}
              </p>
            </div>
            <BarChart3 className="h-10 w-10 text-blue-600 opacity-20" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Ingresos</p>
              <p className="text-3xl font-bold text-green-600">
                ${incomeStatement?.ingresos?.total?.toLocaleString() || 0}
              </p>
            </div>
            <TrendingUp className="h-10 w-10 text-green-600 opacity-20" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Gastos</p>
              <p className="text-3xl font-bold text-red-600">
                ${incomeStatement?.gastos?.total?.toLocaleString() || 0}
              </p>
            </div>
            <AlertTriangle className="h-10 w-10 text-red-600 opacity-20" />
          </div>
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mr-3 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-lg font-medium text-yellow-800">Alertas de Inventario</h3>
              <p className="text-yellow-700 text-sm mt-2">{alerts.length} producto(s) con stock bajo</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">Balance General</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-gray-600 font-medium mb-2">Activos</p>
            <p className="text-2xl font-bold text-blue-600">
              ${balanceSheet?.activos?.total?.toLocaleString() || 0}
            </p>
          </div>
          <div>
            <p className="text-gray-600 font-medium mb-2">Pasivos</p>
            <p className="text-2xl font-bold text-orange-600">
              ${balanceSheet?.pasivos?.total?.toLocaleString() || 0}
            </p>
          </div>
          <div>
            <p className="text-gray-600 font-medium mb-2">Patrimonio</p>
            <p className="text-2xl font-bold text-green-600">
              ${balanceSheet?.patrimonio?.total?.toLocaleString() || 0}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
