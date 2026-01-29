import React, { useState } from 'react';
import api from '../api/axios';
import { Shield, Key, CheckCircle, AlertCircle } from 'lucide-react';

const Settings = ({ userData }) => {
  const [formData, setFormData] = useState({
    current_password: '',
    new_password: '',
    new_password_confirmation: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.new_password !== formData.new_password_confirmation) {
      setMessage({ type: 'danger', text: 'Las contraseñas nuevas no coinciden.' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      await api.post('/change-password', formData);
      setMessage({ type: 'success', text: '¡Contraseña actualizada correctamente!' });
      setFormData({
        current_password: '',
        new_password: '',
        new_password_confirmation: ''
      });
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Error al cambiar la contraseña.';
      setMessage({ type: 'danger', text: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settings-content">
      <div className="row justify-content-center">
        <div className="col-md-8 col-lg-6">
          <div className="card shadow-sm border-0 rounded-4 overflow-hidden">
            <div className="card-header bg-primary py-3">
              <div className="d-flex align-items-center gap-2">
                <Shield className="text-white" size={20} />
                <h5 className="mb-0 fw-bold text-white">Configuración de Seguridad</h5>
              </div>
            </div>
            <div className="card-body p-4">
              <div className="text-center mb-4">
                <div className="bg-primary-subtle d-inline-flex p-3 rounded-circle mb-3">
                  <Key size={32} className="text-primary" />
                </div>
                <h4 className="fw-bold">Cambiar Contraseña</h4>
                <p className="text-muted small">Mantén tu cuenta protegida actualizando tu contraseña periódicamente.</p>
              </div>

              {message.text && (
                <div className={`alert alert-${message.type} d-flex align-items-center gap-2 shadow-sm border-0`} role="alert">
                  {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                  <div>{message.text}</div>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label small fw-bold text-muted">Contraseña Actual</label>
                  <div className="position-relative">
                    <input 
                      type={showCurrentPassword ? "text" : "password"} 
                      className="form-control" 
                      value={formData.current_password}
                      onChange={(e) => setFormData({...formData, current_password: e.target.value})}
                      required 
                    />
                    <span 
                      className="material-symbols-rounded position-absolute top-50 end-0 translate-middle-y me-3 text-muted"
                      style={{ cursor: 'pointer', zIndex: 5 }}
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    >
                      {showCurrentPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-bold text-muted">Nueva Contraseña</label>
                  <div className="position-relative">
                    <input 
                      type={showNewPassword ? "text" : "password"} 
                      className="form-control" 
                      value={formData.new_password}
                      onChange={(e) => setFormData({...formData, new_password: e.target.value})}
                      minLength="8"
                      required 
                    />
                    <span 
                      className="material-symbols-rounded position-absolute top-50 end-0 translate-middle-y me-3 text-muted"
                      style={{ cursor: 'pointer', zIndex: 5 }}
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </div>
                  <div className="form-text small">Mínimo 8 caracteres.</div>
                </div>

                <div className="mb-4">
                  <label className="form-label small fw-bold text-muted">Confirmar Nueva Contraseña</label>
                  <input 
                    type="password" 
                    className="form-control" 
                    value={formData.new_password_confirmation}
                    onChange={(e) => setFormData({...formData, new_password_confirmation: e.target.value})}
                    required 
                  />
                </div>

                <button 
                  type="submit" 
                  className="btn btn-primary w-100 py-2 fw-bold d-flex align-items-center justify-content-center gap-2"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                      Actualizando...
                    </>
                  ) : (
                    'Actualizar Contraseña'
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;

