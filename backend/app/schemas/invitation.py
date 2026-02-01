from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from uuid import UUID
from datetime import datetime


class InvitationCreate(BaseModel):
    email: EmailStr
    first_name: Optional[str] = Field(None, min_length=2, max_length=100)
    last_name: Optional[str] = Field(None, min_length=2, max_length=100)
    phone: Optional[str] = None
    role: str = "technician"


class InvitationResponse(BaseModel):
    id: UUID
    organization_id: UUID
    email: str
    first_name: Optional[str]
    last_name: Optional[str]
    phone: Optional[str]
    role: str
    status: str
    expires_at: datetime
    created_at: datetime
    invited_by_name: Optional[str] = None

    class Config:
        from_attributes = True


class AcceptInvitation(BaseModel):
    token: str
    password: str = Field(..., min_length=8)
    first_name: Optional[str] = Field(None, min_length=2, max_length=100)
    last_name: Optional[str] = Field(None, min_length=2, max_length=100)


class InvitationInfo(BaseModel):
    email: str
    first_name: Optional[str]
    last_name: Optional[str]
    role: str
    organization_name: str
    inviter_name: str
    expires_at: datetime
    is_valid: bool
