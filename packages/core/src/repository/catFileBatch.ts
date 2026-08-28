import { spawn } from "node:child_process";
import { RepositoryError } from "../errors.js";

interface PendingRequest {
  resolve: (value: Buffer | undefined) => void;
  reject: (reason: unknown) => void;
}

// One persistent `git cat-file --batch` process serves many `<rev>:<path>` lookups without
// paying a process-spawn cost per object — spawning `git show` per file was the dominant cost
// on large PRs (measured ~22ms/file, mostly process-startup overhead, not I/O).
export class GitCatFileBatch {
  private readonly proc: ReturnType<typeof spawn>;
  private buffer = Buffer.alloc(0);
  private readonly queue: PendingRequest[] = [];
  private closed = false;

  constructor(cwd: string) {
    this.proc = spawn("git", ["cat-file", "--batch"], { cwd, stdio: ["pipe", "pipe", "ignore"] });
    this.proc.stdout?.on("data", (chunk: Buffer) => {
      this.onData(chunk);
    });
    this.proc.on("error", (error) => {
      this.failAll(error);
    });
  }

  request(objectExpr: string): Promise<Buffer | undefined> {
    if (this.closed) {
      return Promise.reject(new RepositoryError("GitCatFileBatch is closed"));
    }
    return new Promise((resolve, reject) => {
      this.queue.push({ resolve, reject });
      this.proc.stdin?.write(`${objectExpr}\n`);
    });
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.proc.stdin?.end();
    this.proc.kill();
  }

  private onData(chunk: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, chunk]);

    for (;;) {
      const headerEnd = this.buffer.indexOf(0x0a);
      if (headerEnd === -1) return;

      const header = this.buffer.subarray(0, headerEnd).toString("utf8");

      if (header.endsWith(" missing")) {
        this.buffer = this.buffer.subarray(headerEnd + 1);
        this.settleNext(undefined);
        continue;
      }

      const parts = header.split(" ");
      const sizeToken = parts[parts.length - 1];
      const size = sizeToken !== undefined ? Number.parseInt(sizeToken, 10) : Number.NaN;

      if (!Number.isFinite(size)) {
        this.buffer = this.buffer.subarray(headerEnd + 1);
        this.settleNext(undefined);
        continue;
      }

      const contentStart = headerEnd + 1;
      const contentEnd = contentStart + size;
      if (this.buffer.length < contentEnd + 1) return; // wait for the rest, plus trailing LF

      const content = Buffer.from(this.buffer.subarray(contentStart, contentEnd));
      this.buffer = this.buffer.subarray(contentEnd + 1);
      this.settleNext(content);
    }
  }

  private settleNext(value: Buffer | undefined): void {
    const pending = this.queue.shift();
    pending?.resolve(value);
  }

  private failAll(error: unknown): void {
    while (this.queue.length > 0) {
      this.queue.shift()?.reject(error);
    }
  }
}
