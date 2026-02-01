"""
Migration script to add the invitations table.
Run with: python -m migrations.add_invitations_table
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.db.session import engine, SessionLocal

def upgrade():
    """Create the invitations table."""
    db = SessionLocal()
    try:
        # Check if table already exists
        result = db.execute(text("""
            SELECT name FROM sqlite_master
            WHERE type='table' AND name='invitations'
        """))
        if result.fetchone():
            print("Table 'invitations' already exists, skipping...")
            return

        db.execute(text("""
            CREATE TABLE invitations (
                id VARCHAR(36) PRIMARY KEY,
                organization_id VARCHAR(36) NOT NULL,
                invited_by_id VARCHAR(36) NOT NULL,
                email VARCHAR(255) NOT NULL,
                first_name VARCHAR(100),
                last_name VARCHAR(100),
                phone VARCHAR(20),
                role VARCHAR(50) DEFAULT 'technician',
                token VARCHAR(100) UNIQUE NOT NULL,
                status VARCHAR(20) DEFAULT 'pending',
                expires_at DATETIME NOT NULL,
                accepted_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (organization_id) REFERENCES organizations(id),
                FOREIGN KEY (invited_by_id) REFERENCES users(id)
            )
        """))

        # Create indexes
        db.execute(text("CREATE INDEX ix_invitations_email ON invitations(email)"))
        db.execute(text("CREATE INDEX ix_invitations_token ON invitations(token)"))
        db.execute(text("CREATE INDEX ix_invitations_organization_id ON invitations(organization_id)"))

        db.commit()
        print("Successfully created 'invitations' table with indexes")

    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


def downgrade():
    """Drop the invitations table."""
    db = SessionLocal()
    try:
        db.execute(text("DROP TABLE IF EXISTS invitations"))
        db.commit()
        print("Dropped 'invitations' table")
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "downgrade":
        downgrade()
    else:
        upgrade()
