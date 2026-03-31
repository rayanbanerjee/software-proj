import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const users = [
  {
    id: "user_demo_owner",
    email: "owner@example.com",
    googleSubject: "google-owner",
    imageUrl: "https://example.com/avatar-owner.png",
    name: "Owner Demo"
  },
  {
    id: "user_demo_editor",
    email: "editor@example.com",
    googleSubject: "google-editor",
    imageUrl: "https://example.com/avatar-editor.png",
    name: "Editor Demo"
  },
  {
    id: "user_demo_viewer",
    email: "viewer@example.com",
    googleSubject: "google-viewer",
    imageUrl: "https://example.com/avatar-viewer.png",
    name: "Viewer Demo"
  }
];

const documents = [
  {
    id: "doc_demo_plan",
    title: "Project plan"
  },
  {
    id: "doc_demo_notes",
    title: "Research notes"
  }
];

const memberships = [
  {
    id: "membership_owner_plan",
    documentId: "doc_demo_plan",
    role: "owner",
    userId: "user_demo_owner"
  },
  {
    id: "membership_editor_plan",
    documentId: "doc_demo_plan",
    role: "editor",
    userId: "user_demo_editor"
  },
  {
    id: "membership_viewer_plan",
    documentId: "doc_demo_plan",
    role: "viewer",
    userId: "user_demo_viewer"
  },
  {
    id: "membership_owner_notes",
    documentId: "doc_demo_notes",
    role: "owner",
    userId: "user_demo_editor"
  },
  {
    id: "membership_commenter_notes",
    documentId: "doc_demo_notes",
    role: "commenter",
    userId: "user_demo_owner"
  }
];

async function seedUsers() {
  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      create: user,
      update: {
        googleSubject: user.googleSubject,
        imageUrl: user.imageUrl,
        name: user.name
      }
    });
  }
}

async function seedDocuments() {
  for (const document of documents) {
    await prisma.document.upsert({
      where: { id: document.id },
      create: document,
      update: {
        title: document.title
      }
    });
  }
}

async function seedMemberships() {
  for (const membership of memberships) {
    await prisma.documentMembership.upsert({
      where: {
        documentId_userId: {
          documentId: membership.documentId,
          userId: membership.userId
        }
      },
      create: membership,
      update: {
        role: membership.role
      }
    });
  }
}

async function main() {
  await seedUsers();
  await seedDocuments();
  await seedMemberships();

  console.log("Seeded demo users, documents, and memberships.");
}

main()
  .catch((error) => {
    console.error("Failed to seed demo data.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
