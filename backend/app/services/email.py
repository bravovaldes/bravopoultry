import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from typing import Optional, List
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)


class EmailService:
    def __init__(self):
        self.smtp_host = settings.SMTP_HOST
        self.smtp_port = settings.SMTP_PORT
        self.smtp_user = settings.SMTP_USER
        self.smtp_password = settings.SMTP_PASSWORD
        self.sender_email = getattr(settings, 'EMAIL_FROM', None) or "noreply@bravopoultry.com"

    def _is_configured(self) -> bool:
        """Check if email is properly configured."""
        return bool(self.smtp_host and self.smtp_user and self.smtp_password)

    def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
        attachments: Optional[List[dict]] = None
    ) -> bool:
        """
        Send an email with optional attachments.

        Args:
            to_email: Recipient email address
            subject: Email subject
            html_content: HTML body content
            text_content: Plain text body content (optional)
            attachments: List of attachments, each as dict with 'filepath' and 'filename' keys
        """
        if not self._is_configured():
            logger.warning(f"Email not configured. Would send to {to_email}: {subject}")
            return True  # Return True in dev mode

        try:
            # Use mixed for attachments, alternative for just text/html
            if attachments:
                msg = MIMEMultipart("mixed")
                # Create alternative part for text/html
                alt_part = MIMEMultipart("alternative")
                if text_content:
                    alt_part.attach(MIMEText(text_content, "plain"))
                alt_part.attach(MIMEText(html_content, "html"))
                msg.attach(alt_part)
            else:
                msg = MIMEMultipart("alternative")
                if text_content:
                    msg.attach(MIMEText(text_content, "plain"))
                msg.attach(MIMEText(html_content, "html"))

            msg["Subject"] = subject
            msg["From"] = f"BravoPoultry <{self.sender_email}>"
            msg["To"] = to_email

            # Add attachments
            if attachments:
                for attachment in attachments:
                    filepath = attachment.get('filepath')
                    filename = attachment.get('filename', os.path.basename(filepath))

                    if filepath and os.path.exists(filepath):
                        with open(filepath, 'rb') as f:
                            part = MIMEBase('application', 'octet-stream')
                            part.set_payload(f.read())
                            encoders.encode_base64(part)
                            part.add_header(
                                'Content-Disposition',
                                f'attachment; filename="{filename}"'
                            )
                            msg.attach(part)

            # Use SSL for port 465, TLS for port 587
            if self.smtp_port == 465:
                with smtplib.SMTP_SSL(self.smtp_host, self.smtp_port) as server:
                    server.login(self.smtp_user, self.smtp_password)
                    server.sendmail(self.sender_email, to_email, msg.as_string())
            else:
                with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                    server.starttls()
                    server.login(self.smtp_user, self.smtp_password)
                    server.sendmail(self.sender_email, to_email, msg.as_string())

            logger.info(f"Email sent to {to_email}: {subject}")
            return True

        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}")
            return False

    def send_invitation_email(
        self,
        to_email: str,
        inviter_name: str,
        organization_name: str,
        invitation_token: str,
        role: str
    ) -> bool:
        """Send an invitation email to join an organization."""
        frontend_url = settings.FRONTEND_URL.rstrip('/')
        invitation_link = f"{frontend_url}/accept-invitation?token={invitation_token}"

        role_labels = {
            "owner": "Proprietaire",
            "manager": "Gestionnaire",
            "technician": "Technicien",
            "accountant": "Comptable",
            "viewer": "Observateur"
        }
        role_label = role_labels.get(role, role)

        subject = f"Invitation a rejoindre {organization_name} - BravoPoultry"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #1a1a1a; background-color: #ffffff;">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; margin: 0 auto; padding: 40px 20px;">
                <tr>
                    <td>
                        <p style="margin: 0 0 24px 0; font-size: 14px; color: #666666;">BravoPoultry</p>

                        <h1 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 600; color: #1a1a1a;">Vous etes invite a rejoindre une equipe</h1>

                        <p style="margin: 0 0 16px 0;">Bonjour,</p>

                        <p style="margin: 0 0 16px 0;"><strong>{inviter_name}</strong> vous invite a rejoindre <strong>{organization_name}</strong> sur BravoPoultry.</p>

                        <p style="margin: 0 0 24px 0;">Votre role : <strong>{role_label}</strong></p>

                        <table cellpadding="0" cellspacing="0" style="margin: 0 0 24px 0;">
                            <tr>
                                <td style="background-color: #1a1a1a; border-radius: 6px;">
                                    <a href="{invitation_link}" style="display: inline-block; padding: 12px 24px; color: #ffffff; text-decoration: none; font-weight: 500;">Accepter l'invitation</a>
                                </td>
                            </tr>
                        </table>

                        <p style="margin: 0 0 16px 0; font-size: 14px; color: #666666;">Ce lien expire dans 7 jours.</p>

                        <p style="margin: 0 0 16px 0; font-size: 14px; color: #666666;">Si vous n'attendiez pas cette invitation, vous pouvez ignorer cet email.</p>

                        <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;">

                        <p style="margin: 0 0 8px 0; font-size: 12px; color: #999999;">Si le bouton ne fonctionne pas, copiez ce lien:</p>
                        <p style="margin: 0; font-size: 12px; color: #999999; word-break: break-all;">{invitation_link}</p>

                        <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;">

                        <p style="margin: 0; font-size: 12px; color: #999999;">&copy; 2026 BravoPoultry</p>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        """

        text_content = f"""
