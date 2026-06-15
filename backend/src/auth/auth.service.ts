import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RemoteOAuthProfile } from './oauth.types';
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

  async loginWithOAuth(profile: RemoteOAuthProfile) {
    if (!profile.email || profile.email === 'undefined' || profile.email === 'null') {
      throw new UnauthorizedException('OAuth provider did not return an email address');
    }

    const existingOAuthUser = await this.usersService.findByOAuth(profile.provider, profile.providerUserId);
    if (existingOAuthUser) {
      return this.buildAuthResponse(existingOAuthUser);
    }

    const existingEmailUser = await this.usersService.findByEmail(profile.email);
    if (existingEmailUser) {
      const linkedUser = await this.usersService.linkOAuthAccount(existingEmailUser.id, profile.provider, profile.providerUserId, {
        displayName: existingEmailUser.displayName ?? profile.displayName,
        avatarUrl: existingEmailUser.avatarUrl ?? profile.avatarUrl,
      });
      return this.buildAuthResponse(linkedUser);
    }

    const username = await this.createAvailableUsername(profile.username);
    const user = await this.usersService.create({
      email: profile.email,
      username,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      oauthProvider: profile.provider,
      oauthId: profile.providerUserId,
      passwordHash: await bcrypt.hash(randomUUID(), 12),
    });

    return this.buildAuthResponse(user);
  }

  async loginWithOAuth(profile: RemoteOAuthProfile) {
    if (!profile.email || profile.email === 'undefined' || profile.email === 'null') {
      throw new UnauthorizedException('OAuth provider did not return an email address');
    }

    const existingOAuthUser = await this.usersService.findByOAuth(profile.provider, profile.providerUserId);
    if (existingOAuthUser) {
      return this.buildAuthResponse(existingOAuthUser);
    }

    const existingEmailUser = await this.usersService.findByEmail(profile.email);
    if (existingEmailUser) {
      const linkedUser = await this.usersService.linkOAuthAccount(existingEmailUser.id, profile.provider, profile.providerUserId, {
        displayName: existingEmailUser.displayName ?? profile.displayName,
        avatarUrl: existingEmailUser.avatarUrl ?? profile.avatarUrl,
      });
      return this.buildAuthResponse(linkedUser);
    }

    const username = await this.createAvailableUsername(profile.username);
    const user = await this.usersService.create({
      email: profile.email,
      username,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      oauthProvider: profile.provider,
      oauthId: profile.providerUserId,
      passwordHash: await bcrypt.hash(randomUUID(), 12),
    });

    return this.buildAuthResponse(user);
  }

  private async createAvailableUsername(baseUsername: string) {
    const cleanBase = baseUsername.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20) || 'player';
    const existingUser = await this.usersService.findByUsername(cleanBase);
    if (!existingUser) {
      return cleanBase;
    }

    for (let index = 1; index <= 50; index += 1) {
      const suffix = String(index);
      const candidate = `${cleanBase.slice(0, 24 - suffix.length)}${suffix}`;
      const existingCandidate = await this.usersService.findByUsername(candidate);
      if (!existingCandidate) {
        return candidate;
      }
    }

    return `player${randomUUID().replace(/-/g, '').slice(0, 18)}`;
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
