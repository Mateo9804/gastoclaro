import React, { useState } from 'react';
import api from '../api/axios';
import { Check, Send, AlertCircle, CheckCircle } from 'lucide-react';

const Pricing = ({ onBack }) => {
  const [step, setStep] = useState('plans'); // 'plans' o 'form'
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [formData, setFormData] = useState({
    company_name: '',
    contact_email: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', text: '' });

  const plans = [
    {
      id: 'basic',
      name: 'Básico',
      price: '19,99',
      for: 'Autónomos, microempresas y freelancers',
      features: ['Hasta 3 usuarios', '100 tickets / mes', 'OCR básico', 'Categorías', 'Exportación CSV', 'Soporte por email'],
      color: 'primary'
    },
    {
      id: 'pro',
      name: 'Profesional',
      price: '49,99',
      for: 'PYMEs reales y equipos administrativos',
      features: ['Hasta 10 usuarios', '500 tickets / mes', 'OCR avanzado', 'Historial + auditoría', 'CSV / Excel', 'Modo "cumplimiento" (VeriFactu)', 'Soporte prioritario'],
      color: 'success'
    },
    {
      id: 'enterprise',
      name: 'Empresarial',
      price: '79,99',
      for: 'Empresas con gran volumen de gastos',
      features: ['Hasta 20 usuarios', '1500 tickets / mes', 'OCR avanzado', 'Historial + auditoría', 'CSV / Excel', 'Modo "cumplimiento" (VeriFactu)', 'Soporte prioritario'],
      color: 'info'
    }
  ];

  const handleSelectPlan = (plan) => {
    setSelectedPlan(plan);
    setStep('form');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: '', text: '' });

    try {
      await api.post('/pricing-request', {
        ...formData,
        plan: selectedPlan.name,
        price: selectedPlan.price
      });
      setStatus({ 
        type: 'success', 
        text: '¡Solicitud enviada! Nos pondremos en contacto contigo en breve para verificar el pago y activar tu cuenta.' 
      });
      setTimeout(() => onBack(), 5000);
    } catch (error) {
      setStatus({ 
        type: 'danger', 
        text: 'Hubo un error al enviar la solicitud. Por favor, inténtalo de nuevo o escribe a soporte@gastoclaro.com' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-5">
      <div className="text-center mb-5">
        <img 
          src="/imagenes/logo/gastoclarologo.png" 
          alt="GastoClaro Logo" 
          className="mb-4" 
          style={{ maxHeight: '100px', width: 'auto' }} 
        />
        <h1 className="fw-bold text-white">Planes y Precios</h1>
        <p className="text-muted fs-5">Escoge el plan que mejor se adapte a las necesidades de tu empresa.</p>
      </div>

      {step === 'plans' ? (
        <div className="row justify-content-center g-4">
          {plans.map((plan) => (
            <div key={plan.id} className="col-md-4">
              <div className={`card h-100 border-0 shadow-lg rounded-4 overflow-hidden ${plan.popular ? 'border border-success border-2' : ''}`} style={{ backgroundColor: 'var(--bg-card)' }}>
                {plan.popular && (
                  <div className="bg-success text-white text-center py-1 fw-bold small">MÁS POPULAR</div>
                )}
                <div className="card-body p-4 d-flex flex-column">
                  <h3 className="fw-bold mb-1">{plan.name}</h3>
                  <p className="text-muted small mb-3">{plan.for}</p>
                  <div className="d-flex align-items-end mb-4">
                    <span className="h1 fw-bold mb-0">{plan.price} €</span>
                    <span className="text-muted ms-2">/mes</span>
                  </div>
                  <ul className="list-unstyled mb-5 flex-grow-1">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="mb-3 d-flex align-items-center gap-2 small">
                        <Check size={16} className="text-success" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <button 
                    className={`btn btn-${plan.color} btn-lg w-100 fw-bold rounded-3`}
                    onClick={() => handleSelectPlan(plan)}
                  >
                    Seleccionar Plan
                  </button>
                </div>
              </div>
            </div>
          ))}
          <div className="text-center mt-5">
            <button className="btn btn-link text-muted text-decoration-none fw-bold" onClick={onBack}>
              ← Volver al login
            </button>
          </div>
        </div>
      ) : (
        <div className="row justify-content-center">
          <div className="col-md-6">
            <div className="card shadow-lg border-0 rounded-4" style={{ backgroundColor: 'var(--bg-card)' }}>
              <div className="card-body p-5">
                <h3 className="fw-bold mb-4 text-center">Solicitar Cuenta - Plan {selectedPlan.name}</h3>
                
                {status.text && (
                  <div className={`alert alert-${status.type} d-flex align-items-center gap-2 mb-4 border-0 shadow-sm`} style={{ backgroundColor: status.type === 'success' ? 'rgba(68, 195, 108, 0.1)' : 'rgba(220, 38, 38, 0.1)', color: status.type === 'success' ? '#44c36c' : '#f87171' }}>
                    {status.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                    <div className="small">{status.text}</div>
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label className="form-label small fw-bold text-muted text-uppercase">Nombre de la Empresa</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Ej: Mi Empresa S.A."
                      value={formData.company_name}
                      onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-bold text-muted text-uppercase">Email de Contacto</label>
                    <input 
                      type="email" 
                      className="form-control" 
                      placeholder="admin@empresa.com"
                      value={formData.contact_email}
                      onChange={(e) => setFormData({...formData, contact_email: e.target.value})}
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className="mb-4">
                    <label className="form-label small fw-bold text-muted text-uppercase">Comentarios Adicionales (Opcional)</label>
                    <textarea 
                      className="form-control" 
                      rows="3" 
                      placeholder="Información sobre el pago o dudas..."
                      value={formData.message}
                      onChange={(e) => setFormData({...formData, message: e.target.value})}
                      disabled={loading}
                    ></textarea>
                  </div>
                  
                  <div className="d-grid gap-2">
                    <button type="submit" className="btn btn-success btn-lg fw-bold py-3 d-flex align-items-center justify-content-center gap-2 shadow-sm" disabled={loading}>
                      {loading ? (
                        <span className="spinner-border spinner-border-sm" role="status"></span>
                      ) : (
                        <><Send size={18} /> Enviar Solicitud</>
                      )}
                    </button>
                    <button type="button" className="btn btn-link text-muted text-decoration-none mt-2" onClick={() => setStep('plans')} disabled={loading}>
                      Cambiar de plan
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Pricing;