BravoPoultry

Vous etes invite a rejoindre une equipe

Bonjour,

{inviter_name} vous invite a rejoindre {organization_name} sur BravoPoultry.

Votre role : {role_label}

Pour accepter l'invitation, cliquez sur le lien ci-dessous:

{invitation_link}

Ce lien expire dans 7 jours.

Si vous n'attendiez pas cette invitation, vous pouvez ignorer cet email.

---
© 2026 BravoPoultry
        """

        return self.send_email(to_email, subject, html_content, text_content)

    def send_invoice_email(
        self,
        to_email: str,
        client_name: str,
        invoice_number: str,
        invoice_filepath: str,
        total_amount: str,
        payment_status: str,
        organization_name: str = "BravoPoultry"
    ) -> bool:
        """Send an invoice by email with PDF attachment."""
        status_labels = {
            "paid": "Payee",
            "pending": "En attente de paiement",
            "partial": "Partiellement payee",
            "overdue": "En retard"
        }
        status_label = status_labels.get(payment_status, payment_status)

        subject = f"Facture {invoice_number} - {organization_name}"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #1a1a1a; background-color: #ffffff;">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; margin: 0 auto; padding: 40px 20px;">
                <tr>
                    <td>
                        <p style="margin: 0 0 24px 0; font-size: 14px; color: #666666;">{organization_name}</p>

                        <h1 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 600; color: #1a1a1a;">Votre facture {invoice_number}</h1>

                        <p style="margin: 0 0 16px 0;">Bonjour {client_name},</p>

                        <p style="margin: 0 0 24px 0;">Veuillez trouver ci-joint votre facture.</p>

                        <table cellpadding="0" cellspacing="0" style="margin: 0 0 24px 0; width: 100%; border: 1px solid #e5e5e5; border-radius: 6px;">
                            <tr>
                                <td style="padding: 16px;">
                                    <p style="margin: 0 0 8px 0; font-size: 14px; color: #666666;">Numero de facture</p>
                                    <p style="margin: 0; font-weight: 600;">{invoice_number}</p>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 16px; border-top: 1px solid #e5e5e5;">
                                    <p style="margin: 0 0 8px 0; font-size: 14px; color: #666666;">Montant total</p>
                                    <p style="margin: 0; font-weight: 600; font-size: 20px;">{total_amount}</p>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 16px; border-top: 1px solid #e5e5e5;">
                                    <p style="margin: 0 0 8px 0; font-size: 14px; color: #666666;">Statut</p>
                                    <p style="margin: 0; font-weight: 500;">{status_label}</p>
                                </td>
                            </tr>
                        </table>

                        <p style="margin: 0 0 16px 0; font-size: 14px; color: #666666;">Le document PDF est joint a cet email.</p>

                        <p style="margin: 0 0 16px 0; font-size: 14px; color: #666666;">Pour toute question concernant cette facture, n'hesitez pas a nous contacter.</p>

                        <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;">

                        <p style="margin: 0; font-size: 12px; color: #999999;">&copy; 2026 {organization_name}</p>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        """

        text_content = f"""
{organization_name}

Votre facture {invoice_number}

Bonjour {client_name},

Veuillez trouver ci-joint votre facture.

Numero de facture: {invoice_number}
Montant total: {total_amount}
Statut: {status_label}

Le document PDF est joint a cet email.

Pour toute question concernant cette facture, n'hesitez pas a nous contacter.

---
© 2026 {organization_name}
        """

        attachments = [
            {
                'filepath': invoice_filepath,
                'filename': f"{invoice_number}.pdf"
            }
        ]

        return self.send_email(to_email, subject, html_content, text_content, attachments)


    def send_verification_email(
        self,
        to_email: str,
        user_name: str,
        verification_token: str
    ) -> bool:
        """Send an email verification link to a new user."""
        frontend_url = settings.FRONTEND_URL.rstrip('/')
        verification_link = f"{frontend_url}/verify-email?token={verification_token}"

        subject = "Verifiez votre adresse email - BravoPoultry"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #1a1a1a; background-color: #ffffff;">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; margin: 0 auto; padding: 40px 20px;">
                <tr>
                    <td>
                        <p style="margin: 0 0 24px 0; font-size: 14px; color: #666666;">BravoPoultry</p>

                        <h1 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 600; color: #1a1a1a;">Bienvenue sur BravoPoultry</h1>

                        <p style="margin: 0 0 16px 0;">Bonjour {user_name},</p>

                        <p style="margin: 0 0 24px 0;">Merci de vous etre inscrit. Pour activer votre compte, veuillez verifier votre adresse email en cliquant sur le bouton ci-dessous.</p>

                        <table cellpadding="0" cellspacing="0" style="margin: 0 0 24px 0;">
                            <tr>
                                <td style="background-color: #1a1a1a; border-radius: 6px;">
                                    <a href="{verification_link}" style="display: inline-block; padding: 12px 24px; color: #ffffff; text-decoration: none; font-weight: 500;">Verifier mon email</a>
                                </td>
                            </tr>
                        </table>

                        <p style="margin: 0 0 16px 0; font-size: 14px; color: #666666;">Ce lien expire dans 24 heures.</p>

                        <p style="margin: 0 0 16px 0; font-size: 14px; color: #666666;">Si vous n'avez pas cree de compte sur BravoPoultry, vous pouvez ignorer cet email.</p>

                        <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;">

                        <p style="margin: 0 0 8px 0; font-size: 12px; color: #999999;">Si le bouton ne fonctionne pas, copiez ce lien:</p>
                        <p style="margin: 0; font-size: 12px; color: #999999; word-break: break-all;">{verification_link}</p>

                        <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;">

                        <p style="margin: 0; font-size: 12px; color: #999999;">&copy; 2026 BravoPoultry</p>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        """

        text_content = f"""
