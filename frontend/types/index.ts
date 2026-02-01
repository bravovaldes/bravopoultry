// User types
export interface User {
  id: string
  email: string
  phone?: string
  first_name: string
  last_name: string
  organization_id?: string
  role: string
  is_active: boolean
  language: string
  currency: string
  avatar_url?: string
  created_at: string
}

// Organization
export interface Organization {
  id: string
  name: string
  type: string
  registration_number?: string
  address?: string
  city?: string
  country: string
  phone?: string
  email?: string
  logo_url?: string
  created_at: string
}

// Site
export interface Site {
  id: string
  organization_id: string
  name: string
  code?: string
  address?: string
  city?: string
  region?: string
  country: string
  gps_latitude?: number
  gps_longitude?: number
  total_capacity?: number
  is_active: boolean
  notes?: string
  created_at: string
  buildings_count?: number
  active_lots_count?: number
  total_birds?: number
}

// Building
export interface Building {
  id: string
  site_id: string
  name: string
  code?: string
  building_type: 'broiler' | 'layer' | 'breeder' | 'pullet' | 'hatchery' | 'feed_storage' | 'egg_storage' | 'mixed'
  capacity?: number
  surface_m2?: number
  ventilation_type: string
  has_electricity: boolean
  has_water: boolean
  has_generator: boolean
  is_active: boolean
  created_at: string
  sections_count?: number
  active_lots_count?: number
  current_birds?: number
}

// Section
export interface Section {
  id: string
  building_id: string
  name: string
  code?: string
  capacity?: number
  position?: number
  is_active: boolean
  current_lot_id?: string
}

// Lot
export interface Lot {
  id: string
  code?: string
  name?: string
  type: 'broiler' | 'layer'
  breed?: string
  supplier?: string
  initial_quantity: number
  current_quantity?: number
  placement_date: string
  age_at_placement: number
  expected_end_date?: string
  actual_end_date?: string
  status: 'preparation' | 'active' | 'completed' | 'suspended'
  building_id?: string
  building_name?: string
  site_name?: string
  chick_price_unit?: number
  transport_cost?: number
  target_weight_g?: number
  target_fcr?: number
  target_laying_rate?: number
  notes?: string
  age_days: number
  age_weeks: number
  created_at: string
  stats?: LotStats
}

export interface LotStats {
  total_mortality: number
  mortality_rate: number
  total_eggs: number
  average_laying_rate: number
  peak_laying_rate: number
  eggs_per_hen_housed: number
  current_weight_g?: number
  daily_gain_g?: number
  uniformity?: number
  total_feed_kg: number
  feed_conversion_ratio?: number
  feed_per_egg?: number
  total_expenses: number
  total_sales: number
  gross_margin: number
  cost_per_kg?: number
  cost_per_egg?: number
  performance_score?: number
}

// Production
export interface EggProduction {
  id: string
  lot_id: string
  date: string
  normal_eggs: number
  cracked_eggs: number
  dirty_eggs: number
  small_eggs: number
  total_eggs: number
  sellable_eggs: number
  hen_count?: number
  laying_rate?: number
  created_at: string
}

export interface WeightRecord {
  id: string
  lot_id: string
  date: string
  average_weight_g: number
  sample_size?: number
  min_weight_g?: number
  max_weight_g?: number
  uniformity_cv?: number
  age_days?: number
  standard_weight_g?: number
  weight_vs_standard?: number
  created_at: string
}

export interface Mortality {
  id: string
  lot_id: string
  date: string
  quantity: number
  cause: string
  symptoms?: string
  suspected_disease?: string
  created_at: string
}

// Feed
export interface FeedConsumption {
  id: string
  lot_id: string
  date: string
  feed_type?: string
  brand?: string
  quantity_kg: number
  price_per_kg?: number
  total_cost?: number
  bird_count?: number
  feed_per_bird_g?: number
  created_at: string
}

// Health
export interface HealthEvent {
  id: string
  lot_id: string
  date: string
  event_type: 'vaccination' | 'treatment' | 'vet_visit' | 'lab_analysis' | 'prophylaxis' | 'deworming' | 'vitamin'
  product_name?: string
  manufacturer?: string
  route?: string
  dose?: string
  duration_days?: number
  target_disease?: string
  withdrawal_days_meat?: number
  withdrawal_days_eggs?: number
  withdrawal_end_date?: string
  veterinarian_name?: string
  cost?: number
  reminder_date?: string
  notes?: string
  created_at: string
}

// Finance
export interface Sale {
  id: string
  lot_id?: string
  site_id?: string
  date: string
  sale_type: 'eggs_tray' | 'eggs_carton' | 'live_birds' | 'dressed_birds' | 'culled_hens' | 'manure' | 'other'
  quantity: number
  unit?: string
  unit_price: number
  total_amount: number
  total_weight_kg?: number
  client_name?: string
  client_phone?: string
  payment_status: 'paid' | 'pending' | 'partial' | 'overdue'
  amount_paid: number
  payment_date?: string
  payment_method?: string
  created_at: string
}

export interface Expense {
  id: string
  lot_id?: string
  site_id?: string
  date: string
  category: string
  description?: string
  quantity?: number
  unit?: string
  unit_price?: number
  amount: number
  supplier_name?: string
  is_paid: boolean
  payment_date?: string
  created_at: string
}

// Alert
export interface Alert {
  id: string
  alert_type: string
  severity: 'info' | 'warning' | 'critical'
  status: 'active' | 'acknowledged' | 'resolved'
  title: string
  message: string
  lot_id?: string
  site_id?: string
  created_at: string
}
