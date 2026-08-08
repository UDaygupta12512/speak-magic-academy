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
    const { hero, storyIdea, scene, pageNumber, totalPages, setting } = await req.json();
    const AI_API_KEY = Deno.env.get("AI_API_KEY") || Deno.env.get("AI_GATEWAY_KEY") || Deno.env.get("LOVABLE_API_KEY") || Deno.env.get("OPENAI_API_KEY");

    if (!AI_API_KEY) {
      throw new Error("AI_API_KEY is not configured");
    }

    const prompt = `Single COMIC BOOK PANEL illustration for a children's English learning comic.

ART STYLE (mandatory):
- Authentic Western comic book art: bold black ink outlines (2-3px), flat cel-shaded coloring, halftone dot shading on backgrounds, vivid saturated palette (teal, orange, magenta, yellow), dramatic perspective, dynamic camera angle.
- Looks like a printed Marvel/DC kids comic page panel — NOT a soft watercolor, NOT 3D render, NOT anime, NOT photoreal.
- Strong silhouettes, expressive faces, action lines / motion lines where appropriate.

CHARACTER CONSISTENCY (mandatory):
- Hero "${hero || "Genie Explorer"}" must appear with the SAME design every panel: friendly child, big round eyes, bright teal hoodie with star emblem, tousled dark hair, warm skin tone, age 8-10. Keep proportions and outfit identical across pages.

COMPOSITION:
- Single rectangular panel, edge-to-edge full-bleed artwork, no white border, no gutter inside the image.
- Cinematic framing appropriate to the scene (wide shot, medium, close-up, low angle, etc.).
- Rich detailed background that matches the setting.

STRICTLY FORBIDDEN inside the image:
- NO text of any kind, NO letters, NO words, NO speech bubbles, NO thought bubbles, NO caption boxes, NO sound effects ("POW", "BAM"), NO signage with readable writing, NO logos, NO watermarks, NO page numbers, NO UI.

CONTEXT:
- Story: ${storyIdea || "A magical English learning adventure"}.
- This is panel ${pageNumber || 1} of ${totalPages || 10}. Setting: ${setting || "adventure"}.
- Scene to depict: ${scene || "A child begins a magical learning adventure."}`;

    const models = [
      "google/gemini-3.1-flash-image-preview",
      "google/gemini-2.5-flash-image",
    ];

    let imageUrl: string | undefined;
    let lastStatus = 500;
    let lastErrorText = "";

    const AI_ENDPOINT = Deno.env.get("AI_ENDPOINT") || Deno.env.get("AI_GATEWAY_URL") || "https://ai.gateway.lovable.dev/v1/chat/completions";

    for (const model of models) {
      const response = await fetch(AI_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${AI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          modalities: ["image", "text"],
        }),
      });

      if (!response.ok) {
        lastStatus = response.status;
        lastErrorText = await response.text();
        console.error(`Comic image generation error (${model}):`, response.status, lastErrorText);
        if (response.status === 429 || response.status === 402) {
          const message = response.status === 429
            ? "Too many image requests. Please wait and try again."
            : "AI image credits are needed. Please contact support.";
          return new Response(JSON.stringify({ error: message, fallback: true }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        continue;
      }

      const data = await response.json();
      imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      if (imageUrl) break;
      console.warn(`Model ${model} returned no image, trying next...`);
    }

    if (!imageUrl) {
      return new Response(
        JSON.stringify({
          error: "Image generation was blocked or returned no image. Try simplifying the scene or rephrasing the story idea.",
          fallback: true,
          upstreamStatus: lastStatus,
          upstreamError: lastErrorText?.slice(0, 500),
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ imageUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Comic image function error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});