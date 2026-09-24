// Generate an ADMIN_PASSWORD_HASH — Phase 5.
//
//   npm run auth:hash
//
// Reads the password from an interactive prompt with echo disabled, so it
// never appears on screen, in shell history, or in a process listing. That is
// why it is not accepted as a command-line argument.
//
// Prints only the hash. Copy it into .env as ADMIN_PASSWORD_HASH — the
// plaintext password is never stored anywhere.

import { createInterface } from "node:readline";

import { dotenvLine } from "@/lib/auth/env-file";
import { hashPassword } from "@/lib/auth/password";

const MIN_LENGTH = 12;

/** Prompt without echoing. Falls back to a visible prompt on a non-TTY stdin. */
function promptHidden(question: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const input = process.stdin;
    const output = process.stdout;

    if (!input.isTTY) {
      const rl = createInterface({ input, output });
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer);
      });
      return;
    }

    output.write(question);
    input.setRawMode(true);
    input.resume();
    input.setEncoding("utf8");

    let value = "";
    const onData = (chunk: string) => {
      for (const ch of chunk) {
        switch (ch) {
          case "\n":
          case "\r":
          case "\u0004": // Ctrl-D
            input.setRawMode(false);
            input.pause();
            input.removeListener("data", onData);
            output.write("\n");
            resolve(value);
            return;
          case "\u0003": // Ctrl-C
            input.setRawMode(false);
            input.pause();
            input.removeListener("data", onData);
            output.write("\n");
            reject(new Error("Cancelled."));
            return;
          case "\u007f": // Backspace
          case "\b":
            value = value.slice(0, -1);
            break;
          default:
            if (ch >= " ") value += ch;
        }
      }
    };

    input.on("data", onData);
  });
}

async function main(): Promise<number> {
  const password = await promptHidden("Admin password (input hidden): ");
  if (password.length < MIN_LENGTH) {
    console.error(`\nPassword must be at least ${MIN_LENGTH} characters. Nothing was written.`);
    return 1;
  }

  const confirm = await promptHidden("Confirm password: ");
  if (confirm !== password) {
    console.error("\nPasswords did not match. Nothing was written.");
    return 1;
  }

  const hash = await hashPassword(password);

  // Printed with every `$` escaped as `\$`. Next.js expands `$NAME` inside
  // .env values, which silently collapses an unescaped scrypt hash into a
  // handful of characters — and the only symptom is the admin login claiming
  // it is "not configured". Quoting does not prevent it; escaping does.
  // See lib/auth/env-file.ts.
  console.log("\nAdd this line to .env exactly as printed (it is gitignored — never commit it):\n");
  console.log(dotenvLine("ADMIN_PASSWORD_HASH", hash));
  console.log(
    "\nThe backslashes are required: Next.js would otherwise treat each `$` as a\n" +
      "variable reference and strip the hash. Do not add quotes around it.",
  );
  console.log(
    "\nAlso set ADMIN_EMAIL, and an AUTH_SECRET of at least 32 characters:\n" +
      "  node -e \"console.log(require('node:crypto').randomBytes(32).toString('base64url'))\"\n",
  );
  return 0;
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error: unknown) => {
    console.error(`\n${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
