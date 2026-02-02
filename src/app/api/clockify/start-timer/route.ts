import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { getServerClient } from '@/lib/supabase/pool';
import { decryptApiKey } from '@/lib/clockify/encryption';
import { getClockifyClient } from '@/lib/clockify/client';

export const runtime = 'nodejs';
export const maxDuration = 10;

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { goalId, description } = await req.json();

    if (!goalId || !description) {
      return NextResponse.json(
        { error: 'goalId and description are required' },
        { status: 400 }
      );
    }

    // Get database client
    const supabase = getServerClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database unavailable' },
        { status: 503 }
      );
    }

    // Get user ID
    const userResult: any = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (userResult.error || !userResult.data) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userId = userResult.data.id;

    // Get Clockify connection
    const connectionResult: any = await supabase
      .from('clockify_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (connectionResult.error || !connectionResult.data) {
      return NextResponse.json(
        { error: 'Clockify не підключено' },
        { status: 404 }
      );
    }

    const connection = connectionResult.data;

    // Get goal details (name, color)
    const goalResult: any = await supabase
      .from('goals')
      .select('name, color')
      .eq('id', goalId)
      .single();

    if (goalResult.error || !goalResult.data) {
      return NextResponse.json(
        { error: 'Goal not found' },
        { status: 404 }
      );
    }

    const goal = goalResult.data;

    // Decrypt API key
    const apiKey = await decryptApiKey(connection.api_key_encrypted);
    const clockifyClient = getClockifyClient(apiKey);

    // Get or create project mapping for this goal
    const mappingResult: any = await supabase
      .from('clockify_project_goal_mappings')
      .select('clockify_projects(clockify_project_id, name)')
      .eq('goal_id', goalId)
      .eq('is_active', true)
      .single();

    let projectId: string | null = null;

    if (mappingResult.data?.clockify_projects?.clockify_project_id) {
      // Mapping exists - use existing project
      projectId = mappingResult.data.clockify_projects.clockify_project_id;
    } else {
      // No mapping - check if project exists in Clockify first
      console.log(`Checking/creating Clockify project for goal: ${goal.name}`);

      try {
        // Get active projects from Clockify
        const allProjects = await clockifyClient.getProjects(connection.workspace_id, false);

        console.log(`Found ${allProjects.length} active projects in Clockify`);
        console.log(`Looking for project: "${goal.name}"`);
        console.log(`Available: ${allProjects.map(p => `"${p.name}"`).join(', ')}`);

        const existingProject = allProjects.find(p => p.name === goal.name);

        let newProject;
        if (existingProject) {
          // Project exists - use it
          console.log(`✅ Found existing project: ${existingProject.name}`);
          newProject = existingProject;
        } else {
          // Try to create new project
          console.log(`Creating new project: ${goal.name}`);
          try {
            newProject = await clockifyClient.createProject(
              connection.workspace_id,
              {
                name: goal.name,
                color: goal.color || '#0B83D9',
                isPublic: true,
                billable: false,
              }
            );
            console.log(`✅ Created project: ${newProject.name}`);
          } catch (createError: any) {
            // If project already exists (Clockify internal issue), continue without project
            if (createError.message.includes('already exists')) {
              console.log(`⚠️ Project exists but not in list - continuing without project`);
              projectId = null;
              newProject = null;
            } else {
              throw createError;
            }
          }
        }

        if (!newProject) {
          // No project - continue without it
          console.log(`Timer will start without project`);
          projectId = null;
        } else {
          projectId = newProject.id;

        // Check if project already exists in our DB
        const existingDbProject: any = await supabase
          .from('clockify_projects')
          .select('id')
          .eq('connection_id', connection.id)
          .eq('clockify_project_id', newProject.id)
          .single();

        let savedProject = existingDbProject.data;

        if (!savedProject) {
          // Save project to our database
          const savedProjectResult: any = await (supabase as any)
            .from('clockify_projects')
            .insert({
              connection_id: connection.id,
              clockify_project_id: newProject.id,
              name: newProject.name,
              color: newProject.color,
              is_archived: false,
            })
            .select()
            .single();

          savedProject = savedProjectResult.data;
          console.log(`Saved project ${newProject.name} to DB`);
        } else {
          console.log(`Project ${newProject.name} already exists in DB`);
        }

        // Create mapping between goal and project (if not exists)
        if (savedProject) {
          const existingMapping: any = await supabase
            .from('clockify_project_goal_mappings')
            .select('id')
            .eq('user_id', userId)
            .eq('goal_id', goalId)
            .eq('clockify_project_id', savedProject.id)
            .maybeSingle();

          if (!existingMapping.data) {
            await (supabase as any)
              .from('clockify_project_goal_mappings')
              .insert({
                user_id: userId,
                goal_id: goalId,
                clockify_project_id: savedProject.id, // Our internal UUID, not Clockify ID
              });
            console.log(`Created mapping for ${goal.name} → ${newProject.name}`);
          } else {
            console.log(`Mapping already exists for ${goal.name}`);
          }
        }
        } // Close else block for newProject
      } catch (error: any) {
        console.error('Error creating Clockify project:', error);
        // Continue without project if creation fails
      }
    }

    // Start timer via Clockify API
    const timeEntry = await clockifyClient.createTimeEntry(
      connection.workspace_id,
      {
        start: new Date().toISOString(),
        description: description,
        projectId: projectId || undefined,
      }
    );

    return NextResponse.json({
      success: true,
      timeEntry: {
        id: timeEntry.id,
        description: timeEntry.description,
        projectId: timeEntry.projectId,
        start: timeEntry.timeInterval.start,
      },
      projectCreated: projectId ? !mappingResult.data : false, // New project was created
    });
  } catch (error: any) {
    console.error('Error starting timer:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
