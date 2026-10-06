import prisma from "../config/database.js";

export function findUserByEmail(email: string) {
  return prisma.users.findUnique({
    where: {
      email,
    },
  });
}

export function findUserById(id: string) {
  return prisma.users.findUnique({
    where: {
      id,
    },
  });
}

type CreateUserInput = {
  email: string;
  passwordHash: string;
  displayName?: string;
};

export function createUser(input: CreateUserInput) {
  return prisma.users.create({
    data: {
      email: input.email,
      password_hash: input.passwordHash,
      display_name: input.displayName ?? null,
    },
  });
}
