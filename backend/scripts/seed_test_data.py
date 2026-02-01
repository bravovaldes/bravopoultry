"""
Script de génération de données de test pour BravoPoultry

Génère des données réalistes incluant:
- Organisation et utilisateurs
- Sites et bâtiments (pondeuses + chairs)
- Lots actifs avec production sur 30 jours
- Pesées, mortalités, consommation
- Clients, fournisseurs, ventes, dépenses

Usage:
    cd backend
    python -m scripts.seed_test_data
"""

import sys
import os
import random
from datetime import datetime, date, timedelta
from decimal import Decimal
from uuid import uuid4

# Ajouter le répertoire parent au path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import bcrypt
from sqlalchemy.orm import Session

from app.db.session import SessionLocal, engine, Base
from app.models import (
    User, Organization, Site, SiteMember, Building, Section, Lot, LotStats,
    EggProduction, WeightRecord, Mortality, FeedConsumption, WaterConsumption,
    FeedStock, HealthEvent, VaccinationSchedule, Sale, Expense, Client, Supplier,
    Alert, AlertConfig
)
from app.models.user import UserRole
from app.models.organization import OrganizationType
from app.models.site import MemberRole as SiteMemberRole
from app.models.building import BuildingType, VentilationType, TrackingMode
from app.models.lot import LotType, LotStatus
from app.models.production import MortalityCause
from app.models.feed import FeedType
from app.models.health import HealthEventType, AdministrationRoute
from app.models.finance import SaleType, PaymentStatus


def hash_password(password: str) -> str:
    """Hash password using bcrypt."""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


# ============================================================================
# CONSTANTES ET DONNÉES DE RÉFÉRENCE
# ============================================================================

BREEDS_LAYER = ["Isa Brown", "Lohmann Brown", "Hy-Line Brown", "Novogen Brown"]
BREEDS_BROILER = ["Cobb 500", "Ross 308", "Arbor Acres", "Hubbard"]

SUPPLIER_NAMES = [
    ("Provenderie du Cameroun", "feed"),
    ("NKAP Aliments", "feed"),
    ("Aviculture Tropicale", "chicks"),
    ("Poussinière du Littoral", "chicks"),
    ("VetCare Cameroun", "veterinary"),
    ("Pharma-Vet Douala", "veterinary"),
    ("Agri-Equip SARL", "equipment"),
]

CLIENT_NAMES = [
    ("Supermarché Casino Douala", "retailer", "Douala"),
    ("Marché Mokolo - Mme Ngono", "wholesaler", "Yaoundé"),
    ("Restaurant Le Biniou", "restaurant", "Douala"),
    ("Hôtel Akwa Palace", "restaurant", "Douala"),
    ("Boucherie Centrale", "retailer", "Bafoussam"),
    ("M. Kamga - Grossiste", "wholesaler", "Douala"),
    ("Mme Fotso", "individual", "Yaoundé"),
    ("Alimentation Générale", "retailer", "Kribi"),
]

# Courbe de ponte réaliste (% par semaine d'âge, à partir de 18 semaines)
LAYING_CURVE = {
    18: 5, 19: 20, 20: 45, 21: 70, 22: 85, 23: 92, 24: 95, 25: 96, 26: 96,
    27: 95, 28: 95, 29: 94, 30: 94, 31: 93, 32: 93, 33: 92, 34: 92, 35: 91,
    36: 91, 37: 90, 38: 90, 39: 89, 40: 88, 41: 88, 42: 87, 43: 86, 44: 85,
    45: 84, 46: 83, 47: 82, 48: 81, 49: 80, 50: 79, 51: 78, 52: 76,
    53: 75, 54: 74, 55: 73, 56: 72, 57: 71, 58: 70, 59: 69, 60: 68,
}

# Courbe de poids poulet de chair (grammes par jour d'âge)
BROILER_WEIGHT_CURVE = {
    1: 42, 7: 170, 14: 430, 21: 850, 28: 1400, 35: 2050, 42: 2700, 49: 3200, 56: 3600
}


# ============================================================================
# FONCTIONS UTILITAIRES
# ============================================================================

