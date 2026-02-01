from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.api.deps import get_db, get_current_user
from app.core.security import get_password_hash
from app.models.user import User
from app.schemas.user import UserResponse, UserUpdate, PasswordChange

router = APIRouter()


@router.get("", response_model=List[UserResponse])
async def get_users(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get users in the same organization."""
    if not current_user.organization_id:
        return [UserResponse.model_validate(current_user)]

    users = db.query(User).filter(
        User.organization_id == current_user.organization_id
    ).offset(skip).limit(limit).all()

    return [UserResponse.model_validate(u) for u in users]


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific user."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouve.")

    # Check permission
    if user.organization_id != current_user.organization_id and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Acces non autorise.")

    return UserResponse.model_validate(user)


@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: UUID,
    user_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update user profile."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouve.")

    # Check same organization
    if user.organization_id != current_user.organization_id:
        raise HTTPException(status_code=403, detail="Acces non autorise.")

    update_data = user_data.model_dump(exclude_unset=True)

    # Owner and manager can change role or is_active of other users
    if "role" in update_data or "is_active" in update_data:
        if current_user.role not in ["owner", "manager"]:
            raise HTTPException(status_code=403, detail="Acces refuse. Seuls les proprietaires et gestionnaires peuvent modifier les roles ou le statut.")
        # Cannot change own role
        if str(user_id) == str(current_user.id) and "role" in update_data:
            raise HTTPException(status_code=400, detail="Vous ne pouvez pas modifier votre propre role.")
        # Managers cannot change owner's role/status
        if current_user.role == "manager" and user.role == "owner":
            raise HTTPException(status_code=403, detail="Acces refuse. Vous ne pouvez pas modifier un proprietaire.")
        # Managers cannot promote to owner
        if current_user.role == "manager" and update_data.get("role") == "owner":
            raise HTTPException(status_code=403, detail="Acces refuse. Seul un proprietaire peut promouvoir un membre au role de proprietaire.")

    # Non-owners/managers can only update their own profile
    if str(user_id) != str(current_user.id) and current_user.role not in ["owner", "manager"]:
        raise HTTPException(status_code=403, detail="Acces non autorise.")

    for field, value in update_data.items():
        setattr(user, field, value)

    db.commit()
    db.refresh(user)

    return UserResponse.model_validate(user)


@router.delete("/{user_id}")
async def delete_user(
    user_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a user from the organization."""
    # Owners and managers can delete users
    if current_user.role not in ["owner", "manager"]:
        raise HTTPException(status_code=403, detail="Acces refuse. Seuls les proprietaires et gestionnaires peuvent supprimer des utilisateurs.")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouve.")

    # Check same organization
    if user.organization_id != current_user.organization_id:
        raise HTTPException(status_code=403, detail="Acces non autorise.")

    # Cannot delete self
    if str(user_id) == str(current_user.id):
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas vous supprimer vous-meme.")

    # Cannot delete owners
    if user.role == "owner":
        raise HTTPException(status_code=400, detail="Impossible de supprimer un proprietaire.")

    # Managers cannot delete other managers
    if current_user.role == "manager" and user.role == "manager":
        raise HTTPException(status_code=403, detail="Acces refuse. Les gestionnaires ne peuvent pas supprimer d'autres gestionnaires.")

    db.delete(user)
    db.commit()

    return {"message": "Utilisateur supprime avec succes."}


@router.post("/change-password")
async def change_password(
    password_data: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Change user password."""
    from app.core.security import verify_password

    if not verify_password(password_data.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le mot de passe actuel est incorrect."
        )

    current_user.password_hash = get_password_hash(password_data.new_password)
    db.commit()

    return {"message": "Mot de passe modifie avec succes."}
