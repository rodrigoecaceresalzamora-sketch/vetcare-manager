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

import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ProtectedRoute } from './contexts/ProtectedRoute'
import { LoginPage } from './modules/auth/LoginPage'
import { TutorView } from './modules/auth/TutorView'
import { VaccineDashboard } from './modules/vaccines/VaccineDashboard'
import { WeekView }          from './modules/agenda/WeekView'
import { PublicBooking }     from './modules/portal/PublicBooking'
import { PatientList }       from './modules/patients/PatientList'
import { PatientDetail }     from './modules/patients/PatientDetail'
import { useVaccineAlerts }  from './modules/vaccines/useVaccineAlerts'

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
  )
}

// ── Sidebar ───────────────────────────────────────────────────
function Sidebar() {
  const { pathname } = useLocation()
  const { signOut, user } = useAuth()
  
  // Extraer unicamente cuantas son inminentes sin trabar UI
  const { urgentAlerts, upcomingAlerts } = useVaccineAlerts()

  const navItems = [
    { to: '/pacientes', icon: icons.patients, label: 'Pacientes', section: 'Principal' },
    { 
      to: '/vacunas',   
      icon: icons.vaccines, 
      label: 'Vacunas',   
      badge: upcomingAlerts.length > 0 ? String(upcomingAlerts.length) : undefined,
      urgentBadge: urgentAlerts.length > 0 ? String(urgentAlerts.length) : undefined
    },
    { to: '/agenda',    icon: icons.agenda,   label: 'Agenda' },
  ]

  return (
    <aside className="w-52 bg-white border-r border-gray-100 flex flex-col flex-shrink-0 h-screen sticky top-0 font-sans">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-gray-100">
        <img 
          src="/logo.png" 
          alt="VetCare Logo" 
          className="w-16 h-16 object-cover rounded-xl mb-2 shadow-sm border border-pink-100" 
        />
        <h1 className="text-black text-sm font-bold leading-tight uppercase tracking-tight">
          VetCare<br/>Manager
        </h1>
        <p className="text-gray-500 text-xs mt-0.5">Clínica Veterinaria</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto">
        <p className="text-[9px] uppercase tracking-widest text-gray-400
                      px-2 py-1 mt-1 mb-0.5 font-bold">
          Principal
        </p>
        {navItems.map((item) => {
          const active = pathname === item.to || pathname.startsWith(item.to + '/')
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg
                          text-sm mb-0.5 transition-all
                          ${active
                            ? 'bg-vet-pink text-black font-bold shadow-sm ring-1 ring-vet-rose/10'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-black'
                          }`}
            >
              {item.icon}
              <span className="flex-1">{item.label}</span>
              <div className="flex items-center gap-1">
                {item.urgentBadge && (
                  <span className="bg-red-500 text-white text-[10px]
                                   px-1.5 py-0.5 rounded-full font-bold" title="Urgentes o vencidas">
                    {item.urgentBadge}
                  </span>
                )}
                {item.badge && (
                  <span className="bg-amber-100 text-amber-800 text-[10px]
                                   px-1.5 py-0.5 rounded-full font-bold border border-amber-200" title="Próximas a vencer">
                    {item.badge}
                  </span>
                )}
              </div>
            </Link>
          )
        })}
      </nav>

      {/* Footer usuario */}
      <div className="px-3 py-4 border-t border-gray-100 bg-gray-50/50">
        <div className="flex items-center gap-2.5 mb-3">
          <img
            src="/logo.png"
            alt="Usuario"
            className="w-8 h-8 rounded-full object-cover ring-2 ring-vet-pink flex-shrink-0"
          />
          <div className="min-w-0 pr-1">
            <p className="text-black text-xs font-bold truncate">
              {user?.email === 'scaceresalzamora@gmail.com' ? 'Dra. Sofía Cáceres' : 'Admin'}
            </p>
            <p className="text-gray-500 text-[10px] font-medium truncate">{user?.email}</p>
          </div>
        </div>
        <button 
          onClick={() => signOut()}
          className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-gray-500 
                     hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium border border-transparent hover:border-red-100"
        >
          {icons.logout}
          Cerrar Sesión
        </button>
      </div>
    </aside>
  )
}


// ── Layout interno (con sidebar) ──────────────────────────────
function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-vet-bone">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}

// ── App principal ─────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Rutas Públicas */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/reserva" element={<PublicBooking />} />

          {/* Rutas Protegidas (Solo Admin) */}
          <Route
            path="/pacientes"
            element={
              <ProtectedRoute requireAdmin>
                <AppLayout><PatientList /></AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/pacientes/:id"
            element={
              <ProtectedRoute requireAdmin>
                <AppLayout><PatientDetail /></AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/vacunas"
            element={
              <ProtectedRoute requireAdmin>
                <AppLayout><VaccineDashboard /></AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/agenda"
            element={
              <ProtectedRoute requireAdmin>
                <AppLayout><WeekView /></AppLayout>
              </ProtectedRoute>
            }
          />

          {/* Ruta del Tutor */}
          <Route
            path="/tutor"
            element={
              <ProtectedRoute>
                <TutorView />
              </ProtectedRoute>
            }
          />

          {/* Redirección por defecto */}
          <Route 
             path="/" 
             element={<ProtectedRoute requireAdmin><Navigate to="/vacunas" replace /></ProtectedRoute>} 
          />
          <Route path="*" element={<Navigate to="/reserva" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
