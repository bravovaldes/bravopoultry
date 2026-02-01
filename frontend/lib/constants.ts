// Causes de mortalite
export const MORTALITY_CAUSES = [
  { value: 'disease', label: 'Maladie', description: 'Infection, virus, bacterie', icon: '🦠' },
  { value: 'heat_stress', label: 'Coup de chaleur', description: 'Temperature trop elevee', icon: '🌡️' },
  { value: 'cold_stress', label: 'Froid', description: 'Temperature trop basse', icon: '❄️' },
  { value: 'crushing', label: 'Ecrasement', description: 'Pietinement, bousculade', icon: '💥' },
  { value: 'laying_accident', label: 'Accident de ponte', description: 'Prolapsus, oeuf coince', icon: '🥚' },
  { value: 'predator', label: 'Predateur', description: 'Serpent, rat, oiseau', icon: '🦊' },
  { value: 'dehydration', label: 'Deshydratation', description: 'Manque d\'eau', icon: '💧' },
  { value: 'unknown', label: 'Cause inconnue', description: 'Je ne sais pas', icon: '❓' },
]

// Types d'aliment
export const FEED_TYPES = [
  { value: 'starter', label: 'Demarrage', description: 'J1-J14' },
  { value: 'grower', label: 'Croissance', description: 'J15-J28' },
  { value: 'finisher', label: 'Finition', description: 'J29+' },
  { value: 'layer', label: 'Pondeuse', description: 'Ponte' },
  { value: 'pre-layer', label: 'Pre-ponte', description: '16-20 sem' },
]

// Nombre d'oeufs par plateau (standard Afrique)
export const EGGS_PER_CARTON = 30

// Types d'evenements sante
export const HEALTH_EVENT_TYPES = [
  { value: 'vaccination', label: 'Vaccination', description: 'Vaccin preventif', icon: '💉' },
  { value: 'treatment', label: 'Traitement', description: 'Medicament curatif', icon: '💊' },
  { value: 'vet_visit', label: 'Visite veterinaire', description: 'Consultation', icon: '👨‍⚕️' },
  { value: 'deworming', label: 'Vermifuge', description: 'Anti-parasites', icon: '🐛' },
  { value: 'vitamin', label: 'Vitamines', description: 'Complement', icon: '🧪' },
  { value: 'prophylaxis', label: 'Prophylaxie', description: 'Prevention', icon: '🛡️' },
]

// Voies d'administration
export const ADMINISTRATION_ROUTES = [
  { value: 'water', label: 'Eau de boisson', icon: '💧' },
  { value: 'feed', label: 'Aliment', icon: '🌾' },
  { value: 'injection', label: 'Injection', icon: '💉' },
  { value: 'spray', label: 'Pulverisation', icon: '💨' },
  { value: 'eye_drop', label: 'Goutte oculaire', icon: '👁️' },
  { value: 'oral', label: 'Voie orale', icon: '👄' },
]

// Maladies courantes des volailles
export const COMMON_DISEASES = [
  { value: 'newcastle', label: 'Newcastle', description: 'Maladie virale grave' },
  { value: 'gumboro', label: 'Gumboro (IBD)', description: 'Bursite infectieuse' },
  { value: 'bronchitis', label: 'Bronchite infectieuse', description: 'IB - respiratoire' },
  { value: 'fowl_pox', label: 'Variole aviaire', description: 'Lesions cutanees' },
  { value: 'coccidiosis', label: 'Coccidiose', description: 'Parasites intestinaux' },
  { value: 'avian_influenza', label: 'Grippe aviaire', description: 'Influenza' },
  { value: 'marek', label: 'Marek', description: 'Paralysie' },
  { value: 'typhoid', label: 'Typhose', description: 'Salmonellose' },
  { value: 'cholera', label: 'Cholera aviaire', description: 'Pasteurellose' },
  { value: 'mycoplasmosis', label: 'Mycoplasmose', description: 'CRD - respiratoire' },
  { value: 'other', label: 'Autre', description: 'Specifier dans notes' },
]

// Vaccins courants
export const COMMON_VACCINES = [
  { value: 'lasota', label: 'La Sota', disease: 'newcastle', route: 'water' },
  { value: 'hitchner_b1', label: 'Hitchner B1', disease: 'newcastle', route: 'eye_drop' },
  { value: 'gumboro_vaccine', label: 'Gumboro', disease: 'gumboro', route: 'water' },
  { value: 'ib_vaccine', label: 'IB', disease: 'bronchitis', route: 'spray' },
  { value: 'fowl_pox_vaccine', label: 'Variole', disease: 'fowl_pox', route: 'injection' },
  { value: 'marek_vaccine', label: 'Marek', disease: 'marek', route: 'injection' },
]

