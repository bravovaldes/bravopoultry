"""
Migration script to add missing columns to feed_stocks and feed_stock_movements tables.
Run this script once to update the database schema.
"""
import sqlite3
import os

# Database path
DB_PATH = os.path.join(os.path.dirname(__file__), "bravopoultry.db")

def get_existing_columns(cursor, table_name):
    """Get list of existing columns in a table."""
    cursor.execute(f"PRAGMA table_info({table_name})")
    return [row[1] for row in cursor.fetchall()]

def add_column_if_not_exists(cursor, table_name, column_name, column_type, default=None):
    """Add a column if it doesn't exist."""
    existing = get_existing_columns(cursor, table_name)
    if column_name not in existing:
        default_clause = f" DEFAULT {default}" if default is not None else ""
        sql = f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}{default_clause}"
        print(f"  Adding column: {column_name}")
        cursor.execute(sql)
        return True
    else:
        print(f"  Column {column_name} already exists")
        return False

def migrate():
    """Run the migration."""
    print(f"Connecting to database: {DB_PATH}")

    if not os.path.exists(DB_PATH):
        print("Database file not found!")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        # Check if feed_stocks table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='feed_stocks'")
        if not cursor.fetchone():
            print("Table feed_stocks does not exist. It will be created when the app starts.")
            return

        print("\n=== Migrating feed_stocks table ===")
        add_column_if_not_exists(cursor, "feed_stocks", "organization_id", "TEXT")
        add_column_if_not_exists(cursor, "feed_stocks", "building_id", "TEXT")
        add_column_if_not_exists(cursor, "feed_stocks", "location_type", "VARCHAR(20)", "'site'")
        add_column_if_not_exists(cursor, "feed_stocks", "last_restock_date", "DATE")
        add_column_if_not_exists(cursor, "feed_stocks", "supplier_name", "VARCHAR(100)")
        add_column_if_not_exists(cursor, "feed_stocks", "created_at", "DATETIME")
        add_column_if_not_exists(cursor, "feed_stocks", "updated_at", "DATETIME")

        # Check if feed_stock_movements table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='feed_stock_movements'")
        if not cursor.fetchone():
            print("\nTable feed_stock_movements does not exist. Creating it...")
            cursor.execute("""
                CREATE TABLE feed_stock_movements (
                    id TEXT PRIMARY KEY,
                    stock_id TEXT NOT NULL,
                    movement_type VARCHAR(20) NOT NULL,
                    quantity_kg NUMERIC(12, 2) NOT NULL,
                    supplier_name VARCHAR(100),
                    invoice_number VARCHAR(50),
                    unit_price NUMERIC(10, 2),
                    total_amount NUMERIC(12, 2),
                    lot_id TEXT,
                    notes TEXT,
                    recorded_by TEXT,
                    created_at DATETIME,
                    date DATE,
                    FOREIGN KEY (stock_id) REFERENCES feed_stocks(id) ON DELETE CASCADE,
                    FOREIGN KEY (lot_id) REFERENCES lots(id),
                    FOREIGN KEY (recorded_by) REFERENCES users(id)
                )
            """)
            print("  Table feed_stock_movements created")
        else:
            print("\n=== Migrating feed_stock_movements table ===")
            add_column_if_not_exists(cursor, "feed_stock_movements", "supplier_name", "VARCHAR(100)")
            add_column_if_not_exists(cursor, "feed_stock_movements", "invoice_number", "VARCHAR(50)")
            add_column_if_not_exists(cursor, "feed_stock_movements", "unit_price", "NUMERIC(10, 2)")
            add_column_if_not_exists(cursor, "feed_stock_movements", "total_amount", "NUMERIC(12, 2)")
            add_column_if_not_exists(cursor, "feed_stock_movements", "lot_id", "TEXT")
            add_column_if_not_exists(cursor, "feed_stock_movements", "notes", "TEXT")
            add_column_if_not_exists(cursor, "feed_stock_movements", "date", "DATE")

        # Update existing stocks with organization_id from site
        print("\n=== Updating existing data ===")
        cursor.execute("""
            UPDATE feed_stocks
            SET organization_id = (
                SELECT organization_id FROM sites WHERE sites.id = feed_stocks.site_id
            )
            WHERE organization_id IS NULL AND site_id IS NOT NULL
        """)
        updated = cursor.rowcount
        if updated > 0:
            print(f"  Updated {updated} stocks with organization_id")

        conn.commit()
        print("\n=== Migration completed successfully! ===")

    except Exception as e:
        print(f"\nError during migration: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
