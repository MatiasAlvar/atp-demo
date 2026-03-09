// ── AUTH USERS ────────────────────────────────────────────────
export const USERS = {
  atp:        { password: 'atp2026',   role: 'atp',        name: 'ATP Admin',         avatar: 'AT', operador: null,                           sitios: null },
  telefonica: { password: 'tef2026',   role: 'operador',   name: 'Matias Alvarado',   avatar: 'MA', operador: 'Telefónica Móviles Chile S.A.', sitios: null },
  entel:      { password: 'entel2026', role: 'operador',   name: 'Carolina Silva',    avatar: 'CS', operador: 'Entel PCS',                    sitios: null },
  claro:      { password: 'claro2026', role: 'operador',   name: 'Jorge Ramírez',     avatar: 'JR', operador: 'Claro Chile S.A.',              sitios: null },
  wom:        { password: 'wom2026',   role: 'operador',   name: 'Ana Torres',        avatar: 'AT2',operador: 'WOM S.A.',                     sitios: null },
  prop1:      { password: 'prop2026',  role: 'propietario',name: 'Carlos Rojas',      avatar: 'CR', operador: null, sitios: ['CL48769','CL-TAR-5003','CL-TAR-5005','CL62100'] },
  prop2:      { password: 'prop2b',    role: 'propietario',name: 'Luis Muñoz',        avatar: 'LM', operador: null, sitios: ['CL31102','CL52341','CL70045'] },
}
USERS['merced'] = USERS['prop1']

export const C = {
  red:'#E53935', redD:'#C62828', redL:'#FFEBEE',
  green:'#2E7D32', greenL:'#E8F5E9',
  orange:'#E65100', orangeL:'#FFF3E0',
  blue:'#1565C0', blueL:'#E3F2FD',
  teal:'#00695C', tealL:'#E0F2F1',
  purple:'#6A1B9A', purpleL:'#F3E5F5',
  amber:'#F57F17', amberL:'#FFF8E1',
  gray1:'#F5F5F5', gray2:'#EEEEEE', gray3:'#E0E0E0', gray4:'#9E9E9E', gray5:'#616161',
  white:'#FFFFFF', border:'#E0E0E0', text:'#212121', textS:'#616161',
}

