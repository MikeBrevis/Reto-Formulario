// ...existing code...
// Copied from prior client/src/App.jsx without functional changes
import React, { useEffect, useMemo, useState, forwardRef } from 'react'
import DatePicker from 'react-datepicker'

const RE = {
  name: /^[A-Za-zÁÉÍÓÚÑáéíóúñ]+(?:\s+[A-Za-zÁÉÍÓÚÑáéíóúñ]+)+$/,
  phone: /^(?:\+?56\s?)?(?:9\s?)?\d{8}$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
}

const cleanRut = (v) => (v || '').replace(/[^0-9kK]/g, '')
const computeRutDV = (body) => {
  let sum = 0, mul = 2
  for (let i = body.length - 1; i >= 0; i--) { sum += parseInt(body[i], 10) * mul; mul = mul === 7 ? 2 : mul + 1 }
  const rest = 11 - (sum % 11)
  if (rest === 11) return '0'
  if (rest === 10) return 'K'
  return String(rest)
}
const isValidRut = (v) => { const cl = cleanRut(v); if (cl.length < 2 || !/^\d+$/.test(cl.slice(0, -1))) return false; const body = cl.slice(0, -1); const dv = cl.slice(-1).toUpperCase(); return computeRutDV(body) === dv }
const formatRut = (v) => { const cl = cleanRut(v); if (!cl) return ''; const body = cl.slice(0, -1); const dv = cl.slice(-1).toUpperCase(); let out = '', cnt = 0; for (let i = body.length - 1; i >= 0; i--) { out = body[i] + out; cnt++; if (cnt === 3 && i !== 0) { out = '.' + out; cnt = 0 } } if (!out) return dv; return `${out}-${dv}` }

const toDateInput = (d) => d?.toISOString?.().slice(0, 10)

