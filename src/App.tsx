// ============================================================
// VetCare Manager — App.tsx
// Enrutamiento principal y layout de la aplicación.
//
// Rutas internas (requieren auth):
//   /           → Dashboard (redirige a /vacunas)
//   /pacientes  → Módulo 1: Pacientes y tutores
//   /vacunas    → Módulo 2: Vacunas y notificaciones
//   /agenda     → Módulo 3: Agenda semanal
//
// Rutas públicas (sin auth):
//   /reserva    → Módulo 4: Portal de agendamiento público
// ============================================================

import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ProtectedRoute } from './contexts/ProtectedRoute'
import { LoginPage } from './modules/auth/LoginPage'
import { TutorView } from './modules/auth/TutorView'
import { ClinicConfigProvider, useClinicConfig } from './contexts/ClinicConfigContext'

import { WeekView }          from './modules/agenda/WeekView'
import { VaccineDashboard }  from './modules/vaccines/VaccineDashboard'
import { PublicBooking }     from './modules/portal/PublicBooking'
import { PatientList }       from './modules/patients/PatientList'
import { PatientDetail }     from './modules/patients/PatientDetail'
import { StaffManagement }   from './modules/staff/StaffManagement'
import { PricingManagement } from './modules/staff/PricingManagement'
import { StockManagement }   from './modules/stock/StockManagement'
import { SettingsManagement } from './modules/staff/SettingsManagement'
import { LandingPage } from './modules/marketing/LandingPage'
import { Onboarding } from './modules/auth/Onboarding'
import { Billing } from './modules/staff/Billing'

import { getGravatarUrl }    from './lib/utils'

function DashboardRedirect() {
  const { user, role, loading, clinicId } = useAuth()
  
  if (loading) return null

  if (!user) return <Navigate to="/" replace />
  
  if (role === 'tutor') return <Navigate to="/tutor" replace />
  
  if (!clinicId) return <Navigate to="/onboarding" replace />
  
  return <Navigate to="/agenda" replace />
}

// ── Íconos SVG inline ─────────────────────────────────────────
const icons = {
  patients: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  vaccines: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2">
      <path d="M14.5 9.5 9 15m-4 4 1.5-1.5m4-4-2 2M3 21h2m14.5-16.5-15 15m16-13.5 1.5-1.5M14 10l1.5-1.5M21 3h-2M10 14l-5 5"/>
    </svg>
  ),
  agenda: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  globe: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  ),
  logout: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
  chevronLeft: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2.5">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  ),
  chevronRight: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2.5">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
  staff: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  pricing: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2">
      <path d="M12 2v20m0-20H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2h-6zm-4 4h8m-8 4h8m-8 4h4" />
    </svg>
  ),
  stock: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
      <line x1="12" y1="22.08" x2="12" y2="12"></line>
    </svg>
  ),
  settings: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"></circle>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
    </svg>
  ),
  billing: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
    </svg>
  )
}