export const SITIOS = [
  {id:'CL-TAR-5003',siterra:'CH00120AG',nombre:'ALTO HOSPICIO',        lat:-20.2731,lng:-70.1025,comuna:'Alto Hospicio', regionLabel:'Tarapacá',     regionCode:'I',   altTotal:24, tipo:'Monoposte',          propietario:'Municipalidad Alto Hospicio',  contacto:'Carlos Rojas',    tel:'+56 57 234 5678', email:'danaeoteiza.a@gmail.com'},
  {id:'CL-TAR-5005',siterra:'CH00275AG',nombre:'ALTO HOSPICIO NORTE',  lat:-20.255, lng:-70.1033,comuna:'Alto Hospicio', regionLabel:'Tarapacá',     regionCode:'I',   altTotal:30, tipo:'Monoposte Plataforma',propietario:'Inversiones Norte SpA',        contacto:'Ana Soto',        tel:'+56 57 234 5679', email:'danaeoteiza.a@gmail.com'},
  {id:'CL-TAR-5021',siterra:'CH01752CG',nombre:'CARCEL ALTO HOSPICIO', lat:-20.223, lng:-70.0443,comuna:'Alto Hospicio', regionLabel:'Tarapacá',     regionCode:'I',   altTotal:24, tipo:'Ventada',            propietario:'Gendarmería de Chile',         contacto:'Suboficial Pérez',tel:'+56 57 234 5670', email:''},
  {id:'CL-TAR-5010',siterra:'CH01535CG',nombre:'CAMINA - Francia',     lat:-19.3844,lng:-69.575, comuna:'Camina',        regionLabel:'Tarapacá',     regionCode:'I',   altTotal:24, tipo:'Ventada',            propietario:'Comunidad Agrícola Camiña',   contacto:'Pedro Mamani',    tel:'+56 57 234 5671', email:''},
  {id:'CL-TAR-5020',siterra:'CH01704CG',nombre:'RPT MOQUELLA',         lat:-19.3193,lng:-69.4862,comuna:'Camina',        regionLabel:'Tarapacá',     regionCode:'I',   altTotal:24, tipo:'Ventada',            propietario:'Comunidad Moquella',          contacto:'Luis Flores',     tel:'+56 57 234 5672', email:''},
  {id:'CL-TAR-5011',siterra:'CH01536CG',nombre:'HUARA - MINIMINE',     lat:-19.1976,lng:-69.6871,comuna:'Huara',         regionLabel:'Tarapacá',     regionCode:'I',   altTotal:24, tipo:'Ventada',            propietario:'Municipalidad Huara',         contacto:'Rosa Colque',     tel:'+56 57 234 5673', email:''},
  {id:'CL62100',    siterra:'CH00621I',  nombre:'IQUIQUE NORTE',        lat:-20.214, lng:-70.152, comuna:'Iquique',       regionLabel:'Tarapacá',     regionCode:'I',   altTotal:35, tipo:'Monoposte',          propietario:'Costa Norte SpA',             contacto:'Jorge Flores',    tel:'+56 57 234 5678', email:'danaeoteiza.a@gmail.com'},
  {id:'CL91230',    siterra:'CH00912II', nombre:'ANTOFAGASTA NORTE',    lat:-23.617, lng:-70.39,  comuna:'Antofagasta',  regionLabel:'Antofagasta',  regionCode:'II',  altTotal:45, tipo:'Monopolo',           propietario:'Minera Atacama SA',           contacto:'Pedro Soto',      tel:'+56 55 234 5678', email:''},
  {id:'CL48769',    siterra:'CH00480RM', nombre:'MERCED-SAN ANTONIO',   lat:-33.437, lng:-70.645, comuna:'Santiago',      regionLabel:'Metropolitana',regionCode:'RM',  altTotal:22, tipo:'Edificio',           propietario:'Edificio Merced SA',          contacto:'Carlos Rojas',    tel:'+56 2 2345 6789', email:'danaeoteiza.a@gmail.com'},
  {id:'CL52341',    siterra:'CH00521RM', nombre:'PROVIDENCIA NORTE',    lat:-33.429, lng:-70.625, comuna:'Providencia',  regionLabel:'Metropolitana',regionCode:'RM',  altTotal:30, tipo:'Torre Arriostrada',  propietario:'Inmobiliaria Los Andes',      contacto:'Ana Pérez',       tel:'+56 2 2987 6543', email:'danaeoteiza.a@gmail.com'},
  {id:'CL31102',    siterra:'CH00310V',  nombre:'VALPARAÍSO CENTRO',    lat:-33.045, lng:-71.619, comuna:'Valparaíso',   regionLabel:'Valparaíso',   regionCode:'V',   altTotal:36, tipo:'Monopolo',           propietario:'Puerto Valpo SpA',            contacto:'Luis Muñoz',      tel:'+56 32 234 5678', email:'danaeoteiza.a@gmail.com'},
  {id:'CL70045',    siterra:'CH00701VIII',nombre:'CONCEPCIÓN SUR',      lat:-36.826, lng:-73.05,  comuna:'Concepción',   regionLabel:'Biobío',       regionCode:'VIII',altTotal:40, tipo:'Torre Arriostrada',  propietario:'Inmuebles del Sur',           contacto:'María Díaz',      tel:'+56 41 234 5678', email:'danaeoteiza.a@gmail.com'},
  {id:'CL83450',    siterra:'CH00834IX', nombre:'TEMUCO CENTRO',        lat:-38.735, lng:-72.59,  comuna:'Temuco',       regionLabel:'Araucanía',    regionCode:'IX',  altTotal:30, tipo:'Monopolo',           propietario:'Araucania SpA',               contacto:'Rosa Lagos',      tel:'+56 45 234 5678', email:''},
]

