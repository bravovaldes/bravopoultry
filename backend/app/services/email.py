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
        # Build the invitation link (frontend URL)
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

        subject = f"Invitation a rejoindre {organization_name} sur BravoPoultry"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #ea580c, #f97316); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .header h1 {{ color: white; margin: 0; font-size: 24px; }}
                .content {{ background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }}
                .button {{ display: inline-block; background: #ea580c; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }}
                .button:hover {{ background: #c2410c; }}
                .footer {{ text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }}
                .role-badge {{ display: inline-block; background: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 20px; font-size: 14px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>BravoPoultry</h1>
                </div>
                <div class="content">
                    <h2>Vous etes invite!</h2>
                    <p>Bonjour,</p>
                    <p><strong>{inviter_name}</strong> vous invite a rejoindre <strong>{organization_name}</strong> sur BravoPoultry en tant que <span class="role-badge">{role_label}</span>.</p>
                    <p>BravoPoultry est une plateforme de gestion avicole complete qui vous permet de suivre vos lots, la production, les ventes et bien plus encore.</p>
                    <p style="text-align: center;">
                        <a href="{invitation_link}" class="button">Accepter l'invitation</a>
                    </p>
                    <p style="color: #6b7280; font-size: 14px;">Ce lien expire dans 7 jours. Si vous n'avez pas demande cette invitation, vous pouvez ignorer cet email.</p>
                </div>
                <div class="footer">
                    <p>&copy; 2024 BravoPoultry. Tous droits reserves.</p>
                </div>
            </div>
        </body>
        </html>
        """

        text_content = f"""
        Invitation a rejoindre {organization_name}

        Bonjour,

        {inviter_name} vous invite a rejoindre {organization_name} sur BravoPoultry en tant que {role_label}.

        Pour accepter l'invitation, cliquez sur le lien suivant:
        {invitation_link}

        Ce lien expire dans 7 jours.

        ---
        BravoPoultry - Gestion Avicole
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
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #16a34a, #22c55e); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .header h1 {{ color: white; margin: 0; font-size: 24px; }}
                .content {{ background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }}
                .invoice-info {{ background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb; }}
                .amount {{ font-size: 24px; font-weight: bold; color: #16a34a; }}
                .status {{ display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 14px; }}
                .status-paid {{ background: #dcfce7; color: #16a34a; }}
                .status-pending {{ background: #fef3c7; color: #92400e; }}
                .status-partial {{ background: #dbeafe; color: #1d4ed8; }}
                .status-overdue {{ background: #fee2e2; color: #dc2626; }}
                .footer {{ text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>{organization_name}</h1>
                </div>
                <div class="content">
                    <h2>Votre facture</h2>
                    <p>Bonjour {client_name},</p>
                    <p>Veuillez trouver ci-joint votre facture <strong>{invoice_number}</strong>.</p>

                    <div class="invoice-info">
                        <p><strong>Numero de facture:</strong> {invoice_number}</p>
                        <p><strong>Montant total:</strong> <span class="amount">{total_amount}</span></p>
                        <p><strong>Statut:</strong> <span class="status status-{payment_status}">{status_label}</span></p>
                    </div>

                    <p>Le document PDF est joint a cet email.</p>

                    <p>Pour toute question concernant cette facture, n'hesitez pas a nous contacter.</p>

                    <p>Cordialement,<br/>L'equipe {organization_name}</p>
                </div>
                <div class="footer">
                    <p>&copy; 2024 {organization_name}. Tous droits reserves.</p>
                </div>
            </div>
        </body>
        </html>
        """

        text_content = f"""
        Facture {invoice_number} - {organization_name}

        Bonjour {client_name},

        Veuillez trouver ci-joint votre facture {invoice_number}.

        Numero de facture: {invoice_number}
        Montant total: {total_amount}
        Statut: {status_label}

        Le document PDF est joint a cet email.

        Pour toute question concernant cette facture, n'hesitez pas a nous contacter.

        Cordialement,
        L'equipe {organization_name}
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
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #ea580c, #f97316); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .header h1 {{ color: white; margin: 0; font-size: 24px; }}
                .content {{ background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }}
                .button {{ display: inline-block; background: #ea580c; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }}
                .button:hover {{ background: #c2410c; }}
                .footer {{ text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }}
                .code {{ background: #f3f4f6; padding: 15px 25px; border-radius: 8px; font-family: monospace; font-size: 18px; letter-spacing: 2px; display: inline-block; margin: 15px 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>BravoPoultry</h1>
                </div>
                <div class="content">
                    <h2>Bienvenue sur BravoPoultry!</h2>
                    <p>Bonjour {user_name},</p>
                    <p>Merci de vous etre inscrit sur BravoPoultry. Pour activer votre compte et acceder a toutes les fonctionnalites, veuillez verifier votre adresse email en cliquant sur le bouton ci-dessous:</p>
                    <p style="text-align: center;">
                        <a href="{verification_link}" class="button">Verifier mon email</a>
                    </p>
                    <p style="color: #6b7280; font-size: 14px;">Ou copiez ce lien dans votre navigateur:</p>
                    <p style="word-break: break-all; color: #6b7280; font-size: 12px;">{verification_link}</p>
                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
                    <p style="color: #6b7280; font-size: 14px;">Ce lien expire dans 24 heures. Si vous n'avez pas cree de compte sur BravoPoultry, vous pouvez ignorer cet email.</p>
                </div>
                <div class="footer">
                    <p>&copy; 2024 BravoPoultry. Tous droits reserves.</p>
                    <p>La plateforme de gestion avicole la plus complete</p>
                </div>
            </div>
        </body>
        </html>
        """

        text_content = f"""
        Bienvenue sur BravoPoultry!

        Bonjour {user_name},

        Merci de vous etre inscrit sur BravoPoultry. Pour activer votre compte, veuillez verifier votre adresse email en cliquant sur le lien suivant:

        {verification_link}

        Ce lien expire dans 24 heures.

        Si vous n'avez pas cree de compte sur BravoPoultry, vous pouvez ignorer cet email.

        ---
        BravoPoultry - La plateforme de gestion avicole la plus complete
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
