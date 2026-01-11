/**
 * Goal Icon Upload API
 *
 * POST /api/goals/upload-icon - Upload a custom icon for a goal
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { getServerClient } from '@/lib/supabase/pool';

export const runtime = 'nodejs';
export const maxDuration = 10;

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

    // 2. Get Supabase client
    const supabase = getServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
    }

    // 3. Get user ID
    const userResult: any = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (userResult.error || !userResult.data) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userId = userResult.data.id;

    // 4. Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const goalId = formData.get('goalId') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // 5. Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/svg+xml', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only PNG, JPEG, GIF, SVG, and WebP are allowed.' },
        { status: 400 }
      );
    }

    // 6. Validate file size (max 2MB)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 2MB.' },
        { status: 400 }
      );
    }

    // 7. Generate unique filename
    const fileExt = file.name.split('.').pop();
    const timestamp = Date.now();
    const fileName = goalId
      ? `${userId}/${goalId}_${timestamp}.${fileExt}`
      : `${userId}/${timestamp}.${fileExt}`;

    // 8. Convert File to ArrayBuffer then to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 9. Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('goal-icons')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload file', details: uploadError.message },
        { status: 500 }
      );
    }

    // 10. Get public URL
    const { data: urlData } = supabase.storage
      .from('goal-icons')
      .getPublicUrl(fileName);

    return NextResponse.json({
      iconUrl: urlData.publicUrl,
      fileName: uploadData.path,
    });
  } catch (error: any) {
    console.error('Error in POST /api/goals/upload-icon:', error);
    return NextResponse.json(
      { error: 'Failed to upload icon', details: error.message },
      { status: 500 }
    );
  }
}
