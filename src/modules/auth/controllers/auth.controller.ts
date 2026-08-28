import { Controller, Post, Body, HttpCode, HttpStatus, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from '../services/auth.service';
import { OtpService } from '../services/otp.service';
import { GoogleAuthService } from '../services/google-auth.service';
import { EmailAuthService } from '../services/email-auth.service'; // NEW
import { TokenService } from '../services/token.service';
import { 
  SendOtpDto, 
  VerifyOtpDto, 
  GoogleAuthDto, 
  RefreshTokenDto, 
  LogoutDto,
  RegisterEmailDto,  // NEW
  LoginEmailDto,     // NEW
} from '../dto/auth.dto';
import { Public } from '../../../common/decorators/public.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly otpService: OtpService,
    private readonly googleAuthService: GoogleAuthService,
    private readonly emailAuthService: EmailAuthService, // NEW
    private readonly tokenService: TokenService,
  ) {}

  // ========== EMAIL AUTH (NEW) ==========

  @Public()
  @Post('email/register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register with email and password' })
  @ApiResponse({ status: 201, description: 'Registration successful' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async registerEmail(@Body() dto: RegisterEmailDto) {
    return this.emailAuthService.register({
      email: dto.email,
      password: dto.password,
      name: dto.name,
    });
  }

  @Public()
  @Post('email/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async loginEmail(@Body() dto: LoginEmailDto) {
    return this.emailAuthService.login({
      email: dto.email,
      password: dto.password,
    });
  }

  // ========== OTP AUTH ==========

  @Public()
  @Post('otp/send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send OTP to phone number' })
  async sendOtp(@Body() dto: SendOtpDto) {
    return this.otpService.sendOtp(dto.phone);
  }

  @Public()
  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify OTP and login' })
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.otpService.verifyOtp(dto.phone, dto.otp);
  }

  // ========== GOOGLE AUTH ==========

  @Public()
  @Post('google')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with Google OAuth' })
  async googleAuth(@Body() dto: GoogleAuthDto) {
    return this.googleAuthService.verifyGoogleToken(dto.idToken);
  }

  // ========== TOKEN MANAGEMENT ==========

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  async refreshToken(@Body() dto: RefreshTokenDto) {
    return this.tokenService.refreshTokens(dto.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout user' })
  async logout(@Body() dto: LogoutDto, @CurrentUser('sub') userId: string) {
    return this.authService.logout(userId, dto.token);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  async getMe(@CurrentUser('sub') userId: string) {
    return this.authService.getMe(userId);
  }
}