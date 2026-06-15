import { PrismaService } from '../prisma.service'
import { BadRequestException, Injectable } from '@nestjs/common'
import { generateSecret, generate, verify, generateURI } from 'otplib';
import * as QRCode from 'qrcode';

@Injectable()
export class TwoFactorService {
    constructor(private readonly prisma: PrismaService) {}

    async generateSecret(userId: string) {
        const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
        const secret = generateSecret();
        const otpauthUrl = generateURI({ label: user.email, issuer: 'Lexmon', secret });
        const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
        await (this.prisma.user as any).update({
            where: { id: userId },
            data: { twoFactorSecret: secret },

        });
        return { otpauthUrl, qrCodeDataUrl };
    }

    async enableTwoFactor(userId: string, token: string) {
        const user = await (this.prisma.user as any).findUniqueOrThrow({ where: { id: userId } });
        if (!user.twoFactorSecret) {
            throw new BadRequestException('2FA not set up');
        }
        const isValid = await this.verifyToken(user.twoFactorSecret, token);
        if (!isValid) {
            throw new BadRequestException('Invalid TOTP code');
        }
        await (this.prisma.user as any).update({ where: { id: userId }, data: { twoFactorEnabled: true } });
    }

    async verifyToken(secret: string, token: string): Promise<boolean> {
        try {
            const result = await verify({ token, secret });
            return result.valid;
        } catch {
            return false;
        }
    }

    async disableTwoFactor(userId: string, token: string) {
        const user = await (this.prisma.user as any).findUniqueOrThrow({ where: { id: userId } });
        if (!user.twoFactorSecret) {
            throw new BadRequestException('2FA not set up');
        }
        const isValid = await this.verifyToken(user.twoFactorSecret, token);
        if (!isValid) {
            throw new BadRequestException('Invalid TOTP code');
        }
        await (this.prisma.user as any).update({ where: { id: userId }, data: { twoFactorEnabled: false, twoFactorSecret: null } });
    }

}
