'use client'

import { useState } from 'react'
import {
  BookOpen,
  Search,
  Bird,
  Bug,
  Wheat,
  Thermometer,
  Syringe,
  ChevronRight,
  ChevronDown,
  Star,
  X,
  PlayCircle,
  Smartphone,
  GraduationCap,
  Filter,
  Stethoscope,
  Shield,
  Droplets,
  Egg,
  Building2,
  ClipboardList,
  TrendingUp,
  DollarSign,
  Users,
  Bell,
  Package,
  Calendar,
  BarChart3,
  Settings,
  Heart,
  Youtube,
  Clock,
  AlertTriangle,
  Lightbulb,
  Feather,
  ShoppingCart,
  FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Types de contenu
type ContentType = 'all' | 'tutorials' | 'farming' | 'videos'

// Tutoriels de l'application
const TUTORIALS = [
  {
    id: 'tuto-lots',
    category: 'tutorials',
    icon: ClipboardList,
    title: 'Gerer vos bandes',
    subtitle: 'Creation et suivi des bandes',
    content: {
      description: 'Apprenez a creer et gerer vos bandes de volailles dans BravoPoultry. Une bande represente un groupe d\'oiseaux arrives en meme temps.',
      steps: [
        {
          title: 'Creer une nouvelle bande',
          instructions: [
            'Allez dans "Bandes" depuis le menu',
            'Cliquez sur "+ Nouvelle bande"',
            'Remplissez: nom, type (chair/pondeuse), quantite initiale',
            'Selectionnez le batiment et la date de placement',
            'Indiquez l\'age a l\'arrivee (0 pour poussins d\'un jour)',
          ],
        },
        {
          title: 'Suivre une bande active',
          instructions: [
            'Cliquez sur une bande pour voir ses details',
            'Consultez les KPIs: age, effectif, mortalite, poids moyen',
            'Enregistrez les evenements quotidiens',
            'Suivez la courbe de croissance',
          ],
        },
        {
          title: 'Cloturer une bande',
          instructions: [
            'Utilisez "Cloturer la bande" quand la bande est vendue',
            'Entrez les donnees finales de vente',
            'La bande passe en historique avec toutes ses statistiques',
          ],
        },
      ],
      tips: [
        'Utilisez des codes de bande significatifs (ex: B1-2024-01)',
        'Enregistrez les donnees quotidiennement pour un meilleur suivi',
        'Consultez l\'historique pour comparer vos performances',
      ],
    },
  },
  {
    id: 'tuto-mortality',
    category: 'tutorials',
    icon: Heart,
    title: 'Enregistrer la mortalite',
    subtitle: 'Suivi quotidien',
    content: {
      description: 'Le suivi de la mortalite est crucial pour detecter rapidement les problemes sanitaires et optimiser vos performances.',
      steps: [
        {
          title: 'Enregistrement quotidien',
          instructions: [
            'Selectionnez la bande concernee',
            'Cliquez sur "Enregistrer mortalite"',
            'Entrez le nombre de morts du jour',
            'Selectionnez la cause si connue',
            'Ajoutez des notes si necessaire',
          ],
        },
        {
          title: 'Analyser les tendances',
          instructions: [
            'Consultez le graphique de mortalite dans les details de la bande',
            'Comparez avec les standards de la souche',
            'Identifiez les pics anormaux',
          ],
        },
      ],
      tips: [
        'Enregistrez a heure fixe chaque jour',
        'Une mortalite > 1%/semaine apres demarrage necessite attention',
        'Notez les symptomes observes pour l\'historique veterinaire',
      ],
      alerts: [
        'Mortalite > 3% en 24h = Alerte critique',
        'Tendance croissante sur 3 jours = Investiguer',
      ],
    },
  },
  {
    id: 'tuto-weight',
    category: 'tutorials',
    icon: TrendingUp,
    title: 'Pesees et croissance',
    subtitle: 'Suivi du poids',
    content: {
      description: 'Les pesees regulieres permettent de verifier que vos oiseaux suivent la courbe de croissance attendue.',
      steps: [
        {
          title: 'Effectuer une pesee',
          instructions: [
            'Pesez un echantillon representatif (30-50 oiseaux)',
            'Prelevez dans differentes zones du batiment',
            'Pesez de preference le matin a jeun',
            'Enregistrez le poids moyen dans l\'application',
          ],
        },
        {
          title: 'Interpreter les resultats',
          instructions: [
            'Comparez avec la courbe standard de la souche',
            'Verifiez l\'homogeneite de la bande (CV < 10%)',
            'Analysez l\'ecart avec l\'objectif',
          ],
        },
      ],
      tips: [
        'Frequence recommandee: hebdomadaire minimum',
        'Utilisez toujours la meme balance',
        'Pesez avant distribution de l\'aliment',
      ],
    },
  },
  {
    id: 'tuto-feed',
    category: 'tutorials',
    icon: Package,
    title: 'Gestion de l\'alimentation',
    subtitle: 'Stock et consommation',
    content: {
      description: 'Suivez vos stocks d\'aliments et la consommation de vos bandes pour optimiser vos achats et detecter les anomalies.',
      steps: [
        {
          title: 'Enregistrer une livraison',
          instructions: [
            'Allez dans "Stock aliment"',
            'Cliquez sur "+ Reception"',
            'Entrez: type d\'aliment, quantite, fournisseur, prix',
            'Le stock est automatiquement mis a jour',
          ],
        },
        {
          title: 'Enregistrer la consommation',
          instructions: [
            'Selectionnez la bande',
            'Entrez la quantite distribuee du jour',
            'L\'indice de consommation est calcule automatiquement',
          ],
        },
      ],
      tips: [
        'Anticipez vos commandes avec les alertes de stock bas',
        'Un IC eleve peut indiquer du gaspillage ou des parasites',
        'Comparez votre IC avec les standards de la souche',
      ],
    },
  },
  {
    id: 'tuto-health',
    category: 'tutorials',
    icon: Stethoscope,
    title: 'Suivi sanitaire',
    subtitle: 'Vaccins et traitements',
    content: {
      description: 'Gerez le calendrier vaccinal et enregistrez les traitements pour assurer la tracabilite sanitaire de vos bandes.',
      steps: [
        {
          title: 'Planifier les vaccinations',
          instructions: [
            'Allez dans "Sante" > "Programme vaccinal"',
            'Selectionnez un programme type ou creez le votre',
            'Les rappels sont automatiquement generes',
          ],
        },
        {
          title: 'Enregistrer un evenement sante',
          instructions: [
            'Cliquez sur "+ Evenement sante"',
            'Selectionnez: vaccination, traitement ou observation',
            'Entrez les details: produit, dose, cout',
            'Le delai d\'attente est calcule automatiquement',
          ],
        },
      ],
      tips: [
        'Respectez la chaine du froid pour les vaccins',
        'Notez le numero de lot du vaccin',
        'Verifiez les delais d\'attente avant abattage',
      ],
    },
  },
  {
    id: 'tuto-sales',
    category: 'tutorials',
    icon: ShoppingCart,
    title: 'Ventes et commerce',
    subtitle: 'Gerer vos ventes',
    content: {
      description: 'Enregistrez vos ventes de volailles et suivez vos revenus et credits clients.',
      steps: [
        {
          title: 'Enregistrer une vente',
          instructions: [
            'Allez dans "Commerce" > "+ Nouvelle vente"',
            'Selectionnez la bande et le client',
            'Entrez: quantite, prix unitaire, poids total',
            'Choisissez: paye ou credit',
          ],
        },
        {
          title: 'Gerer les credits',
          instructions: [
            'Consultez les credits en cours par client',
            'Enregistrez les paiements partiels',
            'Suivez l\'historique des transactions',
          ],
        },
      ],
      tips: [
        'Definissez des limites de credit par client',
        'Exportez les rapports de vente mensuels',
        'Analysez vos meilleurs clients',
      ],
    },
  },
  {
    id: 'tuto-finance',
    category: 'tutorials',
    icon: DollarSign,
    title: 'Gestion financiere',
    subtitle: 'Depenses et rentabilite',
    content: {
      description: 'Suivez toutes vos depenses et calculez la rentabilite reelle de chaque bande.',
      steps: [
        {
          title: 'Enregistrer une depense',
          instructions: [
            'Allez dans "Finances" > "+ Depense"',
            'Selectionnez la categorie: aliment, sante, energie, main d\'oeuvre...',
            'Associez a la bande concernee si applicable',
            'Entrez le montant et joignez la facture si disponible',
          ],
        },
        {
          title: 'Analyser la rentabilite',
          instructions: [
            'Consultez le tableau de bord financier',
            'Analysez le cout par kg produit',
            'Comparez la rentabilite entre bandes',
          ],
        },
      ],
      tips: [
        'Categorisez correctement pour des analyses precises',
        'L\'aliment represente 60-70% des couts, surveillez-le',
        'Comparez vos couts avec les benchmarks du secteur',
      ],
    },
  },
  {
    id: 'tuto-alerts',
    category: 'tutorials',
    icon: Bell,
    title: 'Alertes et notifications',
    subtitle: 'Rester informe',
    content: {
      description: 'Configurez les alertes pour etre notifie des evenements importants et ne rien manquer.',
      steps: [
        {
          title: 'Configurer les alertes',
          instructions: [
            'Allez dans "Parametres" > "Notifications"',
            'Activez/desactivez chaque type d\'alerte',
            'Definissez les seuils critiques',
          ],
        },
        {
          title: 'Types d\'alertes disponibles',
          instructions: [
            'Mortalite anormale: depasse le seuil defini',
            'Stock aliment bas: anticipez les commandes',
            'Vaccinations dues: rappels automatiques',
            'Fin de bande proche: planifiez la vente',
          ],
        },
      ],
      tips: [
        'Activez les notifications push sur mobile',
        'Consultez le centre de notifications regulierement',
        'Reagissez rapidement aux alertes critiques',
      ],
    },
  },
  {
    id: 'tuto-reports',
    category: 'tutorials',
    icon: BarChart3,
    title: 'Rapports et analyses',
    subtitle: 'Exploiter vos donnees',
    content: {
      description: 'Generez des rapports detailles pour analyser vos performances et prendre de meilleures decisions.',
      steps: [
        {
          title: 'Consulter le tableau de bord',
          instructions: [
            'La page d\'accueil affiche les KPIs principaux',
            'Filtrez par periode, site ou batiment',
            'Comparez avec les periodes precedentes',
          ],
        },
        {
          title: 'Generer un rapport de bande',
          instructions: [
            'Ouvrez une bande (active ou cloturee)',
            'Cliquez sur "Rapport complet"',
            'Exportez en PDF ou Excel',
          ],
        },
      ],
      tips: [
        'Analysez vos donnees historiques pour identifier les tendances',
        'Comparez vos performances entre bandes de meme souche',
        'Utilisez les graphiques pour communiquer avec votre equipe',
      ],
    },
  },
  {
    id: 'tuto-sites',
    category: 'tutorials',
    icon: Building2,
    title: 'Gerer sites et batiments',
    subtitle: 'Structure de l\'elevage',
    content: {
      description: 'Organisez votre elevage en sites et batiments pour un suivi precis de chaque zone.',
      steps: [
        {
          title: 'Creer un site',
          instructions: [
            'Allez dans "Parametres" > "Sites"',
            'Cliquez sur "+ Nouveau site"',
            'Entrez le nom et l\'adresse',
            'Le site regroupe plusieurs batiments',
          ],
        },
        {
          title: 'Ajouter un batiment',
          instructions: [
            'Dans le site, cliquez sur "+ Batiment"',
            'Definissez: nom, capacite, type d\'equipement',
            'Vous pouvez maintenant y placer des bandes',
          ],
        },
      ],
      tips: [
        'Un batiment = une bande a la fois generalement',
        'Definissez la capacite reelle pour eviter le surpeuplement',
        'Utilisez des noms clairs (A, B, C ou des numeros)',
      ],
    },
  },
]

// Videos YouTube (placeholders pour integration future)
const VIDEOS = [
  {
    id: 'video-demarrage',
    category: 'videos',
    icon: PlayCircle,
    title: 'Demarrage des poussins',
    subtitle: 'Les 7 premiers jours',
    duration: '12:45',
    thumbnail: '/thumbnails/demarrage.jpg',
    youtubeId: 'PLACEHOLDER',
    description: 'Guide complet pour reussir le demarrage de vos poussins: preparation du batiment, reception, temperature, abreuvement.',
    topics: ['Preparation batiment', 'Reception poussins', 'Temperature optimale', 'Premier abreuvement', 'Premier aliment'],
  },
  {
    id: 'video-biosecurite',
    category: 'videos',
    icon: PlayCircle,
    title: 'Biosecurite en elevage',
    subtitle: 'Proteger votre cheptel',
    duration: '18:30',
    thumbnail: '/thumbnails/biosecurite.jpg',
    youtubeId: 'PLACEHOLDER',
    description: 'Mesures essentielles de biosecurite pour prevenir les maladies et proteger vos investissements.',
    topics: ['Pediluve', 'Tenue de travail', 'Controle visiteurs', 'Desinfection', 'Vide sanitaire'],
  },
  {
    id: 'video-ventilation',
    category: 'videos',
    icon: PlayCircle,
    title: 'Maitrise de la ventilation',
    subtitle: 'Qualite de l\'air',
    duration: '15:20',
    thumbnail: '/thumbnails/ventilation.jpg',
    youtubeId: 'PLACEHOLDER',
    description: 'Comment gerer la ventilation pour maintenir un environnement optimal dans vos batiments.',
    topics: ['Ventilation minimum', 'Ventilation tunnel', 'Gestion NH3', 'Controle humidite'],
  },
  {
    id: 'video-vaccination',
    category: 'videos',
    icon: PlayCircle,
    title: 'Techniques de vaccination',
    subtitle: 'Administration correcte',
    duration: '22:15',
    thumbnail: '/thumbnails/vaccination.jpg',
    youtubeId: 'PLACEHOLDER',
    description: 'Methodes de vaccination: eau de boisson, spray, injection. Preparation et administration.',
    topics: ['Eau de boisson', 'Spray', 'Goutte oculaire', 'Injection', 'Conservation vaccins'],
  },
  {
    id: 'video-alimentation',
    category: 'videos',
    icon: PlayCircle,
    title: 'Optimiser l\'alimentation',
    subtitle: 'Reduire le cout alimentaire',
    duration: '16:40',
    thumbnail: '/thumbnails/alimentation.jpg',
    youtubeId: 'PLACEHOLDER',
    description: 'Strategies pour optimiser l\'indice de consommation et reduire le gaspillage alimentaire.',
    topics: ['Calcul IC', 'Hauteur mangeoires', 'Granulometrie', 'Rationnement'],
  },
  {
    id: 'video-pondeuses',
    category: 'videos',
    icon: PlayCircle,
    title: 'Elevage de pondeuses',
    subtitle: 'De la poulette a la ponte',
    duration: '25:00',
    thumbnail: '/thumbnails/pondeuses.jpg',
    youtubeId: 'PLACEHOLDER',
    description: 'Guide complet pour l\'elevage de poules pondeuses: elevage, stimulation lumineuse, pic de ponte.',
    topics: ['Phase elevage', 'Stimulation lumineuse', 'Transition aliment', 'Qualite oeufs'],
  },
  {
    id: 'video-app-intro',
    category: 'videos',
    icon: PlayCircle,
    title: 'Decouvrir BravoPoultry',
    subtitle: 'Tutoriel application',
    duration: '8:30',
    thumbnail: '/thumbnails/app-intro.jpg',
    youtubeId: 'PLACEHOLDER',
    description: 'Presentation generale de l\'application BravoPoultry et de ses fonctionnalites principales.',
    topics: ['Navigation', 'Tableau de bord', 'Creation bande', 'Enregistrements'],
  },
  {
    id: 'video-app-advanced',
    category: 'videos',
    icon: PlayCircle,
    title: 'Fonctions avancees',
    subtitle: 'Tutoriel application',
    duration: '14:15',
    thumbnail: '/thumbnails/app-advanced.jpg',
    youtubeId: 'PLACEHOLDER',
    description: 'Exploitez toutes les fonctionnalites de BravoPoultry: rapports, analyses, exportations.',
    topics: ['Rapports personnalises', 'Analyses financieres', 'Export donnees', 'Multi-sites'],
  },
]

// Contenu elevage enrichi
const FARMING_CATEGORIES = [
  {
    id: 'breeds',
    name: 'Standards de race',
    icon: Bird,
    color: 'bg-blue-100 text-blue-600',
    description: 'Caracteristiques et performances attendues',
    items: [
      {
        id: 'cobb500',
        title: 'Cobb 500',
        subtitle: 'Poulet de chair',
        content: {
          description: 'Souche de poulet de chair la plus populaire au monde, connue pour son excellente conversion alimentaire et sa croissance rapide.',
          characteristics: [
            'Poids vif a 42j: 2.8-3.0 kg',
            'Indice de conversion: 1.65-1.75',
            'Rendement carcasse: 75-77%',
            'Mortalite acceptable: < 4%',
          ],
          growthTable: [
            { age: 7, weight: 180, consumption: 165, ic: 0.92 },
            { age: 14, weight: 480, consumption: 570, ic: 1.19 },
            { age: 21, weight: 930, consumption: 1320, ic: 1.42 },
            { age: 28, weight: 1500, consumption: 2350, ic: 1.57 },
            { age: 35, weight: 2150, consumption: 3600, ic: 1.67 },
            { age: 42, weight: 2850, consumption: 5100, ic: 1.79 },
          ],
          tips: [
            'Maintenir une temperature de 32°C a la reception',
            'Reduire de 2-3°C par semaine',
            'Programme lumineux: 23h lumiere les 3 premiers jours',
          ],
        },
      },
      {
        id: 'ross308',
        title: 'Ross 308',
        subtitle: 'Poulet de chair',
        content: {
          description: 'Souche performante avec un bon equilibre entre croissance et rendement en viande blanche.',
          characteristics: [
            'Poids vif a 42j: 2.7-2.9 kg',
            'Indice de conversion: 1.68-1.78',
            'Rendement filet: 24-25%',
            'Plumage blanc uniforme',
          ],
          growthTable: [
            { age: 7, weight: 175, consumption: 160, ic: 0.91 },
            { age: 14, weight: 460, consumption: 550, ic: 1.20 },
            { age: 21, weight: 900, consumption: 1280, ic: 1.42 },
            { age: 28, weight: 1450, consumption: 2280, ic: 1.57 },
            { age: 35, weight: 2080, consumption: 3480, ic: 1.67 },
            { age: 42, weight: 2750, consumption: 4950, ic: 1.80 },
          ],
          tips: [
            'Bien ventiler pour eviter l\'ascite',
            'Surveiller la litiere (humidite < 30%)',
            'Densite recommandee: 35-38 kg/m²',
          ],
        },
      },
      {
        id: 'arbor-acres',
        title: 'Arbor Acres Plus',
        subtitle: 'Poulet de chair',
        content: {
          description: 'Souche robuste adaptee aux conditions tropicales avec une bonne resistance aux maladies.',
          characteristics: [
            'Poids vif a 42j: 2.6-2.8 kg',
            'Indice de conversion: 1.70-1.80',
            'Bonne resistance thermique',
            'Adaptee aux conditions africaines',
          ],
          growthTable: [
            { age: 7, weight: 165, consumption: 155, ic: 0.94 },
            { age: 14, weight: 440, consumption: 530, ic: 1.20 },
            { age: 21, weight: 870, consumption: 1240, ic: 1.43 },
            { age: 28, weight: 1400, consumption: 2200, ic: 1.57 },
            { age: 35, weight: 2000, consumption: 3400, ic: 1.70 },
            { age: 42, weight: 2650, consumption: 4800, ic: 1.81 },
          ],
          tips: [
            'Excellente souche pour climats chauds',
            'Bonne viabilite en conditions difficiles',
            'Rendement filet legerement inferieur aux autres souches',
          ],
        },
      },
      {
        id: 'isa-brown',
        title: 'ISA Brown',
        subtitle: 'Poule pondeuse',
        content: {
          description: 'Poule pondeuse hybride tres productive, adaptee aux conditions tropicales.',
          characteristics: [
            'Pic de ponte: 95-96%',
            'Oeufs/an: 300-320',
            'Poids oeuf moyen: 62-64g',
            'Consommation: 110-115g/jour',
          ],
          growthTable: [
            { age: 18, weight: 1550, consumption: 6500, production: 5 },
            { age: 24, weight: 1850, consumption: 8200, production: 90 },
            { age: 32, weight: 1950, consumption: 10500, production: 95 },
            { age: 52, weight: 2050, consumption: 16000, production: 88 },
            { age: 72, weight: 2100, consumption: 21000, production: 78 },
          ],
          tips: [
            'Demarrer la stimulation lumineuse a 17 semaines',
            'Transition aliment pondeuse progressive',
            'Calcium 4-4.5% pendant la ponte',
          ],
        },
      },
      {
        id: 'lohmann-brown',
        title: 'Lohmann Brown',
        subtitle: 'Poule pondeuse',
        content: {
          description: 'Pondeuse tres performante avec excellente persistance de ponte et bonne qualite de coquille.',
          characteristics: [
            'Pic de ponte: 94-95%',
            'Oeufs/an: 315-325',
            'Poids oeuf moyen: 63-65g',
            'Excellente qualite coquille',
          ],
          growthTable: [
            { age: 18, weight: 1500, consumption: 6300, production: 5 },
            { age: 24, weight: 1800, consumption: 8000, production: 92 },
            { age: 32, weight: 1900, consumption: 10200, production: 94 },
            { age: 52, weight: 2000, consumption: 15800, production: 86 },
            { age: 72, weight: 2050, consumption: 20500, production: 75 },
          ],
          tips: [
            'Attention au poids corporel en fin de ponte',
            'Maintenir 16h de lumiere pendant la ponte',
            'Surveiller la qualite de coquille apres 52 semaines',
          ],
        },
      },
      {
        id: 'hubbard',
        title: 'Hubbard Classic',
        subtitle: 'Poulet de chair',
        content: {
          description: 'Souche polyvalente adaptee aux marches traditionnels avec bonne coloration de peau.',
          characteristics: [
            'Poids vif a 42j: 2.5-2.7 kg',
            'Indice de conversion: 1.72-1.82',
            'Bonne coloration jaune',
            'Adaptee au poulet fermier',
          ],
          growthTable: [
            { age: 7, weight: 160, consumption: 150, ic: 0.94 },
            { age: 14, weight: 420, consumption: 510, ic: 1.21 },
            { age: 21, weight: 840, consumption: 1200, ic: 1.43 },
            { age: 28, weight: 1350, consumption: 2100, ic: 1.56 },
            { age: 35, weight: 1950, consumption: 3300, ic: 1.69 },
            { age: 42, weight: 2550, consumption: 4650, ic: 1.82 },
          ],
          tips: [
            'Ideale pour les circuits courts',
            'Bonne adaptation au plein air',
            'Croissance moderee = meilleure qualite gustative',
          ],
        },
      },
    ],
  },
  {
    id: 'diseases',
    name: 'Guide des maladies',
    icon: Bug,
    color: 'bg-red-100 text-red-600',
    description: 'Symptomes, prevention et traitements',
    items: [
      {
        id: 'newcastle',
        title: 'Maladie de Newcastle',
        subtitle: 'Virale - Tres contagieuse',
        content: {
          description: 'Maladie virale hautement contagieuse affectant les voies respiratoires, digestives et nerveuses.',
          symptoms: [
            'Difficultes respiratoires, toux',
            'Diarrhee verdatre',
            'Chute de ponte brutale',
            'Torticolis, paralysie',
            'Mortalite pouvant atteindre 100%',
          ],
          prevention: [
            'Vaccination a J1, J14, J28',
            'Rappels tous les 3 mois',
            'Biosecurite stricte',
            'Quarantaine nouveaux arrivants',
          ],
          treatment: 'Pas de traitement curatif. Traitement symptomatique: vitamines, antibiotiques pour infections secondaires.',
          vaccines: ['HB1', 'Lasota', 'Clone 30'],
        },
      },
      {
        id: 'gumboro',
        title: 'Maladie de Gumboro',
        subtitle: 'Virale - Immunodepressive',
        content: {
          description: 'Maladie virale touchant la bourse de Fabricius, affaiblissant le systeme immunitaire.',
          symptoms: [
            'Prostration, plumes ebouriffees',
            'Diarrhee aqueuse blanchatre',
            'Deshydratation rapide',
            'Pic de mortalite entre 3-6 semaines',
          ],
          prevention: [
            'Vaccination a J10-14 et J21',
            'Vaccination des reproductrices',
            'Immunite maternelle importante',
          ],
          treatment: 'Traitement symptomatique: rehydratation, vitamines, electrolytes.',
          vaccines: ['Gumboro intermediate', 'Gumboro hot'],
        },
      },
      {
        id: 'coccidiosis',
        title: 'Coccidiose',
        subtitle: 'Parasitaire',
        content: {
          description: 'Maladie parasitaire intestinale causee par des protozoaires du genre Eimeria.',
          symptoms: [
            'Diarrhee sanglante',
            'Perte d\'appetit',
            'Retard de croissance',
            'Plumage terne',
            'Mortalite 10-30%',
          ],
          prevention: [
            'Anticoccidiens dans l\'aliment',
            'Litiere seche (< 25% humidite)',
            'Vaccination possible',
            'Rotation des anticoccidiens',
          ],
          treatment: 'Sulfamides, Amprolium, Toltrazuril pendant 3-5 jours.',
          vaccines: ['Paracox'],
        },
      },
      {
        id: 'bronchite',
        title: 'Bronchite infectieuse',
        subtitle: 'Virale - Respiratoire',
        content: {
          description: 'Maladie virale tres contagieuse affectant les voies respiratoires et parfois les reins.',
          symptoms: [
            'Rales, eternuements, toux',
            'Ecoulement nasal',
            'Chute de ponte (pondeuses)',
            'Oeufs deformes, coquille molle',
            'Problemes renaux (nephrite)',
          ],
          prevention: [
            'Vaccination a J1 (spray) et rappels',
            'Bonne ventilation',
            'Eviter stress thermique',
          ],
          treatment: 'Pas de traitement specifique. Antibiotiques contre surinfections. Vitamines et electrolytes.',
          vaccines: ['H120', 'Ma5', '4/91'],
        },
      },
      {
        id: 'mycoplasmose',
        title: 'Mycoplasmose (CRD)',
        subtitle: 'Bacterienne chronique',
        content: {
          description: 'Maladie respiratoire chronique causee par Mycoplasma gallisepticum. Tres repandue.',
          symptoms: [
            'Rales humides, eternuements',
            'Gonflement des sinus',
            'Ecoulement oculaire et nasal',
            'Baisse performances',
            'Evolution lente',
          ],
          prevention: [
            'Achat de poussins certifies MG-free',
            'Biosecurite stricte',
            'Eviter stress',
            'Bonne ventilation',
          ],
          treatment: 'Tylosine, Tilmicosine, Enrofloxacine pendant 5-7 jours. Rechutes frequentes.',
          vaccines: ['Vaccins vivants disponibles'],
        },
      },
      {
        id: 'colibacillose',
        title: 'Colibacillose',
        subtitle: 'Bacterienne - E. coli',
        content: {
          description: 'Infection bacterienne opportuniste tres frequente, souvent secondaire a d\'autres maladies.',
          symptoms: [
            'Forme respiratoire: aerosacculite',
            'Forme septique: mortalite brutale',
            'Omphalite chez poussins',
            'Pericardite, perihepatite',
            'Cellulite sous-cutanee',
          ],
          prevention: [
            'Hygiene couvoir excellente',
            'Qualite eau de boisson',
            'Ventilation adequate',
            'Desinfection batiment',
          ],
          treatment: 'Antibiogramme recommande. Amoxicilline, Enrofloxacine, Colistine selon sensibilite.',
          vaccines: ['Autovaccins possibles'],
        },
      },
      {
        id: 'variole',
        title: 'Variole aviaire',
        subtitle: 'Virale - Cutanee',
        content: {
          description: 'Maladie virale caracterisee par des lesions cutanees (forme seche) ou diphtheriques (forme humide).',
          symptoms: [
            'Nodules sur crete, barbillons, pattes',
            'Croutes noirâtres',
            'Forme humide: plaques jaunatres gorge',
            'Difficultes respiratoires (forme humide)',
          ],
          prevention: [
            'Vaccination a 6-8 semaines',
            'Lutte contre moustiques',
            'Eviter blessures (cannibalisme)',
          ],
          treatment: 'Pas de traitement specifique. Desinfection lesions. Antibiotiques si surinfection.',
          vaccines: ['Vaccin variole aviaire (transfixion alaire)'],
        },
      },
    ],
  },
  {
    id: 'nutrition',
    name: 'Nutrition',
    icon: Wheat,
    color: 'bg-amber-100 text-amber-600',
    description: 'Besoins nutritionnels et formulation',
    items: [
      {
        id: 'broiler-nutrition',
        title: 'Alimentation poulet de chair',
        subtitle: 'Besoins par phase',
        content: {
          phases: [
            {
              name: 'Demarrage (0-10j)',
              protein: '22-23%',
              energy: '3000 kcal/kg',
              calcium: '1.0%',
              phosphore: '0.45%',
              lysine: '1.35%',
            },
            {
              name: 'Croissance (11-24j)',
              protein: '20-21%',
              energy: '3100 kcal/kg',
              calcium: '0.90%',
              phosphore: '0.40%',
              lysine: '1.20%',
            },
            {
              name: 'Finition (25-42j)',
              protein: '18-19%',
              energy: '3200 kcal/kg',
              calcium: '0.85%',
              phosphore: '0.35%',
              lysine: '1.05%',
            },
          ],
          tips: [
            'Transition progressive entre phases (3-4 jours)',
            'Granulometrie adaptee a l\'age',
            'Eviter les ruptures d\'aliment',
            'Ratio eau/aliment: 1.8-2.0',
          ],
        },
      },
      {
        id: 'layer-nutrition',
        title: 'Alimentation pondeuse',
        subtitle: 'Besoins par phase',
        content: {
          phases: [
            {
              name: 'Pre-ponte (16-18 sem)',
              protein: '17-18%',
              energy: '2750 kcal/kg',
              calcium: '2.0%',
              phosphore: '0.45%',
            },
            {
              name: 'Pic de ponte',
              protein: '18-19%',
              energy: '2800 kcal/kg',
              calcium: '4.0-4.5%',
              phosphore: '0.40%',
            },
            {
              name: 'Fin de ponte',
              protein: '16-17%',
              energy: '2700 kcal/kg',
              calcium: '4.5%',
              phosphore: '0.35%',
            },
          ],
          tips: [
            'Calcium sous forme de coquilles d\'huitres',
            'Supplementer en soiree pour qualite coquille',
            'Surveiller le poids corporel',
          ],
        },
      },
      {
        id: 'water-quality',
        title: 'Qualite de l\'eau',
        subtitle: 'Parametre critique',
        content: {
          description: 'L\'eau represente 70% du poids vif des volailles. Sa qualite est essentielle a la sante et aux performances.',
          parameters: [
            { param: 'pH', optimal: '6.5-7.5', limit: '5.0-8.5' },
            { param: 'Durete', optimal: '< 200 ppm', limit: '< 400 ppm' },
            { param: 'Nitrates', optimal: '< 25 ppm', limit: '< 50 ppm' },
            { param: 'Fer', optimal: '< 0.1 ppm', limit: '< 0.3 ppm' },
            { param: 'Coliformes', optimal: '0 UFC/mL', limit: '< 100 UFC/mL' },
          ],
          tips: [
            'Analyser l\'eau 2x/an minimum',
            'Nettoyer les lignes regulierement',
            'Chlorer si necessaire (3-5 ppm)',
            'Consommation: 1.8-2x la consommation aliment',
          ],
        },
      },
      {
        id: 'feed-storage',
        title: 'Stockage des aliments',
        subtitle: 'Conservation optimale',
        content: {
          description: 'Un mauvais stockage peut degrader la qualite nutritionnelle et favoriser les moisissures toxiques.',
          recommendations: [
            'Stockage < 3 semaines en climat tropical',
            'Local sec, frais et ventile',
            'Sureleation du sol (palettes)',
            'FIFO: premier entre, premier sorti',
            'Temperature < 25°C si possible',
          ],
          risks: [
            'Mycotoxines: aflatoxines, ochratoxines',
            'Oxydation des graisses (rancissement)',
            'Perte de vitamines',
            'Infestation insectes',
          ],
          tips: [
            'Inspecter visuellement chaque livraison',
            'Refuser aliment mouille ou moisi',
            'Ajouter anti-mycotoxines si risque eleve',
          ],
        },
      },
      {
        id: 'additives',
        title: 'Additifs alimentaires',
        subtitle: 'Guide des supplements',
        content: {
          description: 'Les additifs ameliorent les performances et la sante quand utilises correctement.',
          categories: [
            {
              name: 'Probiotiques',
              benefit: 'Equilibre flore intestinale',
              usage: 'Continu ou periodes stress',
            },
            {
              name: 'Prebiotiques (MOS)',
              benefit: 'Stimule bonnes bacteries',
              usage: 'Demarrage et periodes critiques',
            },
            {
              name: 'Enzymes',
              benefit: 'Meilleure digestibilite',
              usage: 'Regimes a base de ble/orge',
            },
            {
              name: 'Acidifiants',
              benefit: 'Controle salmonelles, E.coli',
              usage: 'Eau de boisson ou aliment',
            },
            {
              name: 'Phytogeniques',
              benefit: 'Appetit, digestion',
              usage: 'Alternative aux antibiotiques',
            },
          ],
          tips: [
            'Ne pas melanger tous les additifs sans conseil',
            'Respecter les dosages recommandes',
            'Evaluer le retour sur investissement',
          ],
        },
      },
    ],
  },
  {
    id: 'environment',
    name: 'Ambiance',
    icon: Thermometer,
    color: 'bg-cyan-100 text-cyan-600',
    description: 'Parametres environnementaux optimaux',
    items: [
      {
        id: 'temperature',
        title: 'Guide des temperatures',
        subtitle: 'Par age et type',
        content: {
          broiler: [
            { age: '0-3 jours', temp: '32-33°C', humidity: '60-70%' },
            { age: '4-7 jours', temp: '30-31°C', humidity: '55-65%' },
            { age: '2 semaines', temp: '28-29°C', humidity: '50-60%' },
            { age: '3 semaines', temp: '26-27°C', humidity: '50-60%' },
            { age: '4 semaines', temp: '24-25°C', humidity: '50-60%' },
            { age: '5+ semaines', temp: '22-24°C', humidity: '50-60%' },
          ],
          tips: [
            'Observer le comportement des poussins',
            'Regroupes au centre = trop froid',
            'Ecartes contre les murs = trop chaud',
            'Uniformement repartis = temperature ideale',
          ],
        },
      },
      {
        id: 'ventilation',
        title: 'Ventilation',
        subtitle: 'Qualite de l\'air',
        content: {
          parameters: [
            { param: 'Ammoniac (NH3)', limit: '< 25 ppm', optimal: '< 10 ppm' },
            { param: 'CO2', limit: '< 3000 ppm', optimal: '< 2500 ppm' },
            { param: 'Humidite relative', limit: '40-80%', optimal: '50-65%' },
            { param: 'Vitesse air', limit: '0.1-0.3 m/s', optimal: 'Selon age' },
          ],
          tips: [
            'Ventilation minimale meme en hiver',
            'Evacuer l\'ammoniac de la litiere',
            'Eviter les courants d\'air sur les jeunes',
          ],
        },
      },
      {
        id: 'lighting',
        title: 'Programme lumineux',
        subtitle: 'Eclairage optimal',
        content: {
          description: 'La lumiere influence la croissance, la consommation et le comportement des volailles.',
          broiler: [
            { period: 'J0-J3', light: '23h', intensity: '30-40 lux' },
            { period: 'J4-J7', light: '20h', intensity: '20-30 lux' },
            { period: 'J8-J21', light: '18h', intensity: '10-20 lux' },
            { period: 'J22-fin', light: '18-20h', intensity: '10-15 lux' },
          ],
          layer: [
            { period: 'Elevage 0-10 sem', light: '8h', intensity: '10-15 lux' },
            { period: 'Elevage 10-16 sem', light: '10h', intensity: '10-15 lux' },
            { period: 'Pre-ponte 16-18 sem', light: '12h', intensity: '15-20 lux' },
            { period: 'Ponte', light: '16h', intensity: '20-30 lux' },
          ],
          tips: [
            'Augmenter progressivement (30 min/semaine)',
            'Ne jamais diminuer en ponte',
            'Uniformite d\'eclairage importante',
          ],
        },
      },
      {
        id: 'litter',
        title: 'Gestion de la litiere',
        subtitle: 'Copeaux et paille',
        content: {
          description: 'Une bonne litiere absorbe l\'humidite et l\'ammoniac tout en assurant le confort des oiseaux.',
          materials: [
            { type: 'Copeaux de bois', pros: 'Absorbant, disponible', cons: 'Risque moisissures' },
            { type: 'Paille de riz', pros: 'Tres absorbant', cons: 'Poussiereuse' },
            { type: 'Coques de riz', pros: 'Leger, isolant', cons: 'Moins absorbant' },
            { type: 'Paille de ble', pros: 'Economique', cons: 'Compacte rapidement' },
          ],
          parameters: [
            'Epaisseur: 8-10 cm minimum',
            'Humidite: 20-30% ideal',
            'Renouvellement: selon etat',
          ],
          tips: [
            'Aerer les zones humides (abreuvoirs)',
            'Retourner regulierement',
            'Ajouter de la litiere fraiche si necessaire',
          ],
        },
      },
      {
        id: 'density',
        title: 'Densite d\'elevage',
        subtitle: 'Nombre d\'oiseaux/m²',
        content: {
          description: 'La densite impacte directement le bien-etre, la sante et les performances des volailles.',
          recommendations: [
            { type: 'Poulet de chair (finition)', density: '35-38 kg/m²', birds: '15-17 oiseaux/m²' },
            { type: 'Pondeuse au sol', density: '7-9 oiseaux/m²', birds: '7-9 oiseaux/m²' },
            { type: 'Pondeuse en cage', density: '450-550 cm²/oiseau', birds: '-' },
            { type: 'Reproducteurs chair', density: '5-6 oiseaux/m²', birds: '5-6 oiseaux/m²' },
          ],
          impacts: [
            'Surdensite = stress, maladies, cannibalisme',
            'Sous-densite = rentabilite reduite',
            'Adapter selon climat et equipement',
          ],
          tips: [
            'Reduire en saison chaude',
            'Tenir compte du poids final',
            'Reglementation bien-etre selon pays',
          ],
        },
      },
    ],
  },
  {
    id: 'vaccination',
    name: 'Programmes vaccinaux',
    icon: Syringe,
    color: 'bg-purple-100 text-purple-600',
    description: 'Calendriers et protocoles',
    items: [
      {
        id: 'broiler-program',
        title: 'Programme poulet de chair',
        subtitle: 'Calendrier type 42 jours',
        content: {
          schedule: [
            { day: 1, vaccine: 'Newcastle + Bronchite', route: 'Spray/Goutte oculaire' },
            { day: 7, vaccine: 'Gumboro', route: 'Eau de boisson' },
            { day: 14, vaccine: 'Newcastle (rappel)', route: 'Eau de boisson' },
            { day: 18, vaccine: 'Gumboro (rappel)', route: 'Eau de boisson' },
          ],
          tips: [
            'Preparer l\'eau de boisson la veille (dechlorer)',
            'Ajouter du lait ecreme (2g/L) comme protecteur',
            'Administrer tot le matin',
            'Verifier la consommation en 2h max',
          ],
        },
      },
      {
        id: 'layer-program',
        title: 'Programme pondeuse',
        subtitle: 'Calendrier elevage + ponte',
        content: {
          schedule: [
            { day: 1, vaccine: 'Marek', route: 'Injection SC' },
            { day: 7, vaccine: 'Newcastle HB1', route: 'Goutte oculaire' },
            { day: 10, vaccine: 'Gumboro', route: 'Eau de boisson' },
            { day: 14, vaccine: 'Bronchite', route: 'Spray' },
            { day: 21, vaccine: 'Newcastle Lasota', route: 'Eau de boisson' },
            { day: 28, vaccine: 'Gumboro rappel', route: 'Eau de boisson' },
            { day: 42, vaccine: 'Newcastle + Bronchite', route: 'Eau de boisson' },
            { day: 56, vaccine: 'Variole aviaire', route: 'Transfixion alaire' },
            { day: 70, vaccine: 'Encephalomyelite', route: 'Eau de boisson' },
            { day: 105, vaccine: 'Newcastle inactive', route: 'Injection IM' },
          ],
          tips: [
            'Respecter les intervalles entre vaccins',
            'Verifier la chaine du froid',
            'Utiliser le vaccin dans l\'heure apres ouverture',
          ],
        },
      },
      {
        id: 'vaccine-techniques',
        title: 'Techniques de vaccination',
        subtitle: 'Voies d\'administration',
        content: {
          description: 'Chaque voie d\'administration a ses specificites. Une bonne technique garantit l\'efficacite.',
          techniques: [
            {
              method: 'Eau de boisson',
              steps: ['Assoiffer 2-3h avant', 'Dechlorer eau', 'Ajouter lait ecreme', 'Consommer en 2h'],
              tips: 'Verifier que tous boivent',
            },
            {
              method: 'Spray (nébulisation)',
              steps: ['Regrouper les oiseaux', 'Gouttelettes 80-120 microns', 'Pulveriser au-dessus', 'Eteindre ventilation'],
              tips: 'Attention uniformite',
            },
            {
              method: 'Goutte oculaire',
              steps: ['Maintenir l\'oiseau', 'Une goutte dans l\'oeil', 'Attendre absorption', 'Relacher doucement'],
              tips: 'Precis mais long',
            },
            {
              method: 'Injection',
              steps: ['Materiel sterile', 'Site: poitrine ou cuisse', 'Profondeur adequate', 'Desinfecter'],
              tips: 'Personnel forme',
            },
          ],
          tips: [
            'Former le personnel aux techniques',
            'Utiliser materiel propre et calibre',
            'Noter le numero de lot du vaccin',
          ],
        },
      },
    ],
  },
  {
    id: 'biosecurity',
    name: 'Biosecurite',
    icon: Shield,
    color: 'bg-green-100 text-green-600',
    description: 'Prevention et protection sanitaire',
    items: [
      {
        id: 'biosecurity-basics',
        title: 'Principes de base',
        subtitle: 'Les fondamentaux',
        content: {
          description: 'La biosecurite est l\'ensemble des mesures visant a empecher l\'introduction et la propagation des maladies.',
          principles: [
            'Isolement: separer les zones propres/sales',
            'Controle des flux: personnes, materiels, animaux',
            'Nettoyage et desinfection reguliers',
            'Surveillance et detection precoce',
          ],
          zones: [
            { zone: 'Zone publique', description: 'Acces visiteurs, livraisons', risk: 'Eleve' },
            { zone: 'Zone controlee', description: 'Personnel apres changement tenue', risk: 'Moyen' },
            { zone: 'Zone propre', description: 'Batiments d\'elevage', risk: 'Faible' },
          ],
          tips: [
            'Etablir un plan de biosecurite ecrit',
            'Former tout le personnel',
            'Auditer regulierement les pratiques',
          ],
        },
      },
      {
        id: 'cleaning-disinfection',
        title: 'Nettoyage et desinfection',
        subtitle: 'Protocole vide sanitaire',
        content: {
          description: 'Le vide sanitaire entre deux bandes est crucial pour rompre le cycle des pathogenes.',
          steps: [
            { step: 1, action: 'Retrait des oiseaux', detail: 'Enlever tous les animaux' },
            { step: 2, action: 'Retrait litiere', detail: 'Evacuer toute la matiere organique' },
            { step: 3, action: 'Nettoyage a sec', detail: 'Balayer, depoussierer' },
            { step: 4, action: 'Trempage', detail: 'Appliquer detergent, laisser agir' },
            { step: 5, action: 'Lavage haute pression', detail: 'Eau chaude si possible' },
            { step: 6, action: 'Sechage', detail: 'Laisser secher completement' },
            { step: 7, action: 'Desinfection', detail: 'Appliquer desinfectant agree' },
            { step: 8, action: 'Vide sanitaire', detail: 'Minimum 14 jours sans animaux' },
          ],
          products: [
            'Detergents: tensioactifs pour graisses',
            'Desinfectants: ammoniums quaternaires, formol, glutaraldehyde',
            'Alterner les familles de desinfectants',
          ],
          tips: [
            'Nettoyer le materiel aussi',
            'Traiter les abords du batiment',
            'Verifier l\'efficacite (controles bacteriologiques)',
          ],
        },
      },
      {
        id: 'pest-control',
        title: 'Lutte contre les nuisibles',
        subtitle: 'Rongeurs et insectes',
        content: {
          description: 'Les nuisibles vehiculent des maladies et consomment l\'aliment. Leur controle est essentiel.',
          rodents: [
            'Postes d\'appâtage securises autour batiments',
            'Elimination terriers et cachettes',
            'Stockage aliment dans silos etanches',
            'Boucher toutes les ouvertures > 1 cm',
          ],
          insects: [
            'Alphitobius (petit tenebrio): vecteur Salmonella',
            'Traitement insecticide entre bandes',
            'Eviter humidite excessive litiere',
            'Pièges a mouches si necessaire',
          ],
          birds: [
            'Filets anti-moineaux',
            'Fermer les ouvertures',
            'Effarouchement',
          ],
          tips: [
            'Programme de lutte systematique',
            'Registre des interventions',
            'Faire appel a professionnel si infestation',
          ],
        },
      },
    ],
  },
  {
    id: 'management',
    name: 'Pratiques d\'elevage',
    icon: Feather,
    color: 'bg-orange-100 text-orange-600',
    description: 'Bonnes pratiques quotidiennes',
    items: [
      {
        id: 'chick-reception',
        title: 'Reception des poussins',
        subtitle: 'Premier jour crucial',
        content: {
          description: 'La reception est une etape critique. Des poussins bien demarre = de bonnes performances.',
          preparation: [
            'Batiment prechauffé 24h avant (32-33°C)',
            'Eau tiede (25°C) dans les abreuvoirs',
            'Aliment demarrage accessible',
            'Eclairage 30-40 lux',
            'Litiere propre et seche',
          ],
          reception: [
            'Verifier etat des poussins a l\'arrivee',
            'Compter et noter les morts au transport',
            'Placer rapidement dans la zone de demarrage',
            'Tremper le bec de quelques-uns dans l\'eau',
            'Observer la repartition apres 1h',
          ],
          first24h: [
            'Temperature: poussins repartis uniformement',
            'Consommation eau visible',
            'Jabot rempli a 80% apres 8h',
            'Activite normale (pas de cris)',
          ],
          tips: [
            'Reduire le stress au maximum',
            'Eviter courants d\'air',
            'Garder contact avec le couvoir',
          ],
        },
      },
      {
        id: 'daily-routine',
        title: 'Routine quotidienne',
        subtitle: 'Check-list journaliere',
        content: {
          description: 'Une routine systematique permet de detecter rapidement tout probleme.',
          morning: [
            'Observer comportement general en entrant',
            'Verifier temperature et ventilation',
            'Controler eau (debit, proprete)',
            'Distribuer l\'aliment',
            'Ramasser les morts et noter',
          ],
          midday: [
            'Verification rapide',
            'Ajuster ventilation si chaud',
            'Verifier niveaux mangeoires',
          ],
          evening: [
            'Derniere distribution aliment',
            'Controler eclairage',
            'Verifier chauffage pour la nuit',
            'Noter consommations du jour',
          ],
          weekly: [
            'Pesee echantillon',
            'Nettoyage abreuvoirs',
            'Verification equipements',
            'Analyse des donnees',
          ],
          tips: [
            'Toujours meme ordre de visite',
            'Prendre son temps pour observer',
            'Noter tout ce qui est anormal',
          ],
        },
      },
      {
        id: 'heat-stress',
        title: 'Gestion du stress thermique',
        subtitle: 'Canicule et chaleur',
        content: {
          description: 'Le stress thermique est une cause majeure de mortalite en climat tropical.',
          symptoms: [
            'Halètement (bec ouvert)',
            'Ailes ecartees du corps',
            'Prostration',
            'Baisse consommation',
            'Mortalite si T° > 32°C prolongee',
          ],
          prevention: [
            'Isolation toiture (reflecteur)',
            'Ventilation adequate',
            'Brumisation si necessaire',
            'Reduire densite en ete',
          ],
          emergency: [
            'Augmenter ventilation au maximum',
            'Brumisation d\'eau fraiche',
            'Retirer aliment aux heures chaudes',
            'Ajouter electrolytes et vitamine C',
            'Reduire eclairage',
          ],
          tips: [
            'Surveiller meteo et anticiper',
            'Eviter manipulations aux heures chaudes',
            'Eau fraiche toujours disponible',
          ],
        },
      },
    ],
  },
]

export default function KnowledgePage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [contentType, setContentType] = useState<ContentType>('all')
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['tutorials'])

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    )
  }

  // Filter based on search and content type
  const filteredTutorials = TUTORIALS.filter(item =>
    (contentType === 'all' || contentType === 'tutorials') &&
    (searchQuery === '' ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.subtitle.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const filteredVideos = VIDEOS.filter(item =>
    (contentType === 'all' || contentType === 'videos') &&
    (searchQuery === '' ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.subtitle.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const filteredFarming = FARMING_CATEGORIES.map(cat => ({
    ...cat,
    items: cat.items.filter(item =>
      (contentType === 'all' || contentType === 'farming') &&
      (searchQuery === '' ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.subtitle.toLowerCase().includes(searchQuery.toLowerCase()))
    ),
  })).filter(cat => cat.items.length > 0)

  const showTutorials = contentType === 'all' || contentType === 'tutorials'
  const showVideos = contentType === 'all' || contentType === 'videos'
  const showFarming = contentType === 'all' || contentType === 'farming'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-orange-600" />
            Base de connaissances
          </h1>
          <p className="text-gray-500">Tutoriels, guides et documentation technique</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl border p-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher dans la base de connaissances..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 border rounded-lg text-sm"
          />
        </div>

        {/* Content Type Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-sm text-gray-500 flex items-center gap-1 shrink-0">
            <Filter className="w-4 h-4" />
            Filtrer:
          </span>
          {[
            { id: 'all', label: 'Tout', icon: BookOpen },
            { id: 'tutorials', label: 'Tutoriels app', icon: Smartphone },
            { id: 'farming', label: 'Elevage', icon: Bird },
            { id: 'videos', label: 'Videos', icon: Youtube },
          ].map((filter) => {
            const Icon = filter.icon
            return (
              <button
                key={filter.id}
                onClick={() => setContentType(filter.id as ContentType)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition shrink-0",
                  contentType === filter.id
                    ? "bg-orange-100 text-orange-700"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
              >
                <Icon className="w-4 h-4" />
                {filter.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Quick Stats */}
      {searchQuery === '' && contentType === 'all' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Smartphone className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{TUTORIALS.length}</p>
                <p className="text-xs text-gray-500">Tutoriels app</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <Youtube className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{VIDEOS.length}</p>
                <p className="text-xs text-gray-500">Videos</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Bird className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{FARMING_CATEGORIES.reduce((acc, cat) => acc + cat.items.length, 0)}</p>
                <p className="text-xs text-gray-500">Articles elevage</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <GraduationCap className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{FARMING_CATEGORIES.length}</p>
                <p className="text-xs text-gray-500">Categories</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Categories List */}
        <div className="lg:col-span-1 space-y-4">
          {/* Tutorials Section */}
          {showTutorials && filteredTutorials.length > 0 && (
            <div className="bg-white rounded-xl border">
              <button
                onClick={() => toggleCategory('tutorials')}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-orange-100">
                    <Smartphone className="w-5 h-5 text-orange-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold">Tutoriels BravoPoultry</p>
                    <p className="text-xs text-gray-500">Comment utiliser l'application</p>
                  </div>
                </div>
                {expandedCategories.includes('tutorials') ? (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                )}
              </button>

              {expandedCategories.includes('tutorials') && (
                <div className="border-t divide-y">
                  {filteredTutorials.map((item) => {
                    const Icon = item.icon
                    return (
                      <button
                        key={item.id}
                        onClick={() => setSelectedItem({ ...item, categoryId: 'tutorials' })}
                        className={cn(
                          "w-full p-3 flex items-center justify-between hover:bg-gray-50 text-left",
                          selectedItem?.id === item.id && "bg-orange-50"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="w-4 h-4 text-gray-400" />
                          <div>
                            <p className="font-medium text-sm">{item.title}</p>
                            <p className="text-xs text-gray-500">{item.subtitle}</p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Videos Section */}
          {showVideos && filteredVideos.length > 0 && (
            <div className="bg-white rounded-xl border">
              <button
                onClick={() => toggleCategory('videos')}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-red-100">
                    <Youtube className="w-5 h-5 text-red-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold">Videos formation</p>
                    <p className="text-xs text-gray-500">Tutoriels video (bientot)</p>
                  </div>
                </div>
                {expandedCategories.includes('videos') ? (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                )}
              </button>

              {expandedCategories.includes('videos') && (
                <div className="border-t divide-y">
                  {filteredVideos.map((video) => (
                    <button
                      key={video.id}
                      onClick={() => setSelectedItem({ ...video, categoryId: 'videos' })}
                      className={cn(
                        "w-full p-3 flex items-center justify-between hover:bg-gray-50 text-left",
                        selectedItem?.id === video.id && "bg-red-50"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <PlayCircle className="w-4 h-4 text-red-500" />
                        <div>
                          <p className="font-medium text-sm">{video.title}</p>
                          <p className="text-xs text-gray-500">{video.subtitle}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">{video.duration}</span>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Farming Categories */}
          {showFarming && filteredFarming.map((category) => {
            const Icon = category.icon
            const isExpanded = expandedCategories.includes(category.id)

            return (
              <div key={category.id} id={category.id} className="bg-white rounded-xl border">
                <button
                  onClick={() => toggleCategory(category.id)}
                  className="w-full p-4 flex items-center justify-between hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", category.color.split(' ')[0])}>
                      <Icon className={cn("w-5 h-5", category.color.split(' ')[1])} />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold">{category.name}</p>
                      <p className="text-xs text-gray-500">{category.description}</p>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  )}
                </button>

                {isExpanded && (
                  <div className="border-t divide-y">
                    {category.items.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setSelectedItem({ ...item, categoryId: category.id })}
                        className={cn(
                          "w-full p-3 flex items-center justify-between hover:bg-gray-50 text-left",
                          selectedItem?.id === item.id && "bg-gray-50"
                        )}
                      >
                        <div>
                          <p className="font-medium text-sm">{item.title}</p>
                          <p className="text-xs text-gray-500">{item.subtitle}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Content Detail */}
        <div className="lg:col-span-2">
          {selectedItem ? (
            <div className="bg-white rounded-xl border">
              <div className="p-4 border-b flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">{selectedItem.title}</h2>
                  <p className="text-sm text-gray-500">{selectedItem.subtitle}</p>
                </div>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg lg:hidden"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 space-y-6">
                {/* Render content based on category */}
                {selectedItem.categoryId === 'tutorials' && (
                  <TutorialContent content={selectedItem.content} />
                )}
                {selectedItem.categoryId === 'videos' && (
                  <VideoContent video={selectedItem} />
                )}
                {selectedItem.categoryId === 'breeds' && (
                  <BreedContent content={selectedItem.content} />
                )}
                {selectedItem.categoryId === 'diseases' && (
                  <DiseaseContent content={selectedItem.content} />
                )}
                {selectedItem.categoryId === 'nutrition' && (
                  <NutritionContent content={selectedItem.content} />
                )}
                {selectedItem.categoryId === 'environment' && (
                  <EnvironmentContent content={selectedItem.content} />
                )}
                {selectedItem.categoryId === 'vaccination' && (
                  <VaccinationContent content={selectedItem.content} />
                )}
                {selectedItem.categoryId === 'biosecurity' && (
                  <BiosecurityContent content={selectedItem.content} />
                )}
                {selectedItem.categoryId === 'management' && (
                  <ManagementContent content={selectedItem.content} />
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border p-8 text-center">
              <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Selectionnez un article pour afficher son contenu</p>
              <p className="text-sm text-gray-400 mt-2">Utilisez les filtres pour naviguer dans la documentation</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Tutorial Content Component
function TutorialContent({ content }: { content: any }) {
  return (
    <>
      <p className="text-gray-700">{content.description}</p>

      {content.steps && content.steps.map((step: any, i: number) => (
        <div key={i} className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <span className="w-6 h-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-sm font-bold">
              {i + 1}
            </span>
            {step.title}
          </h4>
          <ul className="space-y-2 ml-8">
            {step.instructions.map((instruction: string, j: number) => (
              <li key={j} className="text-sm text-gray-600 flex items-start gap-2">
                <ChevronRight className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                {instruction}
              </li>
            ))}
          </ul>
        </div>
      ))}

      {content.tips && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <h4 className="font-semibold text-orange-800 mb-2 flex items-center gap-2">
            <Lightbulb className="w-4 h-4" />
            Conseils
          </h4>
          <ul className="space-y-1">
            {content.tips.map((tip: string, i: number) => (
              <li key={i} className="text-sm text-orange-700">• {tip}</li>
            ))}
          </ul>
        </div>
      )}

      {content.alerts && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h4 className="font-semibold text-red-800 mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Alertes importantes
          </h4>
          <ul className="space-y-1">
            {content.alerts.map((alert: string, i: number) => (
              <li key={i} className="text-sm text-red-700">• {alert}</li>
            ))}
          </ul>
        </div>
      )}
    </>
  )
}

// Video Content Component (Placeholder for future YouTube integration)
function VideoContent({ video }: { video: any }) {
  return (
    <>
      {/* Video Placeholder */}
      <div className="aspect-video bg-gray-100 rounded-lg flex flex-col items-center justify-center border-2 border-dashed border-gray-300">
        <div className="p-4 bg-red-100 rounded-full mb-4">
          <Youtube className="w-12 h-12 text-red-500" />
        </div>
        <p className="text-lg font-medium text-gray-700">Video bientot disponible</p>
        <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
          <Clock className="w-4 h-4" />
          Duree: {video.duration}
        </p>
      </div>

      <p className="text-gray-700">{video.description}</p>

      {/* Topics covered */}
      <div>
        <h4 className="font-semibold mb-3">Sujets abordes dans cette video</h4>
        <div className="flex flex-wrap gap-2">
          {video.topics.map((topic: string, i: number) => (
            <span key={i} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm">
              {topic}
            </span>
          ))}
        </div>
      </div>

      {/* Coming soon notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Clock className="w-5 h-5 text-amber-600 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">Video en preparation</p>
            <p className="text-sm text-amber-700 mt-1">
              Cette video sera bientot integree. En attendant, consultez les tutoriels texte
              disponibles dans la section "Tutoriels BravoPoultry".
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

// Content Components
function BreedContent({ content }: { content: any }) {
  return (
    <>
      <p className="text-gray-700">{content.description}</p>

      <div>
        <h4 className="font-semibold mb-2">Caracteristiques</h4>
        <ul className="space-y-1">
          {content.characteristics.map((char: string, i: number) => (
            <li key={i} className="flex items-center gap-2 text-sm">
              <Star className="w-4 h-4 text-amber-500" />
              {char}
            </li>
          ))}
        </ul>
      </div>

      {content.growthTable && (
        <div>
          <h4 className="font-semibold mb-2">Table de performance</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-3 py-2 text-left">Age (j)</th>
                  <th className="px-3 py-2 text-right">Poids (g)</th>
                  <th className="px-3 py-2 text-right">Conso. (g)</th>
                  <th className="px-3 py-2 text-right">IC</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {content.growthTable.map((row: any, i: number) => (
                  <tr key={i}>
                    <td className="px-3 py-2">{row.age}</td>
                    <td className="px-3 py-2 text-right font-medium">{row.weight}</td>
                    <td className="px-3 py-2 text-right">{row.consumption}</td>
                    <td className="px-3 py-2 text-right">{row.ic || row.production}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-800 mb-2">Conseils pratiques</h4>
        <ul className="space-y-1">
          {content.tips.map((tip: string, i: number) => (
            <li key={i} className="text-sm text-blue-700">• {tip}</li>
          ))}
        </ul>
      </div>
    </>
  )
}

function DiseaseContent({ content }: { content: any }) {
  return (
    <>
      <p className="text-gray-700">{content.description}</p>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-red-50 rounded-lg p-4">
          <h4 className="font-semibold text-red-800 mb-2">Symptomes</h4>
          <ul className="space-y-1">
            {content.symptoms.map((s: string, i: number) => (
              <li key={i} className="text-sm text-red-700">• {s}</li>
            ))}
          </ul>
        </div>

        <div className="bg-green-50 rounded-lg p-4">
          <h4 className="font-semibold text-green-800 mb-2">Prevention</h4>
          <ul className="space-y-1">
            {content.prevention.map((p: string, i: number) => (
              <li key={i} className="text-sm text-green-700">• {p}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <h4 className="font-semibold text-amber-800 mb-2">Traitement</h4>
        <p className="text-sm text-amber-700">{content.treatment}</p>
      </div>

      {content.vaccines && (
        <div>
          <h4 className="font-semibold mb-2">Vaccins disponibles</h4>
          <div className="flex flex-wrap gap-2">
            {content.vaccines.map((v: string, i: number) => (
              <span key={i} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                {v}
              </span>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

function NutritionContent({ content }: { content: any }) {
  return (
    <>
      {content.description && (
        <p className="text-gray-700">{content.description}</p>
      )}

      {content.phases && (
        <div>
          <h4 className="font-semibold mb-3">Besoins par phase</h4>
          <div className="space-y-3">
            {content.phases.map((phase: any, i: number) => (
              <div key={i} className="bg-gray-50 rounded-lg p-4">
                <h5 className="font-medium text-amber-700 mb-2">{phase.name}</h5>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500">Proteine</p>
                    <p className="font-semibold">{phase.protein}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Energie</p>
                    <p className="font-semibold">{phase.energy}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Calcium</p>
                    <p className="font-semibold">{phase.calcium}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Phosphore</p>
                    <p className="font-semibold">{phase.phosphore}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {content.parameters && (
        <div>
          <h4 className="font-semibold mb-3">Parametres de qualite</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-3 py-2 text-left">Parametre</th>
                  <th className="px-3 py-2 text-center">Optimal</th>
                  <th className="px-3 py-2 text-center">Limite</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {content.parameters.map((row: any, i: number) => (
                  <tr key={i}>
                    <td className="px-3 py-2 font-medium">{row.param}</td>
                    <td className="px-3 py-2 text-center text-green-600">{row.optimal}</td>
                    <td className="px-3 py-2 text-center text-amber-600">{row.limit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {content.categories && (
        <div>
          <h4 className="font-semibold mb-3">Categories d'additifs</h4>
          <div className="space-y-2">
            {content.categories.map((cat: any, i: number) => (
              <div key={i} className="bg-gray-50 rounded-lg p-3">
                <p className="font-medium text-gray-900">{cat.name}</p>
                <p className="text-sm text-gray-600">{cat.benefit}</p>
                <p className="text-xs text-gray-500 mt-1">Usage: {cat.usage}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {content.recommendations && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h4 className="font-semibold text-amber-800 mb-2">Recommandations</h4>
          <ul className="space-y-1">
            {content.recommendations.map((rec: string, i: number) => (
              <li key={i} className="text-sm text-amber-700">• {rec}</li>
            ))}
          </ul>
        </div>
      )}

      {content.risks && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h4 className="font-semibold text-red-800 mb-2">Risques a eviter</h4>
          <ul className="space-y-1">
            {content.risks.map((risk: string, i: number) => (
              <li key={i} className="text-sm text-red-700">• {risk}</li>
            ))}
          </ul>
        </div>
      )}

      {content.tips && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h4 className="font-semibold text-amber-800 mb-2">Recommandations</h4>
          <ul className="space-y-1">
            {content.tips.map((tip: string, i: number) => (
              <li key={i} className="text-sm text-amber-700">• {tip}</li>
            ))}
          </ul>
        </div>
      )}
    </>
  )
}

function EnvironmentContent({ content }: { content: any }) {
  return (
    <>
      {content.description && (
        <p className="text-gray-700">{content.description}</p>
      )}

      {content.broiler && !content.layer && (
        <div>
          <h4 className="font-semibold mb-3">Temperature par age (Poulet de chair)</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-3 py-2 text-left">Age</th>
                  <th className="px-3 py-2 text-center">Temperature</th>
                  <th className="px-3 py-2 text-center">Humidite</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {content.broiler.map((row: any, i: number) => (
                  <tr key={i}>
                    <td className="px-3 py-2">{row.age || row.period}</td>
                    <td className="px-3 py-2 text-center font-medium text-red-600">{row.temp || row.light}</td>
                    <td className="px-3 py-2 text-center text-blue-600">{row.humidity || row.intensity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {content.broiler && content.layer && (
        <>
          <div>
            <h4 className="font-semibold mb-3">Programme lumineux - Poulet de chair</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-3 py-2 text-left">Periode</th>
                    <th className="px-3 py-2 text-center">Duree lumiere</th>
                    <th className="px-3 py-2 text-center">Intensite</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {content.broiler.map((row: any, i: number) => (
                    <tr key={i}>
                      <td className="px-3 py-2">{row.period}</td>
                      <td className="px-3 py-2 text-center font-medium">{row.light}</td>
                      <td className="px-3 py-2 text-center text-amber-600">{row.intensity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-3">Programme lumineux - Pondeuse</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-3 py-2 text-left">Periode</th>
                    <th className="px-3 py-2 text-center">Duree lumiere</th>
                    <th className="px-3 py-2 text-center">Intensite</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {content.layer.map((row: any, i: number) => (
                    <tr key={i}>
                      <td className="px-3 py-2">{row.period}</td>
                      <td className="px-3 py-2 text-center font-medium">{row.light}</td>
                      <td className="px-3 py-2 text-center text-amber-600">{row.intensity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {content.parameters && (
        <div>
          <h4 className="font-semibold mb-3">Parametres de qualite d'air</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-3 py-2 text-left">Parametre</th>
                  <th className="px-3 py-2 text-center">Limite max</th>
                  <th className="px-3 py-2 text-center">Optimal</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {content.parameters.map((row: any, i: number) => (
                  <tr key={i}>
                    <td className="px-3 py-2 font-medium">{row.param}</td>
                    <td className="px-3 py-2 text-center text-amber-600">{row.limit}</td>
                    <td className="px-3 py-2 text-center text-green-600">{row.optimal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {content.materials && (
        <div>
          <h4 className="font-semibold mb-3">Types de litiere</h4>
          <div className="space-y-2">
            {content.materials.map((mat: any, i: number) => (
              <div key={i} className="bg-gray-50 rounded-lg p-3 flex items-start justify-between">
                <div>
                  <p className="font-medium text-gray-900">{mat.type}</p>
                  <p className="text-sm text-green-600">+ {mat.pros}</p>
                  <p className="text-sm text-red-600">- {mat.cons}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {content.recommendations && (
        <div>
          <h4 className="font-semibold mb-3">Densites recommandees</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-3 py-2 text-left">Type</th>
                  <th className="px-3 py-2 text-center">Densite</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {content.recommendations.map((row: any, i: number) => (
                  <tr key={i}>
                    <td className="px-3 py-2">{row.type}</td>
                    <td className="px-3 py-2 text-center font-medium">{row.density}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {content.impacts && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h4 className="font-semibold text-amber-800 mb-2">Impacts de la densite</h4>
          <ul className="space-y-1">
            {content.impacts.map((impact: string, i: number) => (
              <li key={i} className="text-sm text-amber-700">• {impact}</li>
            ))}
          </ul>
        </div>
      )}

      {content.tips && (
        <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
          <h4 className="font-semibold text-cyan-800 mb-2">Points cles</h4>
          <ul className="space-y-1">
            {content.tips.map((tip: string, i: number) => (
              <li key={i} className="text-sm text-cyan-700">• {tip}</li>
            ))}
          </ul>
        </div>
      )}
    </>
  )
}

function VaccinationContent({ content }: { content: any }) {
  return (
    <>
      {content.description && (
        <p className="text-gray-700">{content.description}</p>
      )}

      {content.schedule && (
        <div>
          <h4 className="font-semibold mb-3">Calendrier vaccinal</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-3 py-2 text-left">Jour</th>
                  <th className="px-3 py-2 text-left">Vaccin</th>
                  <th className="px-3 py-2 text-left">Voie</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {content.schedule.map((row: any, i: number) => (
                  <tr key={i}>
                    <td className="px-3 py-2 font-medium">J{row.day}</td>
                    <td className="px-3 py-2 text-purple-700">{row.vaccine}</td>
                    <td className="px-3 py-2 text-gray-600">{row.route}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {content.techniques && (
        <div className="space-y-4">
          {content.techniques.map((tech: any, i: number) => (
            <div key={i} className="bg-gray-50 rounded-lg p-4">
              <h5 className="font-semibold text-purple-700 mb-2">{tech.method}</h5>
              <ol className="space-y-1 ml-4">
                {tech.steps.map((step: string, j: number) => (
                  <li key={j} className="text-sm text-gray-700">{j + 1}. {step}</li>
                ))}
              </ol>
              <p className="text-xs text-gray-500 mt-2 italic">Note: {tech.tips}</p>
            </div>
          ))}
        </div>
      )}

      {content.tips && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <h4 className="font-semibold text-purple-800 mb-2">Bonnes pratiques</h4>
          <ul className="space-y-1">
            {content.tips.map((tip: string, i: number) => (
              <li key={i} className="text-sm text-purple-700">• {tip}</li>
            ))}
          </ul>
        </div>
      )}
    </>
  )
}

function BiosecurityContent({ content }: { content: any }) {
  return (
    <>
      {content.description && (
        <p className="text-gray-700">{content.description}</p>
      )}

      {content.principles && (
        <div>
          <h4 className="font-semibold mb-3">Principes fondamentaux</h4>
          <ul className="space-y-2">
            {content.principles.map((p: string, i: number) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <Shield className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {content.zones && (
        <div>
          <h4 className="font-semibold mb-3">Zonage de biosecurite</h4>
          <div className="space-y-2">
            {content.zones.map((zone: any, i: number) => (
              <div key={i} className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{zone.zone}</p>
                  <p className="text-sm text-gray-600">{zone.description}</p>
                </div>
                <span className={cn(
                  "px-2 py-1 rounded text-xs font-medium",
                  zone.risk === 'Eleve' ? "bg-red-100 text-red-700" :
                  zone.risk === 'Moyen' ? "bg-amber-100 text-amber-700" :
                  "bg-green-100 text-green-700"
                )}>
                  Risque {zone.risk}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {content.steps && (
        <div>
          <h4 className="font-semibold mb-3">Protocole de nettoyage</h4>
          <div className="space-y-2">
            {content.steps.map((step: any, i: number) => (
              <div key={i} className="flex items-start gap-3">
                <span className="w-6 h-6 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-sm font-bold shrink-0">
                  {step.step}
                </span>
                <div>
                  <p className="font-medium text-gray-900">{step.action}</p>
                  <p className="text-sm text-gray-600">{step.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {content.products && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-800 mb-2">Produits recommandes</h4>
          <ul className="space-y-1">
            {content.products.map((p: string, i: number) => (
              <li key={i} className="text-sm text-blue-700">• {p}</li>
            ))}
          </ul>
        </div>
      )}

      {content.rodents && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h4 className="font-semibold text-amber-800 mb-2">Lutte anti-rongeurs</h4>
          <ul className="space-y-1">
            {content.rodents.map((r: string, i: number) => (
              <li key={i} className="text-sm text-amber-700">• {r}</li>
            ))}
          </ul>
        </div>
      )}

      {content.insects && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <h4 className="font-semibold text-purple-800 mb-2">Lutte anti-insectes</h4>
          <ul className="space-y-1">
            {content.insects.map((ins: string, i: number) => (
              <li key={i} className="text-sm text-purple-700">• {ins}</li>
            ))}
          </ul>
        </div>
      )}

      {content.tips && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-semibold text-green-800 mb-2">Conseils</h4>
          <ul className="space-y-1">
            {content.tips.map((tip: string, i: number) => (
              <li key={i} className="text-sm text-green-700">• {tip}</li>
            ))}
          </ul>
        </div>
      )}
    </>
  )
}

function ManagementContent({ content }: { content: any }) {
  return (
    <>
      {content.description && (
        <p className="text-gray-700">{content.description}</p>
      )}

      {content.preparation && (
        <div>
          <h4 className="font-semibold mb-3">Preparation avant arrivee</h4>
          <ul className="space-y-2">
            {content.preparation.map((p: string, i: number) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <ChevronRight className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {content.reception && (
        <div className="bg-orange-50 rounded-lg p-4">
          <h4 className="font-semibold text-orange-800 mb-3">A la reception</h4>
          <ul className="space-y-2">
            {content.reception.map((r: string, i: number) => (
              <li key={i} className="flex items-start gap-2 text-sm text-orange-700">
                <ChevronRight className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {content.first24h && (
        <div className="bg-green-50 rounded-lg p-4">
          <h4 className="font-semibold text-green-800 mb-3">Verification 24h</h4>
          <ul className="space-y-2">
            {content.first24h.map((f: string, i: number) => (
              <li key={i} className="flex items-start gap-2 text-sm text-green-700">
                <ChevronRight className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {content.morning && (
        <div className="space-y-4">
          <div className="bg-amber-50 rounded-lg p-4">
            <h4 className="font-semibold text-amber-800 mb-3">Routine du matin</h4>
            <ul className="space-y-1">
              {content.morning.map((m: string, i: number) => (
                <li key={i} className="text-sm text-amber-700">• {m}</li>
              ))}
            </ul>
          </div>

          {content.midday && (
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-semibold text-blue-800 mb-3">Routine midi</h4>
              <ul className="space-y-1">
                {content.midday.map((m: string, i: number) => (
                  <li key={i} className="text-sm text-blue-700">• {m}</li>
                ))}
              </ul>
            </div>
          )}

          {content.evening && (
            <div className="bg-purple-50 rounded-lg p-4">
              <h4 className="font-semibold text-purple-800 mb-3">Routine du soir</h4>
              <ul className="space-y-1">
                {content.evening.map((e: string, i: number) => (
                  <li key={i} className="text-sm text-purple-700">• {e}</li>
                ))}
              </ul>
            </div>
          )}

          {content.weekly && (
            <div className="bg-cyan-50 rounded-lg p-4">
              <h4 className="font-semibold text-cyan-800 mb-3">Taches hebdomadaires</h4>
              <ul className="space-y-1">
                {content.weekly.map((w: string, i: number) => (
                  <li key={i} className="text-sm text-cyan-700">• {w}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {content.symptoms && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h4 className="font-semibold text-red-800 mb-2">Signes de stress thermique</h4>
          <ul className="space-y-1">
            {content.symptoms.map((s: string, i: number) => (
              <li key={i} className="text-sm text-red-700">• {s}</li>
            ))}
          </ul>
        </div>
      )}

      {content.prevention && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-800 mb-2">Prevention</h4>
          <ul className="space-y-1">
            {content.prevention.map((p: string, i: number) => (
              <li key={i} className="text-sm text-blue-700">• {p}</li>
            ))}
          </ul>
        </div>
      )}

      {content.emergency && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h4 className="font-semibold text-amber-800 mb-2">Actions d'urgence</h4>
          <ul className="space-y-1">
            {content.emergency.map((e: string, i: number) => (
              <li key={i} className="text-sm text-amber-700">• {e}</li>
            ))}
          </ul>
        </div>
      )}

      {content.tips && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <h4 className="font-semibold text-orange-800 mb-2 flex items-center gap-2">
            <Lightbulb className="w-4 h-4" />
            Conseils
          </h4>
          <ul className="space-y-1">
            {content.tips.map((tip: string, i: number) => (
              <li key={i} className="text-sm text-orange-700">• {tip}</li>
            ))}
          </ul>
        </div>
      )}
    </>
  )
}
