import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { hero, idea, pageCount, language } = await req.json();
    const AI_API_KEY = Deno.env.get("AI_API_KEY") || Deno.env.get("AI_GATEWAY_KEY") || Deno.env.get("LOVABLE_API_KEY") || Deno.env.get("OPENAI_API_KEY");
    if (!AI_API_KEY) throw new Error("AI_API_KEY not configured");

    const count = Math.min(Math.max(Number(pageCount) || 10, 4), 16);
    const lang = language === "hi" ? "hi" : "en";

    const langRules = lang === "hi"
      ? `LANGUAGE (STRICT — HINDI ONLY):
- You MUST write the story (title, caption, dialogue, narration) ONLY in natural, child-friendly HINDI in DEVANAGARI script (देवनागरी).
- The user may have typed the story idea in English, Hinglish, or Hindi — you MUST faithfully understand it and write the FULL story in Hindi based on that idea. Do NOT ignore or replace the user's idea with a generic story. Stay true to the hero, setting, plot beats, objects, and emotions they described.
- ZERO English words in caption / dialogue / narration. Do NOT use Latin script. Do NOT romanize. Do NOT mix Hinglish. The ONLY allowed Latin token anywhere in caption/dialogue/narration is the hero's proper name "${hero || "Genie Explorer"}" — and only if it is clearly a non-Hindi name.
- Use simple Hindi a 6-12 year old can read aloud. Short sentences. Common everyday vocabulary (e.g., दोस्त, जादू, किताब, सीखना, बहादुर).
- Set "title" to the pattern "पृष्ठ N" (e.g. "पृष्ठ 1", "पृष्ठ 2"...).
- Keep "scene" and "setting" fields in ENGLISH — these are visual instructions for an illustrator, NOT story text shown to the reader. The "scene" must still faithfully describe what the user's idea implies.
- If ANY caption/dialogue/narration field contains Latin letters (other than the hero's name) or fewer than 60% Devanagari characters, your response will be rejected.`
      : `LANGUAGE (STRICT — ENGLISH ONLY): You MUST write ALL fields (title, scene, setting, caption, dialogue, narration) in simple, child-friendly ENGLISH ONLY. Do NOT include any Hindi, Devanagari script, or non-English words anywhere in the response. Set "title" to "Page N" (e.g. "Page 1"). Keep the hero name "${hero || "Genie Explorer"}" EXACTLY as given in every panel for consistency. If you output any Devanagari characters the response will be rejected.`;

    const systemPrompt = `You are a children's comic book writer for ages 6-12.
You write friendly, vivid, age-appropriate stories with a clear beginning, middle, and end.
You ALWAYS build the story on the user's exact idea — same hero, same setting, same plot direction, expanded into a satisfying arc. Never substitute a generic template story.
Keep captions short and punchy. Always keep character names spelled the SAME way across every panel.
You strictly follow language instructions: when asked for English you write 100% English, when asked for Hindi you write 100% Devanagari Hindi. Never mix languages unless explicitly told.`;

    const userPrompt = `Write a ${count}-panel comic story.
Hero: "${hero || "Genie Explorer"}" (use this exact name every time a character is named)
Story idea from the child (treat as the canonical source — expand it, do not replace it): "${idea || "A magical learning adventure"}"

${langRules}

Return ONLY a JSON object via the tool call. For EACH of the ${count} panels include:
- title: "${lang === "hi" ? "पृष्ठ N" : "Page N"}"
- scene: a rich, detailed visual description IN ENGLISH (2-3 sentences, 30-60 words) describing exactly what to draw — characters, action, setting, mood, lighting. Be specific so an illustrator can draw it. Always refer to the hero by the exact name "${hero || "Genie Explorer"}".
- setting: one short ENGLISH keyword for the location (e.g. "classroom", "forest", "kitchen", "space")
- caption: a comic narration box text — short, punchy, 6-14 words, advances the story (in ${lang === "hi" ? "HINDI (Devanagari)" : "English"})
- dialogue: a short line a character SAYS in this panel (5-12 words, in ${lang === "hi" ? "HINDI (Devanagari)" : "English"}). Simple words.
- narration: 1-2 extra sentences (20-40 words, in ${lang === "hi" ? "HINDI (Devanagari)" : "English"}) that expand the story for book-view reading mode.

The ${count} panels must form ONE coherent story that DIRECTLY tells the child's idea above, with rising action and a satisfying ending. Character names MUST be spelled identically in every panel.`;

    const callModel = async (extraNudge?: string) => {
      const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: extraNudge ? `${userPrompt}\n\nIMPORTANT RETRY NOTE: ${extraNudge}` : userPrompt },
      ];
      const AI_ENDPOINT = Deno.env.get("AI_ENDPOINT") || Deno.env.get("AI_GATEWAY_URL") || "https://ai.gateway.lovable.dev/v1/chat/completions";
      return fetch(AI_ENDPOINT, {
        method: "POST",
        headers: { Authorization: `Bearer ${AI_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          messages,
          tools: [{
            type: "function",
            function: {
              name: "write_comic",
              description: "Return the full comic script.",
              parameters: {
                type: "object",
                properties: {
                  panels: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        scene: { type: "string" },
                        setting: { type: "string" },
                        caption: { type: "string" },
                        dialogue: { type: "string" },
                        narration: { type: "string" },
                      },
                      required: ["title", "scene", "setting", "caption", "dialogue", "narration"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["panels"],
                additionalProperties: false,
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "write_comic" } },
        }),
      });
    };

    const devanagariG = /[\u0900-\u097F]/g;
    const latinLetterG = /[A-Za-z]/g;
    const hasDevanagari = (s: string) => /[\u0900-\u097F]/.test(s);

    const passesLanguageCheck = (panels: any[]) => {
      const storyText = panels.map((p: any) => `${p.caption || ""} ${p.dialogue || ""} ${p.narration || ""}`).join(" ");
      if (lang === "en") {
        return !hasDevanagari(storyText);
      }
      const dev = (storyText.match(devanagariG) || []).length;
      const latin = (storyText.match(latinLetterG) || []).length;
      const total = dev + latin;
      if (total === 0) return false;
      return dev / total >= 0.6;
    };

    let response = await callModel();
    if (!response.ok) {
      const t = await response.text();
      console.error("comic-script gateway error", response.status, t);
      const message = response.status === 429 ? "Too many requests. Try again soon."
        : response.status === 402 ? "AI credits needed. Please contact support."
        : "Comic script service unavailable.";
      return new Response(JSON.stringify({ error: message }), {
        status: response.status === 429 || response.status === 402 ? response.status : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let data = await response.json();
    let args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) throw new Error("No script returned");
    let panels: any[] = JSON.parse(args).panels ?? [];

    // Auto-retry once with a stronger nudge if language is off
    if (!passesLanguageCheck(panels)) {
      console.warn("comic-script: language check failed on first try, retrying with stronger nudge.");
      const nudge = lang === "hi"
        ? "Your previous output was rejected because it contained too much English or no Devanagari. Rewrite EVERY caption, dialogue and narration field in pure HINDI DEVANAGARI (देवनागरी) only. Do not use any Latin letters except the hero's name. The story must still follow the user's idea above exactly."
        : "Your previous output was rejected because it contained Devanagari. Rewrite EVERY field in pure ENGLISH only.";
      const retry = await callModel(nudge);
      if (retry.ok) {
        data = await retry.json();
        args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
        if (args) panels = JSON.parse(args).panels ?? panels;
      }
    }

    if (!passesLanguageCheck(panels)) {
      const errMsg = lang === "hi"
        ? "हिन्दी कहानी ठीक से नहीं बनी। कृपया फिर से 'Write Story' दबाएँ।"
        : "The story came back in the wrong language. Please tap Write Story again.";
      return new Response(JSON.stringify({ error: errMsg }), {
        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ panels }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("comic-script error", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