// ── Sidebar ───────────────────────────────────────────────────
function Sidebar({ isCollapsed, onToggle }: { isCollapsed: boolean; onToggle: () => void }) {
  const { pathname } = useLocation()
  const { signOut, user, role } = useAuth()
  const { config } = useClinicConfig()
  


  const allNavItems = [
    { to: '/pacientes', icon: icons.patients, label: 'Pacientes' },
    { to: '/vacunas',   icon: icons.vaccines, label: 'Vacunas' },
    { to: '/agenda',    icon: icons.agenda,   label: 'Agenda' },
    { to: '/personal',  icon: icons.staff,    label: 'Personal',  adminOnly: true },
    { to: '/precios',   icon: icons.globe,    label: 'Servicios', adminOnly: true },
    { to: '/stock',     icon: icons.stock,    label: 'Stock' },
    { to: '/facturacion', icon: icons.billing, label: 'Planes', adminOnly: true },
    { to: '/config',    icon: icons.settings, label: 'Configuración', adminOnly: true },
  ]

  const navItems = allNavItems.filter(item => {
    if (item.adminOnly) {
      // Bypaseamos el rol si es el correo principal de la Dra. Sofía
      if (user?.email === 'scaceresalzamora@gmail.com') return true
      return role === 'admin'
    }
    return true
  })

  return (
    <aside className={`
      ${isCollapsed ? 'w-16' : 'w-52'} 
      bg-white border-r border-gray-100 flex flex-col flex-shrink-0 h-screen sticky top-0 font-sans transition-all duration-300 
      hidden md:flex z-40
    `}>
      {/* Botón de Colapso */}
      <button 
        onClick={onToggle}
        className="absolute -right-3 top-20 w-6 h-6 bg-white border border-gray-100 rounded-full flex items-center justify-center shadow-sm text-gray-400 hover:text-vet-rose transition-colors z-50 border-pink-100"
      >
        {isCollapsed ? icons.chevronRight : icons.chevronLeft}
      </button>

      {/* Logo */}
      <div className={`px-4 py-6 border-b border-gray-100 flex flex-col ${isCollapsed ? 'items-center' : ''}`}>
        <img 
          src={config?.clinic_logo_url || "/logo.png"} 
          alt="VetCare Logo" 
          className={`${isCollapsed ? 'w-8 h-8' : 'w-12 h-12'} transition-all object-cover rounded-xl mb-3 shadow-sm border border-pink-100`} 
        />
        {!isCollapsed && (
          <>
            <h1 className="text-black text-sm font-bold leading-tight uppercase tracking-tight">
              {config?.clinic_name || 'VetCare'}<br/>Manager
            </h1>
          </>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-6 overflow-y-auto overflow-x-hidden">
        {!isCollapsed && (
          <p className="text-[9px] uppercase tracking-widest text-gray-400
                        px-2 py-1 mt-1 mb-2 font-bold">
            Principal
          </p>
        )}
        {navItems.map((item) => {
          const active = pathname === item.to || pathname.startsWith(item.to + '/')
          return (
            <Link
              key={item.to}
              to={item.to}
              title={isCollapsed ? item.label : ''}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl
                          text-sm mb-1 transition-all
                          ${active
                            ? 'bg-vet-pink text-black font-bold shadow-sm ring-1 ring-vet-rose/10'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-black'
                          }
                          ${isCollapsed ? 'justify-center px-0' : ''}`}
            >
              <div className={`${active ? 'text-black' : 'text-gray-400'}`}>
                {item.icon}
              </div>
              {!isCollapsed && <span className="flex-1 whitespace-nowrap">{item.label}</span>}
              <div className={`flex items-center gap-1 ${isCollapsed ? 'absolute top-1 -right-1 scale-75' : ''}`}>
              </div>
            </Link>
          )
        })}
      </nav>

      {/* Footer usuario */}
      <div className={`px-2 py-4 border-t border-gray-100 bg-gray-50/50 ${isCollapsed ? 'items-center' : ''}`}>
        {!isCollapsed ? (
          <div className="flex items-center gap-2.5 mb-4 px-1">
            <img
              src={user?.user_metadata?.avatar_url || user?.user_metadata?.picture || getGravatarUrl(user?.email)}
              alt="Usuario"
              className="w-8 h-8 rounded-full object-cover ring-2 ring-vet-pink flex-shrink-0"
            />
            <div className="min-w-0 flex-1">
              <p className="text-black text-[11px] font-bold truncate">
                {user?.email === 'scaceresalzamora@gmail.com' ? 'Dra. Sofía Cáceres' : (role === 'ayudante' ? 'Ayudante' : 'Administrador')}
              </p>
              <p className="text-gray-500 text-[10px] truncate">{user?.email}</p>
            </div>
          </div>
        ) : (
          <div className="flex justify-center mb-4">
               <img
                src={user?.user_metadata?.avatar_url || user?.user_metadata?.picture || getGravatarUrl(user?.email)}
                alt="Usuario"
                className="w-8 h-8 rounded-full object-cover ring-2 ring-vet-pink"
              />
          </div>
        )}
        <button 
          onClick={() => signOut()}
          className={`flex items-center gap-2 py-2 text-xs text-gray-500 
                     hover:text-red-500 hover:bg-red-50 rounded-xl transition-all font-medium
                     ${isCollapsed ? 'w-10 h-10 justify-center mx-auto' : 'w-full px-2 mt-1'}`}
          title={isCollapsed ? 'Cerrar Sesión' : ''}
        >
          {icons.logout}
          {!isCollapsed && <span>Cerrar Sesión</span>}
        </button>
      </div>
    </aside>
  )
}

// ── Mobile Navigation ───────────────────────────────────────────
function MobileNav() {
  const { pathname } = useLocation()
  const { user, role, signOut } = useAuth()


  const allNavItems = [
    { to: '/pacientes', icon: icons.patients, label: 'Pacientes' },
    { to: '/vacunas',   icon: icons.vaccines, label: 'Vacunas' },
    { to: '/agenda',    icon: icons.agenda,   label: 'Agenda' },
    { to: '/personal',  icon: icons.staff,    label: 'Personal', adminOnly: true },
    { to: '/precios',   icon: icons.globe,    label: 'Servicios', adminOnly: true },
    { to: '/stock',     icon: icons.stock,    label: 'Stock' },
    { to: '/facturacion', icon: icons.billing, label: 'Planes', adminOnly: true },
    { to: '/config',    icon: icons.settings, label: 'Configuración', adminOnly: true },
  ]

  const navItems = allNavItems.filter(item => {
    if (item.adminOnly) {
      if (user?.email === 'scaceresalzamora@gmail.com') return true
      return role === 'admin'
    }
    return true
  })

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-pink-100 flex items-center justify-around md:hidden z-50 shadow-[0_-4px_12px_rgba(0,0,0,0.03)] px-2">
      {navItems.map((item) => {
        const active = pathname === item.to || pathname.startsWith(item.to + '/')
        return (
          <Link
            key={item.to}
            to={item.to}
            className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all relative
                        ${active ? 'text-vet-rose scale-110' : 'text-gray-400'}`}
          >
            <div className="mb-0.5">
              {item.icon}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-tighter">
              {item.label}
            </span>
            {active && (
              <div className="absolute -top-1 w-8 h-1 bg-vet-rose rounded-full" />
            )}
          </Link>
        )
      })}
      <button
        onClick={() => signOut()}
        className="flex flex-col items-center justify-center p-2 rounded-xl transition-all relative text-gray-400 hover:text-red-500"
      >
        <div className="mb-0.5">
          {icons.logout}
        </div>
        <span className="text-[10px] font-bold uppercase tracking-tighter">
          Salir
        </span>
      </button>
    </nav>
  )
}


// ── Layout interno (con sidebar) ──────────────────────────────
function AppLayout({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true'
  })
  const { isPaid, role } = useAuth()

  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', String(isCollapsed))
  }, [isCollapsed])

  return (
    <div className="flex min-h-screen bg-vet-bone">
      <Sidebar isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />
      <MobileNav />
      <main className="flex-1 flex flex-col min-w-0 transition-all duration-300">
        {!isPaid && role === 'admin' && (
          <div className="bg-gray-900 text-white px-4 py-2 flex items-center justify-between gap-4 animate-fade-in z-30 sticky top-0 md:static">
             <div className="flex items-center gap-2">
              <span className="text-xs font-bold tracking-tight">⚠️ Plan Básico</span>
              <span className="hidden sm:inline text-[10px] text-gray-400 font-medium tracking-wide">| Mejora a Pro para funciones ilimitadas</span>
            </div>
            <Link 
              to="/facturacion" 
              className="bg-vet-rose text-white text-[9px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest hover:bg-vet-dark transition-all shrink-0 shadow-lg shadow-vet-rose/20"
            >
              Mejorar
            </Link>
          </div>
        )}
        <div className="flex-1 overflow-auto pb-16 md:pb-0">
          {children}
        </div>
      </main>
    </div>
  )
}

