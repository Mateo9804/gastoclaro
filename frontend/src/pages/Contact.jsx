import React from 'react';
import { Mail, Phone, Clock } from 'lucide-react';

const Contact = () => {
  return (
    <div className="container-fluid py-4">
      <div className="row justify-content-center">
        <div className="col-12 col-xl-10">
          <div className="card border-0 shadow-lg rounded-4 overflow-hidden" style={{ backgroundColor: 'var(--bg-card)' }}>
            <div className="p-4 p-md-5 text-center text-white" style={{ backgroundColor: 'var(--brand-blue)' }}>
              <h2 className="fw-bold mb-2 fs-3 fs-md-2">Centro de Soporte GastoClaro</h2>
              <p className="opacity-75 mb-0 small">Estamos aquí para ayudarte con cualquier duda o problema técnico.</p>
            </div>
            <div className="card-body p-3 p-md-5">
              <div className="row g-4 text-center">
                <div className="col-12 col-md-6">
                  <div className="p-4 rounded-4 border border-secondary h-100 shadow-sm transition-all" style={{ backgroundColor: 'var(--bg-main)' }}>
                    <div className="bg-primary-subtle text-primary rounded-circle d-inline-flex p-3 mb-3">
                      <Mail size={32} />
                    </div>
                    <h5 className="fw-bold mb-2 text-main">Correo Electrónico</h5>
                    <p className="text-muted small mb-3">Nuestro equipo revisa las consultas diariamente.</p>
                    <a href="mailto:gastoclaro@gmail.com" className="h5 fw-bold text-decoration-none text-primary d-block text-truncate">
                      gastoclaro@gmail.com
                    </a>
                  </div>
                </div>
                <div className="col-12 col-md-6">
                  <div className="p-4 rounded-4 border border-secondary h-100 shadow-sm transition-all" style={{ backgroundColor: 'var(--bg-main)' }}>
                    <div className="bg-success-subtle text-success rounded-circle d-inline-flex p-3 mb-3">
                      <Phone size={32} />
                    </div>
                    <h5 className="fw-bold mb-2 text-main">Atención Telefónica</h5>
                    <p className="text-muted small mb-3">Llámanos de Lunes a Viernes (9:00 - 18:00).</p>
                    <a href="tel:+34910123456" className="h5 fw-bold text-decoration-none text-success d-block">
                      +34 910 123 456
                    </a>
                  </div>
                </div>
              </div>

              <div className="mt-4 mt-md-5 p-4 rounded-4 border border-secondary border-dashed text-center" style={{ borderStyle: 'dashed' }}>
                <h6 className="fw-bold mb-3 d-flex align-items-center justify-content-center gap-2 text-main">
                  <Clock size={20} className="text-primary" /> <span className="small fw-bold">Tiempo de respuesta estimado</span>
                </h6>
                <p className="text-muted small mb-0">
                  Nuestro tiempo medio de respuesta es de <strong>menos de 4 horas</strong> para incidencias técnicas y 24 horas para consultas administrativas.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;