export const COLOCALIZACIONES = {
  'CL-TAR-5003': ['Telefónica Móviles Chile S.A.','Entel PCS'],
  'CL-TAR-5005': ['Telefónica Móviles Chile S.A.','WOM S.A.'],
  'CL-TAR-5021': ['Telefónica Móviles Chile S.A.','Claro Chile S.A.'],
  'CL-TAR-5010': ['Telefónica Móviles Chile S.A.','Entel PCS','Claro Chile S.A.'],
  'CL-TAR-5020': ['Telefónica Móviles Chile S.A.','WOM S.A.'],
  'CL-TAR-5011': ['Telefónica Móviles Chile S.A.','Entel PCS','WOM S.A.'],
  'CL62100':     ['Telefónica Móviles Chile S.A.','Entel PCS','Claro Chile S.A.'],
  'CL91230':     ['Telefónica Móviles Chile S.A.','Claro Chile S.A.','Entel PCS'],
  'CL48769':     ['Telefónica Móviles Chile S.A.','Entel PCS','Claro Chile S.A.','WOM S.A.'],
  'CL52341':     ['Telefónica Móviles Chile S.A.','WOM S.A.','Claro Chile S.A.'],
  'CL31102':     ['Telefónica Móviles Chile S.A.','Claro Chile S.A.','WOM S.A.','Entel PCS'],
  'CL70045':     ['Telefónica Móviles Chile S.A.','Entel PCS','WOM S.A.'],
  'CL83450':     ['Telefónica Móviles Chile S.A.','Claro Chile S.A.','WOM S.A.'],
}

export const EMPRESAS_INIT = [
  {rut:'76.124.890-1',nombre:'Lari Obras y Servicios SpA'},
  {rut:'77.341.200-5',nombre:'TelcoServ SpA'},
  {rut:'76.890.123-4',nombre:'Network Solutions Ltda.'},
  {rut:'77.012.345-6',nombre:'Infratel SpA'},
  {rut:'76.543.210-9',nombre:'TecnoAndes SpA'},
  {rut:'76.222.333-1',nombre:'Torres & Redes Chile SpA'},
  {rut:'77.888.999-0',nombre:'Telecomunicaciones del Sur Ltda.'},
]

export const OPERADORES = ['Telefónica Móviles Chile S.A.','Entel PCS','Claro Chile S.A.','WOM S.A.']
export const OP_SHORT = {'Telefónica Móviles Chile S.A.':'Telefónica','Entel PCS':'Entel','Claro Chile S.A.':'Claro','WOM S.A.':'WOM'}
export const OP_COLOR = {'Telefónica Móviles Chile S.A.':'#0099CC','Entel PCS':'#00A651','Claro Chile S.A.':'#E8000D','WOM S.A.':'#8B1A8B'}

export const TIPOS_TRABAJO = ['LEVANTAMIENTO OBSERVACIONES','OPERACION Y MANTENIMIENTO','INSTALACIÓN','EMERGENCIA FALLA EQUIPOS','AUDITORÍA','DESMONTAJE']
export const VENTANA_MAX = {'LEVANTAMIENTO OBSERVACIONES':3,'OPERACION Y MANTENIMIENTO':5,'INSTALACIÓN':7,'EMERGENCIA FALLA EQUIPOS':2,'AUDITORÍA':2,'DESMONTAJE':10}
export const TRABAJO_INFORMAL = {
  'LEVANTAMIENTO OBSERVACIONES':'Los técnicos van a revisar y anotar observaciones del equipo en el sitio. Solo inspección, sin modificaciones.',
  'OPERACION Y MANTENIMIENTO':  'Se realizarán trabajos de mantención rutinaria de los equipos de telecomunicaciones.',
  'INSTALACIÓN':                'Se instalarán nuevos equipos o antenas en el sitio. Requiere acceso completo a la estructura.',
  'EMERGENCIA FALLA EQUIPOS':   'EMERGENCIA por falla de equipos. Los técnicos deben acceder de urgencia para restablecer el servicio.',
  'AUDITORÍA':                  'Visita de auditoría técnica para verificar el estado del sitio. Solo observación.',
  'DESMONTAJE':                 'Se retirarán equipos del sitio. Al finalizar, el espacio quedará libre.',
}
export const ZONAS = ['Sala de equipos','Torre / Estructura','Área exterior','Cuarto técnico','Sala de baterías']

export const ESTADO_COLOR = {
  'Borrador':               {bg:'#607D8B',t:'#fff'},
  'Enviado':                {bg:'#1565C0',t:'#fff'},
  'En Validación':          {bg:'#7B1FA2',t:'#fff'},
  'Validado':               {bg:'#00838F',t:'#fff'},
  'En Gestión Propietario': {bg:'#E65100',t:'#fff'},
  'Autorizado':             {bg:'#2E7D32',t:'#fff'},
  'Rechazado':              {bg:'#E53935',t:'#fff'},
}
export const ESTADOS = Object.keys(ESTADO_COLOR)

