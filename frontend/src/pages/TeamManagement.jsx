import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { UserPlus, Trash2, Shield, User, Briefcase, Pencil } from 'lucide-react';

const TeamManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState(''); // Nuevo estado para errores
  const [userData, setUserData] = useState(JSON.parse(localStorage.getItem('userData')));
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const isSuperAdmin = userData?.role === 'super_admin';

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: isSuperAdmin ? 'admin' : 'employee',
    plan: 'basic'
  });

  // Efecto para autocompletar el email
  useEffect(() => {
    if (formData.name && !isEditing) {
      const cleanPersonName = formData.name.toLowerCase().replace(/\s+/g, '');
      if (isSuperAdmin) {
        setFormData(prev => ({ ...prev, email: `${cleanPersonName}@gastoclaro.com` }));
      } else {
        const cleanCompanyName = userData?.company?.toLowerCase().replace(/\s+/g, '') || 'empresa';
        setFormData(prev => ({ ...prev, email: `${cleanPersonName}@${cleanCompanyName}.com` }));
      }
    }
  }, [formData.name, isSuperAdmin, isEditing, userData?.company]);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/team');
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching team:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleEdit = (user) => {
    setIsEditing(true);
    setCurrentUserId(user.id);
    setErrorMessage('');
    setFormData({
      name: isSuperAdmin ? (user.company?.name || user.name.replace('Admin ', '')) : user.name,
      email: user.email,
      password: '', // No cargamos la contraseña por seguridad
      confirmPassword: '',
      role: user.role,
      plan: user.company?.plan || 'basic'
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isEditing && formData.password !== formData.confirmPassword) {
      setErrorMessage('Las contraseñas no coinciden');
      return;
    }

    if (isEditing && formData.password && formData.password !== formData.confirmPassword) {
      setErrorMessage('Las contraseñas no coinciden');
      return;
    }

    try {
      setErrorMessage('');
      if (isEditing) {
        await api.put(`/team/${currentUserId}`, formData);
      } else {
        await api.post('/team', formData);
      }

      setShowModal(false);
      setIsEditing(false);
      setCurrentUserId(null);
      setFormData({ 
        name: '', 
        email: '', 
        password: '', 
        confirmPassword: '', 
        role: isSuperAdmin ? 'admin' : 'employee',
        plan: 'basic'
      });
      fetchUsers();
      setSuccessMessage(
        isEditing 
          ? (isSuperAdmin ? 'Empresa actualizada correctamente.' : 'Miembro actualizado correctamente.')
          : (isSuperAdmin ? 'La nueva empresa ha sido registrada correctamente. Ya pueden iniciar sesión con el correo generado.' : 'El nuevo miembro ha sido añadido al equipo correctamente.')
      );
      setShowSuccessModal(true);
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Error al procesar la solicitud');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar a este miembro del equipo?')) return;
    try {
      await api.delete(`/team/${id}`);
      fetchUsers();
    } catch (error) {
      setSuccessMessage('Error al eliminar el usuario');
      setShowSuccessModal(true); // Reutilizamos el modal para errores simples de borrado por ahora o podríamos hacer uno específico
    }
  };

  if (loading) return <div className="text-center py-5"><div className="spinner-border text-primary" role="status"></div></div>;

  return (
    <div className="container-fluid py-4">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div className="d-flex align-items-center gap-3">
          <h4 className="fw-bold mb-0">
            {isSuperAdmin ? 'Gestionar Empresas' : 'Gestionar Equipo'}
          </h4>
          {!isSuperAdmin && (
            <span 
              className="badge px-3 py-2 rounded-pill small border" 
              style={{ backgroundColor: 'rgba(249, 115, 22, 0.1)', color: '#f97316', borderColor: 'rgba(249, 115, 22, 0.3)' }}
            >
              {users.length} de {userData?.user_limit || 3} <span className="d-none d-sm-inline">miembros</span>
            </span>
          )}
        </div>
        <button className="btn btn-primary d-flex align-items-center justify-content-center gap-2 shadow-sm py-2 px-4" onClick={() => { setErrorMessage(''); setShowModal(true); }}>
          <UserPlus size={18} />
          {isSuperAdmin ? 'Nueva Empresa' : 'Nuevo Miembro'}
        </button>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0 align-middle">
              <thead>
                <tr>
                  <th className="px-4 py-3 border-0 small text-muted text-uppercase fw-bold">
                    {isSuperAdmin ? 'Nombre de la Empresa' : 'Nombre'}
                  </th>
                  <th className="py-3 border-0 small text-muted text-uppercase fw-bold">Email de Acceso</th>
                  <th className="py-3 border-0 small text-muted text-uppercase fw-bold text-center">
                    {isSuperAdmin ? 'Plan' : 'Rol'}
                  </th>
                  <th className="px-4 py-3 border-0 small text-muted text-uppercase fw-bold text-end">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="px-4 py-3">
                      <div className="d-flex align-items-center">
                        <div className="avatar-sm bg-primary-subtle text-primary rounded-circle d-flex align-items-center justify-content-center me-3" style={{width: '32px', height: '32px'}}>
                          {isSuperAdmin ? <Briefcase size={16} /> : <User size={16} />}
                        </div>
                        <span className="fw-bold text-main">
                          {isSuperAdmin ? (u.company?.name || u.name.replace('Admin ', '')) : u.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 text-muted">{u.email}</td>
                    <td className="py-3 text-center">
                      {isSuperAdmin ? (
                        <span className={`badge rounded-pill px-3 ${
                          u.company?.plan === 'enterprise' ? 'bg-info text-white' :
                          u.company?.plan === 'pro' ? 'bg-success text-white' : 'bg-primary-subtle text-primary'
                        }`}>
                          {u.company?.plan === 'enterprise' ? 'Empresarial' : 
                           u.company?.plan === 'pro' ? 'Profesional' : 'Básico'}
                        </span>
                      ) : (
                        <span className={`badge rounded-pill px-3 ${
                        u.role === 'admin' ? 'bg-primary-subtle text-primary' : 
                        u.role === 'accountant' ? 'bg-info text-white border-0' : 
                        u.role === 'super_admin' ? 'bg-dark text-white border' :
                          'bg-light text-muted border'
                        }`}>
                          {u.role === 'admin' ? 'Administrador' : 
                           u.role === 'accountant' ? 'Contador' : 
                           u.role === 'super_admin' ? 'Super Admin' : 'Empleado'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-end">
                      <div className="d-flex justify-content-end gap-2">
                        <button className="btn btn-sm btn-outline-primary border-0" onClick={() => handleEdit(u)}>
                          <Pencil size={16} />
                        </button>
                        {u.role !== 'super_admin' && (
                          <button className="btn btn-sm btn-outline-danger border-0" onClick={() => handleDelete(u.id)}>
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal show d-block px-2" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered modal-lg-custom">
            <div className="modal-content border-0 shadow">
              <div className="modal-header border-bottom py-3">
                <h5 className="modal-title fw-bold">
                  {isEditing 
                    ? (isSuperAdmin ? 'Editar Empresa' : 'Editar Miembro') 
                    : (isSuperAdmin ? 'Registrar Nueva Empresa' : 'Crear Miembro')}
                </h5>
                <button type="button" className="btn-close" onClick={() => { setShowModal(false); setIsEditing(false); }}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body p-3 p-md-4">
                  {errorMessage && (
                    <div className="alert alert-danger d-flex align-items-center gap-2 border-0 shadow-sm mb-4" style={{ backgroundColor: 'rgba(220, 38, 38, 0.1)', color: '#f87171' }}>
                      <span className="material-symbols-rounded">error</span>
                      <small className="fw-bold">{errorMessage}</small>
                    </div>
                  )}
                  <div className="row">
                    <div className="col-12 col-md-6 mb-3">
                      <label className="form-label small fw-bold text-muted">
                        {isSuperAdmin ? 'Nombre de la Empresa' : 'Nombre Completo'}
                      </label>
                      <input type="text" className="form-control" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder={isSuperAdmin ? "Ej: Mi Empresa S.A." : "Ej: Juan Pérez"} required />
                    </div>
                    <div className="col-12 col-md-6 mb-3">
                      <label className="form-label small fw-bold text-muted">
                        Email de Acceso (Generado)
                      </label>
                      <input type="email" className="form-control" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} placeholder="nombre@empresa.com" required readOnly />
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-12 col-md-6 mb-3">
                      <label className="form-label small fw-bold text-muted">
                        Contraseña {isEditing && '(Opcional)'}
                      </label>
                      <div className="password-container">
                        <input 
                          type={showPassword ? "text" : "password"} 
                          className="form-control pe-5" 
                          value={formData.password} 
                          onChange={(e) => setFormData({...formData, password: e.target.value})} 
                          placeholder={isEditing ? "Sin cambios" : "Mínimo 8"} 
                          required={!isEditing} 
                          minLength="8" 
                        />
                        <span 
                          className="material-symbols-rounded password-toggle"
                          onClick={() => setShowPassword(!showPassword)}
                          style={{ cursor: 'pointer' }}
                        >
                          {showPassword ? 'visibility_off' : 'visibility'}
                        </span>
                      </div>
                    </div>
                    <div className="col-12 col-md-6 mb-3">
                      <label className="form-label small fw-bold text-muted">
                        Confirmar Contraseña
                      </label>
                      <div className="password-container">
                        <input 
                          type={showConfirmPassword ? "text" : "password"} 
                          className="form-control pe-5" 
                          value={formData.confirmPassword} 
                          onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})} 
                          placeholder={isEditing ? "Sin cambios" : "Repite"} 
                          required={!isEditing || formData.password !== ''} 
                          minLength="8" 
                        />
                        <span 
                          className="material-symbols-rounded password-toggle"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          style={{ cursor: 'pointer' }}
                        >
                          {showConfirmPassword ? 'visibility_off' : 'visibility'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="row">
                    <div className="col-12">
                      {isSuperAdmin ? (
                        <div className="mb-0">
                          <label className="form-label small fw-bold text-muted">Plan de la Empresa</label>
                          <select className="form-select" value={formData.plan} onChange={(e) => setFormData({...formData, plan: e.target.value})}>
                            <option value="basic">Plan Básico (19,99€)</option>
                            <option value="pro">Plan Profesional (49,99€)</option>
                            <option value="enterprise">Plan Empresarial (79,99€)</option>
                          </select>
                        </div>
                      ) : (
                        <div className="mb-0">
                          <label className="form-label small fw-bold text-muted">Asignar Rol</label>
                          <select className="form-select" value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})}>
                            <option value="employee">Empleado (Sube facturas)</option>
                            <option value="accountant">Contador (Ver y Exportar)</option>
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-top p-3">
                  <button type="button" className="btn btn-light fw-bold px-4" onClick={() => setShowModal(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary fw-bold px-4">
                    {isEditing ? 'Guardar Cambios' : (isSuperAdmin ? 'Crear Empresa' : 'Crear Miembro')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Éxito Profesional */}
      {showSuccessModal && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 rounded-4 shadow-lg">
              <div className="modal-body p-5 text-center">
                <div className="bg-success-subtle text-success rounded-circle d-inline-flex p-3 mb-4">
                  <span className="material-symbols-rounded fs-1">check_circle</span>
                </div>
                <h2 className="fw-bold mb-3">¡Operación Exitosa!</h2>
                <p className="text-muted mb-4 fs-6">
                  {successMessage}
                </p>
                <button 
                  className="btn btn-primary btn-lg w-100 fw-bold rounded-3 py-3" 
                  onClick={() => setShowSuccessModal(false)}
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamManagement;
