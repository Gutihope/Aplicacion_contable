import React, { useState, useEffect } from 'react';
import { ProductoInversion } from '../../types';
import { investmentsApi, formatCurrency } from '../../services/api';
import './MonthClose.css';

interface Props {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

/**
 * Componente para registrar intereses de inversiones en cierre de mes
 */
export const InvestmentMonthClose: React.FC<Props> = ({ onSuccess, onError }) => {
  const [inversiones, setInversiones] = useState<ProductoInversion[]>([]);
  const [intereses, setIntereses] = useState<Record<number, number>>({});
  const [mes, setMes] = useState<number>(new Date().getMonth() + 1);
  const [año, setAño] = useState<number>(new Date().getFullYear());
  const [cargando, setCargando] = useState(false);
  const [cargandoInversiones, setCargandoInversiones] = useState(true);

  // Cargar inversiones
  useEffect(() => {
    const cargar = async () => {
      try {
        const response = await investmentsApi.getInversiones();
        if (response.success && response.data) {
          setInversiones(response.data);
        }
      } catch (error) {
        onError?.('Error al cargar inversiones');
      } finally {
        setCargandoInversiones(false);
      }
    };

    cargar();
  }, []);

  const handleInteresChange = (id: number, valor: number) => {
    setIntereses({ ...intereses, [id]: valor });
  };

  const totalIntereses = Object.values(intereses).reduce((sum, v) => sum + v, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (totalIntereses === 0) {
      onError?.('Ingresa al menos un interés');
      return;
    }

    try {
      setCargando(true);

      // Preparar datos para envío
      const interesesArray = Object.entries(intereses)
        .filter(([_, monto]) => monto > 0)
        .map(([id, monto]) => ({
          id_inversion: Number(id),
          monto,
        }));

      const response = await investmentsApi.monthClose(mes, año, interesesArray);

      if (response.success) {
        onSuccess?.();
        // Reset
        setIntereses({});
        setMes(new Date().getMonth() + 1);
        setAño(new Date().getFullYear());
      }
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Error al registrar');
    } finally {
      setCargando(false);
    }
  };

  if (cargandoInversiones) {
    return <div className="loading">Cargando inversiones...</div>;
  }

  return (
    <div className="month-close-form">
      <h2>💰 Cierre de Mes - Inversiones y CDTs</h2>

      <form onSubmit={handleSubmit}>
        {/* Período */}
        <div className="form-group">
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

        {/* Listado de Inversiones */}
        <div className="inversiones-list">
          <h3>Registrar Intereses Devengados</h3>

          {inversiones.length === 0 ? (
            <p className="no-data">No hay inversiones activas registradas</p>
          ) : (
            <div className="tabla-inversiones">
              {inversiones.map((inv) => (
                <div key={inv.id_inversion} className="inversion-item">
                  <div className="inversion-info">
                    <h4>{inv.nombre_producto}</h4>
                    <p className="texto-secundario">
                      Banco: {inv.nombre_producto.split(' ')[0]} | Monto actual:{' '}
                      {formatCurrency(inv.monto_inicial)}
                    </p>
                  </div>

                  <div className="inversion-input">
                    <label>Intereses ({mes}/{año})</label>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      placeholder="0"
                      value={intereses[inv.id_inversion] || ''}
                      onChange={(e) =>
                        handleInteresChange(inv.id_inversion, Number(e.target.value))
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Resumen */}
        <div className="resumen">
          <div className="resumen-item">
            <span>Total Intereses a Registrar:</span>
            <strong className="text-success">{formatCurrency(totalIntereses)}</strong>
          </div>
        </div>

        {/* Submit */}
        <button type="submit" disabled={cargando || totalIntereses === 0} className="btn-primary">
          {cargando ? '⏳ Procesando...' : '✅ Registrar Intereses'}
        </button>
      </form>
    </div>
  );
};
