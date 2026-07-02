export interface Transaction {
  id_asiento: number
  fecha: string
  descripcion: string
  comprobante_tipo: "Egreso" | "Ingreso" | "Nota Contable"
  google_drive_file_id?: string
}

export interface CreditCard {
  id_tarjeta: number
  nombre_tarjeta: string
  numero_ultimos_digitos: string
  id_banco_tercero: number
}

export interface InventoryProduct {
  id_producto: number
  nombre: string
  unidad_medida: string
  stock_actual: number
  stock_minimo: number
  en_alerta: boolean
}

export interface BalanceSheet {
  activos: { items: any[]; total: number }
  pasivos: { items: any[]; total: number }
  patrimonio: { items: any[]; total: number }
}

export interface IncomeStatement {
  ingresos: { detalle: any[]; total: number }
  gastos: { detalle: any[]; total: number }
  resultado_neto: number
}
