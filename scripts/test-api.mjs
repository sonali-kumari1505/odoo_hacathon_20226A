import { spawn } from "node:child_process";
import { once } from "node:events";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";

function loadEnvFile() {
  const envPath = join(process.cwd(), ".env");
  if (!existsSync(envPath)) {
    return;
  }

  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const idx = trimmed.indexOf("=");
    if (idx <= 0) {
      continue;
    }

    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvFile();

const prisma = new PrismaClient();
const PORT = Number(process.env.API_TEST_PORT || 3100 + Math.floor(Math.random() * 200));
const BASE_URL = `http://127.0.0.1:${PORT}`;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function waitForServerReady(timeoutMs = 90000) {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${BASE_URL}/login`);
      if (res.status === 200) {
        return;
      }
    } catch {
      // Keep polling until timeout.
    }

    await sleep(500);
  }

  throw new Error(`Timed out waiting for server on ${BASE_URL}`);
}

async function parseJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function extractSessionCookie(res) {
  const setCookie = res.headers.get("set-cookie") || "";
  const cookiePair = setCookie.split(";")[0];
  return cookiePair || null;
}

async function run() {
  let createdUserId = null;
  let createdProductId = null;
  let createdMovementId = null;
  let devServer;

  try {
    console.log(`Starting Next.js dev server on port ${PORT}...`);

    devServer = spawn("npm", ["run", "dev", "--", "--port", String(PORT)], {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env },
    });

    devServer.stdout.on("data", (chunk) => {
      process.stdout.write(String(chunk));
    });

    devServer.stderr.on("data", (chunk) => {
      process.stderr.write(String(chunk));
    });

    await waitForServerReady();
    console.log("Server is ready. Running API checks...");

    const token = Date.now();
    const authPayload = {
      name: "API Test User",
      email: `api-test-${token}@example.com`,
      password: "testpass123",
    };

    const signupRes = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(authPayload),
    });

    const signupBody = await parseJson(signupRes);
    assert(signupRes.status === 201, `Expected signup 201, got ${signupRes.status}`);
    assert(signupBody?.user?.id, "Signup response missing user id");
    createdUserId = signupBody.user.id;

    const sessionCookie = extractSessionCookie(signupRes);
    assert(sessionCookie, "Signup did not return a session cookie");

    const productPayload = {
      name: `API Test Product ${token}`,
      sku: `API-${token}`,
      unit: "pcs",
    };

    const createProductRes = await fetch(`${BASE_URL}/api/products`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie,
      },
      body: JSON.stringify(productPayload),
    });

    const createProductBody = await parseJson(createProductRes);
    assert(
      createProductRes.status === 200 || createProductRes.status === 201,
      `Expected product create 200/201, got ${createProductRes.status}`,
    );
    assert(createProductBody?.id, "Product create response missing id");
    createdProductId = createProductBody.id;

    const moveOkRes = await fetch(`${BASE_URL}/api/movement`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie,
      },
      body: JSON.stringify({
        productId: createdProductId,
        type: "IN",
        quantity: 7,
        location: "API Test Dock",
      }),
    });

    const moveOkBody = await parseJson(moveOkRes);
    assert(moveOkRes.status === 200, `Expected movement create 200, got ${moveOkRes.status}`);
    assert(moveOkBody?.id, "Movement response missing id");
    assert(moveOkBody.type === "in", `Expected movement type to normalize to 'in', got '${moveOkBody?.type}'`);
    assert(moveOkBody.location === "API Test Dock", "Expected movement location to persist");
    createdMovementId = moveOkBody.id;

    const moveInvalidTypeRes = await fetch(`${BASE_URL}/api/movement`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie,
      },
      body: JSON.stringify({
        productId: createdProductId,
        type: "bad",
        quantity: 7,
      }),
    });

    const moveInvalidTypeBody = await parseJson(moveInvalidTypeRes);
    assert(moveInvalidTypeRes.status === 400, `Expected invalid type 400, got ${moveInvalidTypeRes.status}`);
    assert(
      moveInvalidTypeBody?.error === "Unsupported movement type" ||
        moveInvalidTypeBody?.error === "type must be 'in' or 'out'",
      `Unexpected invalid type error: ${JSON.stringify(moveInvalidTypeBody)}`,
    );

    const moveUnknownProductRes = await fetch(`${BASE_URL}/api/movement`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie,
      },
      body: JSON.stringify({
        productId: 999999999,
        type: "in",
        quantity: 1,
      }),
    });

    const moveUnknownProductBody = await parseJson(moveUnknownProductRes);
    assert(moveUnknownProductRes.status === 404, `Expected unknown product 404, got ${moveUnknownProductRes.status}`);
    assert(
      moveUnknownProductBody?.error === "Product not found",
      `Unexpected unknown product error: ${JSON.stringify(moveUnknownProductBody)}`,
    );

    const historyRes = await fetch(`${BASE_URL}/api/history`, {
      headers: { Cookie: sessionCookie },
    });
    const historyBody = await parseJson(historyRes);
    assert(historyRes.status === 200, `Expected history 200, got ${historyRes.status}`);
    assert(Array.isArray(historyBody), "Expected history response to be an array");

    const foundMovement = historyBody.find((entry) => entry.id === createdMovementId);
    assert(foundMovement, "Created movement not found in history");
    assert(foundMovement.location === "API Test Dock", "History movement location mismatch");

    console.log("API smoke test passed.");
  } finally {
    try {
      if (createdMovementId) {
        await prisma.movement.deleteMany({ where: { id: createdMovementId } });
      }
      if (createdProductId) {
        await prisma.product.deleteMany({ where: { id: createdProductId } });
      }
      if (createdUserId) {
        await prisma.user.deleteMany({ where: { id: createdUserId } });
      }
    } catch (cleanupError) {
      console.error("Cleanup warning:", cleanupError);
    }

    await prisma.$disconnect();

    if (devServer && !devServer.killed) {
      devServer.kill("SIGTERM");
      try {
        await once(devServer, "exit");
      } catch {
        // Ignore if already closed.
      }
    }
  }
}

run().catch((error) => {
  console.error("API smoke test failed:", error);
  process.exit(1);
});
