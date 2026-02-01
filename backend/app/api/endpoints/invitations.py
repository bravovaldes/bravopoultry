from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from datetime import datetime

from app.api.deps import get_db, get_current_user
from app.core.security import get_password_hash, create_access_token
from app.models.user import User
from app.models.organization import Organization
from app.models.invitation import Invitation, InvitationStatus
from app.schemas.invitation import (
    InvitationCreate,
    InvitationResponse,
    AcceptInvitation,
    InvitationInfo
)
from app.schemas.user import Token, UserResponse
from app.services.email import email_service

router = APIRouter()


@router.post("", response_model=InvitationResponse)
async def create_invitation(
    invitation_data: InvitationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create and send an invitation to join the organization."""
    # Owners and managers can invite
    if current_user.role not in ["owner", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acces refuse. Seuls les proprietaires et gestionnaires peuvent inviter des membres."
        )

    if not current_user.organization_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vous devez appartenir a une organisation pour inviter des membres."
        )

    # Check if email is already registered
    existing_user = db.query(User).filter(User.email == invitation_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ce courriel est deja enregistre."
        )

    # Check if there's already a pending invitation
    existing_invitation = db.query(Invitation).filter(
        Invitation.email == invitation_data.email,
        Invitation.organization_id == current_user.organization_id,
        Invitation.status == InvitationStatus.PENDING
    ).first()

    if existing_invitation and not existing_invitation.is_expired:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Une invitation a deja ete envoyee a ce courriel."
        )

    # Cancel expired invitation if exists
    if existing_invitation and existing_invitation.is_expired:
        existing_invitation.status = InvitationStatus.EXPIRED
        db.commit()

    # Validate role
    valid_roles = ["manager", "technician", "accountant", "viewer"]
    if invitation_data.role not in valid_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Role invalide. Doit etre l'un des suivants: {', '.join(valid_roles)}"
        )

    # Get organization name
    organization = db.query(Organization).filter(
        Organization.id == current_user.organization_id
    ).first()

    # Create invitation
    invitation = Invitation(
        organization_id=current_user.organization_id,
        invited_by_id=current_user.id,
        email=invitation_data.email,
        first_name=invitation_data.first_name,
        last_name=invitation_data.last_name,
        phone=invitation_data.phone,
        role=invitation_data.role,
        token=Invitation.generate_token(),
        expires_at=Invitation.default_expiry()
    )

    db.add(invitation)
    db.commit()
    db.refresh(invitation)

    # Send invitation email
    email_service.send_invitation_email(
        to_email=invitation_data.email,
        inviter_name=current_user.full_name,
        organization_name=organization.name if organization else "BravoPoultry",
        invitation_token=invitation.token,
        role=invitation_data.role
    )

    return InvitationResponse(
        id=invitation.id,
        organization_id=invitation.organization_id,
        email=invitation.email,
        first_name=invitation.first_name,
        last_name=invitation.last_name,
        phone=invitation.phone,
        role=invitation.role,
        status=invitation.status.value,
        expires_at=invitation.expires_at,
        created_at=invitation.created_at,
        invited_by_name=current_user.full_name
    )


@router.get("", response_model=List[InvitationResponse])
async def get_invitations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all invitations for the current organization."""
    if not current_user.organization_id:
        return []

    invitations = db.query(Invitation).filter(
        Invitation.organization_id == current_user.organization_id
    ).order_by(Invitation.created_at.desc()).all()

    result = []
    for inv in invitations:
        # Update expired status
        if inv.status == InvitationStatus.PENDING and inv.is_expired:
            inv.status = InvitationStatus.EXPIRED
            db.commit()

        result.append(InvitationResponse(
            id=inv.id,
            organization_id=inv.organization_id,
            email=inv.email,
            first_name=inv.first_name,
            last_name=inv.last_name,
            phone=inv.phone,
            role=inv.role,
            status=inv.status.value,
            expires_at=inv.expires_at,
            created_at=inv.created_at,
            invited_by_name=inv.invited_by.full_name if inv.invited_by else None
        ))

    return result


@router.get("/check/{token}", response_model=InvitationInfo)
async def check_invitation(token: str, db: Session = Depends(get_db)):
    """Check if an invitation token is valid and get its details."""
    invitation = db.query(Invitation).filter(Invitation.token == token).first()

    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation non trouvee."
        )

    # Update expired status
    if invitation.status == InvitationStatus.PENDING and invitation.is_expired:
        invitation.status = InvitationStatus.EXPIRED
        db.commit()

    organization = db.query(Organization).filter(
        Organization.id == invitation.organization_id
    ).first()

    inviter = db.query(User).filter(
        User.id == invitation.invited_by_id
    ).first()

    return InvitationInfo(
        email=invitation.email,
        first_name=invitation.first_name,
        last_name=invitation.last_name,
        role=invitation.role,
        organization_name=organization.name if organization else "BravoPoultry",
        inviter_name=inviter.full_name if inviter else "Un membre",
        expires_at=invitation.expires_at,
        is_valid=invitation.is_valid
    )


