"""
Migration script to add the password_reset_tokens table.
Run with: python -m migrations.add_password_reset_tokens_table
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.db.session import engine, SessionLocal


def upgrade():
    """Create the password_reset_tokens table."""
    db = SessionLocal()
    try:
        # Check if table already exists
        result = db.execute(text("""
            SELECT name FROM sqlite_master
            WHERE type='table' AND name='password_reset_tokens'
        """))
        if result.fetchone():
            print("Table 'password_reset_tokens' already exists, skipping...")
            return

        db.execute(text("""
            CREATE TABLE password_reset_tokens (
                id VARCHAR(36) PRIMARY KEY,
                user_id VARCHAR(36) NOT NULL,
                token VARCHAR(100) UNIQUE NOT NULL,
                is_used BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                expires_at DATETIME NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """))

        # Create indexes
        db.execute(text("CREATE UNIQUE INDEX ix_password_reset_tokens_token ON password_reset_tokens(token)"))
        db.execute(text("CREATE INDEX ix_password_reset_tokens_user_id ON password_reset_tokens(user_id)"))

        db.commit()
        print("Successfully created 'password_reset_tokens' table with indexes")

    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


def downgrade():
    """Drop the password_reset_tokens table."""
    db = SessionLocal()
    try:
        db.execute(text("DROP TABLE IF EXISTS password_reset_tokens"))
        db.commit()
        print("Dropped 'password_reset_tokens' table")
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
