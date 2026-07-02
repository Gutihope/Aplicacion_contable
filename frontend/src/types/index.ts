// ==========================================
// TIPOS DE DATOS PRINCIPALES
// ==========================================

export interface Tercero {
  id_tercero: number;
  nit_o_documento: string;
  nombre_completo: string;
  pais?: string;
  ciudad?: string;
  direccion?: string;
  tipo_servicio_presta?: string;
  tipo_persona?: string;
}

export interface PUC {
  codigo: string;
  nombre: string;
  nivel: number;
  naturaleza: 'D' | 'C'; // Débito o Crédito
  movimiento: boolean;
}

export interface MetodoPagoCuenta {
  id_metodo: number;
  nombre_comercial: string;
  categoria_pago: 'CONTADO' | 'CREDITO';
  tipo_origen: string;
  puc_codigo: string;
  banco_tercero_id?: number;
}

export interface ProductoInversion {
  id_inversion: number;
  nombre_producto: string;
  id_tercero: number;
  puc_cuenta_inversion: string;
  puc_cuenta_ingreso: string;
  monto_inicial: number;
  fecha_apertura: string;
  estado: 'ACTIVO' | 'LIQUIDADO';
}

export interface TarjetaCredito {
  id_tarjeta: number;
  nombre_tarjeta: string;
  id_banco_tercero: number;
  puc_cuenta_pasivo: string;
}

export interface InventarioProducto {
  id_producto: number;
  nombre: string;
  unidad_medida: string;
  stock_actual: number;
  stock_minimo: number;
  en_alerta?: boolean;
  porcentaje_stock?: number;
}

export interface AsientoContable {
  id_asiento: number;
  fecha: string;
  descripcion: string;
  comprobante_tipo: 'Egreso' | 'Ingreso' | 'Nota Contable';
  google_drive_file_id?: string;
  google_drive_webview_link?: string;
  asiento_detalles?: AsientoDetalle[];
}

export interface AsientoDetalle {
  id_detalle: number;
  asiento_id: number;
  puc_codigo: string;
  id_tercero?: number;
  debito: number;
  credito: number;
}

export interface LineaFactura {
  id_producto?: number;
  descripcion?: string;
  cantidad: number;
  precio_unitario: number;
  porcentaje_iva: number;
  subtotal?: number;
  iva?: number;
  total?: number;
}

export interface TransaccionContado {
  fecha: string;
  descripcion: string;
  metodo_pago_id: number;
  items: LineaFactura[];
  archivo_pdf?: File;
}

export interface TransaccionCredito {
  fecha: string;
  descripcion: string;
  tipo_credito: 'TARJETA' | 'PROVEEDOR';
  id_tarjeta?: number;
  establecimiento_tercero_id?: number;
  cuotas_totales?: number;
  items: LineaFactura[];
  archivo_pdf?: File;
}

export interface TarjetaCompra {
  id_compra_tc: number;
  id_tarjeta: number;
  asiento_id: number;
  establecimiento_tercero_id: number;
  monto_total_original: number;
  cuotas_totales: number;
  cuotas_restantes: number;
  saldo_capital_actual: number;
  estado: 'VIGENTE' | 'CANCELADA';
}

export interface BalanceSheet {
  periodo: {
    desde: string;
    hasta: string;
  };
  balance: {
    activos: { items: any[]; total: number };
    pasivos: { items: any[]; total: number };
    patrimonio: { items: any[]; total: number };
    ecuacion_contable: {
      activos: number;
      pasivos_patrimonio: number;
      balanceado: boolean;
    };
  };
}

export interface IncomeStatement {
  periodo: {
    desde: string;
    hasta: string;
  };
  estado_resultados: {
    ingresos: { detalle: any[]; total: number };
    gastos: { detalle: any[]; total: number };
    resultado_neto: number;
    margen: number;
  };
}

export interface Forecast {
  año: number;
  mes_actual: number;
  forecast: Array<{
    mes: number;
    mes_nombre: string;
    gastos_mes: number;
    acumulado: number;
    es_proyectado: boolean;
  }>;
  total_estimado_año: number;
}

// ==========================================
// RESPUESTAS DE API
// ==========================================

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface TransaccionResponse {
  success: boolean;
  message: string;
  asiento_id: number;
  google_drive_file_id?: string;
  asiento: AsientoContable;
}
