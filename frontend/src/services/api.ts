import axios from "axios"

const API_BASE_URL = "http://localhost:5001/api/v1"

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
})

export const endpoints = {
  createCashPurchase: "/transactions/cash-purchase",
  createCreditPurchase: "/transactions/credit-purchase",
  getTransaction: (id: number) => `/transactions/${id}`,
  deleteTransaction: (id: number) => `/transactions/${id}`,
  getCreditCards: "/credit-cards",
  getCreditCardPurchases: (id: number) => `/credit-cards/${id}/purchases`,
  monthCloseCreditCard: (id: number) => `/credit-cards/${id}/month-close`,
  getInventoryProducts: "/inventory/products",
  getInventoryAlerts: "/inventory/alerts",
  createInventoryProduct: "/inventory/products",
  consumeInventory: (id: number) => `/inventory/products/${id}/consume`,
  restockInventory: (id: number) => `/inventory/products/${id}/restock`,
  getBalanceSheet: "/reports/balance-sheet",
  getIncomeStatement: "/reports/income-statement",
  getForecast: "/reports/forecast",
  getInventoryValue: "/reports/inventory-value",
  getInvestments: "/investments",
  recordInvestmentInterest: (id: number) => `/investments/${id}/record-interest`,
  investmentMonthClose: "/investments/month-close",
  getPaymentMethods: "/payment-methods",
  createPaymentMethod: "/payment-methods",
  updatePaymentMethod: (id: number) => `/payment-methods/${id}`,
  deletePaymentMethod: (id: number) => `/payment-methods/${id}`,
  getPUC: "/chart-of-accounts",
}