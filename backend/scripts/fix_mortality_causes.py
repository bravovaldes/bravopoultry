"""
Script de correction des causes de mortalité dans la base de données.

Corrige les anciennes valeurs qui ne correspondent pas à l'enum MortalityCause:
- 'heat' -> 'heat_stress'
- 'cold' -> 'cold_stress'

Usage:
    cd backend
    python -m scripts.fix_mortality_causes
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.db.session import SessionLocal


# Mapping des anciennes valeurs vers les nouvelles
CAUSE_MAPPINGS = {
    'heat': 'heat_stress',
    'cold': 'cold_stress',
    # Correction des valeurs en majuscules (nom enum vs valeur enum)
    'DISEASE': 'disease',
    'HEAT_STRESS': 'heat_stress',
    'COLD_STRESS': 'cold_stress',
    'CRUSHING': 'crushing',
    'CULLING': 'culling',
    'PREDATOR': 'predator',
    'ACCIDENT': 'accident',
    'LAYING_ACCIDENT': 'laying_accident',
    'DEHYDRATION': 'dehydration',
    'UNKNOWN': 'unknown',
    'OTHER': 'other',
}


def fix_mortality_causes():
    """Corrige les causes de mortalité invalides dans la base."""
    db = SessionLocal()

    try:
        print("\n" + "=" * 50)
        print("  CORRECTION DES CAUSES DE MORTALITE")
        print("=" * 50 + "\n")

        total_fixed = 0

        for old_value, new_value in CAUSE_MAPPINGS.items():
            # Compter les enregistrements à corriger
            count_query = text(
                "SELECT COUNT(*) FROM mortalities WHERE cause = :old_value"
            )
            result = db.execute(count_query, {"old_value": old_value})
            count = result.scalar()

            if count > 0:
                print(f"  Correction de '{old_value}' -> '{new_value}': {count} enregistrements")

                # Mettre à jour les valeurs
                update_query = text(
                    "UPDATE mortalities SET cause = :new_value WHERE cause = :old_value"
                )
                db.execute(update_query, {"old_value": old_value, "new_value": new_value})
                total_fixed += count
            else:
                print(f"  Aucun enregistrement avec '{old_value}'")

        db.commit()

        print("\n" + "-" * 50)
        print(f"  Total corrige: {total_fixed} enregistrements")
        print("=" * 50 + "\n")

        # Afficher la distribution actuelle des causes
        print("Distribution actuelle des causes de mortalité:")
        dist_query = text(
            "SELECT cause, COUNT(*) as count FROM mortalities GROUP BY cause ORDER BY count DESC"
        )
        result = db.execute(dist_query)
        for row in result:
            print(f"  - {row[0]}: {row[1]}")

    except Exception as e:
        db.rollback()
        print(f"\n[ERREUR] {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    fix_mortality_causes()