@router.post("/accept", response_model=Token)
async def accept_invitation(
    accept_data: AcceptInvitation,
    db: Session = Depends(get_db)
):
    """Accept an invitation and create the user account."""
    invitation = db.query(Invitation).filter(
        Invitation.token == accept_data.token
    ).first()

    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation non trouvee."
        )

    if not invitation.is_valid:
        if invitation.is_expired:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cette invitation a expire."
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cette invitation n'est plus valide."
        )

    # Check if email is already taken (shouldn't happen but just in case)
    existing_user = db.query(User).filter(User.email == invitation.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ce courriel est deja enregistre."
        )

    # Use provided name or invitation name
    first_name = accept_data.first_name or invitation.first_name or "Utilisateur"
    last_name = accept_data.last_name or invitation.last_name or "Invite"

    # Create user
    user = User(
        email=invitation.email,
        phone=invitation.phone,
        password_hash=get_password_hash(accept_data.password),
        first_name=first_name,
        last_name=last_name,
        organization_id=invitation.organization_id,
        role=invitation.role,
        is_active=True,
        is_verified=True  # Verified through invitation
    )

    db.add(user)

    # Update invitation status
    invitation.status = InvitationStatus.ACCEPTED
    invitation.accepted_at = datetime.utcnow()

    db.commit()
    db.refresh(user)

    # Create token
    access_token = create_access_token(data={"sub": str(user.id)})

    return Token(
        access_token=access_token,
        user=UserResponse.model_validate(user)
    )


@router.post("/{invitation_id}/resend")
async def resend_invitation(
    invitation_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Resend an invitation email."""
    # Owners and managers can resend invitations
    if current_user.role not in ["owner", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acces refuse. Seuls les proprietaires et gestionnaires peuvent renvoyer des invitations."
        )

    invitation = db.query(Invitation).filter(
        Invitation.id == invitation_id,
        Invitation.organization_id == current_user.organization_id
    ).first()

    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation non trouvee."
        )

    if invitation.status == InvitationStatus.ACCEPTED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cette invitation a deja ete acceptee."
        )

    # Regenerate token and expiry
    invitation.token = Invitation.generate_token()
    invitation.expires_at = Invitation.default_expiry()
    invitation.status = InvitationStatus.PENDING

    db.commit()

    organization = db.query(Organization).filter(
        Organization.id == current_user.organization_id
    ).first()

    # Send email
    email_service.send_invitation_email(
        to_email=invitation.email,
        inviter_name=current_user.full_name,
        organization_name=organization.name if organization else "BravoPoultry",
        invitation_token=invitation.token,
        role=invitation.role
    )

    return {"message": "Invitation renvoyee avec succes."}


@router.delete("/{invitation_id}")
async def cancel_invitation(
    invitation_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cancel a pending invitation."""
    # Owners and managers can cancel invitations
    if current_user.role not in ["owner", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acces refuse. Seuls les proprietaires et gestionnaires peuvent annuler des invitations."
        )

    invitation = db.query(Invitation).filter(
        Invitation.id == invitation_id,
        Invitation.organization_id == current_user.organization_id
    ).first()

    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation non trouvee."
        )

    if invitation.status == InvitationStatus.ACCEPTED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Impossible d'annuler une invitation deja acceptee."
        )

    invitation.status = InvitationStatus.CANCELLED
    db.commit()

    return {"message": "Invitation annulee avec succes."}
