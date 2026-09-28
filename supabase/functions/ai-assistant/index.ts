import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');

const GROQ_URL =
  'https://api.groq.com/openai/v1/chat/completions';

const GROQ_MODELS = [
  'openai/gpt-oss-120b',
  'qwen/qwen3.8-27b',
];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods':
    'POST, OPTIONS',
};

// ─────────────────────────────────────────────
// Call Groq
// ─────────────────────────────────────────────

async function callGroq(
  messages: any[],
  jsonMode = false
): Promise<string> {
  if (!GROQ_API_KEY) {
    throw new Error(
      'GROQ_API_KEY is not configured'
    );
  }

  let lastError = '';

  for (const model of GROQ_MODELS) {
    console.log(
      `Trying Groq model: ${model}`
    );

    const body: any = {
      model,
      messages,
      temperature: 0.7,
      max_tokens: jsonMode ? 3000 : 700,
    };

    if (jsonMode) {
      body.response_format = {
        type: 'json_object',
      };
    }

    try {
      const response = await fetch(
        GROQ_URL,
        {
          method: 'POST',
          headers: {
            Authorization:
              `Bearer ${GROQ_API_KEY}`,
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify(body),
        }
      );

      console.log(
        `${model} → HTTP ${response.status}`
      );

      if (response.ok) {
        const data =
          await response.json();

        const text =
          data?.choices?.[0]?.message
            ?.content || '';

        if (!text) {
          throw new Error(
            'Groq returned an empty response'
          );
        }

        console.log(
          `${model} succeeded. Response length: ${text.length}`
        );

        return text;
      }

      const errorText =
        await response.text();

      lastError = errorText;

      console.error(
        `${model} failed (${response.status}):`,
        errorText.slice(0, 500)
      );

      // Authentication errors affect
      // every model.
      if (
        response.status === 401 ||
        response.status === 403
      ) {
        break;
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : String(error);

      console.error(
        `${model} threw:`,
        message
      );

      lastError = message;
    }
  }

  throw new Error(
    `All Groq models failed. ${lastError.slice(
      0,
      500
    )}`
  );
}

// ─────────────────────────────────────────────
// Clean JSON response
// ─────────────────────────────────────────────

function cleanJson(raw: string): string {
  let cleaned = raw.trim();

  cleaned = cleaned
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  return cleaned;
}

// ─────────────────────────────────────────────
// Validate event plan
// ─────────────────────────────────────────────

function validatePlan(
  plan: any,
  totalBudget: number
) {
  if (
    !plan ||
    typeof plan !== 'object'
  ) {
    throw new Error(
      'Invalid plan returned by AI'
    );
  }

  if (!Array.isArray(plan.tasks)) {
    throw new Error(
      'Invalid tasks returned by AI'
    );
  }

  if (
    !Array.isArray(
      plan.budget_breakdown
    )
  ) {
    throw new Error(
      'Invalid budget breakdown returned by AI'
    );
  }

  if (!Array.isArray(plan.timeline)) {
    throw new Error(
      'Invalid timeline returned by AI'
    );
  }

  if (
    !Array.isArray(
      plan.vendors_suggested
    )
  ) {
    throw new Error(
      'Invalid vendor suggestions returned by AI'
    );
  }

  if (!Array.isArray(plan.tips)) {
    throw new Error(
      'Invalid tips returned by AI'
    );
  }

  const percentageTotal =
    plan.budget_breakdown.reduce(
      (sum: number, item: any) =>
        sum +
        Number(item.percent || 0),
      0
    );

  if (
    Math.abs(
      percentageTotal - 100
    ) > 1
  ) {
    throw new Error(
      `Budget percentages must equal 100. Got ${percentageTotal}`
    );
  }

  const amountTotal =
    plan.budget_breakdown.reduce(
      (sum: number, item: any) =>
        sum +
        Number(item.amount || 0),
      0
    );

  if (
    totalBudget > 0 &&
    Math.abs(
      amountTotal - totalBudget
    ) > 1
  ) {
    throw new Error(
      `Budget amounts do not equal total budget. Expected ${totalBudget}, got ${amountTotal}`
    );
  }

  return true;
}

// ─────────────────────────────────────────────
// Main Edge Function
// ─────────────────────────────────────────────

serve(async (req: Request) => {
  console.log(
    'Incoming request:',
    req.method
  );

  // CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders,
    });
  }

  // POST only
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({
        error: 'Method not allowed',
      }),
      {
        status: 405,
        headers: {
          ...corsHeaders,
          'Content-Type':
            'application/json',
        },
      }
    );
  }

  try {
    const body = await req.json();

    const mode = body?.mode;

    console.log(
      'Requested mode:',
      mode
    );

    // ═══════════════════════════════════════
    // CHAT MODE
    // ═══════════════════════════════════════

    if (
      mode === 'chat' ||
      mode === undefined ||
      mode === null
    ) {
      const {
        messages,
        context,
      } = body;

      if (!Array.isArray(messages)) {
        return new Response(
          JSON.stringify({
            error:
              'messages must be an array',
          }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              'Content-Type':
                'application/json',
            },
          }
        );
      }

      const systemPrompt = `
You are EventEase AI, a friendly and practical event planning assistant.

Your job is to help users plan and manage events.

You can help with:
- Creating new event plans
- Birthdays
- Weddings
- College festivals
- Conferences
- Parties
- Beach events
- Budgets
- Tasks
- Guests
- Vendors
- Timelines
- Seating
- Event-day preparation
- General event planning questions

IMPORTANT BEHAVIOR:

1. If the user asks a normal event-planning question, answer normally.

2. If the user asks about an existing event, use the event information provided in the context.

3. If the user wants to plan a NEW event that does not exist in the database, you should still help them plan it.

4. For a new event, ask for missing important information such as:
   - Event type
   - Date
   - Number of guests
   - Budget
   - Location or venue
   - Special requirements

5. Do NOT claim that a new event already exists in the user's database.

6. You MAY make reasonable planning suggestions for a new event, but clearly present them as suggestions or estimates.

7. Never invent existing database information.

8. Remember previous messages in the conversation and use them for follow-up questions.

9. If the user gives information such as:
   "20 people, ₹30,000 budget, December 15"
   remember those details in the current conversation and use them in the next response.

10. If the user says "plan it", "make the plan", or similar, create a practical conversational event plan using the information already provided.

11. Keep responses under 200 words.

12. Use bullet points when useful.

13. Be friendly, concise and practical.

CURRENT USER/EVENT CONTEXT:

${JSON.stringify(
  context || {},
  null,
  2
)}
`;

      const groqMessages = [
        {
          role: 'system',
          content: systemPrompt,
        },
        ...messages.map(
          (message: any) => ({
            role:
              message.role ===
              'assistant'
                ? 'assistant'
                : 'user',
            content: String(
              message.content || ''
            ),
          })
        ),
      ];

      const reply =
        await callGroq(
          groqMessages,
          false
        );

      return new Response(
        JSON.stringify({
          reply,
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type':
              'application/json',
          },
        }
      );
    }

    // ═══════════════════════════════════════
    // BUDGET INSIGHTS MODE
    // ═══════════════════════════════════════

    if (
      mode === 'budget_insights'
    ) {
      console.log(
        'Running budget insights'
      );

      const {
        event,
        expenses,
        stats,
      } = body;

      if (!event) {
        return new Response(
          JSON.stringify({
            error:
              'Event is required',
          }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              'Content-Type':
                'application/json',
            },
          }
        );
      }

      // Safely handle requirements
      let requirementsText =
        'None';

      if (
        Array.isArray(
          event.requirements
        )
      ) {
        requirementsText =
          event.requirements.join(
            ', '
          ) || 'None';
      } else if (
        typeof event.requirements ===
        'string'
      ) {
        requirementsText =
          event.requirements ||
          'None';
      }

      // Safely handle expenses
      const expenseArray =
        Array.isArray(expenses)
          ? expenses
          : [];

      const expenseList =
        expenseArray
          .map(
            (expense: any) =>
              `- ${
                expense.category ||
                'Other'
              }: Rs ${
                Number(
                  expense.amount || 0
                )
              } (${
                expense.paid
                  ? 'paid'
                  : 'pending'
              })`
          )
          .join('\n') ||
        'None yet';

      const insightsPrompt = `
You are an expert event budget advisor.

Analyze the event budget and provide practical insights.

EVENT:

Name: ${
        event.name ||
        'Unnamed Event'
      }

Type: ${
        event.type ||
        'General Event'
      }

Expected guests: ${
        event.expected_guests ||
        0
      }

Total budget: Rs ${
        Number(
          event.total_budget || 0
        )
      }

Requirements:
${requirementsText}

CURRENT EXPENSES:

${expenseList}

CURRENT STATS:

Spent: Rs ${
        Number(
          stats?.spent || 0
        )
      }

Paid: Rs ${
        Number(
          stats?.paid || 0
        )
      }

Pending: Rs ${
        Number(
          stats?.pending || 0
        )
      }

Remaining: Rs ${
        Number(
          stats?.remaining || 0
        )
      }

Over budget by: Rs ${
        Number(
          stats?.over || 0
        )
      }

Percentage used:
${Math.round(
        Number(
          stats?.percent || 0
        )
      )}%

Return ONLY valid JSON.

Use exactly this structure:

{
  "risk_level": "low",
  "headline": "one short summary",
  "insights": [
    {
      "icon": "alert-triangle",
      "color": "#ef4444",
      "title": "short title",
      "description": "practical explanation"
    }
  ],
  "savings_tips": [
    {
      "title": "short title",
      "potential_saving": "Rs 5000",
      "detail": "how to save"
    }
  ],
  "suggested_allocations": [
    {
      "category": "Venue",
      "percent": 35,
      "reason": "short reason"
    }
  ]
}

RULES:

1. risk_level:
   - low = under 60% used
   - medium = 60-90% used
   - high = over 90% used or over budget

2. Generate 3-4 insights.

3. Generate 2-4 savings tips.

4. Generate 4-6 suggested allocations.

5. Suggested allocation percentages MUST add to exactly 100.

6. Use realistic estimates for savings tips.

7. If there are no expenses yet, focus on recommended allocation and planning tips.

8. Do not claim an expense exists if it is not present in the data.

9. Do not use markdown.

10. Return JSON only.

Allowed icons:
alert-triangle
alert-circle
trending-up
trending-down
check-circle
dollar-sign
zap
info
target
pie-chart
shield
users

Allowed colors:
#10b981
#f59e0b
#ef4444
#6366f1
#8b5cf6
`;

      const groqMessages = [
        {
          role: 'system',
          content:
            'You are an expert event budget advisor. Return only valid JSON.',
        },
        {
          role: 'user',
          content:
            insightsPrompt,
        },
      ];

      const raw =
        await callGroq(
          groqMessages,
          true
        );

      console.log(
        'Raw budget insights response:',
        raw.slice(0, 1000)
      );

      let insights;

      try {
        const cleaned =
          cleanJson(raw);

        insights =
          JSON.parse(cleaned);

        console.log(
          'Budget insights parsed successfully'
        );
      } catch (error) {
        console.error(
          'Budget insights parse failed:',
          raw.slice(0, 1000)
        );

        throw new Error(
          'AI returned invalid budget insights JSON'
        );
      }

      return new Response(
        JSON.stringify({
          insights,
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type':
              'application/json',
          },
        }
      );
    }

    // ═══════════════════════════════════════
    // PLAN GENERATION MODE
    // ═══════════════════════════════════════

    if (
      mode === 'generate_plan'
    ) {
      const { event } = body;

      if (!event) {
        return new Response(
          JSON.stringify({
            error:
              'Event information is required',
          }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              'Content-Type':
                'application/json',
            },
          }
        );
      }

      const totalBudget =
        Number(
          event.total_budget || 0
        );

      // Safely handle requirements
      let requirements =
        'None';

      if (
        Array.isArray(
          event.requirements
        )
      ) {
        requirements =
          event.requirements.join(
            ', '
          ) || 'None';
      } else if (
        typeof event.requirements ===
        'string'
      ) {
        requirements =
          event.requirements ||
          'None';
      }

      const planPrompt = `
Generate a complete event planning plan as JSON.

EVENT DETAILS:

Name:
${event.name || 'Unnamed Event'}

Type:
${event.type || 'General Event'}

Date:
${event.event_date || 'Not set'}

Venue:
${event.venue_name || 'Not set'}

Expected Guests:
${event.expected_guests || 0}

Total Budget:
Rs ${totalBudget}

Requirements:
${requirements}

RETURN ONLY VALID JSON.

Use exactly this structure:

{
  "tasks": [
    {
      "title": "string",
      "priority": "High",
      "due_offset_days": 30,
      "category": "string"
    }
  ],
  "budget_breakdown": [
    {
      "category": "string",
      "percent": 30,
      "amount": 15000
    }
  ],
  "timeline": [
    {
      "phase": "string",
      "description": "string",
      "offset_days": 90
    }
  ],
  "vendors_suggested": [
    {
      "type": "string",
      "reason": "string"
    }
  ],
  "tips": [
    "string"
  ]
}

STRICT RULES:

1. Generate 10-14 tasks.

2. Every task priority MUST be:
   High, Medium, or Low.

3. Larger due_offset_days means the task happens earlier.

4. Budget percentages MUST add to exactly 100.

5. Budget amounts MUST add to exactly Rs ${totalBudget}.

6. If budget is 0, all amounts must be 0.

7. Generate 5-7 timeline phases.

8. Generate 3-5 vendor suggestions.

9. Generate 3-5 useful tips.

10. Make the plan specific to the event type.

11. Wedding events should have wedding-specific tasks and vendors.

12. Birthday events should have birthday-specific tasks and vendors.

13. College festivals should have fest-specific tasks and vendors.

14. Conferences should have conference-specific tasks and vendors.

15. Beach events should consider:
    - weather
    - backup arrangements
    - lighting
    - seating
    - safety

16. Do not add markdown.

17. Return valid JSON only.
`;

      const groqMessages = [
        {
          role: 'system',
          content:
            'You are an expert event planner. Return only valid JSON.',
        },
        {
          role: 'user',
          content:
            planPrompt,
        },
      ];

      const raw =
        await callGroq(
          groqMessages,
          true
        );

      let plan;

      try {
        const cleaned =
          cleanJson(raw);

        plan =
          JSON.parse(cleaned);

        console.log(
          'Plan parsed successfully'
        );
      } catch (error) {
        console.error(
          'Plan JSON parse failed:',
          raw.slice(0, 1000)
        );

        throw new Error(
          'AI returned invalid plan JSON'
        );
      }

      validatePlan(
        plan,
        totalBudget
      );

      console.log(
        `Generated ${plan.tasks.length} tasks`
      );

      return new Response(
        JSON.stringify({
          plan,
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type':
              'application/json',
          },
        }
      );
    }

    // ═══════════════════════════════════════
    // UNKNOWN MODE
    // ═══════════════════════════════════════

    return new Response(
      JSON.stringify({
        error:
          `Unknown mode: ${mode}`,
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type':
            'application/json',
        },
      }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    console.error(
      'Edge Function error:',
      message
    );

    return new Response(
      JSON.stringify({
        error: message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type':
            'application/json',
        },
      }
    );
  }
});