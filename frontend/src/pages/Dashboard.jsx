import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { Eye, Edit2, Trash2, X, Check, MessageSquare, AlertTriangle, Download, ShieldCheck, Shield } from 'lucide-react';

const Dashboard = ({ onNavigate, userData }) => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [companyName, setCompanyName] = useState('tu empresa');
  
  // Estados para modales
  const [viewingFile, setViewingFile] = useState(null);
  const [editingExpense, setEditingExpense] = useState(null);
  const [deletingExpenseId, setDeletingExpenseId] = useState(null);
  const [deletingCommentId, setDeletingCommentId] = useState(null);
  const [showStatPeriodModal, setShowStatPeriodModal] = useState(false);
  const [statPeriod, setStatPeriod] = useState({ type: 'all', value: '', label: 'Histórico Total' });
  const [editForm, setEditForm] = useState({ vendor_name: '', total_amount: '', date: '', status: '', category: '' });
  const [warnings, setWarnings] = useState([]);

  // Estados para comentarios
  const [showComments, setShowComments] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');

  // Estados para filtros
  const [filters, setFilters] = useState({
    status: '',
    category: '',
    date_mode: '', // 'date-full', 'date-month', 'date-year', etc.
    date_value: '',
    sort: 'newest'
  });

  const STORAGE_URL = 'http://localhost:8080/gastoclaro/backend/public/storage/';
  const userRole = userData?.role || 'employee';

  const fetchDashboardData = async () => {
    try {
      if (userData) {
        setCompanyName(typeof userData.company === 'object' ? userData.company.name : userData.company || 'tu empresa');
      }

      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.category) params.append('category', filters.category);
      
      if (filters.date_mode && filters.date_value) {
        const [type] = filters.date_mode.split('-');
        params.append(type, filters.date_value);
      }
      
      params.append('sort', filters.sort);

      const response = await api.get(`/receipts?${params.toString()}`);
      setExpenses(response.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [filters, userData]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters({ ...filters, [name]: value });
    
    // Si el usuario cambia la fecha manualmente en los filtros de la tabla, 
    // actualizamos también la etiqueta de la tarjeta superior para que coincidan
    if (name === 'date_mode' && value === '') {
      setStatPeriod({ type: 'all', value: '', label: 'Histórico Total' });
    } else if (name === 'date_value' && value) {
      if (filters.date_mode === 'date-month' || filters.date_mode === 'upload_date-month') {
        const [y, m] = value.split('-');
        const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        setStatPeriod({ type: 'month', value, label: `${months[parseInt(m)-1]} ${y}` });
      } else if (filters.date_mode === 'date-year' || filters.date_mode === 'upload_date-year') {
        setStatPeriod({ type: 'year', value, label: `Año ${value}` });
      } else {
        setStatPeriod({ type: 'specific', value, label: new Date(value).toLocaleDateString() });
      }
    }
  };

  const categories = ['General', 'Alimentación', 'Transporte', 'Tecnología', 'Servicios', 'Otros'];

  const executeDelete = async () => {
    if (!deletingExpenseId) return;
    try {
      await api.delete(`/receipts/${deletingExpenseId}`);
      setExpenses(expenses.filter(e => e.id !== deletingExpenseId));
      setDeletingExpenseId(null);
    } catch (error) {
      alert('Error al eliminar el ticket');
    }
  };

  const startEdit = (expense) => {
    setEditingExpense(expense);
    setEditForm({
      vendor_name: expense.vendor_name || '',
      total_amount: expense.total_amount || '',
      date: expense.date || '',
      status: expense.status || 'pending',
      category: expense.category || 'General'
    });
    setWarnings([]);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const response = await api.put(`/receipts/${editingExpense.id}`, editForm);
      setExpenses(expenses.map(exp => exp.id === editingExpense.id ? response.data.receipt : exp));
      if (response.data.warnings && response.data.warnings.length > 0) {
        setWarnings(response.data.warnings);
      } else {
        setEditingExpense(null);
      }
      fetchDashboardData();
    } catch (error) {
      alert('Error al actualizar el ticket');
    }
  };

  const handleApprove = async (id) => {
    try {
      await api.post(`/receipts/${id}/approve`);
      fetchDashboardData();
    } catch (error) {
      alert('Error al aprobar el ticket');
    }
  };

  const fetchComments = async (receiptId) => {
    try {
      const response = await api.get(`/receipts/${receiptId}/comments`);
      setComments(response.data);
      setShowComments(receiptId);
    } catch (error) {
      alert('Error al cargar comentarios');
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      const response = await api.post(`/receipts/${showComments}/comments`, { comment: newComment });
      setComments([...comments, response.data]);
      setNewComment('');
      // Actualizamos el contador localmente
      setExpenses(expenses.map(exp => 
        exp.id === showComments ? { ...exp, comments_count: (exp.comments_count || 0) + 1 } : exp
      ));
    } catch (error) {
      alert('Error al enviar comentario');
    }
  };

  const handleDeleteComment = (commentId) => {
    setDeletingCommentId(commentId);
  };

  const executeDeleteComment = async () => {
    if (!deletingCommentId) return;
    try {
      await api.delete(`/comments/${deletingCommentId}`);
      setComments(comments.filter(c => c.id !== deletingCommentId));
      // Actualizamos el contador localmente
      setExpenses(expenses.map(exp => 
        exp.id === showComments ? { ...exp, comments_count: Math.max(0, (exp.comments_count || 1) - 1) } : exp
      ));
      setDeletingCommentId(null);
    } catch (error) {
      alert('Error al borrar el comentario');
    }
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.category) params.append('category', filters.category);
      
      if (filters.date_mode && filters.date_value) {
        const [type] = filters.date_mode.split('-');
        params.append(type, filters.date_value);
      }

      const response = await api.get(`/receipts/export?${params.toString()}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      let fileName = 'reporte_gastos';
      if (filters.date_value) fileName += `_${filters.date_value}`;
      link.setAttribute('download', `${fileName}.csv`);
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      alert('Error al exportar datos');
    }
  };

  const stats = [
    { 
      name: 'Gastos Generales', 
      value: `${expenses
        .filter(e => e.status === 'completed')
        .reduce((acc, curr) => acc + parseFloat(curr.total_amount || 0), 0)
        .toLocaleString('es-ES', { minimumFractionDigits: 2 })} €`, 
      change: statPeriod.label, 
      color: 'primary', 
      icon: 'payments',
      clickable: true
    },
    { 
      name: 'Tickets Pendientes', 
      value: expenses.filter(e => e.status === 'pending').length.toString(), 
      change: 'Por revisar', 
      color: 'warning', 
      icon: 'pending_actions' 
    },
    { 
      name: 'Aprobaciones', 
      value: expenses.length > 0 
        ? `${Math.round((expenses.filter(e => e.status === 'completed').length / expenses.length) * 100)}%` 
        : '0%', 
      change: 'Efectividad OCR', 
      color: 'success', 
      icon: 'verified' 
    },
  ];

  const handleStatPeriodChange = (type, value, label) => {
    setStatPeriod({ type, value, label });
    
    // Sincronizar con los filtros globales para que la tabla también cambie
    if (type === 'all') {
      setFilters({ ...filters, date_mode: '', date_value: '' });
    } else if (type === 'month') {
      setFilters({ ...filters, date_mode: 'date-month', date_value: value });
    } else if (type === 'year') {
      setFilters({ ...filters, date_mode: 'date-year', date_value: value });
    }
    
    setShowStatPeriodModal(false);
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{height: '300px'}}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-content">
      <div className="row mb-4">
        {stats.map((stat) => (
          <div key={stat.name} className="col-12 col-md-4 mb-3">
            <div 
              className={`card stat-card h-100 border-start border-4 border-${stat.color} shadow-sm border-0 ${stat.clickable ? 'cursor-pointer' : ''}`}
              onClick={stat.clickable ? () => setShowStatPeriodModal(true) : undefined}
              style={stat.clickable ? { transition: 'transform 0.2s', cursor: 'pointer' } : {}}
              onMouseEnter={(e) => stat.clickable && (e.currentTarget.style.transform = 'translateY(-5px)')}
              onMouseLeave={(e) => stat.clickable && (e.currentTarget.style.transform = 'translateY(0)')}
            >
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h6 className="card-title text-muted mb-0 small fw-bold text-uppercase tracking-wider">
                    {stat.name}
                    {stat.clickable && <span className="material-symbols-rounded ms-2 fs-6 align-middle">calendar_month</span>}
                  </h6>
                  <span className="material-symbols-rounded text-muted">{stat.icon}</span>
                </div>
                <div className="d-flex align-items-end flex-wrap">
                  <h3 className="mb-0 fw-bold me-2">{stat.value}</h3>
                  <small className="text-muted">{stat.change}</small>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card shadow-sm border-0">
        <div className="card-header py-3 d-flex flex-column flex-lg-row justify-content-between align-items-lg-center border-bottom gap-3">
          <div className="d-flex align-items-center justify-content-between w-100 w-lg-auto gap-3">
            <h5 className="mb-0 fw-bold">Actividad Reciente</h5>
            {(userRole === 'admin' || userRole === 'accountant') && (
              <button 
                className={`btn btn-sm ${userData.plan !== 'basic' ? 'btn-outline-success' : 'btn-outline-secondary opacity-50'} d-flex align-items-center gap-1`} 
                onClick={userData.plan !== 'basic' ? handleExport : () => alert('El reporte Excel/CSV solo está disponible en el Plan Profesional o Empresarial.')}
              >
                <Download size={14} /> <span className="d-none d-sm-inline">Exportar CSV</span> {userData.plan === 'basic' && '💎'}
              </button>
            )}
          </div>
          
          <div className="d-flex flex-wrap gap-2 w-100 w-lg-auto">
            <select className="form-select form-select-sm flex-grow-1 flex-lg-grow-0 w-auto border-light-subtle shadow-sm" name="sort" value={filters.sort} onChange={handleFilterChange}>
              <option value="newest">Más recientes</option>
              <option value="oldest">Más antiguos</option>
              <option value="amount_high">Monto más alto</option>
              <option value="amount_low">Monto más bajo</option>
            </select>

            <select className="form-select form-select-sm flex-grow-1 flex-lg-grow-0 w-auto border-light-subtle shadow-sm" name="status" value={filters.status} onChange={handleFilterChange}>
              <option value="">Todos los estados</option>
              <option value="completed">Procesados</option>
              <option value="pending">Pendientes</option>
              <option value="error">Error</option>
            </select>

            <select className="form-select form-select-sm flex-grow-1 flex-lg-grow-0 w-auto border-light-subtle shadow-sm" name="category" value={filters.category} onChange={handleFilterChange}>
              <option value="">Todas las categorías</option>
              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>

            <div className="input-group input-group-sm flex-grow-1 flex-lg-grow-0 w-auto shadow-sm">
              <select 
                className="form-select border-secondary fw-bold" 
                name="date_mode" 
                value={filters.date_mode} 
                onChange={(e) => setFilters({ ...filters, date_mode: e.target.value, date_value: '' })}
                style={{ fontSize: '0.75rem', minWidth: '150px' }}
              >
                <option value="">Cualquier fecha</option>
                <optgroup label="FECHA DE FACTURA">
                  <option value="date-full">Factura: Día exacto</option>
                  <option value="date-month">Factura: Por mes</option>
                  <option value="date-year">Factura: Por año</option>
                </optgroup>
                <optgroup label="FECHA DE SUBIDA">
                  <option value="upload_date-full">Subida: Día exacto</option>
                  <option value="upload_date-month">Subida: Por mes</option>
                  <option value="upload_date-year">Subida: Por año</option>
                </optgroup>
              </select>

              {filters.date_mode && (
                <>
                  {filters.date_mode.endsWith('year') ? (
                    <input 
                      type="number" 
                      className="form-control border-secondary" 
                      placeholder="Año"
                      name="date_value"
                      value={filters.date_value}
                      onChange={handleFilterChange}
                      style={{ width: '70px' }}
                      min="2000"
                      max="2100"
                    />
                  ) : filters.date_mode.endsWith('month') ? (
                    <input 
                      type="month" 
                      className="form-control border-secondary" 
                      name="date_value"
                      value={filters.date_value}
                      onChange={handleFilterChange}
                      style={{ width: '120px' }}
                    />
                  ) : (
                    <input 
                      type="date" 
                      className="form-control border-secondary" 
                      name="date_value"
                      value={filters.date_value}
                      onChange={handleFilterChange}
                      style={{ width: '110px' }}
                    />
                  )}
                </>
              )}
            </div>

            <button 
              className="btn btn-sm btn-light border shadow-sm flex-grow-1 flex-lg-grow-0" 
              onClick={() => {
                setFilters({status:'', category:'', date_mode: '', date_value: '', sort:'newest'});
                setStatPeriod({ type: 'all', value: '', label: 'Histórico Total' });
              }}
            >
              Limpiar
            </button>
          </div>
        </div>
        <div className="card-body p-0">
          {expenses.length === 0 ? (
            <div className="text-center py-5">
              <span className="material-symbols-rounded text-muted mb-3" style={{fontSize: '64px'}}>receipt_long</span>
              <h4 className="fw-bold">No hay gastos registrados</h4>
              <p className="text-muted mx-auto" style={{maxWidth: '400px'}}>
                Tu cuenta de <strong>{companyName}</strong> está lista. Comienza subiendo tu primer ticket o factura.
              </p>
              <button className="btn btn-primary fw-bold px-4 py-2 mt-2 shadow-sm d-flex align-items-center mx-auto gap-2" onClick={onNavigate}>
                <span className="material-symbols-rounded fs-5" style={{ color: 'white' }}>upload_file</span> Subir mi primer ticket
              </button>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0 align-middle">
                <thead>
                  <tr>
                    <th className="px-4 py-3 border-0 small text-muted text-uppercase fw-bold">Proveedor</th>
                    <th className="py-3 border-0 small text-muted text-uppercase fw-bold">Categoría</th>
                    <th className="py-3 border-0 small text-muted text-uppercase fw-bold text-center">Fecha Factura</th>
                    <th className="py-3 border-0 small text-muted text-uppercase fw-bold text-center">Subido el</th>
                    <th className="py-3 border-0 small text-muted text-uppercase fw-bold text-center">Monto</th>
                    <th className="py-3 border-0 small text-muted text-uppercase fw-bold text-center">Estado</th>
                    <th className="py-3 border-0 small text-muted text-uppercase fw-bold text-center">Modificado</th>
                    <th className="px-4 py-3 border-0 small text-muted text-uppercase fw-bold text-end">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((expense) => (
                    <tr key={expense.id}>
                      <td className="px-4 py-3">
                        <div className="d-flex align-items-center">
                          <div className="avatar-sm bg-light text-primary rounded-circle d-flex align-items-center justify-content-center me-3" style={{width: '32px', height: '32px'}}>
                            <span className="material-symbols-rounded fs-6">store</span>
                          </div>
                          <div>
                            <div className="fw-bold text-main">{expense.vendor_name || 'Sin detectar'}</div>
                            <div className="d-flex align-items-center gap-1">
                              <small className="text-muted">{expense.original_name}</small>
                              {expense.approved_by && <ShieldCheck size={12} className="text-success" title="Aprobado" />}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3">
                        <span className="badge bg-primary-subtle text-primary border border-primary-subtle fw-normal">{expense.category || 'General'}</span>
                      </td>
                      <td className="py-3 text-center text-muted">
                        {expense.date ? new Date(expense.date).toLocaleDateString() : '-'}
                      </td>
                      <td className="py-3 text-center text-muted small">
                        {new Date(expense.created_at).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3 text-center fw-bold text-main">
                        {expense.total_amount ? `${expense.total_amount} ${expense.currency === 'EUR' ? '€' : '$'}` : '-'}
                      </td>
                      <td className="py-3 text-center">
                        <span className={`badge rounded-pill ${
                          expense.status === 'completed' ? 'bg-success-subtle text-success' : 
                          expense.status === 'error' ? 'bg-danger-subtle text-danger' : 
                          'bg-warning-subtle text-warning'
                        } px-3`}>
                          {expense.status === 'completed' ? 'Procesado' : 
                           expense.status === 'error' ? 'Error' : 'Pendiente'}
                        </span>
                      </td>
                      <td className="py-3 text-center text-muted small">
                        {expense.editor?.name || expense.uploader?.name || 'Sistema'}
                      </td>
                      <td className="px-4 py-3 text-end">
                        <div className="btn-group">
                          <button className="btn btn-sm btn-outline-secondary border-0" title="Ver archivo" onClick={() => setViewingFile(expense)}>
                            <Eye size={16} />
                          </button>
                          <button className="btn btn-sm btn-outline-info border-0 position-relative" title="Comentarios" onClick={() => fetchComments(expense.id)}>
                            <MessageSquare size={16} />
                            {expense.comments_count > 0 && (
                              <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style={{ fontSize: '0.6rem' }}>
                                {expense.comments_count}
                              </span>
                            )}
                          </button>
                          {userRole !== 'accountant' && (
                            <button className="btn btn-sm btn-outline-primary border-0" title="Editar" onClick={() => startEdit(expense)}>
                              <Edit2 size={16} />
                            </button>
                          )}
                          {userRole === 'admin' && expense.status !== 'completed' && (
                            <button className="btn btn-sm btn-outline-success border-0" title="Aprobar" onClick={() => handleApprove(expense.id)}>
                              <Check size={16} />
                            </button>
                          )}
                          {userRole !== 'accountant' && (
                            <button className="btn btn-sm btn-outline-danger border-0" title="Eliminar" onClick={() => setDeletingExpenseId(expense.id)}>
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
          )}
        </div>
      </div>

      {/* MODAL PARA VER ARCHIVO */}
      {viewingFile && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
          <div className="modal-dialog modal-xl modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg" style={{ backgroundColor: 'var(--bg-card)' }}>
              <div className="modal-header border-0">
                <h5 className="modal-title fw-bold text-main">{viewingFile.original_name}</h5>
                <button type="button" className="btn-close" onClick={() => setViewingFile(null)}></button>
              </div>
              <div className="modal-body p-0 d-flex flex-column flex-lg-row" style={{ minHeight: '60vh', maxHeight: '85vh', overflow: 'hidden' }}>
                {/* Contenedor de Imagen/PDF */}
                <div className="flex-grow-1 bg-dark d-flex align-items-center justify-content-center overflow-auto p-2" style={{ backgroundColor: 'var(--bg-main)', minHeight: '40vh' }}>
                  {viewingFile.file_path.toLowerCase().endsWith('.pdf') ? (
                    <iframe src={`${STORAGE_URL}${viewingFile.file_path}#toolbar=0`} width="100%" height="100%" style={{ minHeight: '50vh', border: 'none' }} frameBorder="0"></iframe>
                  ) : (
                    <img src={`${STORAGE_URL}${viewingFile.file_path}`} alt="Ticket" className="img-fluid shadow" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                  )}
                </div>

                {/* Panel de Información Lateral/Inferior */}
                <div className="modal-info-panel p-4" style={{ backgroundColor: 'var(--bg-card)', overflowY: 'auto' }}>
                  <style>{`
                    .modal-info-panel {
                      width: 100%;
                      border-top: 1px solid var(--border-color);
                    }
                    @media (min-width: 992px) {
                      .modal-info-panel {
                        width: 320px !important;
                        border-top: none;
                        border-left: 1px solid var(--border-color);
                        flex-shrink: 0;
                      }
                    }
                  `}</style>
                  
                  <h6 className="fw-bold mb-3 border-bottom pb-2 text-main d-flex align-items-center gap-2">
                    <ShieldCheck size={18} className="text-primary" />
                    Información de Auditoría {userData.plan === 'basic' && '💎'}
                  </h6>

                  {userData.plan !== 'basic' ? (
                    <div className="small">
                      <div className="mb-3">
                        <span className="text-muted">Subido por:</span><br />
                        <strong className="text-main">{viewingFile.uploader?.name || 'Desconocido'}</strong>
                      </div>
                      {viewingFile.editor && (
                        <div className="mb-3">
                          <span className="text-muted">Editado por:</span><br />
                          <strong className="text-main">{viewingFile.editor.name}</strong>
                        </div>
                      )}
                      {viewingFile.approver && (
                        <div className="mb-3">
                          <span className="text-muted">Aprobado por:</span><br />
                          <strong className="text-main">{viewingFile.approver.name}</strong>
                        </div>
                      )}
                      <div className="mb-0">
                        <span className="text-muted">Fecha de creación:</span><br />
                        <strong className="text-main">{new Date(viewingFile.created_at).toLocaleString()}</strong>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4 rounded-3 p-3" style={{ backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-color)' }}>
                      <Shield size={32} className="text-muted mb-2 opacity-50" />
                      <p className="small text-muted mb-0">
                        El <strong>Modo Cumplimiento</strong> con historial de auditoría solo está disponible en planes superiores.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PARA EDITAR DATOS */}
      {editingExpense && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header border-bottom py-3">
                <h5 className="modal-title fw-bold">Corregir Datos del Ticket</h5>
                <button type="button" className="btn-close" onClick={() => setEditingExpense(null)}></button>
              </div>
              <form onSubmit={handleUpdate}>
                <div className="modal-body p-4">
                  {warnings.length > 0 && (
                    <div className="alert alert-warning mb-4">
                      <div className="d-flex align-items-center gap-2 mb-2">
                        <AlertTriangle size={18} />
                        <strong>Atención: Validaciones de negocio</strong>
                      </div>
                      <ul className="mb-0 small">
                        {warnings.map((w, i) => <li key={i}>{w}</li>)}
                      </ul>
                      <button type="button" className="btn btn-sm btn-outline-warning mt-2 w-100" onClick={() => setEditingExpense(null)}>Cerrar y Revisar</button>
                    </div>
                  )}
                  
                  <div className="mb-3">
                    <label className="form-label small fw-bold text-muted">Proveedor</label>
                    <input type="text" className="form-control" value={editForm.vendor_name} onChange={(e) => setEditForm({...editForm, vendor_name: e.target.value})} placeholder="Ej: Starbucks" required />
                  </div>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label small fw-bold text-muted">Monto Total</label>
                      <div className="input-group">
                        <span className="input-group-text">€</span>
                        <input type="number" step="0.01" className="form-control" value={editForm.total_amount} onChange={(e) => setEditForm({...editForm, total_amount: e.target.value})} placeholder="0.00" required />
                      </div>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label small fw-bold text-muted">Fecha</label>
                      <input type="date" className="form-control" value={editForm.date} onChange={(e) => setEditForm({...editForm, date: e.target.value})} required />
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label small fw-bold text-muted">Categoría</label>
                      <select className="form-select" value={editForm.category} onChange={(e) => setEditForm({...editForm, category: e.target.value})}>
                        {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label small fw-bold text-muted">Estado</label>
                      <select className="form-select" value={editForm.status} onChange={(e) => setEditForm({...editForm, status: e.target.value})}>
                        <option value="pending">Pendiente</option>
                        <option value="completed">Procesado</option>
                        <option value="error">Error</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-top p-3">
                  <button type="button" className="btn btn-light fw-bold" onClick={() => setEditingExpense(null)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary fw-bold px-4">Guardar Cambios</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE COMENTARIOS */}
      {showComments && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow" style={{ backgroundColor: 'var(--bg-card)' }}>
              <div className="modal-header border-bottom">
                <h5 className="modal-title fw-bold text-main">Comentarios Internos</h5>
                <button type="button" className="btn-close" onClick={() => setShowComments(null)}></button>
              </div>
              <div className="modal-body p-0">
                <div className="p-3" style={{ maxHeight: '300px', overflowY: 'auto', backgroundColor: 'var(--bg-main)' }}>
                  {comments.length === 0 ? (
                    <p className="text-center text-muted my-4">No hay comentarios aún.</p>
                  ) : (
                    comments.map((c) => (
                      <div key={c.id} className="mb-3 p-3 rounded shadow-sm border-start border-3 border-primary" style={{ backgroundColor: 'var(--bg-card)' }}>
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <div>
                            <strong className="small text-main">{c.user.name}</strong>
                            <span className="text-muted ms-2" style={{ fontSize: '0.7rem' }}>{new Date(c.created_at).toLocaleString()}</span>
                          </div>
                          {(c.user_id === userData?.id || userRole === 'admin') && (
                            <button className="btn btn-sm p-0 text-danger border-0 shadow-none" onClick={() => handleDeleteComment(c.id)}>
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                        <p className="mb-0 small text-main opacity-75">{c.comment}</p>
                      </div>
                    ))
                  )}
                </div>
                <form onSubmit={handleAddComment} className="p-3 border-top" style={{ backgroundColor: 'var(--bg-card)' }}>
                  <div className="input-group">
                    <input 
                      type="text" 
                      className="form-control form-control-sm border-secondary text-white" 
                      placeholder="Escribe un comentario..." 
                      value={newComment} 
                      onChange={(e) => setNewComment(e.target.value)}
                      style={{ backgroundColor: 'var(--bg-main)' }}
                    />
                    <button className="btn btn-primary btn-sm px-3 fw-bold" type="submit">Enviar</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN */}
      {deletingExpenseId && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 rounded-4 shadow-lg">
              <div className="modal-body p-5 text-center">
                <div className="bg-danger-subtle text-danger rounded-circle d-inline-flex p-3 mb-4">
                  <span className="material-symbols-rounded fs-1">delete_forever</span>
                </div>
                <h2 className="fw-bold mb-3">¿Eliminar factura?</h2>
                <p className="text-muted mb-4">
                  Esta acción no se puede deshacer. El archivo y sus datos serán borrados permanentemente del sistema.
                </p>
                <div className="d-flex gap-3">
                  <button 
                    className="btn btn-light btn-lg w-100 fw-bold rounded-3 py-3" 
                    onClick={() => setDeletingExpenseId(null)}
                  >
                    Cancelar
                  </button>
                  <button 
                    className="btn btn-danger btn-lg w-100 fw-bold rounded-3 py-3" 
                    onClick={executeDelete}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN DE COMENTARIO */}
      {deletingCommentId && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1070 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 rounded-4 shadow-lg">
              <div className="modal-body p-5 text-center">
                <div className="bg-danger-subtle text-danger rounded-circle d-inline-flex p-3 mb-4">
                  <span className="material-symbols-rounded fs-1">delete_forever</span>
                </div>
                <h2 className="fw-bold mb-3">¿Borrar comentario?</h2>
                <p className="text-muted mb-4">
                  Esta acción no se puede deshacer. El comentario será eliminado permanentemente.
                </p>
                <div className="d-flex gap-3">
                  <button 
                    className="btn btn-light btn-lg w-100 fw-bold rounded-3 py-3" 
                    onClick={() => setDeletingCommentId(null)}
                  >
                    Cancelar
                  </button>
                  <button 
                    className="btn btn-danger btn-lg w-100 fw-bold rounded-3 py-3" 
                    onClick={executeDeleteComment}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* MODAL DE SELECCIÓN DE PERIODO PARA ESTADÍSTICAS */}
      {showStatPeriodModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1080 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 rounded-4 shadow-lg">
              <div className="modal-header border-bottom py-3">
                <h5 className="modal-title fw-bold">Seleccionar Periodo de Gastos</h5>
                <button type="button" className="btn-close" onClick={() => setShowStatPeriodModal(false)}></button>
              </div>
              <div className="modal-body p-4">
                <p className="text-muted small mb-4">Elige qué periodo quieres que se muestre en la tarjeta de Gastos Generales y se aplique a la tabla.</p>
                
                <div className="list-group">
                  <button 
                    className={`list-group-item list-group-item-action border border-secondary rounded-3 mb-3 d-flex align-items-center gap-3 py-3 ${statPeriod.type === 'all' ? 'bg-primary text-white border-primary' : 'text-main'}`}
                    style={{ backgroundColor: statPeriod.type === 'all' ? '' : 'var(--bg-main)' }}
                    onClick={() => handleStatPeriodChange('all', '', 'Histórico Total')}
                  >
                    <span className="material-symbols-rounded">history</span>
                    <div className="fw-bold">Todo el Historial</div>
                  </button>

                  <div className="mb-3 p-3 rounded-3 border border-secondary" style={{ backgroundColor: 'var(--bg-main)' }}>
                    <label className="form-label small fw-bold text-muted">Filtrar por Mes</label>
                    <div className="input-group">
                      <input 
                        type="month" 
                        className="form-control bg-dark text-white border-secondary" 
                        id="monthPicker"
                      />
                      <button 
                        className="btn btn-primary fw-bold"
                        onClick={() => {
                          const val = document.getElementById('monthPicker').value;
                          if (!val) return;
                          const [y, m] = val.split('-');
                          const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
                          handleStatPeriodChange('month', val, `${months[parseInt(m)-1]} ${y}`);
                        }}
                      >
                        Aplicar
                      </button>
                    </div>
                  </div>

                  <div className="mb-0 p-3 rounded-3 border border-secondary" style={{ backgroundColor: 'var(--bg-main)' }}>
                    <label className="form-label small fw-bold text-muted">Filtrar por Año</label>
                    <div className="input-group">
                      <input 
                        type="number" 
                        className="form-control bg-dark text-white border-secondary" 
                        placeholder="Ej: 2025"
                        id="yearPicker"
                        min="2000"
                        max="2100"
                      />
                      <button 
                        className="btn btn-primary fw-bold"
                        onClick={() => {
                          const val = document.getElementById('yearPicker').value;
                          if (val && val.length === 4) {
                            handleStatPeriodChange('year', val, `Año ${val}`);
                          } else {
                            alert('Por favor ingresa un año válido de 4 dígitos.');
                          }
                        }}
                      >
                        Aplicar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer border-0 p-3">
                <button type="button" className="btn btn-light fw-bold w-100" onClick={() => setShowStatPeriodModal(false)}>Cerrar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
