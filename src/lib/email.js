import emailjs from '@emailjs/browser'
import { SITIOS, TRABAJO_INFORMAL } from '../shared/data.js'
import { getSitiosConfig } from './supabase.js'

const SERVICE_ID  = import.meta.env.VITE_EMAILJS_SERVICE_ID
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID
const PUBLIC_KEY  = import.meta.env.VITE_EMAILJS_PUBLIC_KEY
const APP_URL     = import.meta.env.VITE_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '')

emailjs.init(PUBLIC_KEY)

// Obtiene config del sitio: primero Supabase, luego data.js
async function getConfigSitio(sitioId) {
  try {
    const configs = await getSitiosConfig()
    if (configs[sitioId]?.email || configs[sitioId]?.contacto) return configs[sitioId]
  } catch(e) { console.warn('getConfigSitio error:', e) }
  return SITIOS.find(s => s.id === sitioId) || {}
}

export async function enviarCorreoPropietario({ solicitud, sitio }) {
  const cfg           = await getConfigSitio(sitio.id)
  const emailDestino  = cfg.email || sitio.email || import.meta.env.VITE_PROPIETARIO_EMAIL || ''
  const contacto      = cfg.contacto || sitio.contacto || 'Propietario'

  if (!emailDestino) {
    console.warn('⚠️ Sin email configurado para sitio', sitio.id)
    return false
  }

  const tecnicos = (solicitud.trabajadores || []).map(t => `${t.nombre} (${t.rut})`).join(', ')
  const linkBase = `${APP_URL}?id=${solicitud.id}`

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

  const destinos = [solicitud.correoMandante, solicitud.correoContratista]
    .filter((e, i, arr) => e && e.trim() && arr.indexOf(e) === i)

  if (destinos.length === 0) {
    console.warn('⚠️ Sin correos destino para autorización, sol:', solicitud.id)
    return false
  }

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
