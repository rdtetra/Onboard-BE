import type { RequestContext } from '../types/request';
import { RoleName } from '../types/roles';

export type ScopeClause = {
  clause: string;
  params: Record<string, unknown>;
};

/**
 * Scope for the users list only.
 * - SUPER_ADMIN: no restriction (sees all).
 * - TENANT with organization: users in same organization.
 * - TENANT without organization: only their own user.
 *
 * Use with QueryBuilder: if (scope) qb.andWhere(scope.clause, scope.params).
 */
export function getUserListScope(ctx: RequestContext): ScopeClause | null {
  if (!ctx.user?.userId || !ctx.user?.roleName) {
    return null;
  }

  switch (ctx.user.roleName) {
    case RoleName.SUPER_ADMIN:
      return null;
    case RoleName.TENANT:
      if (ctx.user.organizationId) {
        return {
          clause: 'user.organization_id = :organizationId',
          params: { organizationId: ctx.user.organizationId },
        };
      }
      return {
        clause: 'user.id = :userId',
        params: { userId: ctx.user.userId },
      };
    default:
      return {
        clause: 'user.id = :userId',
        params: { userId: ctx.user.userId },
      };
  }
}
