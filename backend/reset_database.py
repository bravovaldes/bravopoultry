"""
Script to completely reset the database - drops all tables and recreates them.
WARNING: This will delete ALL data including users!
"""
import sys
import os

# Add the backend directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text
from app.db.session import engine, SessionLocal, Base

# Import all models to ensure they're registered
from app.models.user import User
from app.models.organization import Organization
from app.models.site import Site
from app.models.building import Building, Section
from app.models.lot import Lot
from app.models.production import EggProduction, WeightRecord, Mortality
from app.models.feed import FeedStock, FeedConsumption, WaterConsumption
from app.models.health import HealthEvent, VaccinationSchedule
from app.models.finance import Sale, Expense, Client
from app.models.alert import Alert


def reset_database():
    print("=" * 60)
    print("DATABASE RESET SCRIPT")
    print("=" * 60)
    print("\nWARNING: This will DELETE ALL DATA including:")
    print("  - All users")
    print("  - All organizations")
    print("  - All sites, buildings, lots")
    print("  - All production data (eggs, weights, mortality)")
    print("  - All financial data (sales, expenses)")
    print("  - All health records")
    print("  - All alerts")
    print("\nThis action is IRREVERSIBLE!")
    print("=" * 60)

    confirm = input("\nType 'RESET' to confirm: ")
    if confirm != "RESET":
        print("Aborted. Database not changed.")
        return

    print("\nDropping all tables...")

    # Drop all tables
    Base.metadata.drop_all(bind=engine)
    print("All tables dropped.")

    print("\nRecreating all tables...")

    # Recreate all tables
    Base.metadata.create_all(bind=engine)
    print("All tables recreated.")

    print("\n" + "=" * 60)
    print("DATABASE RESET COMPLETE!")
    print("=" * 60)
    print("\nThe database is now empty. You can:")
    print("1. Register a new user via the app")
    print("2. Or run seed scripts if you have any")


if __name__ == "__main__":
    reset_database()
