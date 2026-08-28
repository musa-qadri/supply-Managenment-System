import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Inject } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { TokenService } from './token.service';

@Injectable()
export class EmailAuthService {
  constructor(
    @Inject('PRISMA') private readonly prisma: PrismaClient,
    private readonly tokenService: TokenService,
  ) {}

  // ========== REGISTER ==========
  async register(data: { email: string; password: string; name: string }) {
    // Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered. Please login.');
    }

    // Hash password (bcrypt with 10 rounds)
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Create user with CUSTOMER role
    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        password: hashedPassword,
        isVerified: true, // Email users are auto-verified
      },
      include: {
        supplierProfile: true,
        customerProfile: true,
      },
    });

    // Auto-create customer profile
    await this.prisma.customer.create({
      data: {
        userId: user.id,
      },
    });

    // Generate JWT tokens
    const tokens = await this.tokenService.generateTokens(user);

    return {
      message: 'Registration successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        isVerified: user.isVerified,
      },
      ...tokens,
    };
  }

  // ========== LOGIN ==========
  async login(data: { email: string; password: string }) {
    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email: data.email },
      include: {
        supplierProfile: true,
        customerProfile: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Check if user has password (OTP-only users won't have password)
    if (!user.password) {
      throw new BadRequestException('This account uses OTP login. Please use phone number.');
    }

    // Compare password
    const isPasswordValid = await bcrypt.compare(data.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Generate tokens
    const tokens = await this.tokenService.generateTokens(user);

    return {
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatar: user.avatar,
        isVerified: user.isVerified,
        supplierProfile: user.supplierProfile,
        customerProfile: user.customerProfile,
      },
      ...tokens,
    };
  }
}