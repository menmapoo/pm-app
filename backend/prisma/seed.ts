import { PrismaClient, Role, ProjectStatus, TicketType, TicketStatus, TicketPriority, ProjectRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  await prisma.activityLog.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();

  const hashedPassword = await bcrypt.hash('password123', 10);

  const admin = await prisma.user.create({
    data: { email: 'admin@pmapp.com', password: hashedPassword, name: 'Admin User', role: Role.ADMIN },
  });
  const pm = await prisma.user.create({
    data: { email: 'pm@pmapp.com', password: hashedPassword, name: 'Sarah Johnson', role: Role.PROJECT_MANAGER },
  });
  const dev1 = await prisma.user.create({
    data: { email: 'dev1@pmapp.com', password: hashedPassword, name: 'Alex Chen', role: Role.DEVELOPER },
  });
  const dev2 = await prisma.user.create({
    data: { email: 'dev2@pmapp.com', password: hashedPassword, name: 'Maria Garcia', role: Role.DEVELOPER },
  });
  const viewer = await prisma.user.create({
    data: { email: 'viewer@pmapp.com', password: hashedPassword, name: 'Tom Wilson', role: Role.VIEWER },
  });

  console.log('Users created');

  const project1 = await prisma.project.create({
    data: { name: 'Frontend Redesign', description: 'Complete redesign of the customer-facing frontend application.', key: 'FRD', status: ProjectStatus.ACTIVE },
  });
  const project2 = await prisma.project.create({
    data: { name: 'API Gateway', description: 'Build a centralized API gateway for all microservices.', key: 'AGW', status: ProjectStatus.ACTIVE },
  });
  const project3 = await prisma.project.create({
    data: { name: 'Mobile App', description: 'Cross-platform mobile application for iOS and Android.', key: 'MOB', status: ProjectStatus.ARCHIVED },
  });

  console.log('Projects created');

  await prisma.projectMember.createMany({
    data: [
      { projectId: project1.id, userId: admin.id, role: ProjectRole.MANAGER },
      { projectId: project1.id, userId: pm.id, role: ProjectRole.MANAGER },
      { projectId: project1.id, userId: dev1.id, role: ProjectRole.DEVELOPER },
      { projectId: project1.id, userId: dev2.id, role: ProjectRole.DEVELOPER },
      { projectId: project1.id, userId: viewer.id, role: ProjectRole.VIEWER },
      { projectId: project2.id, userId: admin.id, role: ProjectRole.MANAGER },
      { projectId: project2.id, userId: pm.id, role: ProjectRole.MANAGER },
      { projectId: project2.id, userId: dev1.id, role: ProjectRole.DEVELOPER },
      { projectId: project3.id, userId: pm.id, role: ProjectRole.MANAGER },
      { projectId: project3.id, userId: dev2.id, role: ProjectRole.DEVELOPER },
    ],
  });

  console.log('Project members added');

  // Tickets with realistic startDate and dueDate for Gantt demo
  const tickets = [
    // Frontend Redesign tickets
    {
      key: 'FRD-1', title: 'Setup project structure and build tooling',
      description: 'Initialize with Vite, TypeScript, Tailwind CSS, and ESLint.',
      type: TicketType.TASK, status: TicketStatus.DONE, priority: TicketPriority.HIGH,
      projectId: project1.id, assigneeId: dev1.id, reporterId: pm.id, position: 0,
      startDate: new Date('2026-03-01'), dueDate: new Date('2026-03-15'),
    },
    {
      key: 'FRD-2', title: 'Design system and component library',
      description: 'Create reusable UI components: Button, Input, Modal, Badge, Select.',
      type: TicketType.STORY, status: TicketStatus.IN_REVIEW, priority: TicketPriority.HIGH,
      projectId: project1.id, assigneeId: dev2.id, reporterId: pm.id, position: 0,
      startDate: new Date('2026-03-10'), dueDate: new Date('2026-04-25'),
    },
    {
      key: 'FRD-3', title: 'Implement authentication pages',
      description: 'Build login and registration pages with form validation.',
      type: TicketType.TASK, status: TicketStatus.IN_PROGRESS, priority: TicketPriority.HIGHEST,
      projectId: project1.id, assigneeId: dev1.id, reporterId: pm.id, position: 0,
      startDate: new Date('2026-04-01'), dueDate: new Date('2026-05-20'),
    },
    {
      key: 'FRD-4', title: 'Dashboard page implementation',
      description: 'Create the main dashboard with stats, charts, and recent activity.',
      type: TicketType.STORY, status: TicketStatus.TODO, priority: TicketPriority.HIGH,
      projectId: project1.id, assigneeId: dev2.id, reporterId: pm.id, position: 0,
      startDate: new Date('2026-05-10'), dueDate: new Date('2026-06-10'),
    },
    {
      key: 'FRD-5', title: 'Fix navigation broken on mobile',
      description: 'Sidebar navigation collapses incorrectly on mobile screens.',
      type: TicketType.BUG, status: TicketStatus.TODO, priority: TicketPriority.MEDIUM,
      projectId: project1.id, assigneeId: dev1.id, reporterId: dev2.id, position: 1,
      startDate: new Date('2026-04-25'), dueDate: new Date('2026-05-28'),
    },
    {
      key: 'FRD-6', title: 'Add dark mode support',
      description: 'Implement dark mode toggle with persistent user preference.',
      type: TicketType.IMPROVEMENT, status: TicketStatus.BACKLOG, priority: TicketPriority.LOW,
      projectId: project1.id, assigneeId: null, reporterId: pm.id, position: 0,
      startDate: null, dueDate: null, // Intentionally no dates (shown in Gantt warning section)
    },
    {
      key: 'FRD-7', title: 'Performance optimization - lazy loading',
      description: 'Implement route-level code splitting and lazy loading.',
      type: TicketType.IMPROVEMENT, status: TicketStatus.BACKLOG, priority: TicketPriority.MEDIUM,
      projectId: project1.id, assigneeId: null, reporterId: dev1.id, position: 1,
      startDate: null, dueDate: null, // Intentionally no dates
    },
    // API Gateway tickets
    {
      key: 'AGW-1', title: 'API Gateway architecture design',
      description: 'Design overall architecture: routing, auth, and rate limiting.',
      type: TicketType.STORY, status: TicketStatus.DONE, priority: TicketPriority.HIGHEST,
      projectId: project2.id, assigneeId: pm.id, reporterId: admin.id, position: 0,
      startDate: new Date('2026-02-15'), dueDate: new Date('2026-03-20'),
    },
    {
      key: 'AGW-2', title: 'Implement JWT authentication middleware',
      description: 'Build JWT validation middleware for all services.',
      type: TicketType.TASK, status: TicketStatus.IN_PROGRESS, priority: TicketPriority.HIGH,
      projectId: project2.id, assigneeId: dev1.id, reporterId: pm.id, position: 0,
      startDate: new Date('2026-03-25'), dueDate: new Date('2026-05-15'),
    },
    {
      key: 'AGW-3', title: 'Rate limiting implementation',
      description: 'Add configurable rate limiting per route and per user.',
      type: TicketType.TASK, status: TicketStatus.TODO, priority: TicketPriority.MEDIUM,
      projectId: project2.id, assigneeId: dev1.id, reporterId: pm.id, position: 0,
      startDate: new Date('2026-05-05'), dueDate: new Date('2026-06-20'),
    },
  ];

  for (const ticket of tickets) {
    await prisma.ticket.create({ data: ticket });
  }

  console.log('Tickets created');

  const frd3 = await prisma.ticket.findUnique({ where: { key: 'FRD-3' } });
  const frd2 = await prisma.ticket.findUnique({ where: { key: 'FRD-2' } });

  if (frd3 && frd2) {
    await prisma.comment.createMany({
      data: [
        { content: 'I have started working on the login page. Should be done by EOD.', ticketId: frd3.id, authorId: dev1.id },
        { content: 'Great! Make sure to handle the JWT refresh token flow as well.', ticketId: frd3.id, authorId: pm.id },
        { content: 'Component library is looking good! Just need to finalize the Modal component.', ticketId: frd2.id, authorId: dev2.id },
      ],
    });

    await prisma.activityLog.createMany({
      data: [
        { action: 'TICKET_CREATED', entity: 'TICKET', entityId: frd3.id, details: { title: 'Implement authentication pages' }, userId: pm.id, projectId: project1.id, ticketId: frd3.id },
        { action: 'STATUS_CHANGED', entity: 'TICKET', entityId: frd3.id, details: { from: 'TODO', to: 'IN_PROGRESS' }, userId: dev1.id, projectId: project1.id, ticketId: frd3.id },
        { action: 'PROJECT_CREATED', entity: 'PROJECT', entityId: project1.id, details: { name: 'Frontend Redesign' }, userId: admin.id, projectId: project1.id },
        { action: 'PROJECT_CREATED', entity: 'PROJECT', entityId: project2.id, details: { name: 'API Gateway' }, userId: admin.id, projectId: project2.id },
      ],
    });
  }

  console.log('Seed complete!\n');
  console.log('Admin:   admin@pmapp.com / password123');
  console.log('PM:      pm@pmapp.com / password123');
  console.log('Dev 1:   dev1@pmapp.com / password123');
  console.log('Dev 2:   dev2@pmapp.com / password123');
  console.log('Viewer:  viewer@pmapp.com / password123');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
