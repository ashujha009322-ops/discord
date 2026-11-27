/**
 * Permission bitfield definitions.
 *
 * Each permission uses a unique bit position.
 */
export const Permissions = {
  KICK_MEMBERS: 1n << 1n,
  BAN_MEMBERS: 1n << 2n,
  ADMINISTRATOR: 1n << 3n,

  MANAGE_NICKNAMES: 1n << 27n,
  MANAGE_ROLES: 1n << 28n,
} as const;

/**
 * Type representing a valid permission flag.
 */
export type Permission = (typeof Permissions)[keyof typeof Permissions];

/**
 * All currently defined permission flags.
 */
export const ALL_PERMISSIONS = Object.values(Permissions).reduce(
  (total, permission) => total | permission,
  0n,
);

/**
 * Computes base permissions from all assigned roles.
 *
 * - Guild owner receives all permissions.
 * - Administrator receives all permissions.
 * - Otherwise, permissions are combined using bitwise OR.
 */
export function computeBasePermissions(
  isOwner: boolean,
  rolePermissions: readonly bigint[],
): bigint {
  if (isOwner) {
    return ALL_PERMISSIONS;
  }

  const permissions = rolePermissions.reduce(
    (total, permission) => total | permission,
    0n,
  );

  if (hasPermission(permissions, Permissions.ADMINISTRATOR)) {
    return ALL_PERMISSIONS;
  }

  return permissions;
}

/**
 * Checks whether a permission bitfield contains a permission.
 */
export function hasPermission(
  permissions: bigint,
  permission: bigint,
): boolean {
  return (permissions & permission) === permission;
}

/**
 * Checks whether a user has at least one of the specified permissions.
 */
export function hasAnyPermission(
  permissions: bigint,
  requiredPermissions: readonly bigint[],
): boolean {
  return requiredPermissions.some((permission) =>
    hasPermission(permissions, permission),
  );
}

/**
 * Checks whether a user has all specified permissions.
 */
export function hasAllPermissions(
  permissions: bigint,
  requiredPermissions: readonly bigint[],
): boolean {
  return requiredPermissions.every((permission) =>
    hasPermission(permissions, permission),
  );
}

/**
 * Adds permissions to an existing permission bitfield.
 */
export function addPermissions(
  permissions: bigint,
  ...newPermissions: bigint[]
): bigint {
  return newPermissions.reduce(
    (total, permission) => total | permission,
    permissions,
  );
}

/**
 * Removes permissions from an existing permission bitfield.
 */
export function removePermissions(
  permissions: bigint,
  ...removedPermissions: bigint[]
): bigint {
  return removedPermissions.reduce(
    (total, permission) => total & ~permission,
    permissions,
  );
}

/**
 * Checks whether an actor can moderate a target member.
 *
 * Rules:
 * - Nobody can moderate themselves.
 * - Nobody can moderate the guild owner.
 * - Guild owner can moderate everyone else.
 * - Other members must have a strictly higher role position.
 */
export function canModerateTarget(params: {
  actorId: string;
  targetId: string;
  guildOwnerId: string;
  actorHighestPosition: number;
  targetHighestPosition: number;
}): boolean {
  const {
    actorId,
    targetId,
    guildOwnerId,
    actorHighestPosition,
    targetHighestPosition,
  } = params;

  if (actorId === targetId) return false;

  if (targetId === guildOwnerId) return false;

  if (actorId === guildOwnerId) return true;

  return actorHighestPosition > targetHighestPosition;
}
