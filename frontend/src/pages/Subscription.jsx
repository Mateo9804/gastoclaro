import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { CreditCard, ArrowUpCircle, XCircle, AlertCircle, Clock, CheckCircle, Info } from 'lucide-react';

const Subscription = ({ userData }) => {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [pendingAction, setPendingAction] = useState(null); // { type: 'cancel' | 'change', plan?: string, message: string }

  const fetchSubscription = async () => {
    try {
      const response = await api.get('/subscription');
      setSubscription(response.data);
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, []);

  const handleCancel = () => {
    setPendingAction({
      type: 'cancel',
      message: '¿Estás seguro de que quieres cancelar tu suscripción? Podrás seguir usando el servicio hasta el final de tu periodo actual.'
    });
  };

  const handleChangePlan = (newPlan) => {
    let confirmMsg = `¿Deseas cambiar al plan ${plansInfo[newPlan].name}?`;
    if (subscription.plan === 'basic' && (newPlan === 'pro' || newPlan === 'enterprise')) {
      const price = newPlan === 'pro' ? '29,99' : '59,99';
      confirmMsg = `¡Promoción de Mejora! El primer mes de tu plan ${plansInfo[newPlan].name} solo te costará ${price}€ (20€ de descuento). ¿Deseas aplicar el cambio ahora?`;
    }

    setPendingAction({
      type: 'change',
      plan: newPlan,
      message: confirmMsg
    });
  };

  const executePendingAction = async () => {
    if (!pendingAction) return;
    
    setActionLoading(true);
    try {
      if (pendingAction.type === 'cancel') {
        const response = await api.post('/subscription/cancel');
        setMessage({ type: 'success', text: response.data.message });
      } else if (pendingAction.type === 'change') {
        const response = await api.post('/subscription/change-plan', { plan: pendingAction.plan });
        setMessage({ type: 'success', text: response.data.message });
      }
      fetchSubscription();
    } catch (error) {
      setMessage({ type: 'danger', text: `Error al ${pendingAction.type === 'cancel' ? 'cancelar' : 'cambiar'} la suscripción.` });
    } finally {
      setActionLoading(false);
      setPendingAction(null);
    }
  };

  const handleRenew = async () => {
    setActionLoading(true);
    try {
      await api.post('/subscription/renew');
      setMessage({ type: 'success', text: '¡Suscripción renovada con éxito!' });
      fetchSubscription();
    } catch (error) {
      setMessage({ type: 'danger', text: 'Error al renovar la suscripción.' });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="text-center py-5"><div className="spinner-border text-primary" role="status"></div></div>;

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  const plansInfo = {
    basic: { name: 'Básico', price: 19.99, users: 3, tickets: 100 },
    pro: { name: 'Profesional', price: 49.99, users: 10, tickets: 500 },
    enterprise: { name: 'Empresarial', price: 79.99, users: 20, tickets: 1500 }
  };

  const formatPrice = (price) => {
    return price.toLocaleString('es-ES', { minimumFractionDigits: 2 }) + '€';
  };

  return (
    <div className="container-fluid py-4">
      <h4 className="fw-bold mb-4 text-main">Gestionar Suscripción</h4>

      {message.text && (
        <div className={`alert alert-${message.type} d-flex align-items-center gap-2 border-0 shadow-sm mb-4`} style={{ backgroundColor: message.type === 'success' ? 'rgba(68, 195, 108, 0.1)' : 'rgba(220, 38, 38, 0.1)', color: message.type === 'success' ? '#44c36c' : '#f87171' }}>
          {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <div className="small fw-bold">{message.text}</div>
        </div>
      )}

      <div className="row g-4">
        {/* Estado Actual */}
        <div className="col-12 col-lg-8">
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-body p-md-4 p-3">
              <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start mb-4 gap-3">
                <div>
                  <h5 className="fw-bold mb-1">Plan Actual: <span className="text-primary">{plansInfo[subscription.plan]?.name}</span></h5>
                  <p className="text-muted small mb-0">Estado: 
                    <span className={`ms-2 badge rounded-pill ${subscription.status === 'active' ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'}`}>
                      {subscription.status === 'active' ? 'Activo' : 'Cancelado'}
                    </span>
                  </p>
                </div>
                <div className="text-sm-end">
                  <h4 className="fw-bold mb-0">{formatPrice(plansInfo[subscription.plan]?.price)} <small className="text-muted fs-6">/mes</small></h4>
                  <small className="text-muted d-block mt-1">Próximo cobro: {formatDate(subscription.ends_at)}</small>
                </div>
              </div>

              {subscription.pending_plan && (
                <div className="alert alert-info border-0 shadow-sm d-flex align-items-center gap-3 mb-4" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa' }}>
                  <Clock size={24} />
                  <div>
                    <div className="fw-bold small">Cambio de plan programado</div>
                    <div className="small">Tu plan cambiará a <strong>{plansInfo[subscription.pending_plan]?.name}</strong> el {formatDate(subscription.ends_at)}.</div>
                  </div>
                </div>
              )}

              <div className="row g-3 mb-4">
                <div className="col-sm-6">
                  <div className="p-3 rounded border border-secondary" style={{ backgroundColor: 'var(--bg-main)' }}>
                    <small className="text-muted d-block mb-1">Límite de Usuarios</small>
                    <span className="fw-bold text-main">{plansInfo[subscription.plan]?.users} miembros</span>
                  </div>
                </div>
                <div className="col-sm-6">
                  <div className="p-3 rounded border border-secondary" style={{ backgroundColor: 'var(--bg-main)' }}>
                    <small className="text-muted d-block mb-1">Límite de Tickets</small>
                    <span className="fw-bold text-main">{plansInfo[subscription.plan]?.tickets} / mes</span>
                  </div>
                </div>
              </div>

              <div className="d-flex gap-3">
                {subscription.status === 'active' ? (
                  <button className="btn btn-outline-danger d-flex align-items-center gap-2 fw-bold" onClick={handleCancel} disabled={actionLoading}>
                    <XCircle size={18} /> Cancelar Suscripción
                  </button>
                ) : (
                  <button className="btn btn-success d-flex align-items-center gap-2 fw-bold" onClick={handleRenew} disabled={actionLoading}>
                    <ArrowUpCircle size={18} /> Reactivar Suscripción
                  </button>
                )}
              </div>
            </div>
          </div>

          <h5 className="fw-bold mb-3 text-main">Cambiar de Plan</h5>
          <div className="row g-3">
            {Object.entries(plansInfo).map(([id, info]) => {
              if (id === subscription.plan) return null;
              return (
                <div key={id} className="col-md-6">
                  <div className="card border-0 shadow-sm h-100">
                    <div className="card-body p-4 d-flex flex-column">
                      <h6 className="fw-bold mb-1">{info.name}</h6>
                      <h4 className="fw-bold mb-3">{formatPrice(info.price)} <small className="text-muted fs-6">/mes</small></h4>
                      <ul className="list-unstyled small text-muted mb-4 flex-grow-1">
                        <li><CheckCircle size={12} className="text-success me-2" /> {info.users} usuarios</li>
                        <li><CheckCircle size={12} className="text-success me-2" /> {info.tickets} tickets/mes</li>
                      </ul>
                      <button className="btn btn-primary w-100 fw-bold" onClick={() => handleChangePlan(id)} disabled={actionLoading}>
                        Cambiar a este plan
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Información Adicional */}
        <div className="col-12 col-lg-4">
          <div className="card border-0 shadow-sm bg-primary-subtle text-primary mb-4" style={{ backgroundColor: 'rgba(0, 48, 97, 0.2)' }}>
            <div className="card-body p-4">
              <h6 className="fw-bold d-flex align-items-center gap-2 mb-3">
                <Info size={20} /> Política de Retención
              </h6>
              <p className="small mb-0">
                Si decides no renovar, tu cuenta entrará en un periodo de gracia. Tienes <strong>2 meses</strong> para reactivar tu suscripción antes de que tus datos y cuenta sean eliminados permanentemente de nuestra base de datos.
              </p>
            </div>
          </div>

          <div className="card border-0 shadow-sm">
            <div className="card-body p-4">
              <h6 className="fw-bold mb-3 d-flex align-items-center gap-2">
                <CreditCard size={20} /> Historial de Pagos
              </h6>
              <div className="table-responsive">
                <table className="table table-sm table-borderless mb-0">
                  <thead className="small text-muted text-uppercase">
                    <tr>
                      <th>Fecha</th>
                      <th className="text-end">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="small">
                    {subscription.last_payment ? (
                      <tr>
                        <td>{formatDate(subscription.last_payment)}</td>
                        <td className="text-end fw-bold">{formatPrice(plansInfo[subscription.plan]?.price)}</td>
                      </tr>
                    ) : (
                      <tr>
                        <td colSpan="2" className="text-center py-3 text-muted italic">No hay pagos registrados aún</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL DE CONFIRMACIÓN DE ACCIÓN */}
      {pendingAction && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 rounded-4 shadow-lg">
              <div className="modal-body p-5 text-center">
                <div className={`${pendingAction.type === 'cancel' ? 'bg-danger-subtle text-danger' : 'bg-primary-subtle text-primary'} rounded-circle d-inline-flex p-3 mb-4`}>
                  <span className="material-symbols-rounded fs-1">
                    {pendingAction.type === 'cancel' ? 'cancel' : 'upgrade'}
                  </span>
                </div>
                <h2 className="fw-bold mb-3">
                  {pendingAction.type === 'cancel' ? '¿Cancelar suscripción?' : '¿Confirmar cambio?'}
                </h2>
                <p className="text-muted mb-4">
                  {pendingAction.message}
                </p>
                <div className="d-flex gap-3">
                  <button 
                    className="btn btn-light btn-lg w-100 fw-bold rounded-3 py-3" 
                    onClick={() => setPendingAction(null)}
                    disabled={actionLoading}
                  >
                    Cancelar
                  </button>
                  <button 
                    className={`btn ${pendingAction.type === 'cancel' ? 'btn-danger' : 'btn-primary'} btn-lg w-100 fw-bold rounded-3 py-3`} 
                    onClick={executePendingAction}
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <span className="spinner-border spinner-border-sm" role="status"></span>
                    ) : (
                      'Confirmar'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Subscription;

