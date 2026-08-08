import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { prompt, userText, minWords } = await req.json();
    const AI_API_KEY = Deno.env.get("AI_API_KEY") || Deno.env.get("AI_GATEWAY_KEY") || Deno.env.get("LOVABLE_API_KEY") || Deno.env.get("OPENAI_API_KEY");

    if (!AI_API_KEY) {
      throw new Error("AI_API_KEY is not configured");
    }

    const systemPrompt = `You are a friendly and encouraging writing teacher for children aged 6-16. 
Your job is to give constructive feedback on their writing exercises.

Be positive and encouraging! Focus on what they did well while gently suggesting improvements.
Use simple language that children can understand.

You must respond with a valid JSON object in this exact format:
{
  "overallScore": number between 0-100,
  "grammarScore": number between 0-100,
  "creativityScore": number between 0-100,
  "feedback": "2-3 sentences of encouraging overall feedback",
  "corrections": ["list of specific grammar or spelling mistakes to fix, max 3"],
  "suggestions": ["list of tips to improve their writing, max 3"]
}

Be generous with scores for children - a decent effort should score at least 60-70.
If there are no corrections needed, return an empty array for corrections.`;

    const AI_ENDPOINT = Deno.env.get("AI_ENDPOINT") || Deno.env.get("AI_GATEWAY_URL") || "https://ai.gateway.lovable.dev/v1/chat/completions";
    const response = await fetch(AI_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Writing Prompt: "${prompt}"
            
Minimum Words Required: ${minWords}

Student's Writing:
"${userText}"

Please provide feedback in the specified JSON format.`,
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI service credits exhausted, please try again later." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Invalid response format");
    }

    const feedback = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify(feedback), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Writing feedback error:", error);
    
    // Return fallback feedback
    return new Response(
      JSON.stringify({
        overallScore: 70,
        grammarScore: 75,
        creativityScore: 65,
        feedback: "Great effort! Keep practicing your writing skills. The more you write, the better you'll become!",
        corrections: [],
        suggestions: ["Try adding more descriptive words", "Use connecting words like 'and', 'but', 'then'"],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
