import { NextResponse } from 'next/server';
import { dbExecute } from '@/lib/db';
import { RowDataPacket } from 'mysql2';

async function columnExists(table: string, column: string): Promise<boolean> {
  const [rows] = await dbExecute<RowDataPacket[]>(
    `SELECT 1 FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  return rows.length > 0;
}

async function setupAuditTables() {
  // student_audit
  await dbExecute(`
    CREATE TABLE IF NOT EXISTS student_audit (
      audit_id     BIGINT AUTO_INCREMENT PRIMARY KEY,
      operation    ENUM('INSERT','UPDATE','DELETE') NOT NULL,
      snapshot     ENUM('BEFORE','AFTER')           NOT NULL,
      changed_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      changed_by   VARCHAR(255) NULL,
      student_id   VARCHAR(64)  NOT NULL,
      college      VARCHAR(255) NULL,
      name         VARCHAR(255) NULL,
      parentage    VARCHAR(255) NULL,
      studentid    VARCHAR(255) NULL,
      rollno       VARCHAR(255) NULL,
      studentclass VARCHAR(255) NULL,
      course       VARCHAR(255) NULL,
      year         VARCHAR(20)  NULL,
      email        VARCHAR(255) NULL,
      phone        VARCHAR(50)  NULL,
      busstop      VARCHAR(255) NULL,
      bloodgroup   VARCHAR(20)  NULL,
      dob          VARCHAR(20)  NULL,
      address      TEXT         NULL,
      percentage   VARCHAR(10)  NULL,
      has_photo    TINYINT(1)   NULL,
      createdby    VARCHAR(255) NULL,
      createdat    DATETIME     NULL,
      deleted_by   VARCHAR(255) NULL,
      deleted_at   DATETIME     NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  if (!(await columnExists('student_audit', 'snapshot'))) {
    await dbExecute(`ALTER TABLE student_audit ADD COLUMN snapshot ENUM('BEFORE','AFTER') NOT NULL DEFAULT 'AFTER' AFTER operation`);
  }

  // user_audit
  await dbExecute(`
    CREATE TABLE IF NOT EXISTS user_audit (
      audit_id   BIGINT AUTO_INCREMENT PRIMARY KEY,
      operation  ENUM('INSERT','UPDATE','DELETE') NOT NULL,
      snapshot   ENUM('BEFORE','AFTER')           NOT NULL,
      changed_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      user_id    INT          NOT NULL,
      name       VARCHAR(255) NULL,
      email      VARCHAR(255) NULL,
      role       VARCHAR(50)  NULL,
      college_id INT          NULL,
      deleted_at DATETIME     NULL,
      deleted_by VARCHAR(255) NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  if (!(await columnExists('user_audit', 'snapshot'))) {
    await dbExecute(`ALTER TABLE user_audit ADD COLUMN snapshot ENUM('BEFORE','AFTER') NOT NULL DEFAULT 'AFTER' AFTER operation`);
  }

  // college_audit
  await dbExecute(`
    CREATE TABLE IF NOT EXISTS college_audit (
      audit_id   BIGINT AUTO_INCREMENT PRIMARY KEY,
      operation  ENUM('INSERT','UPDATE','DELETE') NOT NULL,
      snapshot   ENUM('BEFORE','AFTER')           NOT NULL,
      changed_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      college_id INT          NOT NULL,
      name       VARCHAR(255) NULL,
      deleted_at DATETIME     NULL,
      deleted_by VARCHAR(255) NULL,
      created_at DATETIME     NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  if (!(await columnExists('college_audit', 'snapshot'))) {
    await dbExecute(`ALTER TABLE college_audit ADD COLUMN snapshot ENUM('BEFORE','AFTER') NOT NULL DEFAULT 'AFTER' AFTER operation`);
  }
}

export async function GET() {
  try {
    await setupAuditTables();
    return NextResponse.json({ success: true, message: 'Audit tables ready.' });
  } catch (error) {
    console.error('Audit setup error:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
