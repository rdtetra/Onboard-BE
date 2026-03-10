import { DataSource } from 'typeorm';
import { Role } from '../common/entities/role.entity';
import { Permission } from '../common/entities/permission.entity';
import { RoleName } from '../types/roles';
import { Permission as PermissionEnum } from '../types/permissions';

export async function seedRoles(dataSource: DataSource): Promise<void> {
  const roleRepository = dataSource.getRepository(Role);
  const permissionRepository = dataSource.getRepository(Permission);

  // Delete all existing: clear user role refs, join table, roles, then permissions
  await dataSource.query('UPDATE users SET role_id = NULL WHERE role_id IS NOT NULL');
  await dataSource.query('DELETE FROM role_permissions');
  await roleRepository.createQueryBuilder().delete().execute();
  await permissionRepository.createQueryBuilder().delete().execute();

  const allPermissions = Object.values(PermissionEnum);

  for (const permissionName of allPermissions) {
    const permission = permissionRepository.create({
      name: permissionName,
      description: `Permission to ${permissionName.replace(/_/g, ' ').toLowerCase()}`,
    });
    await permissionRepository.save(permission);
  }

  const allPermissionEntities = await permissionRepository.find();

  for (const roleName of Object.values(RoleName)) {
    const role = roleRepository.create({
      name: roleName,
      description: `${roleName.replace(/_/g, ' ')} role`,
      permissions: allPermissionEntities,
    });
    await roleRepository.save(role);
  }
}
