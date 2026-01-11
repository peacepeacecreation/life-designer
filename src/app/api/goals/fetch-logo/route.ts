/**
 * Goal Logo Fetcher API
 *
 * POST /api/goals/fetch-logo - Fetch logo/favicon from a URL
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

export const runtime = 'nodejs';
export const maxDuration = 10;

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return '';
  }
}

/**
 * POST /api/goals/fetch-logo
 * Fetch logo/favicon from a given URL
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse request body
    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // 3. Validate URL
    let validUrl: URL;
    try {
      validUrl = new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    const domain = extractDomain(url);

    // 4. Try multiple sources for logo/favicon
    const logoSources = [
      // Google's favicon service (most reliable)
      `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
      // DuckDuckGo's icon service
      `https://icons.duckduckgo.com/ip3/${domain}.ico`,
      // Direct favicon.ico
      `${validUrl.protocol}//${domain}/favicon.ico`,
      // Apple touch icon
      `${validUrl.protocol}//${domain}/apple-touch-icon.png`,
      // Common logo locations
      `${validUrl.protocol}//${domain}/logo.png`,
      `${validUrl.protocol}//${domain}/images/logo.png`,
    ];

    // 5. Try to fetch from each source
    let logoUrl = null;
    for (const source of logoSources) {
      try {
        const response = await fetch(source, {
          method: 'HEAD',
          signal: AbortSignal.timeout(3000),
        });

        if (response.ok) {
          logoUrl = source;
          break;
        }
      } catch {
        // Continue to next source
        continue;
      }
    }

    // 6. If no logo found, use Google's favicon service as fallback
    if (!logoUrl) {
      logoUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
    }

    return NextResponse.json({
      iconUrl: logoUrl,
      domain,
    });
  } catch (error: any) {
    console.error('Error in POST /api/goals/fetch-logo:', error);
    return NextResponse.json(
      { error: 'Failed to fetch logo', details: error.message },
      { status: 500 }
    );
  }
}
