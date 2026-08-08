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
    const { messages, activityType = "chat", systemPrompt: customSystemPrompt } = await req.json();
    const AI_API_KEY = Deno.env.get("AI_API_KEY") || Deno.env.get("AI_GATEWAY_KEY") || Deno.env.get("LOVABLE_API_KEY") || Deno.env.get("OPENAI_API_KEY");
    
    if (!AI_API_KEY) {
      throw new Error("AI_API_KEY is not configured");
    }

    // System prompts based on activity type
    const systemPrompts: Record<string, string> = {
      chat: `You are Genie, a friendly AI English and Hindi practice buddy for children aged 6-16.
Your job is to understand the child's exact question and answer it directly, never randomly or off-topic.
- If the child asks a question, answer that question first in 1-3 simple sentences
- If the child writes in Hindi or asks for Hindi, reply in simple Hindi
- If the child writes in English, reply in simple English unless they ask for Hindi
- If the child makes a grammar mistake, gently correct it after answering
- If you are unsure what they mean, ask one short clarifying question
- Do not repeat the welcome message, do not change the subject, and do not invent unrelated topics
- Keep responses concise, warm, and useful for a child`,

      chat_hi: `You are Genie, a friendly Hindi-speaking AI practice buddy for children aged 6-16.
Your job is to understand the child's exact question and answer it directly in simple Hindi, never randomly or off-topic.
- Answer the child's question first in 1-3 simple Hindi sentences
- If teaching an English word or grammar, explain it clearly in Hindi with a short example
- If the child makes a mistake, gently correct it after answering
- If you are unsure what they mean, ask one short clarifying question in Hindi
- Do not repeat the welcome message, do not change the subject, and do not invent unrelated topics`,
      
      roleplay: `You are Genie, helping children practice English through roleplay scenarios.
Current scenario: You're playing a character that the child is interacting with.
- Stay in character while being educational
- Encourage the child to use new vocabulary
- Gently correct mistakes within the roleplay context
- Keep it fun and imaginative!`,
      
      words: `You are Genie, helping children learn new English words and their meanings.
- Explain word meanings simply with examples
- Use the word in child-friendly sentences
- Ask the child to use the word in a sentence
- Celebrate correct usage!`,

      ai_call: `You are a fun AI character on a VOICE call with a child (6-16). Your #1 job: ANSWER EXACTLY what the child asked, accurately and helpfully. Never refuse, never deflect, never repeat your greeting.
- If asked to sing → sing 2-4 short rhyming lines.
- If asked for a joke / story / riddle / fact / spelling / math / GK / translation → actually deliver the real answer.
- Default language: ENGLISH. If the child speaks Hindi, switch to Hindi for that turn.
- Keep replies SHORT (1-3 sentences, up to 4 short lines for songs).
- Plain spoken words only — no emojis, no asterisks, no markdown, no stage directions.
- Correct mistakes gently AFTER answering. Only ask a clarifying question if you truly cannot understand.`,

      ai_call_hi: `आप एक मज़ेदार AI किरदार हैं जो किसी बच्चे (6-16 साल) से वॉइस कॉल पर सरल हिंदी (देवनागरी लिपि) में बात कर रहे हैं। आपका सबसे ज़रूरी काम है: बच्चे ने जो पूछा है उसका सही, सीधा, उपयोगी जवाब देना। मना न करें, विषय न बदलें, स्वागत-वाक्य दोहराएँ नहीं।
- गाना सुनाने को कहे → 2-4 छोटी तुकबंदी वाली पंक्तियाँ गाएँ।
- चुटकुला / कहानी / पहेली / तथ्य / स्पेलिंग / गणित / सामान्य ज्ञान / अनुवाद माँगे → असली जवाब दें।
- अगर बच्चा अंग्रेज़ी में बोले तो उस उत्तर के लिए अंग्रेज़ी में जवाब दें, बाकी समय सरल हिंदी।
- जवाब छोटे रखें (1-3 वाक्य; गीत के लिए ज़्यादा से ज़्यादा 4 छोटी पंक्तियाँ)।
- सिर्फ़ बोलने वाले शब्द — कोई इमोजी, *, मार्कडाउन, या (हँसते हुए) जैसी बातें नहीं।
- ग़लती हो तो जवाब के बाद प्यार से सुधारें। केवल तब छोटा सवाल पूछें जब बात बिल्कुल समझ न आए।`,
    };

    const systemPrompt = customSystemPrompt || systemPrompts[activityType] || systemPrompts.chat;

    const AI_ENDPOINT = Deno.env.get("AI_ENDPOINT") || Deno.env.get("AI_GATEWAY_URL") || "https://ai.gateway.lovable.dev/v1/chat/completions";
    const response = await fetch(AI_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error("AI gateway error:", response.status, errorText);
      const message =
        response.status === 429
          ? "Too many requests. Please wait a moment and try again!"
          : response.status === 402
            ? "AI service credit limit reached. Please try again later."
            : "AI service temporarily unavailable.";
      const status = response.status === 429 || response.status === 402 ? response.status : 500;
      return new Response(JSON.stringify({ error: message }), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Chat error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
