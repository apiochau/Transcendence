import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { TwoFactorService } from './two-factor.service';

interface AuthUser {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly twoFactorService: TwoFactorService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.usersService.findByEmailOrUsername(dto.email, dto.username);
    if (existingUser) {
      throw new ConflictException('Email or username is already in use');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.usersService.create({
      email: dto.email,
      username: dto.username,
      passwordHash,
    });

    return this.buildAuthResponse(user);
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.twoFactorEnabled) {
      const tempToken = await this.jwtService.signAsync(
        { sub: user.id, twoFactorPending: true },
        { expiresIn: '5m' },
      );
      return { requires2FA: true, tempToken };
    }

    return this.buildAuthResponse(user);
  }

  async verifyTwoFactor(tempToken: string, code: string) {
    const payload = await this.jwtService.verifyAsync(tempToken);
    if (!payload.twoFactorPending)
      throw new UnauthorizedException('Invalid temp token');
    const user = await this.usersService.findById(payload.sub);
    if (!user || !user.twoFactorSecret) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const isValid = await this.twoFactorService.verifyToken(user.twoFactorSecret, code);
    if (!isValid) {
      throw new UnauthorizedException('Invalid TOTP code');
    }
    return this.buildAuthResponse(user);
  }

  private async buildAuthResponse(user: AuthUser) {
    const accessToken = await this.jwtService.signAsync(
      { sub: user.id, email: user.email, username: user.username },
      { expiresIn: this.config.get<string>('JWT_EXPIRES_IN') ?? '1d' },
    );

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
      },
    };
  }
}
