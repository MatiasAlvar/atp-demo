import emailjs from '@emailjs/browser'

const SERVICE_ID  = import.meta.env.VITE_EMAILJS_SERVICE_ID
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID
const PUBLIC_KEY  = import.meta.env.VITE_EMAILJS_PUBLIC_KEY
const APP_URL     = import.meta.env.VITE_APP_URL || window.location.origin

emailjs.init(PUBLIC_KEY)

export async function enviarCorreoPropietario({ solicitud, sitio }) {
  const linkBase = `${APP_URL}/propietario?id=${solicitud.id}`
  const params = {
    to_email:        sitio.emailPropietario || import.meta.env.VITE_PROPIETARIO_EMAIL,
    propietario_nombre: sitio.contacto,
    sitio_nombre:    sitio.nombre,
    sitio_id:        sitio.id,
    operador:        solicitud.operador,
    empresa:         solicitud.empresaNombre || solicitud.empresa,
    trabajo_desc:    TRABAJO_INFORMAL[solicitud.trabajo] || solicitud.trabajo,
    desde:           solicitud.desde,
    hasta:           solicitud.hasta,
    num_tecnicos:    solicitud.trabajadores?.length || 1,
    tecnico_nombre:  solicitud.trabajadores?.[0]?.nombre || '—',
    sol_id:          solicitud.id,
    link_autorizar:  `${linkBase}&action=autorizar`,
    link_rechazar:   `${linkBase}&action=rechazar`,
  }

  try {
    await emailjs.send(SERVICE_ID, TEMPLATE_ID, params)
    console.log('✅ Correo enviado a propietario')
    return true
  } catch (err) {
    console.error('❌ Error enviando correo:', err)
    return false
  }
}

const TRABAJO_INFORMAL = {
  'LEVANTAMIENTO OBSERVACIONES': 'Los técnicos van a revisar y anotar observaciones del equipo en el sitio. Solo inspección, sin modificaciones.',
  'OPERACION Y MANTENIMIENTO':   'Se realizarán trabajos de mantención rutinaria de los equipos de telecomunicaciones. Incluye limpieza, ajustes y revisión general.',
  'INSTALACIÓN':                 'Se instalarán nuevos equipos o antenas en el sitio. Requiere acceso completo a la estructura.',
  'EMERGENCIA FALLA EQUIPOS':    'Es una EMERGENCIA por falla de equipos. Los técnicos deben acceder de urgencia para restablecer el servicio de telecomunicaciones.',
  'AUDITORÍA':                   'Visita de auditoría técnica para verificar el estado del sitio. Solo observación, sin intervención.',
  'DESMONTAJE':                  'Se retirarán equipos del sitio. Al finalizar, el espacio quedará libre.',
}
