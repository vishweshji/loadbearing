import type { ChangedFile, DetectorContext } from "@loadbearing/core";
import { describe, expect, it } from "vitest";
import { LB002 } from "../detector.js";

function file(path: string, overrides: Partial<ChangedFile> = {}): ChangedFile {
  return { path, status: "added", binary: false, truncated: false, ...overrides };
}

function context(changedFiles: ChangedFile[]): DetectorContext {
  return {
    repository: {
      root: "/fake",
      baseRevision: "base",
      headRevision: "head",
      async changedFiles() {
        return changedFiles;
      },
      async readAt() {
        return undefined;
      },
      async existsAt() {
        return false;
      },
    },
    changedFiles,
  };
}

describe("LB002 metadata", () => {
  it("has stable id and HIGH default severity", () => {
    expect(LB002.id).toBe("LB002");
    expect(LB002.defaultSeverity).toBe("high");
  });
});

describe("LB002 - SQL migrations", () => {
  it("flags CREATE TABLE in a migration directory (positive)", async () => {
    const findings = await LB002.detect(
      context([
        file("db/migrations/001_create_customer_identity.sql", {
          after: "CREATE TABLE customer_identity (\n  id UUID PRIMARY KEY\n);\n",
        }),
      ]),
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe("high");
    expect(findings[0]?.evidence[0]?.description).toContain("customer_identity");
  });

  it("does not flag a SELECT statement (negative)", async () => {
    const findings = await LB002.detect(
      context([
        file("db/migrations/002_query.sql", {
          after: "SELECT * FROM customer_identity;\n",
        }),
      ]),
    );

    expect(findings).toHaveLength(0);
  });

  it("does not flag CREATE TABLE text inside a README (near-miss)", async () => {
    const findings = await LB002.detect(
      context([
        file("README.md", {
          after: "Example: `CREATE TABLE customer_identity (...)`\n",
        }),
      ]),
    );

    expect(findings).toHaveLength(0);
  });

  it("only flags newly added lines on modification, not pre-existing statements", async () => {
    const before = "CREATE TABLE existing_table (id UUID);\n";
    const after = before + "CREATE TABLE new_table (id UUID);\n";

    const findings = await LB002.detect(
      context([file("db/migrations/003.sql", { status: "modified", before, after })]),
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]?.evidence[0]?.description).toContain("new_table");
  });

  it("flags ALTER TABLE ADD COLUMN", async () => {
    const findings = await LB002.detect(
      context([
        file("migrations/004.sql", {
          after: "ALTER TABLE customer_identity ADD COLUMN email TEXT;\n",
        }),
      ]),
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]?.evidence[0]?.description).toContain("ADD COLUMN email");
  });

  it("does not flag anything for a deleted migration file", async () => {
    const findings = await LB002.detect(
      context([
        file("db/migrations/005.sql", {
          status: "deleted",
          before: "CREATE TABLE gone (id UUID);\n",
        }),
      ]),
    );

    expect(findings).toHaveLength(0);
  });

  it("does not scan a .sql file outside a migrations directory", async () => {
    const findings = await LB002.detect(
      context([file("scripts/adhoc.sql", { after: "CREATE TABLE adhoc (id UUID);\n" })]),
    );

    expect(findings).toHaveLength(0);
  });

  it("recognizes a migrations directory nested arbitrarily deep, not just at the repo root", async () => {
    // Regression: found via real-world testing against golang-migrate/migrate, whose own
    // example migrations live under database/postgres/examples/migrations/ - a root-only
    // "migrations/**" glob missed this entirely.
    const findings = await LB002.detect(
      context([
        file("database/postgres/examples/migrations/1385949617_create_books_table.up.sql", {
          after: "CREATE TABLE books (\n  user_id integer,\n  name varchar(40)\n);\n",
        }),
      ]),
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe("high");
    expect(findings[0]?.evidence[0]?.description).toContain("books");
  });
});

describe("LB002 - Prisma", () => {
  it("flags a new model as HIGH", async () => {
    const findings = await LB002.detect(
      context([
        file("schema.prisma", {
          after: "model Customer {\n  id String @id\n  email String\n}\n",
        }),
      ]),
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe("high");
  });

  it("flags a new optional field as MEDIUM and a new required field as HIGH", async () => {
    const before = "model Customer {\n  id String @id\n}\n";
    const after = "model Customer {\n  id String @id\n  nickname String?\n  email String\n}\n";

    const findings = await LB002.detect(
      context([file("schema.prisma", { status: "modified", before, after })]),
    );

    expect(findings).toHaveLength(2);
    const optional = findings.find((f) => f.evidence[0]?.description.includes("nickname"));
    const required = findings.find((f) => f.evidence[0]?.description.includes("email"));
    expect(optional?.severity).toBe("medium");
    expect(required?.severity).toBe("high");
  });

  it("does not flag an unchanged model", async () => {
    const content = "model Customer {\n  id String @id\n}\n";
    const findings = await LB002.detect(
      context([file("schema.prisma", { status: "modified", before: content, after: content })]),
    );

    expect(findings).toHaveLength(0);
  });
});

describe("LB002 - Django", () => {
  it("flags migrations.CreateModel", async () => {
    const findings = await LB002.detect(
      context([
        file("app/migrations/0002_create_book.py", {
          after: "migrations.CreateModel(\n    name='Book',\n    fields=[],\n)\n",
        }),
      ]),
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]?.evidence[0]?.description).toContain("Book");
  });

  it("does not scan a Python file outside a migrations directory", async () => {
    const findings = await LB002.detect(
      context([
        file("app/models.py", {
          after: "migrations.CreateModel(name='Book', fields=[])\n",
        }),
      ]),
    );

    expect(findings).toHaveLength(0);
  });
});

describe("LB002 - Alembic", () => {
  it("flags op.create_table", async () => {
    const findings = await LB002.detect(
      context([
        file("alembic/versions/abc123_create_book.py", {
          after: "op.create_table('book', sa.Column('id', sa.Integer))\n",
        }),
      ]),
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]?.evidence[0]?.description).toContain("book");
  });
});

describe("LB002 - Rails", () => {
  it("flags create_table under db/migrate", async () => {
    const findings = await LB002.detect(
      context([
        file("db/migrate/20260828000000_create_books.rb", {
          after:
            "class CreateBooks < ActiveRecord::Migration[7.0]\n  def change\n    create_table :books do |t|\n    end\n  end\nend\n",
        }),
      ]),
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]?.evidence[0]?.description).toContain("books");
  });

  it("does not scan a Ruby file outside db/migrate", async () => {
    const findings = await LB002.detect(
      context([file("app/models/book.rb", { after: "create_table :books\n" })]),
    );

    expect(findings).toHaveLength(0);
  });
});