// Symptomes courants
export const COMMON_SYMPTOMS = [
  { value: 'respiratory', label: 'Problemes respiratoires', icon: '😮‍💨' },
  { value: 'diarrhea', label: 'Diarrhee', icon: '💩' },
  { value: 'lethargy', label: 'Lethargie/faiblesse', icon: '😴' },
  { value: 'loss_appetite', label: 'Perte d\'appetit', icon: '🍽️' },
  { value: 'drop_production', label: 'Chute de production', icon: '📉' },
  { value: 'nervous', label: 'Signes nerveux', icon: '🌀' },
  { value: 'skin_lesions', label: 'Lesions cutanees', icon: '🩹' },
  { value: 'swelling', label: 'Gonflement', icon: '😵' },
  { value: 'discharge', label: 'Ecoulements', icon: '💧' },
  { value: 'mortality_spike', label: 'Pic de mortalite', icon: '💀' },
]

// Programmes de vaccination predefinis
export const VACCINATION_PROGRAMS = [
  {
    id: 'broiler_standard',
    name: 'Chair Standard (45j)',
    description: 'Programme standard pour poulet de chair - cycle 45 jours',
    lot_type: 'broiler',
    vaccinations: [
      { day: 1, vaccine: 'Marek', disease: 'marek', route: 'injection', note: 'Au couvoir' },
      { day: 7, vaccine: 'Hitchner B1', disease: 'newcastle', route: 'eye_drop', note: '1ere Newcastle' },
      { day: 14, vaccine: 'Gumboro', disease: 'gumboro', route: 'water', note: '1er Gumboro' },
      { day: 21, vaccine: 'La Sota', disease: 'newcastle', route: 'water', note: 'Rappel Newcastle' },
      { day: 28, vaccine: 'Gumboro', disease: 'gumboro', route: 'water', note: 'Rappel Gumboro' },
    ]
  },
  {
    id: 'broiler_intensif',
    name: 'Chair Intensif (45j)',
    description: 'Programme renforce avec IB - zones a risque',
    lot_type: 'broiler',
    vaccinations: [
      { day: 1, vaccine: 'Marek', disease: 'marek', route: 'injection', note: 'Au couvoir' },
      { day: 5, vaccine: 'IB + Newcastle', disease: 'bronchitis', route: 'spray', note: 'Combo' },
      { day: 14, vaccine: 'Gumboro', disease: 'gumboro', route: 'water', note: '1er Gumboro' },
      { day: 18, vaccine: 'IB', disease: 'bronchitis', route: 'water', note: 'Rappel IB' },
      { day: 21, vaccine: 'La Sota', disease: 'newcastle', route: 'water', note: 'Rappel Newcastle' },
      { day: 28, vaccine: 'Gumboro', disease: 'gumboro', route: 'water', note: 'Rappel Gumboro' },
    ]
  },
  {
    id: 'layer_standard',
    name: 'Pondeuses Standard',
    description: 'Programme standard pour poules pondeuses',
    lot_type: 'layer',
    vaccinations: [
      { day: 1, vaccine: 'Marek', disease: 'marek', route: 'injection', note: 'Au couvoir' },
      { day: 7, vaccine: 'Hitchner B1 + IB', disease: 'newcastle', route: 'eye_drop', note: 'Newcastle + IB' },
      { day: 14, vaccine: 'Gumboro', disease: 'gumboro', route: 'water', note: '1er Gumboro' },
      { day: 21, vaccine: 'La Sota', disease: 'newcastle', route: 'water', note: 'Rappel Newcastle' },
      { day: 28, vaccine: 'Gumboro', disease: 'gumboro', route: 'water', note: 'Rappel Gumboro' },
      { day: 42, vaccine: 'Variole', disease: 'fowl_pox', route: 'injection', note: '6 semaines - aile' },
      { day: 56, vaccine: 'La Sota', disease: 'newcastle', route: 'water', note: '8 semaines' },
      { day: 70, vaccine: 'IB', disease: 'bronchitis', route: 'water', note: '10 semaines' },
      { day: 84, vaccine: 'Newcastle + IB', disease: 'newcastle', route: 'water', note: '12 semaines' },
      { day: 112, vaccine: 'Newcastle inactivé', disease: 'newcastle', route: 'injection', note: '16 sem - avant ponte' },
    ]
  },
  {
    id: 'layer_minimal',
    name: 'Pondeuses Minimal',
    description: 'Programme minimal - petits elevages',
    lot_type: 'layer',
    vaccinations: [
      { day: 1, vaccine: 'Marek', disease: 'marek', route: 'injection', note: 'Au couvoir' },
      { day: 7, vaccine: 'Hitchner B1', disease: 'newcastle', route: 'eye_drop', note: '1ere Newcastle' },
      { day: 14, vaccine: 'Gumboro', disease: 'gumboro', route: 'water', note: 'Gumboro' },
      { day: 21, vaccine: 'La Sota', disease: 'newcastle', route: 'water', note: 'Rappel Newcastle' },
      { day: 42, vaccine: 'Variole', disease: 'fowl_pox', route: 'injection', note: '6 semaines' },
      { day: 112, vaccine: 'La Sota', disease: 'newcastle', route: 'water', note: 'Avant ponte' },
    ]
  },
]
