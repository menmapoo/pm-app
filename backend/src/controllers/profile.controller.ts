import { Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

// GET /api/profile/me — full profile with pending request
export const getMyProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { id: true, email: true, name: true, role: true, avatar: true, bio: true, isActive: true, createdAt: true },
    });
    if (!user) { res.status(404).json({ message: 'User not found' }); return; }

    const pendingRequest = await prisma.profileChangeRequest.findFirst({
      where: { userId: req.user!.userId, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    });

    const latestRequest = await prisma.profileChangeRequest.findFirst({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ user, pendingRequest, latestRequest });
  } catch {
    res.status(500).json({ message: 'Failed to fetch profile' });
  }
};

// POST /api/profile/request — submit a change request
export const submitChangeRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, email, bio } = req.body;
  const userId = req.user!.userId;

  if (!name && !email && !bio) {
    res.status(400).json({ message: 'No changes provided' });
    return;
  }

  try {
    // Cancel any existing pending request first
    await prisma.profileChangeRequest.updateMany({
      where: { userId, status: 'PENDING' },
      data: { status: 'REJECTED', adminNote: 'Superseded by a newer request' },
    });

    const request = await prisma.profileChangeRequest.create({
      data: {
        userId,
        requestedName: name || null,
        requestedEmail: email || null,
        requestedBio: bio || null,
      },
    });

    res.status(201).json({ request, message: 'Change request submitted. Awaiting admin approval.' });
  } catch {
    res.status(500).json({ message: 'Failed to submit request' });
  }
};

// POST /api/profile/change-password — change own password (no approval needed)
export const changePassword = async (req: AuthRequest, res: Response): Promise<void> => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user!.userId;

  if (!currentPassword || !newPassword || newPassword.length < 6) {
    res.status(400).json({ message: 'Current and new password (min 6 chars) required' });
    return;
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) { res.status(404).json({ message: 'User not found' }); return; }

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) { res.status(400).json({ message: 'Current password is incorrect' }); return; }

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: userId }, data: { password: hashed } });

    res.json({ message: 'Password changed successfully' });
  } catch {
    res.status(500).json({ message: 'Failed to change password' });
  }
};

// GET /api/profile/requests — admin: list all requests
export const getAllRequests = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status } = req.query;
    const where: any = {};
    if (status) where.status = status;

    const requests = await prisma.profileChangeRequest.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, avatar: true, bio: true, role: true } },
        reviewedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const pendingCount = await prisma.profileChangeRequest.count({ where: { status: 'PENDING' } });

    res.json({ requests, pendingCount });
  } catch {
    res.status(500).json({ message: 'Failed to fetch requests' });
  }
};

// PATCH /api/profile/requests/:id/approve — admin: approve
export const approveRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  const adminId = req.user!.userId;
  const { adminNote } = req.body;

  try {
    const request = await prisma.profileChangeRequest.findUnique({
      where: { id: req.params.id },
      include: { user: true },
    });

    if (!request) { res.status(404).json({ message: 'Request not found' }); return; }
    if (request.status !== 'PENDING') { res.status(400).json({ message: 'Request is not pending' }); return; }

    // Apply the changes to the user
    const updateData: any = {};
    if (request.requestedName) updateData.name = request.requestedName;
    if (request.requestedEmail) updateData.email = request.requestedEmail;
    if (request.requestedBio !== null) updateData.bio = request.requestedBio;

    await prisma.$transaction([
      prisma.user.update({ where: { id: request.userId }, data: updateData }),
      prisma.profileChangeRequest.update({
        where: { id: req.params.id },
        data: { status: 'APPROVED', adminNote: adminNote || null, reviewedById: adminId },
      }),
    ]);

    res.json({ message: 'Request approved and profile updated' });
  } catch {
    res.status(500).json({ message: 'Failed to approve request' });
  }
};

// PATCH /api/profile/requests/:id/reject — admin: reject
export const rejectRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  const adminId = req.user!.userId;
  const { adminNote } = req.body;

  try {
    const request = await prisma.profileChangeRequest.findUnique({ where: { id: req.params.id } });
    if (!request) { res.status(404).json({ message: 'Request not found' }); return; }
    if (request.status !== 'PENDING') { res.status(400).json({ message: 'Request is not pending' }); return; }

    await prisma.profileChangeRequest.update({
      where: { id: req.params.id },
      data: { status: 'REJECTED', adminNote: adminNote || null, reviewedById: adminId },
    });

    res.json({ message: 'Request rejected' });
  } catch {
    res.status(500).json({ message: 'Failed to reject request' });
  }
};

// GET /api/profile/requests/pending-count — for sidebar badge
export const getPendingCount = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const count = await prisma.profileChangeRequest.count({ where: { status: 'PENDING' } });
    res.json({ count });
  } catch {
    res.status(500).json({ message: 'Failed to fetch count' });
  }
};
