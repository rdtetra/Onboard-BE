import { DataSource } from 'typeorm';
import { Role } from '../common/entities/role.entity';
import { Permission } from '../common/entities/permission.entity';
import { RoleName } from '../common/enums/roles.enum';
import { Permission as PermissionEnum } from '../common/enums/permissions.enum';

export async function seedRoles(dataSource: DataSource): Promise<void> {
  const roleRepository = dataSource.getRepository(Role);
  const permissionRepository = dataSource.getRepository(Permission);

  await dataSource.query('DELETE FROM role_permissions');
  await permissionRepository.createQueryBuilder().delete().execute();

  const allPermissionNames = Object.values(PermissionEnum);
  for (const permissionName of allPermissionNames) {
    const permission = permissionRepository.create({
      name: permissionName,
      description: `Permission to ${permissionName.replace(/_/g, ' ').toLowerCase()}`,
    });
    await permissionRepository.save(permission);
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
    } else {
      existingRole.permissions = allPermissionEntities;
      await roleRepository.save(existingRole);
    }
  }
}
