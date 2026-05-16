'use server';

import { dbExecute } from './db';

// ── student_audit ──────────────────────────────────────────────────────────────

async function ensureStudentAuditTable() {
  await dbExecute(`
    CREATE TABLE IF NOT EXISTS student_audit (
      audit_id       BIGINT AUTO_INCREMENT PRIMARY KEY,
      operation      ENUM('INSERT','UPDATE','DELETE') NOT NULL,
      snapshot       ENUM('BEFORE','AFTER')           NOT NULL,
      changed_at     DATETIME                         NOT NULL DEFAULT CURRENT_TIMESTAMP,
      changed_by     VARCHAR(255)                     NULL,
      student_id     VARCHAR(64)                      NOT NULL,
      college        VARCHAR(255)                     NULL,
      name           VARCHAR(255)                     NULL,
      parentage      VARCHAR(255)                     NULL,
      studentid      VARCHAR(255)                     NULL,
      rollno         VARCHAR(255)                     NULL,
      studentclass   VARCHAR(255)                     NULL,
      course         VARCHAR(255)                     NULL,
      year           VARCHAR(20)                      NULL,
      email          VARCHAR(255)                     NULL,
      phone          VARCHAR(50)                      NULL,
      busstop        VARCHAR(255)                     NULL,
      bloodgroup     VARCHAR(20)                      NULL,
      dob            VARCHAR(20)                      NULL,
      address        TEXT                             NULL,
      percentage     VARCHAR(10)                      NULL,
      has_photo      TINYINT(1)                       NULL,
      createdby      VARCHAR(255)                     NULL,
      createdat      DATETIME                         NULL,
      deleted_by     VARCHAR(255)                     NULL,
      deleted_at     DATETIME                         NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

async function ensureStudentAuditTriggers() {
  const triggers = [
    {
      name: 'trg_students_after_insert',
      sql: `CREATE OR REPLACE TRIGGER trg_students_after_insert
AFTER INSERT ON students FOR EACH ROW
  INSERT INTO student_audit
    (operation, changed_at, changed_by, student_id, college, name, parentage,
     studentid, rollno, studentclass, course, year, email, phone, busstop,
     bloodgroup, dob, address, percentage, has_photo, createdby, createdat,
     deleted_by, deleted_at)
  VALUES
    ('INSERT', NOW(), NEW.createdby, NEW.id, NEW.college, NEW.name, NEW.parentage,
     NEW.studentid, NEW.rollNo, NEW.studentClass, NEW.course, NEW.year,
     NEW.email, NEW.phone, NEW.busStop, NEW.bloodGroup, NEW.dob, NEW.address,
     NEW.percentage, IF(NEW.photo IS NOT NULL AND LENGTH(NEW.photo) > 0, 1, 0),
     NEW.createdby, NEW.createdAt, NEW.deleted_by, NEW.deleted_at)`,
    },
    {
      name: 'trg_students_after_update',
      sql: `CREATE OR REPLACE TRIGGER trg_students_after_update
AFTER UPDATE ON students FOR EACH ROW
  INSERT INTO student_audit
    (operation, changed_at, changed_by, student_id, college, name, parentage,
     studentid, rollno, studentclass, course, year, email, phone, busstop,
     bloodgroup, dob, address, percentage, has_photo, createdby, createdat,
     deleted_by, deleted_at)
  VALUES
    ('UPDATE', NOW(), NEW.createdby, NEW.id, NEW.college, NEW.name, NEW.parentage,
     NEW.studentid, NEW.rollNo, NEW.studentClass, NEW.course, NEW.year,
     NEW.email, NEW.phone, NEW.busStop, NEW.bloodGroup, NEW.dob, NEW.address,
     NEW.percentage, IF(NEW.photo IS NOT NULL AND LENGTH(NEW.photo) > 0, 1, 0),
     NEW.createdby, NEW.createdAt, NEW.deleted_by, NEW.deleted_at)`,
    },
    {
      name: 'trg_students_after_delete',
      sql: `CREATE OR REPLACE TRIGGER trg_students_after_delete
AFTER DELETE ON students FOR EACH ROW
  INSERT INTO student_audit
    (operation, changed_at, changed_by, student_id, college, name, parentage,
     studentid, rollno, studentclass, course, year, email, phone, busstop,
     bloodgroup, dob, address, percentage, has_photo, createdby, createdat,
     deleted_by, deleted_at)
  VALUES
    ('DELETE', NOW(), OLD.deleted_by, OLD.id, OLD.college, OLD.name, OLD.parentage,
     OLD.studentid, OLD.rollNo, OLD.studentClass, OLD.course, OLD.year,
     OLD.email, OLD.phone, OLD.busStop, OLD.bloodGroup, OLD.dob, OLD.address,
     OLD.percentage, IF(OLD.photo IS NOT NULL AND LENGTH(OLD.photo) > 0, 1, 0),
     OLD.createdby, OLD.createdAt, OLD.deleted_by, OLD.deleted_at)`,
    },
  ];
  for (const t of triggers) await dbExecute(t.sql);
}

// ── user_audit ─────────────────────────────────────────────────────────────────

async function ensureUserAuditTable() {
  await dbExecute(`
    CREATE TABLE IF NOT EXISTS user_audit (
      audit_id    BIGINT AUTO_INCREMENT PRIMARY KEY,
      operation   ENUM('INSERT','UPDATE','DELETE') NOT NULL,
      snapshot    ENUM('BEFORE','AFTER')           NOT NULL,
      changed_at  DATETIME                         NOT NULL DEFAULT CURRENT_TIMESTAMP,
      user_id     INT                              NOT NULL,
      name        VARCHAR(255)                     NULL,
      email       VARCHAR(255)                     NULL,
      role        VARCHAR(50)                      NULL,
      college_id  INT                              NULL,
      deleted_at  DATETIME                         NULL,
      deleted_by  VARCHAR(255)                     NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

async function ensureUserAuditTriggers() {
  const triggers = [
    {
      name: 'trg_users_after_insert',
      sql: `CREATE OR REPLACE TRIGGER trg_users_after_insert
AFTER INSERT ON users FOR EACH ROW
  INSERT INTO user_audit
    (operation, changed_at, user_id, name, email, role, college_id, deleted_at, deleted_by)
  VALUES
    ('INSERT', NOW(), NEW.id, NEW.name, NEW.email, NEW.role, NEW.college_id, NEW.deleted_at, NEW.deleted_by)`,
    },
    {
      name: 'trg_users_after_update',
      sql: `CREATE OR REPLACE TRIGGER trg_users_after_update
AFTER UPDATE ON users FOR EACH ROW
  INSERT INTO user_audit
    (operation, changed_at, user_id, name, email, role, college_id, deleted_at, deleted_by)
  VALUES
    ('UPDATE', NOW(), NEW.id, NEW.name, NEW.email, NEW.role, NEW.college_id, NEW.deleted_at, NEW.deleted_by)`,
    },
    {
      name: 'trg_users_after_delete',
      sql: `CREATE OR REPLACE TRIGGER trg_users_after_delete
AFTER DELETE ON users FOR EACH ROW
  INSERT INTO user_audit
    (operation, changed_at, user_id, name, email, role, college_id, deleted_at, deleted_by)
  VALUES
    ('DELETE', NOW(), OLD.id, OLD.name, OLD.email, OLD.role, OLD.college_id, OLD.deleted_at, OLD.deleted_by)`,
    },
  ];
  for (const t of triggers) await dbExecute(t.sql);
}

// ── college_audit ──────────────────────────────────────────────────────────────

async function ensureCollegeAuditTable() {
  await dbExecute(`
    CREATE TABLE IF NOT EXISTS college_audit (
      audit_id    BIGINT AUTO_INCREMENT PRIMARY KEY,
      operation   ENUM('INSERT','UPDATE','DELETE') NOT NULL,
      snapshot    ENUM('BEFORE','AFTER')           NOT NULL,
      changed_at  DATETIME                         NOT NULL DEFAULT CURRENT_TIMESTAMP,
      college_id  INT                              NOT NULL,
      name        VARCHAR(255)                     NULL,
      deleted_at  DATETIME                         NULL,
      deleted_by  VARCHAR(255)                     NULL,
      created_at  DATETIME                         NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

async function ensureCollegeAuditTriggers() {
  const triggers = [
    {
      name: 'trg_colleges_after_insert',
      sql: `CREATE OR REPLACE TRIGGER trg_colleges_after_insert
AFTER INSERT ON colleges FOR EACH ROW
  INSERT INTO college_audit
    (operation, changed_at, college_id, name, deleted_at, deleted_by, created_at)
  VALUES
    ('INSERT', NOW(), NEW.id, NEW.name, NEW.deleted_at, NEW.deleted_by, NEW.created_at)`,
    },
    {
      name: 'trg_colleges_after_update',
      sql: `CREATE OR REPLACE TRIGGER trg_colleges_after_update
AFTER UPDATE ON colleges FOR EACH ROW
  INSERT INTO college_audit
    (operation, changed_at, college_id, name, deleted_at, deleted_by, created_at)
  VALUES
    ('UPDATE', NOW(), NEW.id, NEW.name, NEW.deleted_at, NEW.deleted_by, NEW.created_at)`,
    },
    {
      name: 'trg_colleges_after_delete',
      sql: `CREATE OR REPLACE TRIGGER trg_colleges_after_delete
AFTER DELETE ON colleges FOR EACH ROW
  INSERT INTO college_audit
    (operation, changed_at, college_id, name, deleted_at, deleted_by, created_at)
  VALUES
    ('DELETE', NOW(), OLD.id, OLD.name, OLD.deleted_at, OLD.deleted_by, OLD.created_at)`,
    },
  ];
  for (const t of triggers) await dbExecute(t.sql);
}

// ── Public entry point ─────────────────────────────────────────────────────────

export async function ensureAuditTables() {
  await Promise.all([
    ensureStudentAuditTable(),
    ensureUserAuditTable(),
    ensureCollegeAuditTable(),
  ]);
  // Triggers must run sequentially — MySQL doesn't allow concurrent DDL on the same table
  await ensureStudentAuditTriggers();
  await ensureUserAuditTriggers();
  await ensureCollegeAuditTriggers();
}
