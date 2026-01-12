/**
 * Goal Icon Upload API
 *
 * POST /api/goals/upload-icon - Upload a custom icon for a goal
 * Uses Vercel Blob in production, local filesystem in development
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { put } from '@vercel/blob';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export const runtime = 'nodejs';
export const maxDuration = 10;

const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * POST /api/goals/upload-icon
 * Upload a custom icon image for a goal
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const goalId = formData.get('goalId') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // 3. Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/svg+xml', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only PNG, JPEG, GIF, SVG, and WebP are allowed.' },
        { status: 400 }
      );
    }

    // 4. Validate file size (max 2MB)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 2MB.' },
        { status: 400 }
      );
    }

    // 5. Generate unique filename
    const fileExt = file.name.split('.').pop();
    const timestamp = Date.now();
    const userEmail = session.user.email.replace(/[^a-zA-Z0-9]/g, '_');

    if (isDevelopment) {
      // Development: Save to public/uploads folder
      const fileName = goalId
        ? `${goalId}_${timestamp}.${fileExt}`
        : `${timestamp}.${fileExt}`;

      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'goal-icons', userEmail);
      const filePath = path.join(uploadDir, fileName);

      // Create directory if it doesn't exist
      await mkdir(uploadDir, { recursive: true });

      // Convert File to Buffer
      const buffer = Buffer.from(await file.arrayBuffer());

      // Write file to disk
      await writeFile(filePath, buffer);

      // Return public URL
      const publicUrl = `/uploads/goal-icons/${userEmail}/${fileName}`;

      return NextResponse.json({
        iconUrl: publicUrl,
        fileName: fileName,
      });
    } else {
      // Production: Use Vercel Blob
      const fileName = goalId
        ? `goal-icons/${userEmail}/${goalId}_${timestamp}.${fileExt}`
        : `goal-icons/${userEmail}/${timestamp}.${fileExt}`;

      const blob = await put(fileName, file, {
        access: 'public',
        addRandomSuffix: false,
      });

      return NextResponse.json({
        iconUrl: blob.url,
        fileName: blob.pathname,
      });
    }
  } catch (error: any) {
    console.error('Error in POST /api/goals/upload-icon:', error);
    return NextResponse.json(
      { error: 'Failed to upload icon', details: error.message },
      { status: 500 }
    );
  }
}
