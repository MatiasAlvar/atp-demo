import emailjs from '@emailjs/browser'
import { SITIOS, TRABAJO_INFORMAL } from '../shared/data.js'

const SERVICE_ID  = import.meta.env.VITE_EMAILJS_SERVICE_ID
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID
const PUBLIC_KEY  = import.meta.env.VITE_EMAILJS_PUBLIC_KEY
const APP_URL     = import.meta.env.VITE_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '')

emailjs.init(PUBLIC_KEY)

// Obtiene el email del propietario: primero revisa overrides de localStorage, luego data.js
function getEmailSitio(sitioId) {
  try {
    const overrides = JSON.parse(localStorage.getItem('atp_sitios_data') || '{}')
    if (overrides[sitioId]?.email) return overrides[sitioId].email
  } catch {}
  const sitio = SITIOS.find(s => s.id === sitioId)
  return sitio?.email || import.meta.env.VITE_PROPIETARIO_EMAIL || ''
}

function getContactoSitio(sitioId) {
  try {
    const overrides = JSON.parse(localStorage.getItem('atp_sitios_data') || '{}')
    if (overrides[sitioId]?.contacto) return overrides[sitioId].contacto
  } catch {}
  const sitio = SITIOS.find(s => s.id === sitioId)
  return sitio?.contacto || 'Propietario'
}

export async function enviarCorreoPropietario({ solicitud, sitio }) {
  const emailDestino = getEmailSitio(sitio.id)
  const contacto     = getContactoSitio(sitio.id)
  const linkBase     = `${APP_URL}?action=propietario&id=${solicitud.id}`

  if (!emailDestino) {
    console.warn('⚠️ Sin email para sitio', sitio.id)
    return false
  }

  const tecnicos = (solicitud.trabajadores || [])
    .map(t => `${t.nombre} (${t.rut})`)
    .join(', ')

  const params = {
    to_email:           emailDestino,
    propietario_nombre: contacto,
    sitio_nombre:       sitio.nombre,
    sitio_id:           sitio.id,
    operador:           solicitud.operador,
    empresa:            solicitud.empresaNombre || solicitud.empresa || '—',
    trabajo_desc:       TRABAJO_INFORMAL[solicitud.trabajo] || solicitud.trabajo,
    desde:              solicitud.desde,
    hasta:              solicitud.hasta,
    num_tecnicos:       solicitud.trabajadores?.length || 1,
    tecnico_nombre:     solicitud.trabajadores?.[0]?.nombre || '—',
    tecnicos_lista:     tecnicos,
    sol_id:             solicitud.id,
    link_autorizar:     `${linkBase}&action=autorizar`,
    link_rechazar:      `${linkBase}&action=rechazar`,
  }

  try {
    await emailjs.send(SERVICE_ID, TEMPLATE_ID, params)
    console.log('✅ Correo enviado a propietario:', emailDestino)
    return true
  } catch (err) {
    console.error('❌ Error correo propietario:', err)
    return false
  }
}

export async function enviarCorreoAutorizacion({ solicitud }) {
  const sitio    = SITIOS.find(s => s.id === solicitud.sitio)
  const tecnicos = (solicitud.trabajadores || []).map(t => `${t.nombre} (${t.rut})`).join(', ')

  const params = {
    sitio_nombre:   sitio?.nombre || solicitud.sitio,
    sitio_id:       solicitud.sitio,
    operador:       solicitud.operador,
    empresa:        solicitud.empresaNombre || solicitud.empresa || '—',
    trabajo_desc:   TRABAJO_INFORMAL[solicitud.trabajo] || solicitud.trabajo,
    desde:          solicitud.desde,
    hasta:          solicitud.hasta,
    num_tecnicos:   solicitud.trabajadores?.length || 1,
    tecnico_nombre: solicitud.trabajadores?.[0]?.nombre || '—',
    tecnicos_lista: tecnicos,
    sol_id:         solicitud.id,
    link_autorizar: APP_URL,
    link_rechazar:  APP_URL,
  }

  let enviados = 0
  const destinos = [solicitud.correoMandante, solicitud.correoContratista]
    .filter((e, i, arr) => e && arr.indexOf(e) === i) // únicos no vacíos

  for (const email of destinos) {
    try {
      await emailjs.send(SERVICE_ID, TEMPLATE_ID, {
        ...params,
        to_email:           email,
        propietario_nombre: '✅ ACCESO AUTORIZADO — ATP Chile',
      })
      console.log('✅ Correo autorización enviado a:', email)
      enviados++
    } catch (err) {
      console.error('❌ Error correo autorización a', email, err)
    }
  }
  return enviados > 0
}
