from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from app.api.deps import get_db, get_current_user
from app.core.security import verify_password, get_password_hash, create_access_token
from app.core.config import settings
from app.models.user import User
from app.models.organization import Organization
from app.models.email_verification import EmailVerificationToken
from app.models.password_reset import PasswordResetToken
from app.schemas.user import (
    UserCreate, UserResponse, UserLogin, Token,
    EmailVerificationRequest, ResendVerificationRequest, RegistrationResponse,
    ForgotPasswordRequest, ResetPasswordRequest, PasswordResetResponse
)
from app.services.email import email_service

router = APIRouter()


@router.post("/register", response_model=RegistrationResponse)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user and send verification email."""
    # Check if email exists
    if db.query(User).filter(User.email == user_data.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cette adresse email est deja utilisee"
        )

    # Check if phone exists
    if user_data.phone and db.query(User).filter(User.phone == user_data.phone).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ce numero de telephone est deja utilise"
        )

    # Create organization if name provided
    organization = None
    if user_data.organization_name:
        organization = Organization(name=user_data.organization_name)
        db.add(organization)
        db.flush()

    # Create user with is_verified=False
    user = User(
        email=user_data.email,
        phone=user_data.phone,
        password_hash=get_password_hash(user_data.password),
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        language=user_data.language,
        currency=user_data.currency,
        organization_id=organization.id if organization else None,
        is_verified=False,
    )
    db.add(user)
    db.flush()

    # Create verification token
    verification_token = EmailVerificationToken.create_token(user.id)
    db.add(verification_token)
    db.commit()
    db.refresh(user)

    # Send verification email
    email_service.send_verification_email(
        to_email=user.email,
        user_name=user.first_name,
        verification_token=verification_token.token
    )

    return RegistrationResponse(
        message="Un email de verification a ete envoye a votre adresse email.",
        email=user.email,
        requires_verification=True
    )


@router.post("/verify-email", response_model=Token)
async def verify_email(data: EmailVerificationRequest, db: Session = Depends(get_db)):
    """Verify user email with token and return access token."""
    # Find the verification token
    verification_token = db.query(EmailVerificationToken).filter(
        EmailVerificationToken.token == data.token
    ).first()

    if not verification_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token de verification invalide"
        )

    if verification_token.is_used:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ce lien de verification a deja ete utilise"
        )

    if verification_token.is_expired:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ce lien de verification a expire. Veuillez demander un nouveau lien."
        )

    # Get the user
    user = db.query(User).filter(User.id == verification_token.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Utilisateur non trouve"
        )

    # Mark user as verified and token as used
    user.is_verified = True
    verification_token.is_used = True
    db.commit()
    db.refresh(user)

    # Create access token
    access_token = create_access_token(data={"sub": str(user.id)})

    return Token(
        access_token=access_token,
        user=UserResponse.model_validate(user)
    )


@router.post("/resend-verification")
async def resend_verification(data: ResendVerificationRequest, db: Session = Depends(get_db)):
    """Resend verification email."""
    user = db.query(User).filter(User.email == data.email).first()

    if not user:
        # Don't reveal if email exists for security
        return {"message": "Si cette adresse email existe, un email de verification sera envoye."}

    if user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cet email est deja verifie. Vous pouvez vous connecter."
        )

    # Check for recent verification token (rate limiting - 1 per minute)
    recent_token = db.query(EmailVerificationToken).filter(
        EmailVerificationToken.user_id == user.id,
        EmailVerificationToken.created_at > datetime.utcnow() - timedelta(minutes=1)
    ).first()

    if recent_token:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Veuillez attendre 1 minute avant de demander un nouveau lien."
        )

    # Invalidate old tokens
    db.query(EmailVerificationToken).filter(
        EmailVerificationToken.user_id == user.id,
        EmailVerificationToken.is_used == False
    ).update({"is_used": True})

    # Create new verification token
    verification_token = EmailVerificationToken.create_token(user.id)
    db.add(verification_token)
    db.commit()

    # Send verification email
    email_service.send_verification_email(
        to_email=user.email,
        user_name=user.first_name,
        verification_token=verification_token.token
    )

    return {"message": "Un nouveau lien de verification a ete envoye a votre adresse email."}


@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Login with email and password."""
    user = db.query(User).filter(User.email == form_data.username).first()

    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Votre compte a ete desactive. Contactez le support."
        )

    # Check if email is verified
    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Veuillez verifier votre email avant de vous connecter. Consultez votre boite mail."
        )

    # Update last login
    user.last_login = datetime.utcnow()
    db.commit()

    # Create token
    access_token = create_access_token(data={"sub": str(user.id)})

    return Token(
        access_token=access_token,
        user=UserResponse.model_validate(user)
    )


