export interface CollabEnv {
  host: string;
  nodeEnv: "development" | "test" | "production";
  port: number;
}

function parseInteger(name: string, value: string | undefined, fallback: number): number {
  if (value == null || value.trim() === "") {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid integer for ${name}: ${value}`);
  }

  return parsed;
}

function parseNodeEnv(value: string | undefined): CollabEnv["nodeEnv"] {
  if (value === "production" || value === "test") {
    return value;
  }

  return "development";
}

export function getCollabEnv(source: NodeJS.ProcessEnv = process.env): CollabEnv {
  return {
    host: source.HOST?.trim() || "0.0.0.0",
    nodeEnv: parseNodeEnv(source.NODE_ENV),
    port: parseInteger("PORT", source.PORT, 4001)
  };
}
