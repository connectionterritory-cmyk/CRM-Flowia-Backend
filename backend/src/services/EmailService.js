const nodemailer = require('nodemailer');
require('dotenv').config();

class EmailService {
    constructor() {
        this.transporter = null;
        this.init();
    }

    async init() {
        // For development/local, we might simulate or use ethereal
        // If config provided in env, use that.
        // Defaults to console logging for safety in this demo.
    }

    hasSmtpConfig() {
        return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
    }

    getFromAddress() {
        return process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@crm.local';
    }

    getTransporter() {
        if (!this.transporter) {
            this.transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: Number(process.env.SMTP_PORT || 587),
                secure: process.env.SMTP_SECURE === 'true',
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS,
                },
            });
        }
        return this.transporter;
    }

    async sendPasswordReset(to, resetLink) {
        if (!this.hasSmtpConfig()) {
            console.log('---------------------------------------------------');
            console.log('📧 MOCK EMAIL SERVICE - PASSWORD RESET');
            console.log(`To: ${to}`);
            console.log('Subject: Recuperar Contraseña CRM');
            console.log('Body: Has solicitado restablecer tu contraseña.');
            console.log(`Haz clic aquí: ${resetLink}`);
            console.log('---------------------------------------------------');
            return;
        }

        try {
            await this.getTransporter().sendMail({
                from: `"CRM Servicio" <${this.getFromAddress()}>`,
                to,
                subject: 'Recuperar Contraseña',
                html: `<p>Haz clic en el siguiente enlace para restablecer tu contraseña:</p><p><a href="${resetLink}">${resetLink}</a></p>`,
            });
        } catch (error) {
            console.error('Failed to send password reset email:', error);
        }
    }

    async sendInvite({ to, name, link }) {
        if (!this.hasSmtpConfig()) {
            console.log('---------------------------------------------------');
            console.log('📧 MOCK EMAIL SERVICE - USER INVITE');
            console.log(`To: ${to}`);
            console.log('Subject: Invitacion a FlowSuiteCRM');
            console.log(`Body: Hola ${name || ''}`.trim());
            console.log(`Link: ${link}`);
            console.log('---------------------------------------------------');
            return;
        }

        try {
            await this.getTransporter().sendMail({
                from: `"CRM Servicio" <${this.getFromAddress()}>`,
                to,
                subject: 'Invitacion a FlowSuiteCRM',
                html: `
                    <p>Hola ${name || ''},</p>
                    <p>Has sido invitado a FlowSuiteCRM. Crea tu contraseña aqui:</p>
                    <p><a href="${link}">${link}</a></p>
                `
            });
        } catch (error) {
            console.error('Failed to send invite email:', error);
        }
    }

    async sendUserWelcome({ to, name, code, role }) {
        if (!this.hasSmtpConfig()) {
            console.log('---------------------------------------------------');
            console.log('📧 MOCK EMAIL SERVICE - USER WELCOME');
            console.log(`To: ${to}`);
            console.log('Subject: Bienvenido al CRM');
            console.log(`Body: Hola ${name || ''}`.trim());
            console.log(`Rol: ${role || ''}`.trim());
            console.log(`Codigo: ${code || ''}`.trim());
            console.log('Puedes definir tu password con una invitacion.');
            console.log('---------------------------------------------------');
            return;
        }

        try {
            await this.getTransporter().sendMail({
                from: `"CRM Servicio" <${this.getFromAddress()}>`,
                to,
                subject: 'Bienvenido al CRM',
                html: `
                    <p>Hola ${name || ''},</p>
                    <p>Tu cuenta fue creada con el rol <strong>${role || ''}</strong>.</p>
                    <p><strong>Codigo:</strong> ${code || ''}</p>
                    <p>Recuerda definir tu password con la invitacion.</p>
                `
            });
        } catch (error) {
            console.error('Failed to send welcome email:', error);
        }
    }

    async sendUserVerification({ to, name, code }) {
        if (!this.hasSmtpConfig()) {
            console.log('---------------------------------------------------');
            console.log('📧 MOCK EMAIL SERVICE - USER VERIFICATION');
            console.log(`To: ${to}`);
            console.log('Subject: Verificacion de cuenta');
            console.log(`Body: Hola ${name || ''}`.trim());
            console.log(`Codigo: ${code || ''}`.trim());
            console.log('Tu cuenta esta activa. Si no reconoces este correo, responde a soporte.');
            console.log('---------------------------------------------------');
            return;
        }

        try {
            await this.getTransporter().sendMail({
                from: `"CRM Servicio" <${this.getFromAddress()}>`,
                to,
                subject: 'Verificacion de cuenta',
                html: `
                    <p>Hola ${name || ''},</p>
                    <p>Tu cuenta esta activa.</p>
                    <p><strong>Codigo:</strong> ${code || ''}</p>
                    <p>Si no reconoces este correo, responde a soporte.</p>
                `
            });
        } catch (error) {
            console.error('Failed to send verification email:', error);
        }
    }

    async sendProgramReferralSummary({ to, ownerName, programType, referrals }) {
        const list = (referrals || []).map((ref, index) => `${index + 1}. ${ref.NombreCompleto || ref.name || ''} - ${ref.Telefono || ref.phone || ''}`).join('\n');
        console.log('---------------------------------------------------');
        console.log('📧 MOCK EMAIL SERVICE - PROGRAM REFERRALS');
        console.log(`To: ${to}`);
        console.log(`Subject: Referidos del programa ${programType}`);
        console.log(`Body: Hola ${ownerName || ''}`.trim());
        console.log(`Referidos:\n${list}`);
        console.log('---------------------------------------------------');

        if (!this.hasSmtpConfig()) {
            return;
        }

        try {
            await this.getTransporter().sendMail({
                from: `"CRM Servicio" <${this.getFromAddress()}>`,
                to,
                subject: `Referidos del programa ${programType}`,
                text: `Hola ${ownerName || ''}\n\nReferidos:\n${list}`,
            });
        } catch (error) {
            console.error('Failed to send referral summary email:', error);
        }
    }

    async sendProgramDemoUpdate({ to, ownerName, programType, referredName, demoCount }) {
        console.log('---------------------------------------------------');
        console.log('📧 MOCK EMAIL SERVICE - PROGRAM DEMO UPDATE');
        console.log(`To: ${to}`);
        console.log(`Subject: Demostracion completada (${programType})`);
        console.log(`Body: Hola ${ownerName || ''}`.trim());
        console.log(`Referido: ${referredName || ''}`.trim());
        console.log(`Demos completadas: ${demoCount || 0}`);
        console.log('---------------------------------------------------');

        if (!this.hasSmtpConfig()) {
            return;
        }

        try {
            await this.getTransporter().sendMail({
                from: `"CRM Servicio" <${this.getFromAddress()}>`,
                to,
                subject: `Demostracion completada (${programType})`,
                text: `Hola ${ownerName || ''}\n\nReferido: ${referredName || ''}\nDemos completadas: ${demoCount || 0}`,
            });
        } catch (error) {
            console.error('Failed to send demo update email:', error);
        }
    }
}

module.exports = new EmailService();