@router.post("/login/phone", response_model=Token)
async def login_with_phone(phone: str, password: str, db: Session = Depends(get_db)):
    """Login with phone number and password."""
    user = db.query(User).filter(User.phone == phone).first()

    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Numero de telephone ou mot de passe incorrect",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Votre compte a ete desactive. Contactez le support."
        )

    # Check if email is verified
    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Veuillez verifier votre email avant de vous connecter. Consultez votre boite mail."
        )

    access_token = create_access_token(data={"sub": str(user.id)})

    return Token(
        access_token=access_token,
        user=UserResponse.model_validate(user)
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user info."""
    return UserResponse.model_validate(current_user)


@router.post("/refresh", response_model=Token)
async def refresh_token(current_user: User = Depends(get_current_user)):
    """Refresh access token."""
    access_token = create_access_token(data={"sub": str(current_user.id)})
    return Token(
        access_token=access_token,
        user=UserResponse.model_validate(current_user)
    )


@router.post("/forgot-password", response_model=PasswordResetResponse)
async def forgot_password(data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Request a password reset email."""
    user = db.query(User).filter(User.email == data.email).first()

    # Always return success message for security (don't reveal if email exists)
    success_message = "Si cette adresse email est associee a un compte, vous recevrez un lien de reinitialisation."

    if not user:
        return PasswordResetResponse(message=success_message)

    if not user.is_active:
        return PasswordResetResponse(message=success_message)

    # Check for recent reset token (rate limiting - 1 per minute)
    recent_token = db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.created_at > datetime.utcnow() - timedelta(minutes=1)
    ).first()

    if recent_token:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Veuillez attendre 1 minute avant de demander un nouveau lien."
        )

    # Invalidate old tokens
    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.is_used == False
    ).update({"is_used": True})

    # Create new reset token (expires in 1 hour)
    reset_token = PasswordResetToken.create_token(user.id, expires_hours=1)
    db.add(reset_token)
    db.commit()

    # Send password reset email
    email_service.send_password_reset_email(
        to_email=user.email,
        user_name=user.first_name,
        reset_token=reset_token.token
    )

    return PasswordResetResponse(message=success_message)


@router.post("/reset-password", response_model=PasswordResetResponse)
async def reset_password(data: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Reset password with token."""
    # Find the reset token
    reset_token = db.query(PasswordResetToken).filter(
        PasswordResetToken.token == data.token
    ).first()

    if not reset_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Lien de reinitialisation invalide"
        )

    if reset_token.is_used:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ce lien a deja ete utilise"
        )

    if reset_token.is_expired:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ce lien a expire. Veuillez demander un nouveau lien."
        )

    # Get the user
    user = db.query(User).filter(User.id == reset_token.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Utilisateur non trouve"
        )

    # Update password and mark token as used
    user.password_hash = get_password_hash(data.new_password)
    reset_token.is_used = True
    db.commit()

    return PasswordResetResponse(message="Votre mot de passe a ete reinitialise avec succes.")


@router.get("/permissions")
async def get_user_permissions(current_user: User = Depends(get_current_user)):
    """Get current user's permissions based on their role."""
    from app.core.permissions import get_user_permissions, ROLE_PERMISSIONS

    role = current_user.role.value if hasattr(current_user.role, 'value') else str(current_user.role)
    permissions = get_user_permissions(current_user)

    return {
        "role": role,
        "permissions": permissions,
        "can": {
            # Team management
            "manage_team": "manage_team" in permissions,
            "invite_members": "invite_members" in permissions,
            # Lots
            "create_lot": "create_lot" in permissions,
            "edit_lot": "edit_lot" in permissions,
            "delete_lot": "delete_lot" in permissions,
            # Daily entries
            "record_production": "record_production" in permissions,
            "record_feed": "record_feed" in permissions,
            "record_mortality": "record_mortality" in permissions,
            "record_health": "record_health" in permissions,
            # Financial
            "create_sale": "create_sale" in permissions,
            "edit_sale": "edit_sale" in permissions,
            "delete_sale": "delete_sale" in permissions,
            "create_expense": "create_expense" in permissions,
            "edit_expense": "edit_expense" in permissions,
            "delete_expense": "delete_expense" in permissions,
            # Sites/Buildings
            "create_site": "create_site" in permissions,
            "edit_site": "edit_site" in permissions,
            "delete_site": "delete_site" in permissions,
            # Clients/Suppliers
            "manage_clients": "manage_clients" in permissions,
            "manage_suppliers": "manage_suppliers" in permissions,
            # Reports
            "view_reports": "view_reports" in permissions,
            "export_data": "export_data" in permissions,
        }
    }
