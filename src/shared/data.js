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

// ── SITIOS EXPANDIDOS (demo 1.500 → representación visual con ~100 sitios) ─────
export const SITIOS_EXTRA = [
  // REGIÓN XV - Arica y Parinacota
  {id:'CL-XV-001',siterra:'CH00001XV',nombre:'ARICA CENTRO',lat:-18.475,lng:-70.296,comuna:'Arica',regionLabel:'Arica y Parinacota',regionCode:'XV',altTotal:24,tipo:'Monoposte',propietario:'Municipalidad Arica',contacto:'Rodrigo Paz',tel:'+56 58 210 0000',email:''},
  {id:'CL-XV-002',siterra:'CH00002XV',nombre:'ARICA NORTE',lat:-18.431,lng:-70.312,comuna:'Arica',regionLabel:'Arica y Parinacota',regionCode:'XV',altTotal:30,tipo:'Ventada',propietario:'CODELCO Norte',contacto:'Ana Vega',tel:'',email:''},
  {id:'CL-XV-003',siterra:'CH00003XV',nombre:'AZAPA',lat:-18.523,lng:-70.201,comuna:'Arica',regionLabel:'Arica y Parinacota',regionCode:'XV',altTotal:24,tipo:'Monoposte',propietario:'Agrícola Azapa SpA',contacto:'Carlos Mamani',tel:'',email:''},
  // REGIÓN I - Tarapacá adicionales
  {id:'CL-I-010',siterra:'CH00010I',nombre:'IQUIQUE CENTRO',lat:-20.213,lng:-70.151,comuna:'Iquique',regionLabel:'Tarapacá',regionCode:'I',altTotal:35,tipo:'Edificio',propietario:'Comercial Iquique SA',contacto:'Pedro Lagos',tel:'+56 57 210 0001',email:''},
  {id:'CL-I-011',siterra:'CH00011I',nombre:'IQUIQUE SUR',lat:-20.254,lng:-70.134,comuna:'Iquique',regionLabel:'Tarapacá',regionCode:'I',altTotal:30,tipo:'Monopolo',propietario:'Zona Franca ZOFRI',contacto:'María Cid',tel:'',email:''},
  {id:'CL-I-012',siterra:'CH00012I',nombre:'COLCHANE FRONTERA',lat:-19.274,lng:-68.637,comuna:'Colchane',regionLabel:'Tarapacá',regionCode:'I',altTotal:40,tipo:'Ventada',propietario:'Aduana Chile',contacto:'Luis Quispe',tel:'',email:''},
  {id:'CL-I-013',siterra:'CH00013I',nombre:'PISAGUA',lat:-19.597,lng:-70.094,comuna:'Huara',regionLabel:'Tarapacá',regionCode:'I',altTotal:24,tipo:'Monoposte',propietario:'Municipalidad Huara',contacto:'Rosa Tapia',tel:'',email:''},
  // REGIÓN II - Antofagasta
  {id:'CL-II-001',siterra:'CH00001II',nombre:'ANTOFAGASTA CENTRO',lat:-23.652,lng:-70.396,comuna:'Antofagasta',regionLabel:'Antofagasta',regionCode:'II',altTotal:45,tipo:'Monopolo',propietario:'Inmobiliaria Puerto',contacto:'Diego Soto',tel:'+56 55 220 0001',email:''},
  {id:'CL-II-002',siterra:'CH00002II',nombre:'ANTOFAGASTA SUR',lat:-23.697,lng:-70.412,comuna:'Antofagasta',regionLabel:'Antofagasta',regionCode:'II',altTotal:35,tipo:'Torre Arriostrada',propietario:'Pesquera Antofagasta',contacto:'Carmen Rojas',tel:'',email:''},
  {id:'CL-II-003',siterra:'CH00003II',nombre:'CALAMA CENTRO',lat:-22.462,lng:-68.926,comuna:'Calama',regionLabel:'Antofagasta',regionCode:'II',altTotal:30,tipo:'Monoposte',propietario:'CODELCO Chuquicamata',contacto:'Nelson Araya',tel:'+56 55 223 0001',email:''},
  {id:'CL-II-004',siterra:'CH00004II',nombre:'CALAMA NORTE',lat:-22.431,lng:-68.915,comuna:'Calama',regionLabel:'Antofagasta',regionCode:'II',altTotal:40,tipo:'Ventada',propietario:'Minera BHP',contacto:'Andrés Fuentes',tel:'',email:''},
  {id:'CL-II-005',siterra:'CH00005II',nombre:'SAN PEDRO ATACAMA',lat:-22.908,lng:-68.199,comuna:'San Pedro de Atacama',regionLabel:'Antofagasta',regionCode:'II',altTotal:24,tipo:'Monoposte',propietario:'Turismo Atacama SpA',contacto:'Patricia Núñez',tel:'',email:''},
  {id:'CL-II-006',siterra:'CH00006II',nombre:'TALTAL',lat:-25.403,lng:-70.484,comuna:'Taltal',regionLabel:'Antofagasta',regionCode:'II',altTotal:36,tipo:'Monopolo',propietario:'Municipalidad Taltal',contacto:'Víctor Díaz',tel:'',email:''},
  {id:'CL-II-007',siterra:'CH00007II',nombre:'MEJILLONES',lat:-23.094,lng:-70.445,comuna:'Mejillones',regionLabel:'Antofagasta',regionCode:'II',altTotal:28,tipo:'Monoposte',propietario:'Puerto Mejillones',contacto:'Isabel Muñoz',tel:'',email:''},
  // REGIÓN III - Atacama
  {id:'CL-III-001',siterra:'CH00001III',nombre:'COPIAPÓ CENTRO',lat:-27.367,lng:-70.332,comuna:'Copiapó',regionLabel:'Atacama',regionCode:'III',altTotal:30,tipo:'Monopolo',propietario:'Municipalidad Copiapó',contacto:'Ernesto Vera',tel:'+56 52 220 0001',email:''},
  {id:'CL-III-002',siterra:'CH00002III',nombre:'COPIAPÓ NORTE',lat:-27.341,lng:-70.318,comuna:'Copiapó',regionLabel:'Atacama',regionCode:'III',altTotal:35,tipo:'Ventada',propietario:'Minera Candelaria',contacto:'Ignacio Pardo',tel:'',email:''},
  {id:'CL-III-003',siterra:'CH00003III',nombre:'CALDERA',lat:-27.065,lng:-70.796,comuna:'Caldera',regionLabel:'Atacama',regionCode:'III',altTotal:24,tipo:'Monoposte',propietario:'Puerto Caldera SA',contacto:'Laura Ibarra',tel:'',email:''},
  {id:'CL-III-004',siterra:'CH00004III',nombre:'VALLENAR',lat:-28.574,lng:-70.759,comuna:'Vallenar',regionLabel:'Atacama',regionCode:'III',altTotal:30,tipo:'Monopolo',propietario:'Inmobiliaria Huasco',contacto:'Marco Flores',tel:'',email:''},
  // REGIÓN IV - Coquimbo
  {id:'CL-IV-001',siterra:'CH00001IV',nombre:'LA SERENA CENTRO',lat:-29.910,lng:-71.252,comuna:'La Serena',regionLabel:'Coquimbo',regionCode:'IV',altTotal:35,tipo:'Torre Arriostrada',propietario:'Municipalidad La Serena',contacto:'Gabriela Ruz',tel:'+56 51 220 0001',email:''},
  {id:'CL-IV-002',siterra:'CH00002IV',nombre:'LA SERENA NORTE',lat:-29.881,lng:-71.237,comuna:'La Serena',regionLabel:'Coquimbo',regionCode:'IV',altTotal:30,tipo:'Monopolo',propietario:'Inmobiliaria La Serena',contacto:'Rodrigo Mella',tel:'',email:''},
  {id:'CL-IV-003',siterra:'CH00003IV',nombre:'COQUIMBO PUERTO',lat:-29.961,lng:-71.339,comuna:'Coquimbo',regionLabel:'Coquimbo',regionCode:'IV',altTotal:40,tipo:'Monoposte',propietario:'Puerto Coquimbo SpA',contacto:'Álvaro Pérez',tel:'',email:''},
  {id:'CL-IV-004',siterra:'CH00004IV',nombre:'OVALLE',lat:-30.600,lng:-71.195,comuna:'Ovalle',regionLabel:'Coquimbo',regionCode:'IV',altTotal:24,tipo:'Ventada',propietario:'Agrícola Limarí',contacto:'Susana Torres',tel:'',email:''},
  {id:'CL-IV-005',siterra:'CH00005IV',nombre:'ILLAPEL',lat:-31.634,lng:-71.169,comuna:'Illapel',regionLabel:'Coquimbo',regionCode:'IV',altTotal:28,tipo:'Monoposte',propietario:'Municipalidad Illapel',contacto:'Hugo Castillo',tel:'',email:''},
  // REGIÓN V - Valparaíso
  {id:'CL-V-001',siterra:'CH00001V',nombre:'VALPARAÍSO CERRO',lat:-33.037,lng:-71.628,comuna:'Valparaíso',regionLabel:'Valparaíso',regionCode:'V',altTotal:45,tipo:'Torre Arriostrada',propietario:'Inmobiliaria Cerros',contacto:'Marcela Ortiz',tel:'+56 32 220 0001',email:''},
  {id:'CL-V-002',siterra:'CH00002V',nombre:'VIÑA DEL MAR CENTRO',lat:-33.025,lng:-71.552,comuna:'Viña del Mar',regionLabel:'Valparaíso',regionCode:'V',altTotal:35,tipo:'Edificio',propietario:'Hotel Casablanca',contacto:'Jorge Ríos',tel:'',email:''},
  {id:'CL-V-003',siterra:'CH00003V',nombre:'VIÑA DEL MAR NORTE',lat:-32.994,lng:-71.547,comuna:'Viña del Mar',regionLabel:'Valparaíso',regionCode:'V',altTotal:30,tipo:'Monopolo',propietario:'Inmobiliaria Costa',contacto:'Patricia Salas',tel:'',email:''},
  {id:'CL-V-004',siterra:'CH00004V',nombre:'SAN ANTONIO',lat:-33.591,lng:-71.616,comuna:'San Antonio',regionLabel:'Valparaíso',regionCode:'V',altTotal:36,tipo:'Torre Arriostrada',propietario:'Puerto San Antonio SA',contacto:'Eduardo Morales',tel:'',email:''},
  {id:'CL-V-005',siterra:'CH00005V',nombre:'QUILLOTA',lat:-32.879,lng:-71.248,comuna:'Quillota',regionLabel:'Valparaíso',regionCode:'V',altTotal:24,tipo:'Monoposte',propietario:'Municipalidad Quillota',contacto:'Claudia Vidal',tel:'',email:''},
  {id:'CL-V-006',siterra:'CH00006V',nombre:'LOS ANDES',lat:-32.834,lng:-70.598,comuna:'Los Andes',regionLabel:'Valparaíso',regionCode:'V',altTotal:30,tipo:'Ventada',propietario:'Ferrocarril Transandino',contacto:'Francisco Bravo',tel:'',email:''},
  // REGIÓN RM - Metropolitana
  {id:'CL-RM-001',siterra:'CH00001RM',nombre:'SANTIAGO CENTRO',lat:-33.441,lng:-70.654,comuna:'Santiago',regionLabel:'Metropolitana',regionCode:'RM',altTotal:22,tipo:'Edificio',propietario:'Edificio Paseo Ahumada',contacto:'Nicolás Lagos',tel:'+56 2 2200 0001',email:''},
  {id:'CL-RM-002',siterra:'CH00002RM',nombre:'LAS CONDES',lat:-33.417,lng:-70.574,comuna:'Las Condes',regionLabel:'Metropolitana',regionCode:'RM',altTotal:28,tipo:'Edificio',propietario:'Edificio Corporativo LC',contacto:'Valentina Cruz',tel:'',email:''},
  {id:'CL-RM-003',siterra:'CH00003RM',nombre:'MAIPÚ',lat:-33.510,lng:-70.762,comuna:'Maipú',regionLabel:'Metropolitana',regionCode:'RM',altTotal:30,tipo:'Monopolo',propietario:'Municipalidad Maipú',contacto:'Sebastián Ruiz',tel:'',email:''},
  {id:'CL-RM-004',siterra:'CH00004RM',nombre:'LA FLORIDA',lat:-33.537,lng:-70.573,comuna:'La Florida',regionLabel:'Metropolitana',regionCode:'RM',altTotal:25,tipo:'Torre Arriostrada',propietario:'Inmobiliaria Sur SA',contacto:'Pamela Alvarado',tel:'',email:''},
  {id:'CL-RM-005',siterra:'CH00005RM',nombre:'PUENTE ALTO',lat:-33.613,lng:-70.578,comuna:'Puente Alto',regionLabel:'Metropolitana',regionCode:'RM',altTotal:32,tipo:'Monoposte',propietario:'Municipalidad P.Alto',contacto:'Hernán Contreras',tel:'',email:''},
  {id:'CL-RM-006',siterra:'CH00006RM',nombre:'PUDAHUEL',lat:-33.441,lng:-70.773,comuna:'Pudahuel',regionLabel:'Metropolitana',regionCode:'RM',altTotal:45,tipo:'Torre Arriostrada',propietario:'Aeropuerto SCL SA',contacto:'Ricardo Jara',tel:'',email:''},
  {id:'CL-RM-007',siterra:'CH00007RM',nombre:'SANTIAGO NORTE',lat:-33.394,lng:-70.661,comuna:'Independencia',regionLabel:'Metropolitana',regionCode:'RM',altTotal:22,tipo:'Edificio',propietario:'Hospitales del Norte',contacto:'Andrea Molina',tel:'',email:''},
  {id:'CL-RM-008',siterra:'CH00008RM',nombre:'SAN BERNARDO',lat:-33.593,lng:-70.717,comuna:'San Bernardo',regionLabel:'Metropolitana',regionCode:'RM',altTotal:28,tipo:'Monopolo',propietario:'Municipalidad S.Bernardo',contacto:'Gonzalo Espinoza',tel:'',email:''},
  // REGIÓN VI - O'Higgins
  {id:'CL-VI-001',siterra:'CH00001VI',nombre:'RANCAGUA CENTRO',lat:-34.170,lng:-70.741,comuna:'Rancagua',regionLabel:"O'Higgins",regionCode:'VI',altTotal:30,tipo:'Monopolo',propietario:'Municipalidad Rancagua',contacto:'Lorena Vargas',tel:'+56 72 220 0001',email:''},
  {id:'CL-VI-002',siterra:'CH00002VI',nombre:'SAN FERNANDO',lat:-34.585,lng:-70.984,comuna:'San Fernando',regionLabel:"O'Higgins",regionCode:'VI',altTotal:24,tipo:'Monoposte',propietario:'Municipalidad S.Fernando',contacto:'Mauricio Ibáñez',tel:'',email:''},
  {id:'CL-VI-003',siterra:'CH00003VI',nombre:'PICHILEMU',lat:-34.387,lng:-72.001,comuna:'Pichilemu',regionLabel:"O'Higgins",regionCode:'VI',altTotal:30,tipo:'Ventada',propietario:'Turismo Costa',contacto:'Tomás Aguilera',tel:'',email:''},
  // REGIÓN VII - Maule
  {id:'CL-VII-001',siterra:'CH00001VII',nombre:'TALCA CENTRO',lat:-35.427,lng:-71.667,comuna:'Talca',regionLabel:'Maule',regionCode:'VII',altTotal:30,tipo:'Monopolo',propietario:'Municipalidad Talca',contacto:'Gabriela Espinosa',tel:'+56 71 220 0001',email:''},
  {id:'CL-VII-002',siterra:'CH00002VII',nombre:'CURICÓ',lat:-34.986,lng:-71.239,comuna:'Curicó',regionLabel:'Maule',regionCode:'VII',altTotal:28,tipo:'Monoposte',propietario:'Municipalidad Curicó',contacto:'Oscar Fernández',tel:'',email:''},
  {id:'CL-VII-003',siterra:'CH00003VII',nombre:'LINARES',lat:-35.846,lng:-71.597,comuna:'Linares',regionLabel:'Maule',regionCode:'VII',altTotal:24,tipo:'Torre Arriostrada',propietario:'Agrícola Sur Maule',contacto:'Julia Salazar',tel:'',email:''},
  {id:'CL-VII-004',siterra:'CH00004VII',nombre:'CONSTITUCIÓN',lat:-35.334,lng:-72.413,comuna:'Constitución',regionLabel:'Maule',regionCode:'VII',altTotal:36,tipo:'Ventada',propietario:'CMPC Celulosa',contacto:'Pablo Herrera',tel:'',email:''},
  // REGIÓN XVI - Ñuble
  {id:'CL-XVI-001',siterra:'CH00001XVI',nombre:'CHILLÁN CENTRO',lat:-36.607,lng:-72.103,comuna:'Chillán',regionLabel:'Ñuble',regionCode:'XVI',altTotal:30,tipo:'Monopolo',propietario:'Municipalidad Chillán',contacto:'Roxana Moreno',tel:'+56 42 220 0001',email:''},
  {id:'CL-XVI-002',siterra:'CH00002XVI',nombre:'CHILLÁN VIEJO',lat:-36.627,lng:-72.128,comuna:'Chillán Viejo',regionLabel:'Ñuble',regionCode:'XVI',altTotal:24,tipo:'Monoposte',propietario:'Municipalidad Ch.Viejo',contacto:'Daniel Reyes',tel:'',email:''},
  // REGIÓN VIII - Biobío
  {id:'CL-VIII-001',siterra:'CH00001VIII',nombre:'CONCEPCIÓN CENTRO',lat:-36.827,lng:-73.050,comuna:'Concepción',regionLabel:'Biobío',regionCode:'VIII',altTotal:35,tipo:'Edificio',propietario:'Edificio Barros Arana',contacto:'Alejandro Campos',tel:'+56 41 220 0001',email:''},
  {id:'CL-VIII-002',siterra:'CH00002VIII',nombre:'TALCAHUANO',lat:-36.721,lng:-73.121,comuna:'Talcahuano',regionLabel:'Biobío',regionCode:'VIII',altTotal:40,tipo:'Torre Arriostrada',propietario:'Armada de Chile',contacto:'Comandante Ruiz',tel:'',email:''},
  {id:'CL-VIII-003',siterra:'CH00003VIII',nombre:'LOS ÁNGELES',lat:-37.468,lng:-72.354,comuna:'Los Ángeles',regionLabel:'Biobío',regionCode:'VIII',altTotal:28,tipo:'Monopolo',propietario:'Municipalidad L.Ángeles',contacto:'Francisca Navarrete',tel:'',email:''},
  {id:'CL-VIII-004',siterra:'CH00004VIII',nombre:'CORONEL',lat:-37.017,lng:-73.148,comuna:'Coronel',regionLabel:'Biobío',regionCode:'VIII',altTotal:30,tipo:'Monoposte',propietario:'Puerto Coronel SA',contacto:'Mario Zenteno',tel:'',email:''},
  {id:'CL-VIII-005',siterra:'CH00005VIII',nombre:'CHIGUAYANTE',lat:-36.924,lng:-73.023,comuna:'Chiguayante',regionLabel:'Biobío',regionCode:'VIII',altTotal:24,tipo:'Ventada',propietario:'Inmobiliaria Biobío',contacto:'Sandra Acevedo',tel:'',email:''},
  // REGIÓN IX - Araucanía
  {id:'CL-IX-001',siterra:'CH00001IX',nombre:'TEMUCO NORTE',lat:-38.714,lng:-72.603,comuna:'Temuco',regionLabel:'Araucanía',regionCode:'IX',altTotal:30,tipo:'Monopolo',propietario:'Municipalidad Temuco',contacto:'Agustín Pérez',tel:'+56 45 220 0001',email:''},
  {id:'CL-IX-002',siterra:'CH00002IX',nombre:'VILLARRICA',lat:-39.283,lng:-72.229,comuna:'Villarrica',regionLabel:'Araucanía',regionCode:'IX',altTotal:24,tipo:'Monoposte',propietario:'Turismo Villarrica',contacto:'Carolina Herrera',tel:'',email:''},
  {id:'CL-IX-003',siterra:'CH00003IX',nombre:'PUCÓN',lat:-39.272,lng:-71.978,comuna:'Pucón',regionLabel:'Araucanía',regionCode:'IX',altTotal:30,tipo:'Ventada',propietario:'Municipalidad Pucón',contacto:'Marcos Leal',tel:'',email:''},
  {id:'CL-IX-004',siterra:'CH00004IX',nombre:'ANGOL',lat:-37.796,lng:-72.707,comuna:'Angol',regionLabel:'Araucanía',regionCode:'IX',altTotal:28,tipo:'Torre Arriostrada',propietario:'Municipalidad Angol',contacto:'Elena Saavedra',tel:'',email:''},
  // REGIÓN XIV - Los Ríos
  {id:'CL-XIV-001',siterra:'CH00001XIV',nombre:'VALDIVIA CENTRO',lat:-39.814,lng:-73.246,comuna:'Valdivia',regionLabel:'Los Ríos',regionCode:'XIV',altTotal:32,tipo:'Monopolo',propietario:'Municipalidad Valdivia',contacto:'Felipe Castro',tel:'+56 63 220 0001',email:''},
  {id:'CL-XIV-002',siterra:'CH00002XIV',nombre:'LA UNIÓN',lat:-40.294,lng:-73.082,comuna:'La Unión',regionLabel:'Los Ríos',regionCode:'XIV',altTotal:24,tipo:'Monoposte',propietario:'Agro La Unión SpA',contacto:'Teresa Robles',tel:'',email:''},
  // REGIÓN X - Los Lagos
  {id:'CL-X-001',siterra:'CH00001X',nombre:'PUERTO MONTT CENTRO',lat:-41.469,lng:-72.943,comuna:'Puerto Montt',regionLabel:'Los Lagos',regionCode:'X',altTotal:35,tipo:'Torre Arriostrada',propietario:'Puerto Montt SA',contacto:'Iván Barría',tel:'+56 65 220 0001',email:''},
  {id:'CL-X-002',siterra:'CH00002X',nombre:'PUERTO VARAS',lat:-41.324,lng:-72.985,comuna:'Puerto Varas',regionLabel:'Los Lagos',regionCode:'X',altTotal:28,tipo:'Monopolo',propietario:'Turismo Puerto Varas',contacto:'Luz Mansilla',tel:'',email:''},
  {id:'CL-X-003',siterra:'CH00003X',nombre:'OSORNO CENTRO',lat:-40.574,lng:-73.138,comuna:'Osorno',regionLabel:'Los Lagos',regionCode:'X',altTotal:30,tipo:'Monoposte',propietario:'Municipalidad Osorno',contacto:'Raúl Ojeda',tel:'',email:''},
  {id:'CL-X-004',siterra:'CH00004X',nombre:'CASTRO CHILOÉ',lat:-42.479,lng:-73.760,comuna:'Castro',regionLabel:'Los Lagos',regionCode:'X',altTotal:24,tipo:'Ventada',propietario:'Municipalidad Castro',contacto:'Marta Cárdenas',tel:'',email:''},
  {id:'CL-X-005',siterra:'CH00005X',nombre:'ANCUD',lat:-41.869,lng:-73.829,comuna:'Ancud',regionLabel:'Los Lagos',regionCode:'X',altTotal:28,tipo:'Monoposte',propietario:'Municipalidad Ancud',contacto:'Héctor Millao',tel:'',email:''},
  // REGIÓN XI - Aysén
  {id:'CL-XI-001',siterra:'CH00001XI',nombre:'COYHAIQUE CENTRO',lat:-45.571,lng:-72.068,comuna:'Coyhaique',regionLabel:'Aysén',regionCode:'XI',altTotal:30,tipo:'Torre Arriostrada',propietario:'Municipalidad Coyhaique',contacto:'Patricia Uribe',tel:'+56 67 220 0001',email:''},
  {id:'CL-XI-002',siterra:'CH00002XI',nombre:'COCHRANE',lat:-47.240,lng:-72.563,comuna:'Cochrane',regionLabel:'Aysén',regionCode:'XI',altTotal:24,tipo:'Ventada',propietario:'Conaf Aysén',contacto:'Roberto Gallardo',tel:'',email:''},
  // REGIÓN XII - Magallanes
  {id:'CL-XII-001',siterra:'CH00001XII',nombre:'PUNTA ARENAS CENTRO',lat:-53.163,lng:-70.913,comuna:'Punta Arenas',regionLabel:'Magallanes',regionCode:'XII',altTotal:35,tipo:'Monopolo',propietario:'ENAP Magallanes',contacto:'Victoria Andrade',tel:'+56 61 220 0001',email:''},
  {id:'CL-XII-002',siterra:'CH00002XII',nombre:'PUNTA ARENAS NORTE',lat:-53.131,lng:-70.899,comuna:'Punta Arenas',regionLabel:'Magallanes',regionCode:'XII',altTotal:28,tipo:'Torre Arriostrada',propietario:'Municipalidad P.Arenas',contacto:'Eduardo Gómez',tel:'',email:''},
  {id:'CL-XII-003',siterra:'CH00003XII',nombre:'PUERTO NATALES',lat:-51.729,lng:-72.497,comuna:'Natales',regionLabel:'Magallanes',regionCode:'XII',altTotal:24,tipo:'Ventada',propietario:'Municipalidad Natales',contacto:'Simón Vera',tel:'',email:''},
]

