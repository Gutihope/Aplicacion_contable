import React, { useState, useEffect } from 'react';
import { InventarioProducto } from '../../types';
import { inventoryApi, formatCurrency } from '../../services/api';
import './InventoryAlerts.css';

interface Props {
  onError?: (error: string) => void;
}

/**
 * Dashboard tipo alarma visual para productos en stock bajo
 * Permite consumo rápido de inventario (despensa)
 */
export const InventoryAlertsDashboard: React.FC<Props> = ({ onError }) => {
  const [productos, setProductos] = useState<InventarioProducto[]>([]);
  const [productosEnAlerta, setProductosEnAlerta] = useState<InventarioProducto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [consumoRapido, setConsumoRapido] = useState<Record<number, number>>({});

  // Cargar productos
  useEffect(() => {
    const cargar = async () => {
      try {
        const response = await inventoryApi.getProducts();
        if (response.success && response.data) {
          setProductos(response.data);
          const alertas = response.data.filter((p: InventarioProducto) => p.en_alerta);
          setProductosEnAlerta(alertas);
        }
      } catch (error) {
        onError?.('Error al cargar productos');
      } finally {
        setCargando(false);
      }
    };

    cargar();
  }, []);

  const handleConsumo = async (idProducto: number) => {
    const cantidad = consumoRapido[idProducto];

    if (!cantidad || cantidad <= 0) {
      onError?.('Ingresa una cantidad válida');
      return;
    }

    try {
      const response = await inventoryApi.consumeProduct(idProducto, cantidad);

      if (response.success) {
        // Actualizar lista local
        const updated = productos.map((p) =>
          p.id_producto === idProducto
            ? {
                ...p,
                stock_actual: p.stock_actual - cantidad,
              }
            : p
        );

        setProductos(updated);
        const alertas = updated.filter((p) => p.en_alerta);
        setProductosEnAlerta(alertas);

        // Limpiar input
        setConsumoRapido({ ...consumoRapido, [idProducto]: 0 });
      }
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Error al registrar consumo');
    }
  };

  if (cargando) {
    return <div className="loading">Cargando inventario...</div>;
  }

  return (
    <div className="inventory-dashboard">
      <div className="header">
        <h2>🚨 Alertas de Inventario</h2>
        <div className="stats">
          <div className="stat">
            <span className="label">Total Productos</span>
            <span className="value">{productos.length}</span>
          </div>
          <div className="stat alert">
            <span className="label">En Alerta</span>
            <span className="value">{productosEnAlerta.length}</span>
          </div>
        </div>
      </div>

      {productosEnAlerta.length === 0 ? (
        <div className="no-alerts">
          <h3>✅ Sin Alertas</h3>
          <p>Todos los productos tienen stock suficiente</p>
        </div>
      ) : (
        <div className="alertas-grid">
          {productosEnAlerta.map((producto) => (
            <div key={producto.id_producto} className="alert-card">
              <div className="alert-header">
                <h3>{producto.nombre}</h3>
                <span className="badge-alert">⚠️ ALERTA</span>
              </div>

              <div className="stock-info">
                <div className="stock-item">
                  <span className="label">Stock Actual</span>
                  <span className="value">{producto.stock_actual}</span>
                </div>
                <div className="stock-item">
                  <span className="label">Stock Mínimo</span>
                  <span className="value">{producto.stock_minimo}</span>
                </div>
                <div className="stock-item">
                  <span className="label">Diferencia</span>
                  <span className="value alert">
                    -{Math.abs(Number(producto.stock_actual) - Number(producto.stock_minimo))}
                  </span>
                </div>
              </div>

              <div className="progress-bar">
                <div
                  className="progress"
                  style={{
                    width: `${Math.min(
                      (Number(producto.stock_actual) /
                        Number(producto.stock_minimo)) *
                        100,
                      100
                    )}%`,
                  }}
                ></div>
              </div>

              <div className="acciones">
                <div className="consumo-rapido">
                  <label>Consumir (Despensa)</label>
                  <div className="input-group">
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={consumoRapido[producto.id_producto] || ''}
                      onChange={(e) =>
                        setConsumoRapido({
                          ...consumoRapido,
                          [producto.id_producto]: Number(e.target.value),
                        })
                      }
                      placeholder="Cantidad"
                    />
                    <span className="unit">{producto.unidad_medida || 'ud'}</span>
                  </div>
                  <button
                    onClick={() => handleConsumo(producto.id_producto)}
                    className="btn-consume"
                  >
                    ✓ Registrar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sección Todos los Productos */}
      <div className="all-products-section">
        <h3>📦 Todos los Productos</h3>

        <div className="productos-table">
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Stock</th>
                <th>Mínimo</th>
                <th>% Stock</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {productos.map((producto) => (
                <tr key={producto.id_producto} className={producto.en_alerta ? 'alerta' : ''}>
                  <td>{producto.nombre}</td>
                  <td>{producto.stock_actual}</td>
                  <td>{producto.stock_minimo}</td>
                  <td>{producto.porcentaje_stock}%</td>
                  <td>
                    <span className={`badge ${producto.en_alerta ? 'alert' : 'ok'}`}>
                      {producto.en_alerta ? '⚠️ Bajo' : '✓ OK'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