BravoPoultry

Bienvenue sur BravoPoultry

Bonjour {user_name},

Merci de vous etre inscrit. Pour activer votre compte, veuillez verifier votre adresse email en cliquant sur le lien suivant:

{verification_link}

Ce lien expire dans 24 heures.

Si vous n'avez pas cree de compte sur BravoPoultry, vous pouvez ignorer cet email.

---
© 2026 BravoPoultry
        """

        return self.send_email(to_email, subject, html_content, text_content)

    def send_password_reset_email(
        self,
        to_email: str,
        user_name: str,
        reset_token: str
    ) -> bool:
        """Send a password reset link to the user."""
        frontend_url = settings.FRONTEND_URL.rstrip('/')
        reset_link = f"{frontend_url}/reset-password?token={reset_token}"

        subject = "Reinitialisation de votre mot de passe - BravoPoultry"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #1a1a1a; background-color: #ffffff;">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; margin: 0 auto; padding: 40px 20px;">
                <tr>
                    <td>
                        <p style="margin: 0 0 24px 0; font-size: 14px; color: #666666;">BravoPoultry</p>

                        <h1 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 600; color: #1a1a1a;">Reinitialiser votre mot de passe</h1>

                        <p style="margin: 0 0 16px 0;">Bonjour {user_name},</p>

                        <p style="margin: 0 0 24px 0;">Vous avez demande la reinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour creer un nouveau mot de passe.</p>

                        <table cellpadding="0" cellspacing="0" style="margin: 0 0 24px 0;">
                            <tr>
                                <td style="background-color: #1a1a1a; border-radius: 6px;">
                                    <a href="{reset_link}" style="display: inline-block; padding: 12px 24px; color: #ffffff; text-decoration: none; font-weight: 500;">Reinitialiser le mot de passe</a>
                                </td>
                            </tr>
                        </table>

                        <p style="margin: 0 0 16px 0; font-size: 14px; color: #666666;">Ce lien expire dans 1 heure.</p>

                        <p style="margin: 0 0 16px 0; font-size: 14px; color: #666666;">Si vous n'avez pas demande cette reinitialisation, ignorez cet email. Votre mot de passe restera inchange.</p>

                        <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;">

                        <p style="margin: 0 0 8px 0; font-size: 12px; color: #999999;">Si le bouton ne fonctionne pas, copiez ce lien:</p>
                        <p style="margin: 0; font-size: 12px; color: #999999; word-break: break-all;">{reset_link}</p>

                        <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;">

                        <p style="margin: 0; font-size: 12px; color: #999999;">&copy; 2026 BravoPoultry</p>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        """

        text_content = f"""
BravoPoultry

Reinitialiser votre mot de passe

Bonjour {user_name},

Vous avez demande la reinitialisation de votre mot de passe. Cliquez sur le lien ci-dessous pour creer un nouveau mot de passe:

{reset_link}

Ce lien expire dans 1 heure.

Si vous n'avez pas demande cette reinitialisation, ignorez cet email. Votre mot de passe restera inchange.

---
© 2026 BravoPoultry
        """

        return self.send_email(to_email, subject, html_content, text_content)


email_service = EmailService()
