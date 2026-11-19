import { supabase } from './supabase';

// ─── Context builder ────────────────────────────────────

export async function buildUserContext() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      user: null,
      events: [],
      totals: {},
    };
  }

  const { data: events, error } = await supabase
    .from('events')
    .select(
      'id, name, type, event_date, expected_guests, total_budget, status, venue_name, requirements'
    )
    .eq('user_id', user.id)
    .order('event_date', { ascending: true });

  if (error) {
    console.error('buildUserContext error:', error.message);
  }

  const list = events || [];

  const now = new Date();

  const upcomingEvents = list.filter((event) => {
    if (!event.event_date) return false;
    return new Date(event.event_date) >= now;
  });

  const totals = {
    totalEvents: list.length,

    upcomingEvents: upcomingEvents.length,

    totalGuests: list.reduce(
      (sum, event) =>
        sum + Number(event.expected_guests || 0),
      0
    ),

    totalBudget: list.reduce(
      (sum, event) =>
        sum + Number(event.total_budget || 0),
      0
    ),
  };

  return {
    user: {
      name:
        user.user_metadata?.name ||
        user.user_metadata?.full_name ||
        'User',
    },

    events: list,

    totals,
  };
}

// ─── Chat ───────────────────────────────────────────────

export async function sendMessage(
  conversationHistory,
  context
) {
  try {
    const messages = (conversationHistory || []).map(
      (message) => ({
        role:
          message.role === 'assistant'
            ? 'assistant'
            : 'user',
        content: String(message.content || ''),
      })
    );

    const { data, error } =
      await supabase.functions.invoke(
        'ai-assistant',
        {
          body: {
            mode: 'chat',
            messages,
            context: context || {},
          },
        }
      );

    if (error) {
      console.error(
        'sendMessage error:',
        error
      );

      return {
        ok: false,
        error:
          error.message ||
          'AI service unavailable',
      };
    }

    if (data?.error) {
      return {
        ok: false,
        error: data.error,
      };
    }

    if (!data?.reply) {
      return {
        ok: false,
        error: 'AI returned an empty response',
      };
    }

    return {
      ok: true,
      reply: data.reply,
    };
  } catch (error) {
    console.error(
      'sendMessage exception:',
      error
    );

    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : 'Something went wrong',
    };
  }
}

// ─── Chat history ───────────────────────────────────────

export async function saveMessage(
  role,
  content
) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { error } = await supabase
      .from('chat_messages')
      .insert({
        user_id: user.id,
        role,
        content,
      });

    if (error) {
      console.error(
        'saveMessage error:',
        error.message
      );
    }
  } catch (error) {
    console.error(
      'saveMessage exception:',
      error
    );
  }
}

export async function loadHistory() {
  try {
    const {
      data,
      error,
    } = await supabase
      .from('chat_messages')
      .select(
        'role, content, created_at'
      )
      .order('created_at', {
        ascending: true,
      })
      .limit(50);

    if (error) {
      console.error(
        'loadHistory error:',
        error.message
      );

      return [];
    }

    return data || [];
  } catch (error) {
    console.error(
      'loadHistory exception:',
      error
    );

    return [];
  }
}

export async function clearHistory() {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { error } = await supabase
      .from('chat_messages')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      console.error(
        'clearHistory error:',
        error.message
      );
    }
  } catch (error) {
    console.error(
      'clearHistory exception:',
      error
    );
  }
}

// ─── Plan generation ────────────────────────────────────

export async function generateEventPlan(
  event
) {
  try {
    console.log(
      '🌐 Generating AI plan for:',
      event?.id
    );

    const {
      data,
      error,
    } = await supabase.functions.invoke(
      'ai-assistant',
      {
        body: {
          mode: 'generate_plan',
          event,
        },
      }
    );

    console.log(
      '🌐 AI plan response:',
      { data, error }
    );

    if (error) {
      console.error(
        'generateEventPlan error:',
        error
      );

      return {
        ok: false,
        error:
          error.message ||
          'Unable to generate event plan',
      };
    }

    if (data?.error) {
      return {
        ok: false,
        error: data.error,
      };
    }

    if (!data?.plan) {
      return {
        ok: false,
        error:
          'AI did not return a planning result',
      };
    }

    return {
      ok: true,
      plan: data.plan,
    };
  } catch (error) {
    console.error(
      'generateEventPlan exception:',
      error
    );

    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : 'Unable to generate plan',
    };
  }
}

