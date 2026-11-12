import { relations } from 'drizzle-orm';
import { users } from './users.js';
import { permissions, rolePermissions, roles, userRoles } from './roles.js';
import { sessions } from './sessions.js';
import { auditLogs } from './audit.js';
import { files, idempotencyKeys, settings } from './system.js';
import { branches, courses, rooms } from './org.js';
import { guardians, studentGuardians, students } from './students.js';
import { groups, groupTeachers, scheduleOccupancy, scheduleSlots } from './groups.js';

export const usersRelations = relations(users, ({ many }) => ({
  userRoles: many(userRoles),
  sessions: many(sessions),
  auditLogs: many(auditLogs),
  files: many(files),
  updatedSettings: many(settings),
  idempotencyKeys: many(idempotencyKeys),
  guardians: many(guardians),
  groupAssignments: many(groupTeachers),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  rolePermissions: many(rolePermissions),
  userRoles: many(userRoles),
}));

export const permissionsRelations = relations(permissions, ({ many }) => ({
  rolePermissions: many(rolePermissions),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, {
    fields: [rolePermissions.roleId],
    references: [roles.id],
  }),
  permission: one(permissions, {
    fields: [rolePermissions.permissionCode],
    references: [permissions.code],
  }),
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, {
    fields: [userRoles.userId],
    references: [users.id],
  }),
  role: one(roles, {
    fields: [userRoles.roleId],
    references: [roles.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  actor: one(users, {
    fields: [auditLogs.actorId],
    references: [users.id],
  }),
}));

export const settingsRelations = relations(settings, ({ one }) => ({
  updater: one(users, {
    fields: [settings.updatedBy],
    references: [users.id],
  }),
}));

export const filesRelations = relations(files, ({ one, many }) => ({
  uploader: one(users, {
    fields: [files.uploadedBy],
    references: [users.id],
  }),
  studentPhotos: many(students),
}));

export const idempotencyKeysRelations = relations(idempotencyKeys, ({ one }) => ({
  user: one(users, {
    fields: [idempotencyKeys.userId],
    references: [users.id],
  }),
}));

export const branchesRelations = relations(branches, ({ many }) => ({
  courses: many(courses),
  rooms: many(rooms),
  students: many(students),
  guardians: many(guardians),
  groups: many(groups),
}));

export const coursesRelations = relations(courses, ({ one, many }) => ({
  branch: one(branches, { fields: [courses.branchId], references: [branches.id] }),
  groups: many(groups),
}));

export const roomsRelations = relations(rooms, ({ one, many }) => ({
  branch: one(branches, { fields: [rooms.branchId], references: [branches.id] }),
  groups: many(groups),
}));

export const studentsRelations = relations(students, ({ one, many }) => ({
  branch: one(branches, { fields: [students.branchId], references: [branches.id] }),
  photo: one(files, { fields: [students.photoFileId], references: [files.id] }),
  guardianLinks: many(studentGuardians),
}));

export const guardiansRelations = relations(guardians, ({ one, many }) => ({
  user: one(users, { fields: [guardians.userId], references: [users.id] }),
  studentLinks: many(studentGuardians),
}));

export const studentGuardiansRelations = relations(studentGuardians, ({ one }) => ({
  student: one(students, { fields: [studentGuardians.studentId], references: [students.id] }),
  guardian: one(guardians, { fields: [studentGuardians.guardianId], references: [guardians.id] }),
}));

export const groupsRelations = relations(groups, ({ one, many }) => ({
  branch: one(branches, { fields: [groups.branchId], references: [branches.id] }),
  course: one(courses, { fields: [groups.courseId], references: [courses.id] }),
  room: one(rooms, { fields: [groups.roomId], references: [rooms.id] }),
  teachers: many(groupTeachers),
  slots: many(scheduleSlots),
  occupancy: many(scheduleOccupancy),
}));

export const groupTeachersRelations = relations(groupTeachers, ({ one }) => ({
  group: one(groups, { fields: [groupTeachers.groupId], references: [groups.id] }),
  teacher: one(users, { fields: [groupTeachers.teacherId], references: [users.id] }),
}));

export const scheduleSlotsRelations = relations(scheduleSlots, ({ one, many }) => ({
  group: one(groups, { fields: [scheduleSlots.groupId], references: [groups.id] }),
  occupancy: many(scheduleOccupancy),
}));

export const scheduleOccupancyRelations = relations(scheduleOccupancy, ({ one }) => ({
  group: one(groups, { fields: [scheduleOccupancy.groupId], references: [groups.id] }),
  slot: one(scheduleSlots, { fields: [scheduleOccupancy.slotId], references: [scheduleSlots.id] }),
}));
