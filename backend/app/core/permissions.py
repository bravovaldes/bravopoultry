"""
Role-based permissions system for BravoPoultry.

Roles and their permissions:
- OWNER: Full access to everything
- MANAGER: Manage lots, production, sales, expenses, sites, buildings
- TECHNICIAN: Daily entries only (production, feed, mortality, health records)
- ACCOUNTANT: Financial operations (sales, expenses, reports)
- VIEWER: Read-only access to everything
"""

from functools import wraps
from fastapi import HTTPException, status
from typing import List, Callable

# Define permission levels
class Permission:
    # Team management
    MANAGE_TEAM = "manage_team"
    INVITE_MEMBERS = "invite_members"

    # Organization
    MANAGE_ORGANIZATION = "manage_organization"

    # Sites & Buildings
    CREATE_SITE = "create_site"
    EDIT_SITE = "edit_site"
    DELETE_SITE = "delete_site"
    CREATE_BUILDING = "create_building"
    EDIT_BUILDING = "edit_building"
    DELETE_BUILDING = "delete_building"

    # Lots
    CREATE_LOT = "create_lot"
    EDIT_LOT = "edit_lot"
    DELETE_LOT = "delete_lot"

    # Daily entries (production data)
    RECORD_PRODUCTION = "record_production"
    RECORD_FEED = "record_feed"
    RECORD_MORTALITY = "record_mortality"
    RECORD_HEALTH = "record_health"
    RECORD_WEIGHT = "record_weight"

    # Financial
    CREATE_SALE = "create_sale"
    EDIT_SALE = "edit_sale"
    DELETE_SALE = "delete_sale"
    RECORD_PAYMENT = "record_payment"
    CREATE_EXPENSE = "create_expense"
    EDIT_EXPENSE = "edit_expense"
    DELETE_EXPENSE = "delete_expense"

    # Clients & Suppliers
    MANAGE_CLIENTS = "manage_clients"
    MANAGE_SUPPLIERS = "manage_suppliers"

    # Reports
    VIEW_REPORTS = "view_reports"
    VIEW_ANALYTICS = "view_analytics"
    EXPORT_DATA = "export_data"


# Role permissions mapping
ROLE_PERMISSIONS = {
    "owner": [
        # Owner has ALL permissions
        Permission.MANAGE_TEAM,
        Permission.INVITE_MEMBERS,
        Permission.MANAGE_ORGANIZATION,
        Permission.CREATE_SITE,
        Permission.EDIT_SITE,
        Permission.DELETE_SITE,
        Permission.CREATE_BUILDING,
        Permission.EDIT_BUILDING,
        Permission.DELETE_BUILDING,
        Permission.CREATE_LOT,
        Permission.EDIT_LOT,
        Permission.DELETE_LOT,
        Permission.RECORD_PRODUCTION,
        Permission.RECORD_FEED,
        Permission.RECORD_MORTALITY,
        Permission.RECORD_HEALTH,
        Permission.RECORD_WEIGHT,
        Permission.CREATE_SALE,
        Permission.EDIT_SALE,
        Permission.DELETE_SALE,
        Permission.RECORD_PAYMENT,
        Permission.CREATE_EXPENSE,
        Permission.EDIT_EXPENSE,
        Permission.DELETE_EXPENSE,
        Permission.MANAGE_CLIENTS,
        Permission.MANAGE_SUPPLIERS,
        Permission.VIEW_REPORTS,
        Permission.VIEW_ANALYTICS,
        Permission.EXPORT_DATA,
    ],

    "manager": [
        # Manager: Full production, financial management + team management
        Permission.MANAGE_TEAM,
        Permission.INVITE_MEMBERS,
        Permission.CREATE_SITE,
        Permission.EDIT_SITE,
        Permission.CREATE_BUILDING,
        Permission.EDIT_BUILDING,
        Permission.CREATE_LOT,
        Permission.EDIT_LOT,
        Permission.DELETE_LOT,
        Permission.RECORD_PRODUCTION,
        Permission.RECORD_FEED,
        Permission.RECORD_MORTALITY,
        Permission.RECORD_HEALTH,
        Permission.RECORD_WEIGHT,
        Permission.CREATE_SALE,
        Permission.EDIT_SALE,
        Permission.DELETE_SALE,
        Permission.RECORD_PAYMENT,
        Permission.CREATE_EXPENSE,
        Permission.EDIT_EXPENSE,
        Permission.DELETE_EXPENSE,
        Permission.MANAGE_CLIENTS,
        Permission.MANAGE_SUPPLIERS,
        Permission.VIEW_REPORTS,
        Permission.VIEW_ANALYTICS,
        Permission.EXPORT_DATA,
    ],

    "technician": [
        # Technician: Daily entries only
        Permission.RECORD_PRODUCTION,
        Permission.RECORD_FEED,
        Permission.RECORD_MORTALITY,
        Permission.RECORD_HEALTH,
        Permission.RECORD_WEIGHT,
        Permission.VIEW_REPORTS,
        Permission.VIEW_ANALYTICS,
    ],

    "accountant": [
        # Accountant: Financial operations only
        Permission.CREATE_SALE,
        Permission.EDIT_SALE,
        Permission.RECORD_PAYMENT,
        Permission.CREATE_EXPENSE,
        Permission.EDIT_EXPENSE,
        Permission.MANAGE_CLIENTS,
        Permission.MANAGE_SUPPLIERS,
        Permission.VIEW_REPORTS,
        Permission.VIEW_ANALYTICS,
        Permission.EXPORT_DATA,
    ],

    "viewer": [
        # Viewer: Read-only (reports and analytics only)
        Permission.VIEW_REPORTS,
        Permission.VIEW_ANALYTICS,
    ],
}