def random_phone():
    """Génère un numéro de téléphone camerounais."""
    prefix = random.choice(["6", "2"])
    return f"+237 {prefix}{random.randint(50000000, 99999999)}"


def get_laying_rate(age_weeks: int) -> float:
    """Retourne le taux de ponte attendu selon l'âge."""
    if age_weeks < 18:
        return 0
    if age_weeks > 60:
        return 65
    return LAYING_CURVE.get(age_weeks, 75)


def get_broiler_weight(age_days: int) -> int:
    """Retourne le poids attendu d'un poulet de chair selon l'âge."""
    if age_days <= 1:
        return 42

    # Interpolation entre les points connus
    sorted_days = sorted(BROILER_WEIGHT_CURVE.keys())
    for i, d in enumerate(sorted_days[:-1]):
        if d <= age_days < sorted_days[i + 1]:
            d1, d2 = d, sorted_days[i + 1]
            w1, w2 = BROILER_WEIGHT_CURVE[d1], BROILER_WEIGHT_CURVE[d2]
            ratio = (age_days - d1) / (d2 - d1)
            return int(w1 + ratio * (w2 - w1))

    return BROILER_WEIGHT_CURVE[56]


def add_variance(value: float, variance_pct: float = 5) -> float:
    """Ajoute une variance aléatoire à une valeur."""
    factor = 1 + random.uniform(-variance_pct, variance_pct) / 100
    return value * factor


# ============================================================================
# GÉNÉRATION DES DONNÉES
# ============================================================================

def create_organization(db: Session) -> Organization:
    """Crée l'organisation principale."""
    org = Organization(
        id=str(uuid4()),
        name="Ferme Avicole Bravo",
        type=OrganizationType.COMPANY,
        registration_number="RC/DLA/2023/B/1234",
        tax_id="M012345678901X",
        address="BP 1234, Zone Industrielle",
        city="Douala",
        country="Cameroun",
        phone="+237 233 45 67 89",
        email="contact@bravopoultry.cm",
    )
    db.add(org)
    db.flush()
    print(f"  [+] Organisation: {org.name}")
    return org


def create_users(db: Session, org: Organization) -> list[User]:
    """Crée les utilisateurs de test."""
    users = []
    user_data = [
        ("admin@bravopoultry.cm", "Admin", "Bravo", UserRole.OWNER, True),
        ("manager@bravopoultry.cm", "Jean", "Kamga", UserRole.MANAGER, False),
        ("tech@bravopoultry.cm", "Marie", "Ngo", UserRole.TECHNICIAN, False),
        ("comptable@bravopoultry.cm", "Paul", "Ngono", UserRole.ACCOUNTANT, False),
    ]

    for email, first_name, last_name, role, is_superuser in user_data:
        user = User(
            id=str(uuid4()),
            organization_id=org.id,
            email=email,
            phone=random_phone(),
            password_hash=hash_password("password123"),
            first_name=first_name,
            last_name=last_name,
            role=role,
            is_active=True,
            is_superuser=is_superuser,
            is_verified=True,
        )
        db.add(user)
        users.append(user)
        print(f"  [+] Utilisateur: {first_name} {last_name} ({role.value})")

    db.flush()
    return users


def create_sites(db: Session, org: Organization, users: list[User]) -> list[Site]:
    """Crée les sites de production."""
    sites = []
    site_data = [
        ("Site Douala - Bonabéri", "DLA-01", "Bonabéri", "Littoral", 4.0689, 9.6986, 15000, 2.5),
        ("Site Yaoundé - Nsimalen", "YDE-01", "Nsimalen", "Centre", 3.7167, 11.5500, 8000, 1.5),
    ]

    for name, code, city, region, lat, lon, capacity, surface in site_data:
        site = Site(
            id=str(uuid4()),
            organization_id=org.id,
            name=name,
            code=code,
            city=city,
            region=region,
            country="Cameroun",
            gps_latitude=Decimal(str(lat)),
            gps_longitude=Decimal(str(lon)),
            total_capacity=capacity,
            surface_hectares=Decimal(str(surface)),
            is_active=True,
        )
        db.add(site)
        sites.append(site)
        print(f"  [+] Site: {name}")

        # Ajouter les membres du site
        for user in users:
            role = SiteMemberRole.ADMIN if user.role == UserRole.OWNER else SiteMemberRole.MANAGER
            member = SiteMember(
                id=str(uuid4()),
                site_id=site.id,
                user_id=user.id,
                role=role,
                can_edit=True,
                can_delete=user.role in [UserRole.OWNER, UserRole.MANAGER],
                can_manage_users=user.role == UserRole.OWNER,
            )
            db.add(member)

    db.flush()
    return sites