// Array combinado para uso en mapa
export const TODOS_SITIOS = [...SITIOS, ...SITIOS_EXTRA]

// ── DOCUMENTOS OBLIGATORIOS (tipos) ──────────────────────────
export const TIPOS_DOCS_SITIO = [
  'Seguro de accidente laboral vigente',
  'Permiso municipal de acceso',
  'Certificado altura física vigente',
  'Autorización propietario por escrito',
  'Seguro de responsabilidad civil',
  'Certificado CONAF acceso zona protegida',
  'Protocolo COVID empresa contratista',
  'Acuerdo de confidencialidad firmado',
]

// ── COLOCALIZACIONES SITIOS EXTRA ──────────────────────────
export const COLOCALIZACIONES_EXTRA = {
  'CL-XV-001': ['Telefónica Móviles Chile S.A.','Entel PCS','WOM S.A.'],
  'CL-XV-002': ['Telefónica Móviles Chile S.A.','Claro Chile S.A.'],
  'CL-XV-003': ['Entel PCS','WOM S.A.'],
  'CL-I-010':  ['Telefónica Móviles Chile S.A.','Entel PCS','Claro Chile S.A.','WOM S.A.'],
  'CL-I-011':  ['Telefónica Móviles Chile S.A.','WOM S.A.'],
  'CL-I-012':  ['Telefónica Móviles Chile S.A.','Entel PCS'],
  'CL-I-013':  ['Claro Chile S.A.'],
  'CL-II-001': ['Telefónica Móviles Chile S.A.','Entel PCS','Claro Chile S.A.'],
  'CL-II-002': ['Entel PCS','WOM S.A.'],
  'CL-II-003': ['Telefónica Móviles Chile S.A.','Claro Chile S.A.','WOM S.A.'],
  'CL-II-004': ['Telefónica Móviles Chile S.A.','Entel PCS'],
  'CL-II-005': ['Entel PCS','WOM S.A.'],
  'CL-II-006': ['Telefónica Móviles Chile S.A.'],
  'CL-II-007': ['Claro Chile S.A.','WOM S.A.'],
  'CL-III-001':['Telefónica Móviles Chile S.A.','Entel PCS'],
  'CL-III-002':['Claro Chile S.A.'],
  'CL-III-003':['Telefónica Móviles Chile S.A.','WOM S.A.'],
  'CL-III-004':['Entel PCS','Claro Chile S.A.'],
  'CL-IV-001': ['Telefónica Móviles Chile S.A.','Entel PCS','WOM S.A.'],
  'CL-IV-002': ['Claro Chile S.A.'],
  'CL-IV-003': ['Telefónica Móviles Chile S.A.','Entel PCS'],
  'CL-IV-004': ['WOM S.A.'],
  'CL-IV-005': ['Telefónica Móviles Chile S.A.','Claro Chile S.A.'],
  'CL-V-001':  ['Telefónica Móviles Chile S.A.','Entel PCS','Claro Chile S.A.','WOM S.A.'],
  'CL-V-002':  ['Telefónica Móviles Chile S.A.','Entel PCS'],
  'CL-V-003':  ['Claro Chile S.A.','WOM S.A.'],
  'CL-V-004':  ['Telefónica Móviles Chile S.A.','WOM S.A.'],
  'CL-V-005':  ['Entel PCS','Claro Chile S.A.'],
  'CL-V-006':  ['Telefónica Móviles Chile S.A.'],
  'CL-RM-001': ['Telefónica Móviles Chile S.A.','Entel PCS','Claro Chile S.A.','WOM S.A.'],
  'CL-RM-002': ['Telefónica Móviles Chile S.A.','Entel PCS'],
  'CL-RM-003': ['Claro Chile S.A.','WOM S.A.'],
  'CL-RM-004': ['Telefónica Móviles Chile S.A.','Claro Chile S.A.'],
  'CL-RM-005': ['Entel PCS','WOM S.A.'],
  'CL-RM-006': ['Telefónica Móviles Chile S.A.','Entel PCS','WOM S.A.'],
  'CL-RM-007': ['Claro Chile S.A.'],
  'CL-RM-008': ['Telefónica Móviles Chile S.A.','Entel PCS'],
  'CL-VI-001': ['Telefónica Móviles Chile S.A.','Entel PCS'],
  'CL-VI-002': ['Claro Chile S.A.','WOM S.A.'],
  'CL-VI-003': ['Telefónica Móviles Chile S.A.'],
  'CL-VII-001':['Telefónica Móviles Chile S.A.','Entel PCS','Claro Chile S.A.'],
  'CL-VII-002':['WOM S.A.','Entel PCS'],
  'CL-VII-003':['Telefónica Móviles Chile S.A.'],
  'CL-VII-004':['Claro Chile S.A.','WOM S.A.'],
  'CL-XVI-001':['Telefónica Móviles Chile S.A.','Entel PCS'],
  'CL-XVI-002':['WOM S.A.'],
  'CL-VIII-001':['Telefónica Móviles Chile S.A.','Entel PCS','Claro Chile S.A.','WOM S.A.'],
  'CL-VIII-002':['Telefónica Móviles Chile S.A.','Entel PCS'],
  'CL-VIII-003':['Claro Chile S.A.','WOM S.A.'],
  'CL-VIII-004':['Telefónica Móviles Chile S.A.'],
  'CL-VIII-005':['Entel PCS','WOM S.A.'],
  'CL-IX-001': ['Telefónica Móviles Chile S.A.','Entel PCS','Claro Chile S.A.'],
  'CL-IX-002': ['WOM S.A.','Claro Chile S.A.'],
  'CL-IX-003': ['Telefónica Móviles Chile S.A.','Entel PCS'],
  'CL-IX-004': ['WOM S.A.'],
  'CL-XIV-001':['Telefónica Móviles Chile S.A.','Entel PCS'],
  'CL-XIV-002':['Claro Chile S.A.'],
  'CL-X-001':  ['Telefónica Móviles Chile S.A.','Entel PCS','Claro Chile S.A.'],
  'CL-X-002':  ['WOM S.A.','Entel PCS'],
  'CL-X-003':  ['Telefónica Móviles Chile S.A.','Claro Chile S.A.'],
  'CL-X-004':  ['WOM S.A.'],
  'CL-X-005':  ['Entel PCS'],
  'CL-XI-001': ['Telefónica Móviles Chile S.A.','Entel PCS'],
  'CL-XI-002': ['WOM S.A.'],
  'CL-XII-001':['Telefónica Móviles Chile S.A.','Entel PCS'],
  'CL-XII-002':['Claro Chile S.A.','WOM S.A.'],
  'CL-XII-003':['Telefónica Móviles Chile S.A.'],
}

// Merge all colocalizaciones
Object.assign(COLOCALIZACIONES, COLOCALIZACIONES_EXTRA)
