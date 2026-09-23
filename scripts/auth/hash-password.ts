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

  console.log("\nAdd this line to .env (it is gitignored — never commit it):\n");
  console.log(`ADMIN_PASSWORD_HASH="${hash}"`);
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
