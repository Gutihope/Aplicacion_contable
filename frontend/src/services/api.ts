import axios from "axios"

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5001/api/v1"

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
})

export const endpoints = {
  // Terceros
  getTerceros: "/terceros",
  createTercero: "/terceros",
  getTercero: (id: number) => `/terceros/${id}`,
  updateTercero: (id: number) => `/terceros/${id}`,
  deleteTercero: (id: number) => `/terceros/${id}`,
  getTerceroMovimientos: (id: number) => `/terceros/${id}/movimientos`,
  getTercerosPorTipo: (tipo: string) => `/terceros/filtro/${tipo}`,

  // Transacciones
  createCashPurchase: "/transactions/cash-purchase",
  createCreditPurchase: "/transactions/credit-purchase",
  getTransaction: (id: number) => `/transactions/${id}`,
  deleteTransaction: (id: number) => `/transactions/${id}`,

  // Tarjetas de Crédito
  getCreditCards: "/credit-cards",
  getCreditCardPurchases: (id: number) => `/credit-cards/${id}/purchases`,
  monthCloseCreditCard: (id: number) => `/credit-cards/${id}/month-close`,

  // Inventario
  getInventoryProducts: "/inventory/products",
  getInventoryAlerts: "/inventory/alerts",
  createInventoryProduct: "/inventory/products",
  consumeInventory: (id: number) => `/inventory/products/${id}/consume`,
  restockInventory: (id: number) => `/inventory/products/${id}/restock`,

  // Reportes
  getBalanceSheet: "/reports/balance-sheet",
  getIncomeStatement: "/reports/income-statement",
  getForecast: "/reports/forecast",
  getInventoryValue: "/reports/inventory-value",

  // Inversiones
  getInvestments: "/investments",
  recordInvestmentInterest: (id: number) => `/investments/${id}/record-interest`,
  investmentMonthClose: "/investments/month-close",

  // Métodos de Pago
  getPaymentMethods: "/payment-methods",
  createPaymentMethod: "/payment-methods",
  updatePaymentMethod: (id: number) => `/payment-methods/${id}`,
  deletePaymentMethod: (id: number) => `/payment-methods/${id}`,

  // Plan de Cuentas
  getPUC: "/chart-of-accounts",
  createPUC: "/chart-of-accounts",
  deletePUC: "/chart-of-accounts",
}