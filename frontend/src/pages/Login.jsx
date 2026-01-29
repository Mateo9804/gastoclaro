import React, { useState } from 'react';
import api from '../api/axios';

const Login = ({ onLogin, onShowPricing }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/login', {
        email: email,
        password: password
      });

      const { access_token, user } = response.data;

      localStorage.setItem('token', access_token);
      localStorage.setItem('userData', JSON.stringify(user));

      onLogin();
    } catch (err) {
      console.error("ERROR DE LOGIN:", err);
      setError(err.response?.data?.message || "Credenciales incorrectas o error de conexión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="row justify-content-center align-items-center vh-100 px-2">
        <div className="col-12 col-sm-10 col-md-8 col-lg-7 col-xl-6 col-xxl-5" style={{ maxWidth: '600px' }}>
          <div className="card shadow-lg border-0 rounded-4">
            <div className="card-body p-4 p-md-5">
              <div className="text-center mb-4">
                <img 
                  src="/imagenes/logo/gastoclarologo.png" 
                  alt="GastoClaro Logo" 
                  className="img-fluid mb-2"
                  style={{ maxHeight: '200px', width: 'auto' }}
                />
                <p className="text-muted fs-5 mb-0">Inicia sesión en tu panel</p>
              </div>
              
              <form onSubmit={handleSubmit}>
                {error && (
                  <div className="alert alert-danger d-flex align-items-center mb-4" role="alert" style={{ backgroundColor: 'rgba(220, 38, 38, 0.1)', borderColor: 'rgba(220, 38, 38, 0.2)', color: '#f87171' }}>
                    <span className="material-symbols-rounded me-2" style={{ color: '#f87171' }}>error</span>
                    <div className="small">{error}</div>
                  </div>
                )}
                <div className="mb-3"> {/* Reducido de mb-4 a mb-3 */}
                  <label className="form-label fw-semibold small text-muted text-uppercase">Correo Electrónico</label>
                  <div className="input-group">
                    <span className="input-group-text"><span className="material-symbols-rounded">mail</span></span>
                    <input 
                      type="email" 
                      className="form-control border-start-0 ps-0" 
                      placeholder="correo@ejemplo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>
                </div>
                <div className="mb-4">
                  <label className="form-label fw-semibold small text-muted text-uppercase">Contraseña</label>
                  <div className="password-container">
                    <input 
                      type={showPassword ? "text" : "password"} 
                      className="form-control pe-5" 
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading}
                    />
                    <span 
                      className="material-symbols-rounded password-toggle"
                      onClick={() => !loading && setShowPassword(!showPassword)}
                    >
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </div>
                </div>
                <button 
                  type="submit" 
                  className="btn btn-primary btn-lg w-100 fw-bold shadow-sm py-3 mb-4 d-flex align-items-center justify-content-center gap-2"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                      Entrando...
                    </>
                  ) : 'Entrar al sistema'}
                </button>
              </form>
              
              <div className="text-center">
                <button 
                  onClick={onShowPricing} 
                  className="btn btn-link p-0 fw-bold text-decoration-none shadow-none small" 
                  style={{ color: '#44c36c' }}
                >
                  Conoce los precios de GastoClaro
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
