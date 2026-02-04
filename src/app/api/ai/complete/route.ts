import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'

/**
 * POST /api/ai/complete
 * AI completion endpoint using OpenRouter with Google Gemini
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { prompt, command } = await request.json()

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      )
    }

    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenRouter API key not configured' },
        { status: 500 }
      )
    }

    // Different system prompts based on command
    const systemPrompts: Record<string, string> = {
      continue: 'Ти - помічник для написання тексту. Продовж текст природньо та логічно, зберігаючи стиль та тон. Відповідай ТІЛЬКИ продовженням тексту, без додаткових коментарів.',
      improve: 'Ти - редактор тексту. Покращ наданий текст, зроби його більш чітким, структурованим та професійним. Відповідай ТІЛЬКИ покращеною версією тексту.',
      summarize: 'Ти - помічник для створення підсумків. Створи короткий та змістовний підсумок наданого тексту. Відповідай ТІЛЬКИ підсумком.',
      expand: 'Ти - помічник для розширення ідей. Розшир надану думку, додай деталей, прикладів та роз\'яснень. Відповідай ТІЛЬКИ розширеною версією.',
      default: 'Ти - помічник для написання тексту. Допомагай користувачу писати, продовжувати та покращувати текст.'
    }

    const systemPrompt = systemPrompts[command || 'default'] || systemPrompts.default

    // Call OpenRouter API with free Google Gemini model
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3077',
        'X-Title': 'Life Designer'
      },
      body: JSON.stringify({
        model: 'google/gemini-flash-1.5', // Free model
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      })
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('OpenRouter API error:', error)
      return NextResponse.json(
        { error: 'AI service error' },
        { status: response.status }
      )
    }

    const data = await response.json()
    const completion = data.choices?.[0]?.message?.content

    if (!completion) {
      return NextResponse.json(
        { error: 'No completion generated' },
        { status: 500 }
      )
    }

    return NextResponse.json({ completion })
  } catch (error) {
    console.error('Error in AI completion:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
