import React, { useState, useEffect } from 'react';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Pricing from './pages/Pricing';
import TeamManagement from './pages/TeamManagement';
import Settings from './pages/Settings';
import Subscription from './pages/Subscription';
import Contact from './pages/Contact';
import FileUploader from './components/FileUploader';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return !!localStorage.getItem('token');
  });
  const [showPricing, setShowPricing] = useState(false);
  const [userData, setUserData] = useState(() => {
    const storedUser = localStorage.getItem('userData');
    return storedUser ? JSON.parse(storedUser) : null;
  });
  const [activeTab, setActiveTab] = useState(() => {
    const storedUser = localStorage.getItem('userData');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      return user.role === 'super_admin' ? 'users' : 'dashboard';
    }
    return 'dashboard';
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('userData');
    
    if (!token || !storedUser) {
      // Si falta algo, borramos todo para evitar estados inconsistentes
      if (isAuthenticated) {
        localStorage.clear();
        setIsAuthenticated(false);
      }
    }
  }, [isAuthenticated]);

  const handleAuthSuccess = () => {
    const storedUser = localStorage.getItem('userData');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setUserData(user);
      setIsAuthenticated(true);
      setShowPricing(false);

      // Si es super_admin, mandarlo directo a empresas
      if (user.role === 'super_admin') {
        setActiveTab('users');
      } else {
        setActiveTab('dashboard');
      }
    }
  };
  
  const handleLogout = () => {
    localStorage.clear();
    // Forzamos un reinicio total de la app
    window.location.href = '/'; 
  };

  if (!isAuthenticated) {
    return showPricing ? (
      <Pricing onBack={() => setShowPricing(false)} />
    ) : (
      <Login onLogin={handleAuthSuccess} onShowPricing={() => setShowPricing(true)} />
    );
  }

  return (
    <div className="container-fluid p-0 overflow-hidden">
      {/* Navbar Móvil */}
      <header className="navbar sticky-top bg-dark flex-md-nowrap p-0 shadow d-md-none" style={{ backgroundColor: 'var(--bg-sidebar) !important' }}>
        <button 
          className="navbar-toggler d-md-none collapsed border-0 ms-2" 
          type="button" 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        >
          <span className="material-symbols-rounded text-white" style={{ fontSize: '32px' }}>
            {isSidebarOpen ? 'close' : 'menu'}
          </span>
        </button>
        <div className="navbar-brand col-md-3 col-lg-2 me-0 px-3 fs-6">
          <img 
            src="/imagenes/logo/gastoclarologo.png" 
            alt="Logo" 
            style={{ height: '30px' }} 
          />
        </div>
      </header>

      <div className="row g-0">
        {/* Backdrop para móvil */}
        {isSidebarOpen && (
          <div 
            className="sidebar-backdrop d-md-none" 
            onClick={() => setIsSidebarOpen(false)}
          ></div>
        )}

        {/* Sidebar */}
        <nav className={`col-md-3 col-lg-2 d-md-block sidebar shadow-sm ${isSidebarOpen ? 'show' : ''}`}>
          <div className="position-sticky pt-0 h-100 d-flex flex-column">
            <div className="sidebar-logo-container d-none d-md-flex">
              <img 
                src="/imagenes/logo/gastoclarologo.png" 
                alt="GastoClaro Logo" 
                style={{ width: '100%', maxWidth: '280px', height: 'auto' }} 
              />
            </div>
            
            <ul className="nav flex-column mt-md-0 mt-3 flex-grow-1">
              <li className="nav-item">
                <button 
                  className={`nav-link w-100 text-start border-0 bg-transparent ${activeTab === 'dashboard' ? 'active' : ''}`} 
                  onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }}
                >
                  <span className="material-symbols-rounded me-2">dashboard</span> Dashboard
                </button>
              </li>
              <li className="nav-item">
                <button 
                  className={`nav-link w-100 text-start border-0 bg-transparent ${activeTab === 'upload' ? 'active' : ''}`} 
                  onClick={() => { setActiveTab('upload'); setIsSidebarOpen(false); }}
                >
                  <span className="material-symbols-rounded me-2">upload_file</span> Subir Tickets
                </button>
              </li>
              
              {(userData?.role === 'admin' || userData?.role === 'super_admin') && (
                <>
                  <li className="nav-item">
                    <button 
                      className={`nav-link w-100 text-start border-0 bg-transparent ${activeTab === 'users' ? 'active' : ''}`} 
                      onClick={() => { setActiveTab('users'); setIsSidebarOpen(false); }}
                    >
                      <span className="material-symbols-rounded me-2">{userData.role === 'super_admin' ? 'business' : 'group_add'}</span> 
                      {userData.role === 'super_admin' ? 'Gestionar Empresas' : 'Gestionar Equipo'}
                    </button>
                  </li>
                  {userData.role === 'admin' && (
                    <li className="nav-item">
                      <button 
                        className={`nav-link w-100 text-start border-0 bg-transparent ${activeTab === 'subscription' ? 'active' : ''}`} 
                        onClick={() => { setActiveTab('subscription'); setIsSidebarOpen(false); }}
                      >
                        <span className="material-symbols-rounded me-2">credit_card</span> Gestionar Suscripción
                      </button>
                    </li>
                  )}
                  <li className="nav-item">
                    <button 
                      className={`nav-link w-100 text-start border-0 bg-transparent ${activeTab === 'settings' ? 'active' : ''}`} 
                      onClick={() => { setActiveTab('settings'); setIsSidebarOpen(false); }}
                    >
                      <span className="material-symbols-rounded me-2">settings</span> Configuración
                    </button>
                  </li>
                </>
              )}

              {(userData?.role === 'admin' || userData?.role === 'accountant') && (
                <li className="nav-item">
                  <button 
                    className={`nav-link w-100 text-start border-0 bg-transparent ${activeTab === 'contact' ? 'active' : ''}`} 
                    onClick={() => { setActiveTab('contact'); setIsSidebarOpen(false); }}
                  >
                    <span className="material-symbols-rounded me-2">support_agent</span> Contacto
                  </button>
                </li>
              )}

              <li className="nav-item mt-auto mb-3">
                <button className="nav-link w-100 text-start border-0 bg-transparent text-danger fw-bold" onClick={handleLogout}>
                  <span className="material-symbols-rounded me-2">logout</span> Cerrar Sesión
                </button>
              </li>
            </ul>
          </div>
        </nav>

        {/* Main Content */}
        <main className="col-md-9 ms-sm-auto col-lg-10 px-md-4 main-content">
          <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom px-3 py-3 rounded shadow-sm">
            <h1 className="h4 text-muted text-uppercase mb-0 fw-bold d-none d-md-block">
              {activeTab === 'dashboard' ? 'Resumen General' : 'Módulo'}
            </h1>
            <div className="d-flex align-items-center ms-auto ms-md-0">
              <div className="text-end me-3">
                <small className="d-block fw-bold text-main text-uppercase" style={{ fontSize: '0.75rem' }}>{userData?.company || 'Cargando...'}</small>
                <small className="text-muted" style={{fontSize: '0.65rem'}}>{userData?.name || 'Usuario'}</small>
              </div>
              <div className="bg-primary rounded-circle d-flex align-items-center justify-content-center shadow-sm" style={{width: '35px', height: '35px', border: '2px solid var(--border-color)'}}>
                <span className="fw-bold text-white fs-6">
                  {userData?.company?.substring(0, 1).toUpperCase() || 'G'}
                </span>
              </div>
            </div>
          </div>

          <div className="container-fluid py-2 px-md-3 px-1">
            {activeTab === 'dashboard' && userData?.role !== 'super_admin' && <Dashboard onNavigate={() => setActiveTab('upload')} userData={userData} />}
            {activeTab === 'users' && <TeamManagement />}
            {activeTab === 'subscription' && <Subscription userData={userData} />}
            {activeTab === 'settings' && <Settings userData={userData} />}
            {activeTab === 'contact' && <Contact />}
            {activeTab === 'upload' && userData?.role !== 'super_admin' && (
              <div className="card shadow-sm border-0">
                <div className="card-body p-md-5 p-3">
                  <FileUploader onSuccess={() => setActiveTab('dashboard')} userData={userData} />
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <footer className="footer mt-auto py-3 bg-white border-top">
            <div className="container-fluid px-4 text-center text-md-start">
              <div className="d-flex flex-column flex-md-row align-items-center gap-2 gap-md-3">
                <img 
                  src="/imagenes/logo/gastoclarologo.png" 
                  alt="GastoClaro Logo" 
                  style={{ maxHeight: '30px', width: 'auto' }} 
                />
                <span className="small text-muted mb-0">&copy; 2026 GastoClaro.</span>
              </div>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}

export default App;
