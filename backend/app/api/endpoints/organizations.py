from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.organization import Organization
from app.schemas.organization import OrganizationCreate, OrganizationUpdate, OrganizationResponse

router = APIRouter()


@router.get("/current", response_model=OrganizationResponse)
async def get_current_organization(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's organization."""
    if not current_user.organization_id:
        raise HTTPException(status_code=404, detail="No organization found")

    org = db.query(Organization).filter(Organization.id == current_user.organization_id).first()
    return OrganizationResponse.model_validate(org)


@router.post("", response_model=OrganizationResponse)
async def create_organization(
    org_data: OrganizationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new organization."""
    if current_user.organization_id:
        raise HTTPException(
            status_code=400,
            detail="User already belongs to an organization"
        )

    org = Organization(**org_data.model_dump())
    db.add(org)
    db.flush()

    # Assign user to organization
    current_user.organization_id = org.id
    db.commit()
    db.refresh(org)

    return OrganizationResponse.model_validate(org)


@router.patch("/{org_id}", response_model=OrganizationResponse)
async def update_organization(
    org_id: UUID,
    org_data: OrganizationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update organization."""
    if str(current_user.organization_id) != str(org_id):
        raise HTTPException(status_code=403, detail="Not authorized")

    if current_user.role != "owner":
        raise HTTPException(status_code=403, detail="Only owners can update organization")

    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    update_data = org_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(org, field, value)

    db.commit()
    db.refresh(org)

    return OrganizationResponse.model_validate(org)
