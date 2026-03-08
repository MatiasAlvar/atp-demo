# ATP Demo — PrimeCorp SpA

Aplicación web completa con 3 roles: ATP Admin, Operador, Propietario.

---

## 🚀 Deploy en 10 pasos

### PASO 1 — Configurar Supabase
1. Ir a https://supabase.com → tu proyecto `gzjqqpazdrkcuyruczwf`
2. Click en **SQL Editor** → **New query**
3. Pegar el contenido de `supabase_schema.sql` y ejecutar
4. Verificar que las tablas `solicitudes` y `alertas` se crearon ✓

### PASO 2 — Configurar EmailJS template
1. Ir a https://emailjs.com → Email Templates → template_y8bgoqa
2. Configurar el template con este contenido:

**Asunto:**
```
Solicitud de acceso a tu sitio {{sitio_nombre}} — ATP Chile
```

**Cuerpo HTML:**
```html
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
  <div style="background:#E53935;padding:16px 20px;border-radius:8px 8px 0 0">
    <h2 style="color:white;margin:0">ATP — Solicitud de Acceso a tu Sitio</h2>
  </div>
  <div style="background:#fff;border:1px solid #eee;padding:24px;border-radius:0 0 8px 8px">
    <p>Estimado/a <strong>{{propietario_nombre}}</strong>,</p>
    <p>La empresa <strong>{{operador}}</strong> ha solicitado acceso a tu sitio <strong>{{sitio_nombre}} ({{sitio_id}})</strong> para realizar trabajos.</p>
    
    <div style="background:#F5F5F5;border-radius:6px;padding:16px;margin:16px 0">
      <p style="margin:0 0 8px"><strong>📅 Fechas:</strong> {{desde}} al {{hasta}}</p>
      <p style="margin:0 0 8px"><strong>👷 Empresa contratista:</strong> {{empresa}}</p>
      <p style="margin:0 0 8px"><strong>👥 N° de técnicos:</strong> {{num_tecnicos}}</p>
      <p style="margin:0"><strong>📋 Técnico responsable:</strong> {{tecnico_nombre}}</p>
    </div>

    <div style="background:#EDE7F6;border-radius:6px;padding:16px;margin:16px 0">
      <p style="margin:0 0 6px;color:#4A148C;font-weight:bold">💬 ¿Qué van a hacer?</p>
      <p style="margin:0;color:#4A148C">{{trabajo_desc}}</p>
    </div>

    <p style="font-size:14px;color:#666">ID de solicitud: <code>{{sol_id}}</code></p>

    <div style="margin:24px 0;text-align:center">
      <a href="{{link_autorizar}}" style="background:#2E7D32;color:white;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:16px;margin-right:12px">
        ✓ Autorizo el acceso
      </a>
      <a href="{{link_rechazar}}" style="background:white;color:#E53935;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:16px;border:2px solid #E53935">
        ✗ No autorizo
      </a>
    </div>

    <p style="font-size:12px;color:#999;text-align:center">
      Al hacer clic en uno de los botones, tu respuesta se registrará automáticamente en el sistema ATP.
    </p>
  </div>
  <div style="text-align:center;margin-top:16px;font-size:11px;color:#ccc">
    ATP Chile · Automatizado por PrimeCorp SpA
  </div>
</div>
```

### PASO 3 — Subir a GitHub
```bash
cd atp-app
git init
git add .
git commit -m "ATP Demo PrimeCorp v1.0"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/atp-demo.git
git push -u origin main
```

### PASO 4 — Deploy en Vercel
1. Ir a https://vercel.com → New Project
2. Importar el repo `atp-demo` desde GitHub
3. En **Environment Variables** agregar estas variables:

| Variable | Valor |
|---|---|
| VITE_SUPABASE_URL | https://gzjqqpazdrkcuyruczwf.supabase.co |
| VITE_SUPABASE_ANON_KEY | eyJhbGci... (la anon key) |
| VITE_EMAILJS_SERVICE_ID | service_nafjkji |
| VITE_EMAILJS_TEMPLATE_ID | template_y8bgoqa |
| VITE_EMAILJS_PUBLIC_KEY | 0hkDpiAzjaUENS13D |
| VITE_PROPIETARIO_EMAIL | danaeoteiza.a@gmail.com |
| VITE_APP_URL | https://atp-demo.vercel.app (la URL que te asigne Vercel) |

4. Click **Deploy** → esperar 2 minutos → ¡listo!

### PASO 5 — Actualizar VITE_APP_URL
Una vez que Vercel te dé la URL final (ej: `https://atp-demo-abc123.vercel.app`):
1. En Vercel → Settings → Environment Variables
2. Actualizar `VITE_APP_URL` con la URL real
3. Redeploy

---

## 🔑 Cuentas demo para la reunión

| Usuario | Contraseña | Rol | Descripción |
|---|---|---|---|
| `atp` | `atp2026` | ATP Admin | Acceso total, dashboards, gestión |
| `telefonica` | `tef2026` | Operador | Solo solicitudes Telefónica |
| `entel` | `entel2026` | Operador | Solo solicitudes Entel |
| `claro` | `claro2026` | Operador | Solo solicitudes Claro |
| `wom` | `wom2026` | Operador | Solo solicitudes WOM |
| `merced` | `prop2026` | Propietario | Autoriza accesos sitio CL48769 |

---

## 🎬 Flujo de la demo en la reunión

1. **María Inés entra como `telefonica`** desde su navegador
2. Crea una solicitud (manual O con IA — mostrar diferencia de tiempo)
3. Al enviar → **correo llega a danaeoteiza.a@gmail.com en tiempo real**
4. Ustedes muestran el correo en el celular con botón "✓ Autorizo"
5. Hacen clic → **estado cambia a "Autorizado" en ambas pantallas simultáneamente**
6. Ustedes muestran la vista ATP con dashboard, mapa, tiempos, gráficos

---

## 📁 Estructura del proyecto

```
src/
├── App.jsx                  # Router principal + auth
├── LoginPage.jsx            # Login con demo accounts
├── lib/
│   ├── supabase.js          # BD tiempo real
│   └── email.js             # Correos reales
├── shared/
│   ├── data.js              # BBDD ATP, constantes, utils
│   └── components.jsx       # Componentes compartidos
└── views/
    ├── ViewATP.jsx          # Admin completo
    ├── ViewOperador.jsx     # Vista operador filtrada
    └── ViewPropietario.jsx  # Vista propietario simple
```
