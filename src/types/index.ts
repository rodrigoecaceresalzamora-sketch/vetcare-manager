// ============================================================
// VetCare Manager — Tipos TypeScript globales
// Todos los módulos importan sus tipos desde aquí
// ============================================================

// ── ROLES Y PERMISOS ────────────────────────────────────────
export type Role = 'admin' | 'ayudante' | 'tutor' | null

export interface StaffMember {
  id: string
  email: string
  role: 'admin' | 'ayudante'
  created_at?: string
}

// ── STOCK E INVENTARIO ───────────────────────────────────────
export interface StockItem {
  id: string
  name: string
  quantity: number
  unit: string
  min_quantity: number
  lot_number?: string
  created_at?: string
}

// ── SERVICIOS Y PRECIOS ──────────────────────────────────────
export interface Service {
  id: string
  name: string
  description?: string
  price: number
  duration_minutes: number
  icon?: string
  color?: string
  bg?: string
  border?: string
  stock_usage?: { item_id: string, quantity: number }[] // Lista de items de stock a descontar
  created_at?: string
}

// ── TUTOR / GUARDIAN ─────────────────────────────────────────
export interface Guardian {
  id: string
  name: string
  rut: string           // Formato chileno: 12.345.678-9
  phone: string
  email: string
  notes?: string
  created_at?: string
}

// ── PACIENTE ─────────────────────────────────────────────────
export type Species = 'Perro' | 'Gato'
export type Sex = 'Macho' | 'Hembra' | 'No determinado'
export type PatientStatus = 'activo' | 'inactivo' | 'fallecido'

export interface Patient {
  id: string
  guardian_id: string
  name: string
  species: Species
  breed: string
  date_of_birth: string  // ISO date
  sex: Sex
  weight_kg: number
  microchip?: string
  status: PatientStatus
  photo_url?: string
  is_reactive?: boolean
  adopted_since?: string
  created_at?: string
  updated_at?: string
  // Relación cargada con join
  guardian?: Guardian
}

// ── VACUNA ────────────────────────────────────────────────────
export type VaccineStatus = 'vigente' | 'proxima' | 'urgente' | 'vencida'

export interface Vaccination {
  id: string
  patient_id: string
  vaccine_name: string
  applied_date: string   // ISO date
  lot_number: string
  next_due_date: string  // Calculada automáticamente
  reminder_sent: boolean
  created_at?: string
  // Relación cargada
  patient?: Patient
}

export type BoostInterval = '2w' | '4w' | '6m' | '1y'

// ── CITA / APPOINTMENT ────────────────────────────────────────
export type AppointmentService =
  | 'Consulta General'
  | 'Vacunación'
  | 'Control'
  | 'Telemedicina'

export type AppointmentStatus =
  | 'pendiente'
  | 'confirmada'
  | 'completada'
  | 'cancelada'

export type AppointmentSource = 'interno' | 'portal'

export interface Appointment {
  id: string
  patient_id?: string
  guardian_name: string
  guardian_email: string
  guardian_phone?: string
  guardian_rut?: string
  pet_name: string
  service: AppointmentService
  scheduled_at: string   // ISO datetime
  duration_minutes: number
  status: AppointmentStatus
  google_event_id?: string
  meet_link?: string
  source: AppointmentSource
  created_at?: string
  notes?: string
  // Campos del portal público
  pet_species?: Species
  pet_breed?: string
  pet_sex?: Sex
  pet_date_of_birth?: string
  pet_adopted_since?: string
  pet_is_reactive?: boolean
}

// ── FORMULARIO NUEVA CITA (uso interno) ──────────────────────
export interface AppointmentFormData {
  guardian_name: string
  guardian_email: string
  guardian_phone: string
  guardian_rut: string
  pet_name: string
  service: AppointmentService
  scheduled_at: string
  duration_minutes: number
  notes?: string
  status: AppointmentStatus
  is_home_visit: boolean
  address?: string
  pet_species?: Species
  pet_breed?: string
  pet_sex?: Sex
}

// ── FORMULARIO RESERVA PÚBLICA ────────────────────────────────
export interface PublicBookingFormData {
  guardian_name: string
  guardian_email: string
  guardian_phone: string
  guardian_rut?: string
  pet_name: string
  pet_species: Species                     // Nueva
  pet_breed: string                        // Nueva
  pet_sex: Sex                            // Nueva
  pet_date_of_birth?: string               // Nueva (opcional/desconocida)
  pet_adopted_since?: string               // Nueva
  pet_is_reactive?: boolean                // Nueva
  patient_id?: string                      // Vincular si existe
  guardian_id?: string                     // Vincular si existe
  service: string
  scheduled_at: string
  is_home_visit: boolean
  address?: string
}

// ── ALERTA DE VACUNA (derivado) ───────────────────────────────
export interface VaccineAlert {
  vaccination: Vaccination
  patient: Patient
  guardian: Guardian
  days_left: number
  status: VaccineStatus
}

// ── SLOT DE DISPONIBILIDAD ────────────────────────────────────
export interface TimeSlot {
  time: string       // "09:00"
  available: boolean
  appointment?: Appointment
}

// ── FICHA CLÍNICA (CONSULTAS) ─────────────────────────────────
export interface Consultation {
  id: string
  patient_id: string
  service_id?: string // Vincular consulta a servicio (para descontar stock)
  reason_for_consultation?: string
  current_anamnesis?: string
  remote_anamnesis?: string
  weight_kg?: number
  heart_rate?: string
  respiratory_rate?: string
  temperature?: string
  capillary_refill?: string
  skin_fold?: string
  hydration?: string
  lymph_nodes?: string
  body_condition?: string
  pulse?: string
  observations?: string
  diagnosis?: string
  treatment?: string
  complementary_exams?: string
  referral?: string
  applied_vaccine_name?: string
  applied_vaccine_date?: string
  applied_vaccine_lot?: string
  created_at?: string
}

// ── ARCHIVOS ADJUNTOS ─────────────────────────────────────────
export interface PatientFile {
  id: string
  name: string
  url: string
  created_at?: string
}

