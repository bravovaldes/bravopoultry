import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Numeric, Text, Enum, Boolean
import enum

from app.db.session import Base
from app.db.types import GUID


class AlertType(str, enum.Enum):
    MORTALITY_HIGH = "mortality_high"
    LAYING_DROP = "laying_drop"
    WEIGHT_LOW = "weight_low"
    FEED_CONSUMPTION_ABNORMAL = "feed_consumption_abnormal"
    WATER_CONSUMPTION_ABNORMAL = "water_consumption_abnormal"
    STOCK_LOW = "stock_low"
    VACCINATION_DUE = "vaccination_due"
    PAYMENT_OVERDUE = "payment_overdue"
    TEMPERATURE_HIGH = "temperature_high"
    TEMPERATURE_LOW = "temperature_low"


class AlertSeverity(str, enum.Enum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


class AlertStatus(str, enum.Enum):
    ACTIVE = "active"
    ACKNOWLEDGED = "acknowledged"
    RESOLVED = "resolved"


class Alert(Base):
    """System-generated alerts."""
    __tablename__ = "alerts"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)

    organization_id = Column(GUID(), ForeignKey("organizations.id"), nullable=False)
    site_id = Column(GUID(), ForeignKey("sites.id"), nullable=True)
    lot_id = Column(GUID(), ForeignKey("lots.id"), nullable=True)

    alert_type = Column(Enum(AlertType), nullable=False)
    severity = Column(Enum(AlertSeverity), default=AlertSeverity.WARNING)
    status = Column(Enum(AlertStatus), default=AlertStatus.ACTIVE)

    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)

    # Metrics that triggered the alert
    metric_name = Column(String(100), nullable=True)
    metric_value = Column(Numeric(14, 4), nullable=True)
    threshold_value = Column(Numeric(14, 4), nullable=True)

    # Actions
    acknowledged_by = Column(GUID(), ForeignKey("users.id"), nullable=True)
    acknowledged_at = Column(DateTime, nullable=True)
    resolved_by = Column(GUID(), ForeignKey("users.id"), nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    resolution_note = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)


class AlertConfig(Base):
    """User-configurable alert thresholds."""
    __tablename__ = "alert_configs"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)

    organization_id = Column(GUID(), ForeignKey("organizations.id"), nullable=False)
    site_id = Column(GUID(), ForeignKey("sites.id"), nullable=True)  # NULL = org-wide

    alert_type = Column(Enum(AlertType), nullable=False)
    is_enabled = Column(Boolean, default=True)

    # Threshold
    threshold_value = Column(Numeric(14, 4), nullable=True)
    threshold_unit = Column(String(20), nullable=True)

    # Notification channels
    notify_email = Column(Boolean, default=True)
    notify_sms = Column(Boolean, default=False)
    notify_push = Column(Boolean, default=True)
    notify_whatsapp = Column(Boolean, default=False)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
