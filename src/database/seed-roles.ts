import { DataSource } from 'typeorm';
import { Role } from '../common/entities/role.entity';
import { Permission } from '../common/entities/permission.entity';
import { RoleName } from '../types/roles';
import { Permission as PermissionEnum } from '../types/permissions';

export async function seedRoles(dataSource: DataSource): Promise<void> {
  const roleRepository = dataSource.getRepository(Role);
  const permissionRepository = dataSource.getRepository(Permission);

  const allPermissions = Object.values(PermissionEnum);

  for (const permissionName of allPermissions) {
    const existingPermission = await permissionRepository.findOne({
      where: { name: permissionName },
    });

    if (!existingPermission) {
      const permission = permissionRepository.create({
        name: permissionName,
        description: `Permission to ${permissionName.replace(/_/g, ' ').toLowerCase()}`,
      });
      await permissionRepository.save(permission);
    }
  }

  const allPermissionEntities = await permissionRepository.find();

  for (const roleName of Object.values(RoleName)) {
    const existingRole = await roleRepository.findOne({
      where: { name: roleName },
      relations: ['permissions'],
    });

    if (!existingRole) {
      const role = roleRepository.create({
        name: roleName,
        description: `${roleName.replace(/_/g, ' ')} role`,
        permissions: allPermissionEntities,
      });
      await roleRepository.save(role);
    } else if (
      existingRole.permissions.length !== allPermissionEntities.length
    ) {
      existingRole.permissions = allPermissionEntities;
      await roleRepository.save(existingRole);
    }
  }
}