// ─── Save generated plan ────────────────────────────────

export async function saveEventPlan(
  eventId,
  plan
) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        ok: false,
        error: 'Not authenticated',
      };
    }

    if (!eventId || !plan) {
      return {
        ok: false,
        error:
          'Event ID and plan are required',
      };
    }

    const {
      data,
      error,
    } = await supabase
      .from('event_plans')
      .insert({
        event_id: eventId,
        user_id: user.id,

        tasks: plan.tasks || [],

        budget_breakdown:
          plan.budget_breakdown || [],

        timeline:
          plan.timeline || [],

        vendors_suggested:
          plan.vendors_suggested || [],

        tips: plan.tips || [],

        raw_plan: JSON.stringify(plan),
      })
      .select()
      .single();

    if (error) {
      console.error(
        'saveEventPlan error:',
        error
      );

      return {
        ok: false,
        error: error.message,
      };
    }

    return {
      ok: true,
      data,
    };
  } catch (error) {
    console.error(
      'saveEventPlan exception:',
      error
    );

    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : 'Unable to save event plan',
    };
  }
}
// ─── Budget Insights ────────────────────────────────────
export async function getBudgetInsights(event, expenses, stats) {
  try {
    const { data, error } = await supabase.functions.invoke('ai-assistant', {
      body: {
        mode: 'budget_insights',
        event,
        expenses,
        stats,
      },
    });

    if (error) {
      console.error('getBudgetInsights error:', error);
      return { ok: false, error: error.message };
    }
    if (data?.error) {
      console.error('getBudgetInsights data error:', data.error);
      return { ok: false, error: data.error };
    }
    return { ok: true, insights: data.insights };
  } catch (e) {
    console.error('getBudgetInsights threw:', e);
    return { ok: false, error: String(e) };
  }
}
export async function discoverLocalVendors(event) {
  try {
    const { data, error } = await supabase.functions.invoke('ai-assistant', {
      body: { mode: 'discover_vendors', event },
    });

    if (error) {
      console.error('discoverVendors HTTP error:', error);
      
      let realError = error.message;
      try {
        if (error.context && typeof error.context.json === 'function') {
          const body = await error.context.json();
          realError = body.error || JSON.stringify(body);
          console.error('🚨 Actual function error:', realError);
        }
      } catch (e) {
        console.error('Could not parse error body:', e);
      }
      
      return { ok: false, error: realError };
    }
    if (data?.error) {
      return { ok: false, error: data.error };
    }
    return { ok: true, vendors: data.vendors };
  } catch (e) {
    console.error('discoverVendors threw:', e);
    return { ok: false, error: String(e) };
  }
}
export async function discoverRealVendors(event) {
  try {
    const { data, error } = await supabase.functions.invoke('ai-assistant', {
      body: { mode: 'discover_real_vendors', event },
    });

    if (error) {
      console.error('discoverRealVendors HTTP error:', error);
      
      // Extract the actual error message from the Edge Function
      let realError = error.message;
      try {
        if (error.context && typeof error.context.json === 'function') {
          const body = await error.context.json();
          realError = body.error || JSON.stringify(body);
          console.error('🚨 Actual function error:', realError);
        }
      } catch (e) {
        console.error('Could not parse error body:', e);
      }
      
      return { ok: false, error: realError };
    }
    return { ok: true, vendors: data.vendors };
  } catch (e) {
    console.error('discoverRealVendors threw:', e);
    return { ok: false, error: String(e) };
  }
}
// ─── Get event plan ─────────────────────────────────────

export async function getEventPlan(
  eventId
) {
  try {
    const {
      data,
      error,
    } = await supabase
      .from('event_plans')
      .select('*')
      .eq('event_id', eventId)
      .maybeSingle();

    if (error) {
      console.error(
        'getEventPlan error:',
        error.message
      );

      return {
        ok: false,
        error: error.message,
      };
    }

    return {
      ok: true,
      data,
    };
  } catch (error) {
    console.error(
      'getEventPlan exception:',
      error
    );

    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : 'Unable to load event plan',
    };
  }
}