def create_buildings(db: Session, sites: list[Site]) -> list[Building]:
    """Crée les bâtiments pour chaque site."""
    buildings = []

    building_configs = [
        # Site Douala
        (0, "Bâtiment Pondeuses A", "PON-A", BuildingType.LAYER, 5000, 800),
        (0, "Bâtiment Pondeuses B", "PON-B", BuildingType.LAYER, 5000, 800),
        (0, "Bâtiment Chairs 1", "CHA-1", BuildingType.BROILER, 5000, 600),
        # Site Yaoundé
        (1, "Bâtiment Pondeuses", "PON-1", BuildingType.LAYER, 4000, 650),
        (1, "Bâtiment Chairs", "CHA-1", BuildingType.BROILER, 4000, 500),
    ]

    for site_idx, name, code, btype, capacity, surface in building_configs:
        building = Building(
            id=str(uuid4()),
            site_id=sites[site_idx].id,
            name=name,
            code=code,
            building_type=btype,
            tracking_mode=TrackingMode.LOTS,
            capacity=capacity,
            surface_m2=surface,
            ventilation_type=VentilationType.TUNNEL,
            has_electricity=True,
            has_water=True,
            has_generator=True,
            feeder_type="Automatique",
            feeder_count=capacity // 50,
            drinker_type="Nipple",
            drinker_count=capacity // 25,
            construction_year=2020,
            is_active=True,
        )
        db.add(building)
        buildings.append(building)
        print(f"  [+] Bâtiment: {name} ({btype.value})")

    db.flush()
    return buildings


def create_lots(db: Session, buildings: list[Building], user: User) -> list[Lot]:
    """Crée les lots actifs."""
    lots = []
    today = date.today()

    lot_configs = [
        # Pondeuses Douala A - lot en production depuis 10 semaines (28 semaines d'âge)
        (0, "LOT-2024-P001", "Pondeuses Batch 1", LotType.LAYER, "Isa Brown", 4800,
         today - timedelta(days=70), 126, LotStatus.ACTIVE),
        # Pondeuses Douala B - lot plus récent (22 semaines d'âge)
        (1, "LOT-2024-P002", "Pondeuses Batch 2", LotType.LAYER, "Lohmann Brown", 4900,
         today - timedelta(days=28), 126, LotStatus.ACTIVE),
        # Chairs Douala - lot à 35 jours
        (2, "LOT-2025-C001", "Chairs Batch Jan", LotType.BROILER, "Cobb 500", 4500,
         today - timedelta(days=35), 1, LotStatus.ACTIVE),
        # Pondeuses Yaoundé - lot mature (35 semaines)
        (3, "LOT-2024-P003", "Pondeuses YDE", LotType.LAYER, "Hy-Line Brown", 3800,
         today - timedelta(days=119), 126, LotStatus.ACTIVE),
        # Chairs Yaoundé - lot à 21 jours
        (4, "LOT-2025-C002", "Chairs Batch 2", LotType.BROILER, "Ross 308", 3900,
         today - timedelta(days=21), 1, LotStatus.ACTIVE),
    ]

    for bldg_idx, code, name, ltype, breed, qty, placement, age_placement, status in lot_configs:
        lot = Lot(
            id=str(uuid4()),
            building_id=buildings[bldg_idx].id,
            code=code,
            name=name,
            type=ltype,
            status=status,
            breed=breed,
            supplier="Aviculture Tropicale" if ltype == LotType.LAYER else "Poussinière du Littoral",
            initial_quantity=qty,
            current_quantity=int(qty * 0.97),  # 3% mortalité initiale
            placement_date=placement,
            age_at_placement=age_placement,
            chick_price_unit=Decimal("350") if ltype == LotType.LAYER else Decimal("280"),
            transport_cost=Decimal("50000"),
            target_weight_g=2800 if ltype == LotType.BROILER else None,
            target_fcr=Decimal("1.75") if ltype == LotType.BROILER else None,
            target_laying_rate=Decimal("92") if ltype == LotType.LAYER else None,
            created_by=user.id,
        )
        db.add(lot)
        lots.append(lot)
        print(f"  [+] Lot: {code} - {name} ({ltype.value})")

    db.flush()
    return lots