// ── App principal ─────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ClinicConfigProvider>
          <Routes>
          {/* Rutas Públicas */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/reserva/:clinicId" element={<PublicBooking />} />
          <Route path="/reserva" element={<LandingPage />} />
          <Route path="/verify-email" element={<div className="min-h-screen bg-vet-bone flex items-center justify-center p-8 text-center max-w-md mx-auto">
            <div className="bg-white p-10 rounded-3xl shadow-xl border border-pink-100">
               <h1 className="text-2xl font-black mb-4">📧 Verifica tu Email</h1>
               <p className="text-gray-500 text-sm leading-relaxed">Te hemos enviado un enlace de confirmación. Por favor, revisa tu bandeja de entrada para poder activar tu cuenta SaaS.</p>
               <button onClick={() => window.location.reload()} className="mt-8 w-full py-3 bg-vet-rose text-white font-bold rounded-xl shadow-lg">Ya lo verifiqué</button>
            </div>
          </div>} />

          {/* Rutas Protegidas de Onboarding */}
          <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />

          {/* Rutas Protegidas (Solo Admin/Staff) */}
          <Route
            path="/pacientes"
            element={
              <ProtectedRoute requireStaff>
                <AppLayout><PatientList /></AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/pacientes/:id"
            element={
              <ProtectedRoute requireStaff>
                <AppLayout><PatientDetail /></AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/agenda"
            element={
              <ProtectedRoute requireStaff>
                <AppLayout><WeekView /></AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/vacunas"
            element={
              <ProtectedRoute requireStaff>
                <AppLayout><VaccineDashboard /></AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/precios"
            element={
              <ProtectedRoute requireAdmin>
                <AppLayout><PricingManagement /></AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/personal"
            element={
              <ProtectedRoute requireAdmin>
                <AppLayout><StaffManagement /></AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/stock"
            element={
              <ProtectedRoute requireStaff>
                <AppLayout><StockManagement /></AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/config"
            element={
              <ProtectedRoute requireAdmin>
                <AppLayout><SettingsManagement /></AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/facturacion"
            element={
              <ProtectedRoute requireAdmin>
                <AppLayout><Billing /></AppLayout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/tutor"
            element={
              <ProtectedRoute>
                <TutorView />
              </ProtectedRoute>
            }
          />

          {/* Redirección por defecto inteligente */}
          <Route path="/dashboard" element={<DashboardRedirect />} />
          <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ClinicConfigProvider>
      </BrowserRouter>
    </AuthProvider>
  )
}
