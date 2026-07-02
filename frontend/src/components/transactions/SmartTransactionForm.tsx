import React, { useState } from 'react';
import { LineaFactura, MetodoPagoCuenta, TarjetaCredito, Tercero } from '../../types';
import { transactionsApi, formatCurrency } from '../../services/api';
import './SmartTransactionForm.css';

interface Props {
  metodosPago: MetodoPagoCuenta[];
  tarjetas: TarjetaCredito[];
  terceros: Tercero[];
  onSuccess?: (asientoId: number) => void;
  onError?: (error: string) => void;
}

/**
 * Componente principal de transacciones inteligentes
 * Soporta compras en CONTADO y a CRÉDITO con gestión automática de partida doble
 */
export const SmartTransactionForm: React.FC<Props> = ({
  metodosPago,
  tarjetas,
  terceros,
  onSuccess,
  onError,
}) => {
  const [tipoTransaccion, setTipoTransaccion] = useState<'contado' | 'credito'>('contado');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [descripcion, setDescripcion] = useState('');
  const [metodoPagoId, setMetodoPagoId] = useState<number | null>(null);
  const [idTarjeta, setIdTarjeta] = useState<number | null>(null);
  const [cuotasTotales, setCuotasTotales] = useState<number>(1);
  const [establecimientoId, setEstablecimientoId] = useState<number | null>(null);
  const [items, setItems] = useState<LineaFactura[]>([
    { cantidad: 1, precio_unitario: 0, porcentaje_iva: 19 },
  ]);
  const [archivoFactura, setArchivoFactura] = useState<File | null>(null);
  const [cargando, setCargando] = useState(false);
  const [previewArchivo, setPreviewArchivo] = useState<string | null>(null);

  // Calcular totales
  const calcularTotales = (items: LineaFactura[]) => {
    return items.reduce(
      (acc, item) => {
        const subtotal = item.cantidad * item.precio_unitario;
        const iva = subtotal * (item.porcentaje_iva / 100);
        return {
          subtotal: acc.subtotal + subtotal,
          iva: acc.iva + iva,
          total: acc.total + subtotal + iva,
        };
      },
      { subtotal: 0, iva: 0, total: 0 }
    );
  };

  const totales = calcularTotales(items);

  // Actualizar item
  const actualizarItem = (index: number, updates: Partial<LineaFactura>) => {
    const nuevosItems = [...items];
    nuevosItems[index] = { ...nuevosItems[index], ...updates };
    setItems(nuevosItems);
  };

  // Agregar línea
  const agregarLinea = () => {
    setItems([
      ...items,
      { cantidad: 1, precio_unitario: 0, porcentaje_iva: 19 },
    ]);
  };

  // Eliminar línea
  const eliminarLinea = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // Manejo de archivo
  const handleArchivoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        onError?.('Por favor selecciona un archivo PDF');
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        onError?.('El archivo es muy grande (máximo 10MB)');
        return;
      }

      setArchivoFactura(file);

      // Mostrar nombre del archivo
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewArchivo(file.name);
      };
      reader.readAsDataURL(file);
    }
  };

  // Enviar transacción
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fecha || !descripcion || items.length === 0) {
      onError?.('Por favor completa todos los campos obligatorios');
      return;
    }

    try {
      setCargando(true);

      if (tipoTransaccion === 'contado') {
        if (!metodoPagoId) {
          onError?.('Selecciona un método de pago');
          return;
        }

        const result = await transactionsApi.createCashPurchase(
          {
            fecha,
            descripcion,
            metodo_pago_id: metodoPagoId,
            items,
          },
          archivoFactura || undefined
        );

        if (result.success) {
          onSuccess?.(result.asiento_id);
          // Reset formulario
          setFecha(new Date().toISOString().split('T')[0]);
          setDescripcion('');
          setItems([{ cantidad: 1, precio_unitario: 0, porcentaje_iva: 19 }]);
          setArchivoFactura(null);
          setPreviewArchivo(null);
        }
      } else {
        if (!idTarjeta && !establecimientoId) {
          onError?.('Selecciona tarjeta o proveedor');
          return;
        }

        const result = await transactionsApi.createCreditPurchase(
          {
            fecha,
            descripcion,
            tipo_credito: idTarjeta ? 'TARJETA' : 'PROVEEDOR',
            id_tarjeta: idTarjeta || undefined,
            establecimiento_tercero_id: establecimientoId || undefined,
            cuotas_totales: cuotasTotales,
            items,
          },
          archivoFactura || undefined
        );

        if (result.success) {
          onSuccess?.(result.asiento_id);
          // Reset formulario
          setFecha(new Date().toISOString().split('T')[0]);
          setDescripcion('');
          setItems([{ cantidad: 1, precio_unitario: 0, porcentaje_iva: 19 }]);
          setArchivoFactura(null);
          setPreviewArchivo(null);
        }
      }
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="smart-transaction-form">
      <h2>📋 Transacción Inteligente</h2>

      <form onSubmit={handleSubmit}>
        {/* Fecha y Descripción */}
        <div className="form-group">
          <label>
            Fecha
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              required
            />
          </label>
          <label>
            Descripción
            <input
              type="text"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Ej: Compra en Carrefour"
              required
            />
          </label>
        </div>

        {/* Tipo de Transacción */}
        <div className="form-group">
          <fieldset>
            <legend>Tipo de Compra</legend>
            <label>
              <input
                type="radio"
                value="contado"
                checked={tipoTransaccion === 'contado'}
                onChange={() => setTipoTransaccion('contado')}
              />
              💵 Contado
            </label>
            <label>
              <input
                type="radio"
                value="credito"
                checked={tipoTransaccion === 'credito'}
                onChange={() => setTipoTransaccion('credito')}
              />
              💳 Crédito
            </label>
          </fieldset>
        </div>

        {/* Método de Pago (Contado) */}
        {tipoTransaccion === 'contado' && (
          <div className="form-group">
            <label>
              Método de Pago
              <select
                value={metodoPagoId || ''}
                onChange={(e) => setMetodoPagoId(Number(e.target.value))}
                required
              >
                <option value="">Selecciona un método</option>
                {metodosPago
                  .filter((m) => m.categoria_pago === 'CONTADO')
                  .map((m) => (
                    <option key={m.id_metodo} value={m.id_metodo}>
                      {m.nombre_comercial}
                    </option>
                  ))}
              </select>
            </label>
          </div>
        )}

        {/* Crédito */}
        {tipoTransaccion === 'credito' && (
          <div className="form-group">
            <label>
              Tarjeta de Crédito
              <select
                value={idTarjeta || ''}
                onChange={(e) => setIdTarjeta(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">Selecciona tarjeta...</option>
                {tarjetas.map((t) => (
                  <option key={t.id_tarjeta} value={t.id_tarjeta}>
                    {t.nombre_tarjeta}
                  </option>
                ))}
              </select>
            </label>

            {!idTarjeta && (
              <label>
                O Proveedor
                <select
                  value={establecimientoId || ''}
                  onChange={(e) =>
                    setEstablecimientoId(e.target.value ? Number(e.target.value) : null)
                  }
                >
                  <option value="">Selecciona proveedor...</option>
                  {terceros.map((t) => (
                    <option key={t.id_tercero} value={t.id_tercero}>
                      {t.nombre_completo}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {idTarjeta && (
              <label>
                Cuotas
                <input
                  type="number"
                  min="1"
                  value={cuotasTotales}
                  onChange={(e) => setCuotasTotales(Number(e.target.value))}
                />
              </label>
            )}
          </div>
        )}

        {/* Items de Factura */}
        <div className="form-group">
          <h3>📦 Detalles de la Factura</h3>
          <table className="items-table">
            <thead>
              <tr>
                <th>Cantidad</th>
                <th>Precio Unit.</th>
                <th>IVA %</th>
                <th>Subtotal</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx}>
                  <td>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={item.cantidad}
                      onChange={(e) =>
                        actualizarItem(idx, { cantidad: Number(e.target.value) })
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={item.precio_unitario}
                      onChange={(e) =>
                        actualizarItem(idx, { precio_unitario: Number(e.target.value) })
                      }
                    />
                  </td>
                  <td>
                    <select
                      value={item.porcentaje_iva}
                      onChange={(e) =>
                        actualizarItem(idx, { porcentaje_iva: Number(e.target.value) })
                      }
                    >
                      <option value="0">0%</option>
                      <option value="5">5%</option>
                      <option value="19">19%</option>
                    </select>
                  </td>
                  <td className="subtotal">
                    {formatCurrency(
                      item.cantidad * item.precio_unitario *
                        (1 + item.porcentaje_iva / 100)
                    )}
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => eliminarLinea(idx)}
                      className="btn-delete"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <button type="button" onClick={agregarLinea} className="btn-secondary">
            + Agregar línea
          </button>
        </div>

        {/* Resumen */}
        <div className="resumen">
          <div className="resumen-item">
            <span>Subtotal:</span>
            <strong>{formatCurrency(totales.subtotal)}</strong>
          </div>
          <div className="resumen-item">
            <span>IVA:</span>
            <strong>{formatCurrency(totales.iva)}</strong>
          </div>
          <div className="resumen-item total">
            <span>Total:</span>
            <strong>{formatCurrency(totales.total)}</strong>
          </div>
        </div>

        {/* Upload de PDF */}
        <div className="form-group">
          <label>
            Factura en PDF (Opcional)
            <input
              type="file"
              accept=".pdf"
              onChange={handleArchivoChange}
              disabled={cargando}
            />
          </label>
          {previewArchivo && (
            <div className="file-preview">
              ✅ {previewArchivo} seleccionado
            </div>
          )}
        </div>

        {/* Submit */}
        <button type="submit" disabled={cargando} className="btn-primary">
          {cargando ? '⏳ Procesando...' : '✅ Guardar Transacción'}
        </button>
      </form>
    </div>
  );
};