def create_egg_production(db: Session, lots: list[Lot], user: User):
    """Génère la production d'oeufs sur 30 jours pour les lots pondeuses."""
    today = date.today()
    layer_lots = [lot for lot in lots if lot.type == LotType.LAYER]

    for lot in layer_lots:
        print(f"  [+] Production oeufs pour {lot.code}...")

        for day_offset in range(30, 0, -1):
            record_date = today - timedelta(days=day_offset)

            # Calculer l'âge du lot à cette date
            days_since_placement = (record_date - lot.placement_date).days
            age_days = lot.age_at_placement + days_since_placement
            age_weeks = age_days // 7

            # Obtenir le taux de ponte théorique avec variance
            base_rate = get_laying_rate(age_weeks)
            if base_rate == 0:
                continue

            actual_rate = add_variance(base_rate, 3)

            # Calculer la production
            hen_count = lot.current_quantity
            total_eggs = int(hen_count * actual_rate / 100)

            # Répartition des oeufs
            cracked_pct = random.uniform(1, 3) / 100
            dirty_pct = random.uniform(0.5, 2) / 100
            small_pct = random.uniform(1, 4) / 100
            double_yolk_pct = random.uniform(0.2, 1) / 100
            soft_shell_pct = random.uniform(0.1, 0.5) / 100

            cracked = int(total_eggs * cracked_pct)
            dirty = int(total_eggs * dirty_pct)
            small = int(total_eggs * small_pct)
            double_yolk = int(total_eggs * double_yolk_pct)
            soft_shell = int(total_eggs * soft_shell_pct)
            normal = total_eggs - cracked - dirty - small - double_yolk - soft_shell

            production = EggProduction(
                id=str(uuid4()),
                lot_id=lot.id,
                date=record_date,
                normal_eggs=max(0, normal),
                cracked_eggs=cracked,
                dirty_eggs=dirty,
                small_eggs=small,
                double_yolk_eggs=double_yolk,
                soft_shell_eggs=soft_shell,
                hen_count=hen_count,
                laying_rate=Decimal(str(round(actual_rate, 2))),
                avg_egg_weight_g=Decimal(str(random.randint(58, 65))),
                recorded_by=user.id,
            )
            production.calculate_totals()
            db.add(production)

    db.flush()


