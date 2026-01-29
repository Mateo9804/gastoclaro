import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import api from '../api/axios';
import { Upload, File, AlertCircle, CheckCircle } from 'lucide-react';
import Tesseract from 'tesseract.js';

const FileUploader = ({ onSuccess, userData }) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);

  const isPro = userData?.plan === 'pro' || userData?.plan === 'enterprise';

  const extractDataFromText = (text) => {
    const data = {
      vendor_name: isPro ? 'Proveedor Detectado' : 'Proveedor por revisar (Plan Básico)',
      total_amount: 0.00,
      date: new Date().toISOString().split('T')[0],
      raw_text: text
    };

    // Helper para limpiar y convertir montos de forma robusta
    const parseAmount = (amountStr) => {
      if (!amountStr) return 0;
      // Eliminar símbolos de moneda y caracteres no numéricos excepto punto y coma
      let clean = amountStr.replace(/[^\d.,-]/g, '');
      
      // Caso 1: Formato europeo 1.234,56
      if (clean.includes('.') && clean.includes(',')) {
        if (clean.lastIndexOf('.') < clean.lastIndexOf(',')) {
          return parseFloat(clean.replace(/\./g, '').replace(',', '.'));
        } else {
          // Caso 2: Formato US 1,234.56
          return parseFloat(clean.replace(/,/g, ''));
        }
      }
      
      // Caso 3: Solo tiene coma (ej: 1234,56 o 1,234)
      if (clean.includes(',')) {
        const parts = clean.split(',');
        // Si después de la coma hay exactamente 2 dígitos, es decimal
        if (parts[parts.length - 1].length === 2) {
          return parseFloat(clean.replace(',', '.'));
        } else {
          // Si no, asumimos que es separador de miles
          return parseFloat(clean.replace(/,/g, ''));
        }
      }

      // Caso 4: Solo tiene punto (ej: 1234.56 o 1.234)
      if (clean.includes('.')) {
        const parts = clean.split('.');
        // Si después del punto hay exactamente 3 dígitos, es probable que sea miles
        if (parts[parts.length - 1].length === 3) {
          return parseFloat(clean.replace(/\./g, ''));
        }
        // Si no, es decimal
        return parseFloat(clean);
      }
      
      return parseFloat(clean);
    };

    // 1. Intentar detectar MONTO TOTAL buscando palabras clave prioritarias
    const lines = text.split('\n');
    let detectedAmount = 0;
    let foundByKeyword = false;

    // Buscamos de abajo hacia arriba porque el TOTAL suele estar al final
    for (let i = lines.length - 1; i >= 0; i--) {
      const rawLine = lines[i];
      const upperLine = rawLine.toUpperCase();
      
      // PRIORIDAD 1: Buscar "TOTAL" o "ls." (frecuente en Tesseract)
      if (upperLine.includes('TOTAL') || upperLine.includes('LS.')) {
        // Extraemos todos los números de esta línea específica
        // Limpiamos la línea de símbolos de moneda para facilitar el match numérico
        const lineWithoutCurrency = rawLine.replace(/[€$]/g, ' ');
        const numbersOnLine = lineWithoutCurrency.match(/([\d.,]+)/g);
        
        if (numbersOnLine) {
          // Tomamos el último número de la línea (que suele ser el total si hay texto antes)
          for (let j = numbersOnLine.length - 1; j >= 0; j--) {
            const val = parseAmount(numbersOnLine[j]);
            if (val > 0 && val < 100000) {
              detectedAmount = val;
              foundByKeyword = true;
              break;
            }
          }
        }
      }
      if (foundByKeyword) break;
    }

    // PRIORIDAD 2: Otras palabras clave si no se encontró con las prioritarias
    if (!foundByKeyword) {
      const secondaryKeywords = ['IMPORTE', 'AMOUNT', 'A PAGAR', 'NETO', 'SUMA'];
      for (let i = lines.length - 1; i >= 0; i--) {
        const upperLine = lines[i].toUpperCase();
        for (const kw of secondaryKeywords) {
          if (upperLine.includes(kw)) {
            const numbersOnLine = lines[i].match(/([\d.,]+)/g);
            if (numbersOnLine) {
              for (let j = numbersOnLine.length - 1; j >= 0; j--) {
                const val = parseAmount(numbersOnLine[j]);
                if (val > 0 && val < 100000) {
                  detectedAmount = val;
                  foundByKeyword = true;
                  break;
                }
              }
            }
          }
          if (foundByKeyword) break;
        }
        if (foundByKeyword) break;
      }
    }

    // 2. Fallback: Si no encontramos por palabra clave, buscamos el número más probable de ser un total
    if (!foundByKeyword) {
      const allNumbers = text.match(/\d+(?:[.,]\d{1,2})?\b/g);
      if (allNumbers) {
        const parsedNumbers = allNumbers
          .map(n => ({ raw: n, val: parseAmount(n) }))
          .filter(item => {
            const val = item.val;
            // Filtro: No es un año
            if (val >= 2000 && val <= 2030 && !item.raw.includes(',') && !item.raw.includes('.')) return false;
            // Filtro: No es un código postal (5 dígitos exactos sin puntuación)
            if (item.raw.length === 5 && !item.raw.includes(',') && !item.raw.includes('.')) return false;
            return val > 0 && val < 50000;
          })
          .map(item => item.val);

        if (parsedNumbers.length > 0) {
          detectedAmount = Math.max(...parsedNumbers);
        }
      }
    }

    data.total_amount = detectedAmount;

    // 1.1 Intentar detectar moneda
    const lowerText = text.toLowerCase();
    // Solo ponemos USD si el símbolo $ está presente. En cualquier otro caso, EUR.
    if (text.includes('$')) {
      data.currency = 'USD';
    } else {
      data.currency = 'EUR';
    }

    // 2. Intentar detectar FECHA y PROVEEDOR (Solo para Pro)
    if (isPro) {
      const months = {
        'enero': '01', 'febrero': '02', 'marzo': '03', 'abril': '04', 'mayo': '05', 'junio': '06',
        'julio': '07', 'agosto': '08', 'septiembre': '09', 'octubre': '10', 'noviembre': '11', 'diciembre': '12'
      };
      const textDateMatch = text.match(/(\d{1,2})\s+de\s+([a-z]+)\s+de\s+(\d{4})/i);
      const dateMatch = text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);

      if (textDateMatch) {
        const [_, d, m, y] = textDateMatch;
        const monthNum = months[m.toLowerCase()];
        if (monthNum) data.date = `${y}-${monthNum}-${d.padStart(2, '0')}`;
      } else if (dateMatch) {
        let [_, d, m, y] = dateMatch;
        if (y.length === 2) y = "20" + y;
        data.date = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      }

      const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 3 && !/factura|recibo|ticket|nota|cliente|pago|tel|dirección|email/i.test(l));
      if (lines.length > 0) {
        data.vendor_name = lines[0].substring(0, 50);
      }
    }

    return data;
  };

  const onDrop = useCallback(async (acceptedFiles) => {
    setUploading(true);
    setError(null);
    setSuccess(false);
    setOcrProgress(0);

    const ocrResults = [];

    // Procesar cada archivo antes de subir
    for (let i = 0; i < acceptedFiles.length; i++) {
      const file = acceptedFiles[i];
      
      // Solo hacemos OCR si es imagen Y si es un plan Pro/Enterprise
      if (file.type.startsWith('image/') && isPro) {
        try {
          const result = await Tesseract.recognize(file, 'spa', {
            logger: m => {
              if (m.status === 'recognizing text') {
                setOcrProgress(Math.round(m.progress * 100));
              }
            }
          });
          ocrResults.push(extractDataFromText(result.data.text));
        } catch (ocrErr) {
          ocrResults.push(null); // Fallback si falla el OCR
        }
      } else {
        ocrResults.push(null); // No OCR para PDFs o planes básicos
      }
    }

    const formData = new FormData();
    acceptedFiles.forEach((file, index) => {
      formData.append('receipts[]', file);
      if (ocrResults[index]) {
        formData.append(`ocr_results[${index}][vendor_name]`, ocrResults[index].vendor_name);
        formData.append(`ocr_results[${index}][total_amount]`, ocrResults[index].total_amount);
        formData.append(`ocr_results[${index}][currency]`, ocrResults[index].currency);
        formData.append(`ocr_results[${index}][date]`, ocrResults[index].date);
        formData.append(`ocr_results[${index}][raw_text]`, ocrResults[index].raw_text);
      }
    });

    try {
      await api.post('/receipts/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSuccess(true);
      if (onSuccess) {
        setTimeout(() => onSuccess(), 1500);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Error al subir los archivos.');
    } finally {
      setUploading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png'],
      'application/pdf': ['.pdf'],
    },
  });

  return (
    <div className="uploader-container">
      <div
        {...getRootProps()}
        className={`p-5 text-center border-2 border-dashed rounded-3 cursor-pointer transition-all
          ${isDragActive ? 'border-primary bg-primary-subtle' : 'border-secondary-subtle'}`}
        style={{ 
          backgroundColor: isDragActive ? 'rgba(68, 195, 108, 0.1)' : 'var(--bg-main)', 
          cursor: 'pointer',
          borderColor: isDragActive ? 'var(--brand-green)' : 'var(--border-color)' 
        }}
      >
        <input {...getInputProps()} />
        <div className="py-4">
          <Upload size={48} className="text-primary mb-3" />
          <h5 className="fw-bold text-main">
            {isDragActive ? 'Suelta los archivos ahora' : 'Arrastra o haz clic aquí para subir'}
          </h5>
          <p className="text-muted small">Formatos soportados: JPG, PNG, PDF (Máx. 10MB)</p>
        </div>
      </div>

      {uploading && (
        <div className="mt-4">
          <div className="alert alert-primary d-flex align-items-center mb-2">
            <div className="spinner-border spinner-border-sm me-3" role="status"></div>
            <span>{isPro ? `Escaneando factura con IA (OCR)... ${ocrProgress}%` : 'Subiendo factura al sistema...'}</span>
          </div>
          {isPro && (
            <div className="progress" style={{ height: '5px' }}>
              <div 
                className="progress-bar progress-bar-striped progress-bar-animated bg-success" 
                role="progressbar" 
                style={{ width: `${ocrProgress}%` }}
              ></div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="alert alert-danger mt-4 d-flex align-items-center">
          <AlertCircle size={20} className="me-2" />
          {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success mt-4 d-flex align-items-center">
          <CheckCircle size={20} className="me-2" />
          ¡Subida exitosa! Los datos se están extrayendo.
        </div>
      )}
    </div>
  );
};

export default FileUploader;