// ── RUT ───────────────────────────────────────────────────────
export function formatRUT(raw = '') {
  let v = raw.replace(/[^0-9kK]/gi, '').toUpperCase()
  if (v.length < 2) return v
  const dv = v.slice(-1)
  let body = v.slice(0, -1)
  while (body.length < 8) body = '0' + body
  body = body.slice(-8)
  return `${body.slice(0,2)}.${body.slice(2,5)}.${body.slice(5,8)}-${dv}`
}
export function validRUT(rut = '') {
  return /^\d{2}\.\d{3}\.\d{3}-[\dkK]$/i.test(rut)
}

// ── DATE / TIME ───────────────────────────────────────────────
export const today = () => new Date().toISOString().split('T')[0]
export const daysBetween = (a,b) => Math.ceil((new Date(b)-new Date(a))/86400000)+1
export const nextId = (list) => {
  const nums = list.map(x => parseInt(x.id?.split('-').pop())).filter(Boolean)
  return `ATP-CL-26-0${String(Math.max(...nums,1699)+1)}`
}
export function formatDuration(ms) {
  if (!ms || ms <= 0) return '—'
  const totalMin = Math.round(ms / 60000)
  if (totalMin < 60)  return `${totalMin} min`
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h < 24) return m > 0 ? `${h}h ${m}m` : `${h}h`
  const d = Math.floor(h / 24)
  const rh = h % 24
  return rh > 0 ? `${d}d ${rh}h` : `${d}d`
}

// ── VALIDACIÓN ────────────────────────────────────────────────
export function validarSolicitud(sol, solicitudes = []) {
  const errores = []
  if (!sol.sitio)   errores.push('Debe seleccionar un sitio')
  if (!sol.trabajo) errores.push('Tipo de trabajo requerido')
  if (!sol.desde || !sol.hasta) errores.push('Fechas requeridas')
  if (!sol.correoMandante)      errores.push('Correo del mandante requerido')
  if (!sol.correoContratista)   errores.push('Correo de la contratista requerido')

  const trab = (sol.trabajadores||[]).filter(t => t.nombre && t.rut)
  if (trab.length === 0) errores.push('Debe indicar al menos un trabajador con nombre y RUT')
  const badRUT = trab.find(t => !validRUT(t.rut))
  if (badRUT) errores.push(`RUT inválido: ${badRUT.rut} — usa el formato XX.XXX.XXX-X`)

  const colo = COLOCALIZACIONES[sol.sitio] || []
  if (sol.sitio && !colo.includes(sol.operador))
    errores.push(`${OP_SHORT[sol.operador]||sol.operador} no está colocalizado en ${sol.sitio}`)

  if (sol.trabajo && sol.desde && sol.hasta) {
    const dias = daysBetween(sol.desde, sol.hasta)
    const max  = VENTANA_MAX[sol.trabajo] || 7
    if (dias > max) errores.push(`Ventana de ${dias} días excede máximo (${max}d para ${sol.trabajo})`)
  }

  if (sol.desde && sol.hasta) {
    const conflictos = solicitudes.filter(s =>
      s.id !== sol.id &&
      s.sitio === sol.sitio &&
      ['Validado','En Gestión Propietario','Autorizado'].includes(s.estado) &&
      s.desde && s.hasta &&
      !(sol.hasta < s.desde || sol.desde > s.hasta)
    )
    if (conflictos.length > 0) {
      const c = conflictos[0]
      errores.push(`Conflicto de fechas: ${OP_SHORT[c.operador]||c.operador} tiene el sitio del ${c.desde} al ${c.hasta} (${c.id})`)
    }
  }

  return errores.length === 0 ? {ok:true} : {ok:false, motivos:errores}
}

export const todayISO = () => new Date().toISOString().split('T')[0]

export const EMPRESAS_DEFAULT = [
  {rut:'76.124.890-1', nombre:'Lari Obras y Servicios SpA'},
  {rut:'77.341.200-5', nombre:'TelcoServ SpA'},
  {rut:'76.890.123-4', nombre:'Network Solutions Ltda.'},
  {rut:'77.012.345-6', nombre:'Infratel SpA'},
  {rut:'76.543.210-9', nombre:'TecnoAndes SpA'},
  {rut:'76.222.333-1', nombre:'Torres & Redes Chile SpA'},
  {rut:'77.888.999-0', nombre:'Telecomunicaciones del Sur Ltda.'},
]
