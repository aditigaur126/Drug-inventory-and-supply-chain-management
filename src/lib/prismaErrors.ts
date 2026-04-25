type PrismaKnownError = {
  code?: string;
  meta?: {
    modelName?: string;
    table?: string;
  };
};

export const isMissingTableError = (error: unknown) => {
  if (!error || typeof error !== "object") {
    return false;
  }

  const prismaError = error as PrismaKnownError;
  return prismaError.code === "P2021";
};

export const getMissingTableMessage = (error: unknown) => {
  const prismaError = error as PrismaKnownError;
  const modelName = prismaError?.meta?.modelName;
  const table = prismaError?.meta?.table;

  return modelName && table
    ? `Database tables are not created yet for ${modelName} (${table}). Run Prisma migrations on the Neon database.`
    : "Database tables are not created yet. Run Prisma migrations on the Neon database.";
};