def has_permission(user, permission: str) -> bool:
    """Check if a user has a specific permission."""
    if not user or not user.role:
        return False

    role = user.role.value if hasattr(user.role, 'value') else str(user.role)
    role_perms = ROLE_PERMISSIONS.get(role, [])
    return permission in role_perms


def has_any_permission(user, permissions: List[str]) -> bool:
    """Check if a user has any of the specified permissions."""
    return any(has_permission(user, p) for p in permissions)


def require_permission(permission: str):
    """
    Dependency that checks if the current user has a specific permission.
    Use in endpoint dependencies.
    """
    def check_permission(current_user):
        if not has_permission(current_user, permission):
            role = current_user.role.value if hasattr(current_user.role, 'value') else str(current_user.role)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied. Your role ({role}) does not have permission: {permission}"
            )
        return current_user
    return check_permission


def require_any_permission(permissions: List[str]):
    """
    Dependency that checks if the current user has any of the specified permissions.
    """
    def check_permissions(current_user):
        if not has_any_permission(current_user, permissions):
            role = current_user.role.value if hasattr(current_user.role, 'value') else str(current_user.role)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied. Your role ({role}) does not have any of the required permissions"
            )
        return current_user
    return check_permissions


def require_role(allowed_roles: List[str]):
    """
    Dependency that checks if the current user has one of the allowed roles.
    """
    def check_role(current_user):
        role = current_user.role.value if hasattr(current_user.role, 'value') else str(current_user.role)
        if role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {', '.join(allowed_roles)}. Your role: {role}"
            )
        return current_user
    return check_role


# Convenience functions for common checks
def is_owner(user) -> bool:
    """Check if user is an owner."""
    role = user.role.value if hasattr(user.role, 'value') else str(user.role)
    return role == "owner"


def is_manager_or_above(user) -> bool:
    """Check if user is manager or owner."""
    role = user.role.value if hasattr(user.role, 'value') else str(user.role)
    return role in ["owner", "manager"]


def can_write(user) -> bool:
    """Check if user can write data (not viewer)."""
    role = user.role.value if hasattr(user.role, 'value') else str(user.role)
    return role != "viewer"


def get_user_permissions(user) -> List[str]:
    """Get all permissions for a user based on their role."""
    if not user or not user.role:
        return []
    role = user.role.value if hasattr(user.role, 'value') else str(user.role)
    return ROLE_PERMISSIONS.get(role, [])
