import {
  TransaccionContado,
  TransaccionCredito,
  ApiResponse,
  BalanceSheet,
  IncomeStatement,
  Forecast,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

/**
 * Cliente HTTP para todas las operaciones de API
 * Incluye manejo de errores centralizado y formatos de datos
 */

// ==========================================
// MÓDULO DE TRANSACCIONES
// ==========================================

export const transactionsApi = {
  /**
   * Crear compra en contado con upload de PDF a Google Drive
   */
  async createCashPurchase(
    data: TransaccionContado,
    pdfFile?: File
  ): Promise<any> {
    const formData = new FormData();

    // Preparar datos
    formData.append('fecha', data.fecha);
    formData.append('descripcion', data.descripcion);
    formData.append('metodo_pago_id', data.metodo_pago_id.toString());
    formData.append('items', JSON.stringify(data.items));

    if (pdfFile) {
      formData.append('invoice_pdf', pdfFile);
    }

    const response = await fetch(`${API_BASE_URL}/transactions/cash-purchase`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al crear transacción');
    }

    return response.json();
  },

  /**
   * Crear compra a crédito (tarjeta o proveedor)
   */
  async createCreditPurchase(
    data: TransaccionCredito,
    pdfFile?: File
  ): Promise<any> {
    const formData = new FormData();

    formData.append('fecha', data.fecha);
    formData.append('descripcion', data.descripcion);
    formData.append('tipo_credito', data.tipo_credito);

    if (data.id_tarjeta) {
      formData.append('id_tarjeta', data.id_tarjeta.toString());
    }

    if (data.establecimiento_tercero_id) {
      formData.append(
        'establecimiento_tercero_id',
        data.establecimiento_tercero_id.toString()
      );
    }

    if (data.cuotas_totales) {
      formData.append('cuotas_totales', data.cuotas_totales.toString());
    }

    formData.append('items', JSON.stringify(data.items));

    if (pdfFile) {
      formData.append('invoice_pdf', pdfFile);
    }

    const response = await fetch(`${API_BASE_URL}/transactions/credit-purchase`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al crear transacción');
    }

    return response.json();
  },

  /**
   * Obtener detalles de una transacción
   */
  async getTransaction(id: number): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/transactions/${id}`);
    return response.json();
  },

  /**
   * Eliminar transacción
   */
  async deleteTransaction(id: number): Promise<void> {
    await fetch(`${API_BASE_URL}/transactions/${id}`, {
      method: 'DELETE',
    });
  },
};

// ==========================================
// MÓDULO DE INVERSIONES
// ==========================================

export const investmentsApi = {
  /**
   * Listar inversiones activas
   */
  async getInversiones(): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/investments`);
    return response.json();
  },

  /**
   * Registrar intereses de una inversión
   */
  async recordInterest(id: number, monto: number, fecha: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/investments/${id}/record-interest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        monto_interes: monto,
        fecha,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al registrar intereses');
    }

    return response.json();
  },

  /**
   * Cierre de mes: Registrar intereses de todas las inversiones
   */
  async monthClose(mes: number, año: number, intereses: any[]): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/investments/month-close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mes,
        año,
        intereses,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al cerrar mes');
    }

    return response.json();
  },
};

// ==========================================
// MÓDULO DE TARJETAS DE CRÉDITO
// ==========================================

export const creditCardsApi = {
  /**
   * Listar tarjetas de crédito
   */
  async getTarjetas(): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/credit-cards`);
    return response.json();
  },

  /**
   * Listar compras diferidas de una tarjeta
   */
  async getPurchases(id: number): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/credit-cards/${id}/purchases`);
    return response.json();
  },

  /**
   * Cierre de mes de tarjeta
   */
  async monthClose(
    id: number,
    mes: number,
    año: number,
    cuota_manejo?: number,
    compras_intereses?: any[]
  ): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/credit-cards/${id}/month-close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mes,
        año,
        cuota_manejo: cuota_manejo || 0,
        compras_intereses: compras_intereses || [],
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al cerrar mes');
    }

    return response.json();
  },
};

// ==========================================
// MÓDULO DE INVENTARIO
// ==========================================

export const inventoryApi = {
  /**
   * Listar productos de inventario
   */
  async getProducts(): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/inventory/products`);
    return response.json();
  },

  /**
   * Obtener alertas de inventario
   */
  async getAlerts(): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/inventory/alerts`);
    return response.json();
  },

  /**
   * Registrar consumo de producto
   */
  async consumeProduct(id: number, cantidad: number): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/inventory/products/${id}/consume`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cantidad }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al registrar consumo');
    }

    return response.json();
  },

  /**
   * Reabastecimiento de producto
   */
  async restockProduct(id: number, cantidad: number): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/inventory/products/${id}/restock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cantidad }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al reabastecer');
    }

    return response.json();
  },
};

// ==========================================
// MÓDULO DE REPORTES
// ==========================================

export const reportingApi = {
  /**
   * Generar Balance General
   */
  async getBalanceSheet(fromDate: string, toDate: string): Promise<BalanceSheet> {
    const params = new URLSearchParams({
      from_date: fromDate,
      to_date: toDate,
    });

    const response = await fetch(`${API_BASE_URL}/reports/balance-sheet?${params}`);
    return response.json();
  },

  /**
   * Generar Estado de Resultados
   */
  async getIncomeStatement(fromDate: string, toDate: string): Promise<IncomeStatement> {
    const params = new URLSearchParams({
      from_date: fromDate,
      to_date: toDate,
    });

    const response = await fetch(`${API_BASE_URL}/reports/income-statement?${params}`);
    return response.json();
  },

  /**
   * Obtener Forecast de flujo de caja
   */
  async getForecast(year: number): Promise<Forecast> {
    const response = await fetch(`${API_BASE_URL}/reports/forecast?year=${year}`);
    return response.json();
  },

  /**
   * Obtener valor del inventario
   */
  async getInventoryValue(): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/reports/inventory-value`);
    return response.json();
  },
};

// ==========================================
// UTILIDADES
// ==========================================

export const formatCurrency = (valor: number): string => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 2,
  }).format(valor);
};

export const formatDate = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('es-CO');
};