export default function App() {
  const [name, setName] = useState('')
  const [rut, setRut] = useState('')
  const [dob, setDob] = useState(null)
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState('')
  const [ok, setOk] = useState(null)
  const [rows, setRows] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [touched, setTouched] = useState({ name: false, rut: false, dob: false, phone: false, email: false })
  const [theme, setTheme] = useState('light')
  const [toasts, setToasts] = useState([])

  const valid = useMemo(() => ({
    name: RE.name.test(name.trim()),
    rut: isValidRut(rut),
    dob: !!dob && dob <= new Date() && dob >= new Date('1900-01-01'),
    phone: RE.phone.test(phone.trim()),
    email: RE.email.test(email.trim()),
  }), [name, rut, dob, phone, email])

  const allOk = Object.values(valid).every(Boolean)

  async function load() {
    const r = await fetch('http://127.0.0.1:5000/submissions')
    const j = await r.json()
    setRows(Array.isArray(j) ? j : [])
  }

  useEffect(() => { load() }, [])

  async function onSubmit(e) {
    e.preventDefault()
    if (!allOk) { setOk(false); setMsg('Corrige los campos en rojo'); return }
    try {
      setIsSubmitting(true)
      const r = await fetch('http://127.0.0.1:5000/submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name.trim(), rut: rut.trim(), dob: toDateInput(dob), phone: phone.trim(), email: email.trim() }) })
      const j = await r.json()
      if (!r.ok) throw new Error(j?.errors ? Object.values(j.errors).join(' | ') : 'Error')
      setOk(true); setMsg(j.message || 'Guardado'); pushToast({ type: 'success', text: j.message || 'Datos guardados' })
      setName(''); setRut(''); setDob(null); setPhone(''); setEmail(''); await load()
    } catch (err) { setOk(false); setMsg(String(err.message || err)); pushToast({ type: 'error', text: String(err.message || err) }) }
    finally { setIsSubmitting(false) }
  }

  function pushToast(t) { const id = Date.now() + Math.random(); setToasts((prev) => [...prev, { id, ...t }]); setTimeout(() => setToasts((prev) => prev.filter(x => x.id !== id)), 3000) }

  const cls = (flag) => 'form-control ' + (flag ? 'is-valid' : 'is-invalid')

  const fieldError = { name: 'Al menos dos palabras, solo letras y espacios.', rut: 'RUT inválido (revise el dígito verificador).', dob: 'Usa el formato YYYY-MM-DD y una fecha válida.', phone: 'Ejemplo: +56 9 12345678 o 912345678', email: 'Ingresa un correo válido: nombre@dominio.com' }

  const DateInput = forwardRef(({ value, onClick, onChange, placeholder, isValid }, ref) => (
    <div className="date-input">
      <input ref={ref} value={value || ''} onClick={onClick} onChange={onChange} placeholder={placeholder} className={cls(isValid)} aria-invalid={!isValid} />
      <i className="bi bi-calendar3"></i>
    </div>
  ))

  const renderCustomHeader = ({ date, changeYear, changeMonth, decreaseMonth, increaseMonth, prevMonthButtonDisabled, nextMonthButtonDisabled }) => {
    const years = Array.from({ length: (new Date().getFullYear() - 1900 + 1) }, (_, i) => 1900 + i)
    const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
    return (
      <div className="dp-header">
        <div className="dp-nav">
          <button type="button" onClick={decreaseMonth} disabled={prevMonthButtonDisabled} className="dp-btn" aria-label="Mes anterior"><i className="bi bi-chevron-left"></i></button>
          <button type="button" onClick={increaseMonth} disabled={nextMonthButtonDisabled} className="dp-btn" aria-label="Mes siguiente"><i className="bi bi-chevron-right"></i></button>
        </div>
        <div className="d-inline-flex gap-2 align-items-center">
          <select className="dp-select" value={date.getFullYear()} onChange={({ target: { value } }) => changeYear(Number(value))}>{years.map(y => <option key={y} value={y}>{y}</option>)}</select>
          <select className="dp-select" value={date.getMonth()} onChange={({ target: { value } }) => changeMonth(Number(value))}>{months.map((m, idx) => <option key={m} value={idx}>{m}</option>)}</select>
        </div>
      </div>
    )
  }

  useEffect(() => { document.documentElement.classList.toggle('theme-dark', theme === 'dark') }, [theme])

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-end mb-2">
        <div className="btn-group" role="group" aria-label="Tema">
          <button type="button" className={`btn btn-sm ${theme==='light' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={()=>setTheme('light')}><i className="bi bi-sun me-1"></i> Claro</button>
          <button type="button" className={`btn btn-sm ${theme==='dark' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={()=>setTheme('dark')}><i className="bi bi-moon me-1"></i> Oscuro</button>
        </div>
      </div>
      <div className="toast-wrap">{toasts.map(t => (<div key={t.id} className={`toast-item ${t.type} toast-enter`} role="status"><i className={`bi me-1 ${t.type==='success' ? 'bi-check-circle' : 'bi-exclamation-triangle'}`}></i><span>{t.text}</span></div>))}</div>
      <h1 className="mb-3 section-title"><i className="bi bi-card-checklist"></i> Formulario</h1>
      {msg && (<div className={`alert ${ok ? 'alert-success' : 'alert-danger'} d-flex align-items-center`} role="alert" aria-live="polite"><i className={`bi ${ok ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'} me-2`}></i><div>{msg}</div></div>)}
      <form onSubmit={onSubmit} className="card form-card p-4 mb-4">
        <h2 className="h5 mb-3">Datos personales</h2>
        <div className="row g-3">
          <div className="col-12 col-md-8">
            <label className="form-label" htmlFor="name">Nombre completo</label>
            <input id="name" className={cls(valid.name || !touched.name)} value={name} onChange={(e)=>setName(e.target.value)} onBlur={()=>setTouched(prev=>({...prev, name:true}))} placeholder="Juan Pérez" aria-invalid={touched.name && !valid.name} aria-describedby="name-help name-error" />
            <div id="name-help" className="form-text">Al menos dos palabras, solo letras y espacios.</div>
            {touched.name && !valid.name && (<div id="name-error" className="text-danger small mt-1"><i className="bi bi-x-circle me-1"></i>{fieldError.name}</div>)}
          </div>
          <div className="col-12 col-md-4">
            <label className="form-label" htmlFor="rut">RUT</label>
            <input id="rut" className={cls(valid.rut || !touched.rut)} value={rut} onChange={(e)=> setRut(formatRut(e.target.value))} onBlur={()=>setTouched(prev=>({...prev, rut:true}))} placeholder="12.345.678-5" aria-invalid={touched.rut && !valid.rut} aria-describedby="rut-help rut-error" />
            <div id="rut-help" className="form-text">Se autocompleta con puntos y guion. Debe coincidir el dígito verificador.</div>
            {touched.rut && !valid.rut && (<div id="rut-error" className="text-danger small mt-1"><i className="bi bi-x-circle me-1"></i>{fieldError.rut}</div>)}
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label" htmlFor="dob">Fecha de nacimiento</label>
            <DatePicker id="dob" selected={dob} onChange={(d)=>setDob(d)} customInput={<DateInput isValid={valid.dob || !touched.dob} placeholder="YYYY-MM-DD" />} dateFormat="yyyy-MM-dd" maxDate={new Date()} minDate={new Date('1900-01-01')} showMonthDropdown showYearDropdown dropdownMode="select" renderCustomHeader={renderCustomHeader} onBlur={()=>setTouched(prev=>({...prev, dob:true}))} />
            <div className="form-text">Usa el selector o escribe con formato YYYY-MM-DD.</div>
            {touched.dob && !valid.dob && (<div className="text-danger small mt-1"><i className="bi bi-x-circle me-1"></i>{fieldError.dob}</div>)}
          </div>
        </div>

        <h2 className="h5 mt-4 mb-3">Contacto</h2>
        <div className="row g-3">
          <div className="col-12 col-md-6">
            <label className="form-label" htmlFor="phone">Teléfono</label>
            <input id="phone" className={cls(valid.phone || !touched.phone)} value={phone} onChange={(e)=>setPhone(e.target.value)} onBlur={()=>setTouched(prev=>({...prev, phone:true}))} placeholder="+56 9 12345678" aria-invalid={touched.phone && !valid.phone} aria-describedby="phone-help phone-error" />
            <div id="phone-help" className="form-text">Incluye prefijo nacional si corresponde.</div>
            {touched.phone && !valid.phone && (<div id="phone-error" className="text-danger small mt-1"><i className="bi bi-x-circle me-1"></i>{fieldError.phone}</div>)}
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label" htmlFor="email">Email</label>
            <input id="email" className={cls(valid.email || !touched.email)} value={email} onChange={(e)=>setEmail(e.target.value)} onBlur={()=>setTouched(prev=>({...prev, email:true}))} placeholder="correo@dominio.com" aria-invalid={touched.email && !valid.email} aria-describedby="email-help email-error" />
            <div id="email-help" className="form-text">Usa tu correo principal.</div>
            {touched.email && !valid.email && (<div id="email-error" className="text-danger small mt-1"><i className="bi bi-x-circle me-1"></i>{fieldError.email}</div>)}
          </div>
        </div>

        <div className="form-actions mt-4 pt-3">
          <button className="btn btn-primary" type="submit" disabled={!allOk || isSubmitting}>
            {isSubmitting && <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>}
            Enviar
          </button>
        </div>
      </form>

      <h2 className="mb-2">Envíos recientes</h2>
      <div className="table-responsive">
        <table className="table table-striped">
          <thead>
            <tr><th>ID</th><th>Nombre</th><th>RUT</th><th>Nacimiento</th><th>Teléfono</th><th>Email</th><th>Creado</th></tr>
          </thead>
          <tbody>
            {rows.length === 0 && (<tr><td colSpan={7} className="text-center empty-state py-4"><i className="bi bi-inbox me-2"></i> No hay registros aún.</td></tr>)}
            {rows.map(r => (<tr key={r.id}><td>{r.id}</td><td>{r.name}</td><td>{r.rut}</td><td>{r.dob}</td><td>{r.phone}</td><td>{r.email}</td><td>{r.created_at}</td></tr>))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