def create_weight_records(db: Session, lots: list[Lot], user: User):
    """Génère les pesées pour les lots de chair."""
    today = date.today()
    broiler_lots = [lot for lot in lots if lot.type == LotType.BROILER]

    for lot in broiler_lots:
        print(f"  [+] Pesées pour {lot.code}...")

        # Pesée tous les 7 jours depuis le placement
        days_since_placement = (today - lot.placement_date).days

        for day in range(7, days_since_placement + 1, 7):
            record_date = lot.placement_date + timedelta(days=day)
            age_days = lot.age_at_placement + day

            expected_weight = get_broiler_weight(age_days)
            actual_weight = int(add_variance(expected_weight, 5))

            # Uniformité (CV)
            uniformity = random.uniform(6, 12)
            std_dev = actual_weight * uniformity / 100

            record = WeightRecord(
                id=str(uuid4()),
                lot_id=lot.id,
                date=record_date,
                age_days=age_days,
                average_weight_g=actual_weight,
                sample_size=min(100, lot.current_quantity // 50),
                min_weight_g=int(actual_weight - 2 * std_dev),
                max_weight_g=int(actual_weight + 2 * std_dev),
                std_deviation=Decimal(str(round(std_dev, 1))),
                uniformity_cv=Decimal(str(round(uniformity, 1))),
                standard_weight_g=expected_weight,
                weight_vs_standard=Decimal(str(round((actual_weight - expected_weight) / expected_weight * 100, 1))),
                recorded_by=user.id,
            )
            db.add(record)

    db.flush()


def create_mortalities(db: Session, lots: list[Lot], user: User):
    """Génère les mortalités quotidiennes."""
    today = date.today()

    for lot in lots:
        print(f"  [+] Mortalités pour {lot.code}...")

        days_to_generate = min(30, (today - lot.placement_date).days)

        for day_offset in range(days_to_generate, 0, -1):
            record_date = today - timedelta(days=day_offset)

            # Mortalité plus élevée les premiers jours
            age_days = lot.age_at_placement + (record_date - lot.placement_date).days

            if age_days < 7:
                base_mortality = random.uniform(0.15, 0.3)  # 0.15-0.3% premiers jours
            elif age_days < 21:
                base_mortality = random.uniform(0.05, 0.15)
            else:
                base_mortality = random.uniform(0.02, 0.08)

            qty = max(0, int(lot.current_quantity * base_mortality / 100))

            if qty > 0:
                causes = [MortalityCause.DISEASE, MortalityCause.CRUSHING,
                         MortalityCause.HEAT_STRESS, MortalityCause.UNKNOWN]

                mortality = Mortality(
                    id=str(uuid4()),
                    lot_id=lot.id,
                    date=record_date,
                    quantity=qty,
                    cause=random.choice(causes),
                    recorded_by=user.id,
                )
                db.add(mortality)

    db.flush()


def create_feed_consumption(db: Session, lots: list[Lot], suppliers: list[Supplier], user: User):
    """Génère la consommation d'aliment quotidienne."""
    today = date.today()
    feed_suppliers = [s for s in suppliers if s.supplier_type == "feed"]

    for lot in lots:
        print(f"  [+] Consommation aliment pour {lot.code}...")

        days_to_generate = min(30, (today - lot.placement_date).days)

        for day_offset in range(days_to_generate, 0, -1):
            record_date = today - timedelta(days=day_offset)
            age_days = lot.age_at_placement + (record_date - lot.placement_date).days

            # Déterminer le type d'aliment selon l'âge et le type de lot
            if lot.type == LotType.BROILER:
                if age_days <= 10:
                    feed_type = FeedType.STARTER
                    feed_per_bird = 25 + age_days * 5  # g/jour
                elif age_days <= 25:
                    feed_type = FeedType.GROWER
                    feed_per_bird = 80 + (age_days - 10) * 8
                else:
                    feed_type = FeedType.FINISHER
                    feed_per_bird = 150 + (age_days - 25) * 5
                price_per_kg = Decimal("320")
            else:  # LAYER
                age_weeks = age_days // 7
                if age_weeks < 18:
                    feed_type = FeedType.PRE_LAYER
                    feed_per_bird = 80 + age_weeks * 2
                else:
                    feed_type = FeedType.LAYER
                    feed_per_bird = 110 + random.randint(-5, 5)
                price_per_kg = Decimal("300")

            feed_per_bird = add_variance(feed_per_bird, 5)
            quantity_kg = lot.current_quantity * feed_per_bird / 1000

            consumption = FeedConsumption(
                id=str(uuid4()),
                lot_id=lot.id,
                date=record_date,
                feed_type=feed_type,
                brand=random.choice(["Premium Feed", "Nutri-Poultry", "AviPro"]),
                quantity_kg=Decimal(str(round(quantity_kg, 1))),
                price_per_kg=price_per_kg,
                total_cost=Decimal(str(round(float(quantity_kg * float(price_per_kg)), 0))),
                supplier_id=random.choice(feed_suppliers).id if feed_suppliers else None,
                bird_count=lot.current_quantity,
                feed_per_bird_g=Decimal(str(round(feed_per_bird, 1))),
                recorded_by=user.id,
            )
            db.add(consumption)

    db.flush()


def create_water_consumption(db: Session, lots: list[Lot], user: User):
    """Génère la consommation d'eau quotidienne."""
    today = date.today()

    for lot in lots:
        print(f"  [+] Consommation eau pour {lot.code}...")

        days_to_generate = min(30, (today - lot.placement_date).days)

        for day_offset in range(days_to_generate, 0, -1):
            record_date = today - timedelta(days=day_offset)
            age_days = lot.age_at_placement + (record_date - lot.placement_date).days

            # Ratio eau/aliment ~ 1.8 à 2.2
            if lot.type == LotType.BROILER:
                if age_days <= 10:
                    water_per_bird = (25 + age_days * 5) * 2.0
                elif age_days <= 25:
                    water_per_bird = (80 + (age_days - 10) * 8) * 1.9
                else:
                    water_per_bird = (150 + (age_days - 25) * 5) * 1.8
            else:
                water_per_bird = 220 + random.randint(-20, 20)  # ml/jour pour pondeuses

            water_per_bird = add_variance(water_per_bird, 8)
            quantity_liters = lot.current_quantity * water_per_bird / 1000

            consumption = WaterConsumption(
                id=str(uuid4()),
                lot_id=lot.id,
                date=record_date,
                quantity_liters=Decimal(str(round(quantity_liters, 1))),
                bird_count=lot.current_quantity,
                water_per_bird_ml=Decimal(str(round(water_per_bird, 1))),
                water_feed_ratio=Decimal(str(round(random.uniform(1.8, 2.2), 2))),
                recorded_by=user.id,
            )
            db.add(consumption)

    db.flush()


def create_clients(db: Session, org: Organization) -> list[Client]:
    """Crée les clients."""
    clients = []

    for name, ctype, city in CLIENT_NAMES:
        client = Client(
            id=str(uuid4()),
            organization_id=org.id,
            name=name,
            phone=random_phone(),
            city=city,
            client_type=ctype,
            credit_limit=Decimal(str(random.choice([0, 500000, 1000000, 2000000]))),
            payment_terms_days=random.choice([0, 7, 15, 30]),
            is_active=True,
        )
        db.add(client)
        clients.append(client)
        print(f"  [+] Client: {name} ({ctype})")

    db.flush()
    return clients


def create_suppliers(db: Session, org: Organization) -> list[Supplier]:
    """Crée les fournisseurs."""
    suppliers = []

    for name, stype in SUPPLIER_NAMES:
        supplier = Supplier(
            id=str(uuid4()),
            organization_id=org.id,
            name=name,
            phone=random_phone(),
            city=random.choice(["Douala", "Yaoundé"]),
            supplier_type=stype,
            quality_rating=random.randint(3, 5),
            delivery_rating=random.randint(3, 5),
            price_rating=random.randint(3, 5),
            is_active=True,
        )
        db.add(supplier)
        suppliers.append(supplier)
        print(f"  [+] Fournisseur: {name} ({stype})")

    db.flush()
    return suppliers


def create_sales(db: Session, lots: list[Lot], sites: list[Site], clients: list[Client], user: User):
    """Génère les ventes sur 30 jours."""
    today = date.today()
    layer_lots = [lot for lot in lots if lot.type == LotType.LAYER]

    print("  [+] Génération des ventes d'oeufs...")

    for lot in layer_lots:
        site_id = None
        for bldg in lots:
            if bldg.id == lot.building_id:
                continue

        # Trouver le site du lot
        from sqlalchemy import select
        from app.models import Building

        # Ventes tous les 2-3 jours
        for day_offset in range(28, 0, -random.randint(2, 3)):
            sale_date = today - timedelta(days=day_offset)

            # Quantité basée sur production (alvéoles de 30 oeufs)
            trays = random.randint(50, 150)
            unit_price = random.choice([1800, 1900, 2000, 2100])
            total = trays * unit_price

            client = random.choice(clients)
            paid = random.random() > 0.2  # 80% payées

            sale = Sale(
                id=str(uuid4()),
                lot_id=lot.id,
                site_id=sites[0].id if lot.code.startswith("LOT-2024-P00") or lot.code.startswith("LOT-2025-C001") else sites[1].id,
                date=sale_date,
                sale_type=SaleType.EGGS_TRAY,
                quantity=trays,
                unit="tray",
                unit_price=Decimal(str(unit_price)),
                total_amount=Decimal(str(total)),
                client_id=client.id,
                client_name=client.name,
                payment_status=PaymentStatus.PAID if paid else PaymentStatus.PENDING,
                amount_paid=Decimal(str(total)) if paid else Decimal("0"),
                payment_date=sale_date if paid else None,
                payment_method="cash" if paid and random.random() > 0.5 else "mobile_money",
                recorded_by=user.id,
            )
            db.add(sale)

    db.flush()


def create_expenses(db: Session, lots: list[Lot], sites: list[Site], suppliers: list[Supplier], user: User):
    """Génère les dépenses sur 30 jours."""
    today = date.today()

    print("  [+] Génération des dépenses...")

    expense_categories = [
        ("FEED", "Aliment poulet", 50, 200, "kg", 320),
        ("VETERINARY", "Vaccin Newcastle", 1, 5, "flacon", 15000),
        ("MEDICINE", "Vitamine AD3E", 1, 3, "litre", 8000),
        ("LABOR", "Main d'oeuvre journalière", 1, 5, "jour", 3000),
        ("ENERGY", "Carburant groupe électrogène", 20, 50, "litre", 700),
        ("UTILITIES", "Facture électricité", 1, 1, "mois", 150000),
        ("WATER", "Facture eau", 1, 1, "mois", 50000),
        ("PACKAGING", "Alvéoles oeufs", 50, 200, "pièce", 100),
        ("MAINTENANCE", "Réparation abreuvoir", 1, 3, "pièce", 5000),
    ]

    for site in sites:
        for day_offset in range(30, 0, -1):
            expense_date = today - timedelta(days=day_offset)

            # 1-2 dépenses par jour par site
            num_expenses = random.randint(0, 2)

            for _ in range(num_expenses):
                cat, desc, qty_min, qty_max, unit, price = random.choice(expense_categories)
                qty = random.randint(qty_min, qty_max)
                amount = qty * price

                supplier = random.choice([s for s in suppliers if s.supplier_type in ["feed", "veterinary", "equipment"]] or suppliers)

                expense = Expense(
                    id=str(uuid4()),
                    site_id=site.id,
                    date=expense_date,
                    category=cat,
                    description=desc,
                    quantity=Decimal(str(qty)),
                    unit=unit,
                    unit_price=Decimal(str(price)),
                    amount=Decimal(str(amount)),
                    supplier_id=supplier.id,
                    supplier_name=supplier.name,
                    is_paid=random.random() > 0.1,
                    payment_method="cash" if random.random() > 0.5 else "bank_transfer",
                    recorded_by=user.id,
                )
                db.add(expense)

    db.flush()


def create_health_events(db: Session, lots: list[Lot], user: User):
    """Génère les événements sanitaires (vaccinations, traitements)."""
    today = date.today()

    print("  [+] Génération des événements sanitaires...")

    vaccinations = [
        (1, "Marek", "injection"),
        (7, "Newcastle B1", "eau"),
        (14, "Gumboro", "eau"),
        (21, "Newcastle La Sota", "eau"),
        (28, "Gumboro rappel", "eau"),
    ]

    for lot in lots:
        days_since_placement = (today - lot.placement_date).days
        age_start = lot.age_at_placement

        for day, vaccine, route in vaccinations:
            actual_age = age_start + day
            days_in_lot = day

            if days_in_lot <= days_since_placement and actual_age <= age_start + days_since_placement:
                event_date = lot.placement_date + timedelta(days=days_in_lot)

                event = HealthEvent(
                    id=str(uuid4()),
                    lot_id=lot.id,
                    date=event_date,
                    event_type=HealthEventType.VACCINATION,
                    product_name=vaccine,
                    manufacturer="Ceva Santé Animale",
                    route=AdministrationRoute.WATER if route == "eau" else AdministrationRoute.INJECTION,
                    target_disease=vaccine.split()[0],
                    cost=Decimal(str(random.randint(10000, 30000))),
                    recorded_by=user.id,
                )
                db.add(event)

    db.flush()


def create_lot_stats(db: Session, lots: list[Lot]):
    """Crée les statistiques pré-calculées pour chaque lot."""
    print("  [+] Calcul des statistiques des lots...")

    for lot in lots:
        mortality_rate = round((lot.initial_quantity - lot.current_quantity) / lot.initial_quantity * 100, 2)

        if lot.type == LotType.LAYER:
            stats = LotStats(
                lot_id=lot.id,
                total_mortality=lot.initial_quantity - lot.current_quantity,
                mortality_rate=Decimal(str(mortality_rate)),
                total_eggs=random.randint(80000, 120000),
                average_laying_rate=Decimal(str(random.uniform(88, 94))),
                peak_laying_rate=Decimal("96.5"),
                total_feed_kg=Decimal(str(random.randint(15000, 25000))),
                feed_per_egg=Decimal(str(random.uniform(0.12, 0.15))),
                total_expenses=Decimal(str(random.randint(3000000, 5000000))),
                total_sales=Decimal(str(random.randint(4000000, 7000000))),
                performance_score=random.randint(75, 95),
            )
        else:  # BROILER
            age_days = lot.age_at_placement + (date.today() - lot.placement_date).days
            current_weight = get_broiler_weight(age_days)

            stats = LotStats(
                lot_id=lot.id,
                total_mortality=lot.initial_quantity - lot.current_quantity,
                mortality_rate=Decimal(str(mortality_rate)),
                current_weight_g=current_weight,
                daily_gain_g=Decimal(str(round(current_weight / age_days, 1))),
                uniformity=Decimal(str(random.uniform(85, 92))),
                total_feed_kg=Decimal(str(random.randint(8000, 15000))),
                feed_conversion_ratio=Decimal(str(random.uniform(1.65, 1.85))),
                total_expenses=Decimal(str(random.randint(2000000, 4000000))),
                total_sales=Decimal("0"),  # Pas encore vendu
                performance_score=random.randint(70, 90),
            )

        db.add(stats)

    db.flush()


# ============================================================================
# FONCTION PRINCIPALE
# ============================================================================

def seed_database():
    """Fonction principale de seed."""
    print("\n" + "=" * 60)
    print("  GÉNÉRATION DES DONNÉES DE TEST - BRAVOPOULTRY")
    print("=" * 60 + "\n")

    db = SessionLocal()

    try:
        print("[1/14] Création de l'organisation...")
        org = create_organization(db)

        print("\n[2/14] Création des utilisateurs...")
        users = create_users(db, org)
        admin = users[0]

        print("\n[3/14] Création des fournisseurs...")
        suppliers = create_suppliers(db, org)

        print("\n[4/14] Création des clients...")
        clients = create_clients(db, org)

        print("\n[5/14] Création des sites...")
        sites = create_sites(db, org, users)

        print("\n[6/14] Création des bâtiments...")
        buildings = create_buildings(db, sites)

        print("\n[7/14] Création des lots...")
        lots = create_lots(db, buildings, admin)

        print("\n[8/14] Génération de la production d'oeufs (30 jours)...")
        create_egg_production(db, lots, admin)

        print("\n[9/14] Génération des pesées (chairs)...")
        create_weight_records(db, lots, admin)

        print("\n[10/14] Génération des mortalités...")
        create_mortalities(db, lots, admin)

        print("\n[11/14] Génération de la consommation d'aliment...")
        create_feed_consumption(db, lots, suppliers, admin)

        print("\n[12/14] Génération de la consommation d'eau...")
        create_water_consumption(db, lots, admin)

        print("\n[13/14] Génération des ventes et dépenses...")
        create_sales(db, lots, sites, clients, admin)
        create_expenses(db, lots, sites, suppliers, admin)

        print("\n[14/14] Génération des événements sanitaires...")
        create_health_events(db, lots, admin)
        create_lot_stats(db, lots)

        db.commit()

        print("\n" + "=" * 60)
        print("  SEED TERMINÉ AVEC SUCCÈS!")
        print("=" * 60)
        print(f"""
Données générées:
  - 1 organisation
  - {len(users)} utilisateurs
  - {len(sites)} sites
  - {len(buildings)} bâtiments
  - {len(lots)} lots actifs
  - 30 jours de production d'oeufs
  - Pesées hebdomadaires pour les chairs
  - Mortalités, consommation aliment/eau
  - {len(clients)} clients
  - {len(suppliers)} fournisseurs
  - Ventes et dépenses

Identifiants de connexion:
  - Email: admin@bravopoultry.cm
  - Mot de passe: password123
""")

    except Exception as e:
        db.rollback()
        print(f"\n[ERREUR] {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
