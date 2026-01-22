import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ALLOW_KEY } from '../decorators/allow.decorator';
import { Permission } from '../../types/permissions';
import { UsersService } from '../../modules/users/users.service';
import type { RequestContext } from '../../types/request';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      ALLOW_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const jwtUser = request.user;

    if (!jwtUser || !jwtUser.userId) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const minimalContext: RequestContext = {
      user: null,
      url: request.url,
      method: request.method,
      timestamp: new Date().toISOString(),
      requestId: uuidv4(),
    };

    const user = await this.usersService.findOne(minimalContext, jwtUser.userId, {
      role: {
        permissions: true,
      },
    });

    if (!user || !user.role || !user.role.permissions || !Array.isArray(user.role.permissions)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const userPermissions = user.role.permissions.map((permission) => permission.name);
    const hasAllPermissions = requiredPermissions.every((permission) =>
      userPermissions.includes(permission),
    );

    if (!hasAllPermissions) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
