import React, { useState, useEffect } from 'react';
import { TarjetaCredito, TarjetaCompra } from '../../types';
import { creditCardsApi, formatCurrency } from '../../services/api';
import './MonthClose.css';

interface Props {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

/**
 * Componente para cierre de mes de tarjetas de crédito
 * Permite registrar cuota de manejo e intereses de compras diferidas
 */
export const CreditCardMonthClose: React.FC<Props> = ({ onSuccess, onError }) => {
  const [tarjetas, setTarjetas] = useState<TarjetaCredito[]>([]);
  const [tarjetaSeleccionada, setTarjetaSeleccionada] = useState<number | null>(null);
  const [compras, setCompras] = useState<TarjetaCompra[]>([]);
  const [mes, setMes] = useState<number>(new Date().getMonth() + 1);
  const [año, setAño] = useState<number>(new Date().getFullYear());
  const [cuotaManejo, setCuotaManejo] = useState<number>(0);
  const [interesesCompras, setInteresesCompras] = useState<Record<number, number>>({});
  const [cargando, setCargando] = useState(false);

  // Cargar tarjetas
  useEffect(() => {
    const cargar = async () => {
      try {
        const response = await creditCardsApi.getTarjetas();
        if (response.success && response.data) {
          setTarjetas(response.data);
          if (response.data.length > 0) {
            setTarjetaSeleccionada(response.data[0].id_tarjeta);
          }
        }
      } catch (error) {
        onError?.('Error al cargar tarjetas');
      }
    };

    cargar();
  }, []);

  // Cargar compras cuando se selecciona tarjeta
  useEffect(() => {
    if (tarjetaSeleccionada) {
      const cargar = async () => {
        try {
          const response = await creditCardsApi.getPurchases(tarjetaSeleccionada);
          if (response.success && response.data) {
            setCompras(response.data);
            // Reset intereses
            setInteresesCompras({});
          }
        } catch (error) {
          onError?.('Error al cargar compras');
        }
      };

      cargar();
    }
  }, [tarjetaSeleccionada]);

  const handleInteresChange = (id: number, valor: number) => {
    setInteresesCompras({ ...interesesCompras, [id]: valor });
  };

  const totalIntereses = Object.values(interesesCompras).reduce((sum, v) => sum + v, 0);
  const totalMovimiento = cuotaManejo + totalIntereses;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tarjetaSeleccionada) {
      onError?.('Selecciona una tarjeta');
      return;
    }

    if (cuotaManejo === 0 && totalIntereses === 0) {
      onError?.('Ingresa al menos una cuota o interés');
      return;
    }

    try {
      setCargando(true);

      const comprasIntereses = Object.entries(interesesCompras)
        .filter(([_, monto]) => monto > 0)
        .map(([id, monto]) => ({
          id_compra_tc: Number(id),
          interes_individual: monto,
        }));

      const response = await creditCardsApi.monthClose(
        tarjetaSeleccionada,
        mes,
        año,
        cuotaManejo,
        comprasIntereses
      );

      if (response.success) {
        onSuccess?.();
        // Reset
        setCuotaManejo(0);
        setInteresesCompras({});
      }
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Error al registrar');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="month-close-form">
      <h2>💳 Cierre de Mes - Tarjetas de Crédito</h2>

      <form onSubmit={handleSubmit}>
        {/* Período y Tarjeta */}
        <div className="form-group">
          <label>
            Tarjeta de Crédito
            <select
              value={tarjetaSeleccionada || ''}
              onChange={(e) => setTarjetaSeleccionada(Number(e.target.value))}
              required
            >
              <option value="">Selecciona tarjeta</option>
              {tarjetas.map((t) => (
                <option key={t.id_tarjeta} value={t.id_tarjeta}>
                  {t.nombre_tarjeta}
                </option>
              ))}
            </select>
          </label>

          <label>
            Mes
            <select value={mes} onChange={(e) => setMes(Number(e.target.value))}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {new Date(2024, m - 1).toLocaleDateString('es-CO', {
                    month: 'long',
                  })}
                </option>
              ))}
            </select>
          </label>

          <label>
            Año
            <select value={año} onChange={(e) => setAño(Number(e.target.value))}>
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(
                (y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                )
              )}
            </select>
          </label>
        </div>

        {/* Cuota de Manejo */}
        <div className="form-group">
          <label>
            Cuota de Manejo/Seguro
            <input
              type="number"
              min="0"
              step="1000"
              placeholder="0"
              value={cuotaManejo}
              onChange={(e) => setCuotaManejo(Number(e.target.value))}
            />
          </label>
        </div>

        {/* Compras Diferidas */}
        {compras.length > 0 && (
          <div className="compras-list">
            <h3>Compras Diferidas a Cuotas</h3>
            <div className="tabla-compras">
              {compras.map((compra) => (
                <div key={compra.id_compra_tc} className="compra-item">
                  <div className="compra-info">
                    <h4>{compra.establecimiento.nombre_completo}</h4>
                    <p className="texto-secundario">
                      Monto: {formatCurrency(compra.monto_total_original)} | Cuotas:{' '}
                      {compra.cuotas_totales - compra.cuotas_restantes + 1}/
                      {compra.cuotas_totales}
                    </p>
                  </div>

                  <div className="compra-input">
                    <label>Interes Cuota {compra.cuotas_totales - compra.cuotas_restantes + 1}</label>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      placeholder="0"
                      value={interesesCompras[compra.id_compra_tc] || ''}
                      onChange={(e) =>
                        handleInteresChange(compra.id_compra_tc, Number(e.target.value))
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {compras.length === 0 && (
          <p className="no-data">No hay compras diferidas para esta tarjeta</p>
        )}

        {/* Resumen */}
        <div className="resumen">
          <div className="resumen-item">
            <span>Cuota de Manejo:</span>
            <strong>{formatCurrency(cuotaManejo)}</strong>
          </div>
          <div className="resumen-item">
            <span>Intereses Compras:</span>
            <strong>{formatCurrency(totalIntereses)}</strong>
          </div>
          <div className="resumen-item total">
            <span>Total Movimiento:</span>
            <strong className="text-danger">{formatCurrency(totalMovimiento)}</strong>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={cargando || !tarjetaSeleccionada || totalMovimiento === 0}
          className="btn-primary"
        >
          {cargando ? '⏳ Procesando...' : '✅ Registrar Cierre'}
        </button>
      </form>
    </div>
  );
};
