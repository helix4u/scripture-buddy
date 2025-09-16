export async function POST(request) {
  try {
    const body = await request.json();

    const {
      endpointBase = "https://api.openai.com/v1",
      path = "/chat/completions",
      url,
      apiKey,
      authHeader = "Authorization",
      authPrefix = "Bearer ",
      model = "gpt-4o-mini",
      messages,
      temperature = 0.4,
      max_tokens = 1200,
      extraHeaders = {},
      requestOverride = null,
      method = "POST",
    } = body || {};

    const requiresApiKey =
      authHeader !== null && authHeader !== undefined && authHeader !== "";
    if (requiresApiKey && !apiKey) {
      return Response.json(
        {
          error:
            "Missing apiKey in request body. Leave authHeader blank if your endpoint does not require one.",
        },
        { status: 400 }
      );
    }

    if (!messages && !requestOverride) {
      return Response.json(
        { error: "Missing messages or requestOverride in request body" },
        { status: 400 }
      );
    }

    // Build URL safely
    let targetUrl;
    try {
      if (url) {
        targetUrl = new URL(url).toString();
      } else if (typeof path === "string" && /^https?:\/\//i.test(path)) {
        targetUrl = new URL(path).toString();
      } else {
        const base = endpointBase ?? "";
        const normalizedBase = base.endsWith("/") ? base : `${base}/`;
        const cleanedPath =
          typeof path === "string" && path.startsWith("/")
            ? path.slice(1)
            : path || "";
        targetUrl = new URL(cleanedPath, normalizedBase).toString();
      }
    } catch (e) {
      return Response.json(
        { error: `Invalid endpoint or path: ${(e && e.message) || e}` },
        { status: 400 }
      );
    }

    const defaultHeaders = {
      "Content-Type": "application/json",
    };
    if (requiresApiKey && apiKey) {
      const prefix = authPrefix ?? "";
      defaultHeaders[String(authHeader)] = `${prefix}${apiKey}`;
    }
    const headers = {
      ...defaultHeaders,
      ...extraHeaders,
    };

    const payload = requestOverride ?? {
      model,
      messages,
      temperature,
      max_tokens,
    };

    const resp = await fetch(targetUrl, {
      method,
      headers,
      body: JSON.stringify(payload),
    });

    const textBody = await resp.text();
    let json;
    try {
      json = textBody ? JSON.parse(textBody) : {};
    } catch (e) {
      // Non-JSON response; forward as text
      if (!resp.ok) {
        return new Response(textBody || "Upstream error", { status: resp.status });
      }
      return Response.json({ text: textBody });
    }

    if (!resp.ok) {
      const message = json?.error?.message || json?.message || "Upstream error";
      return Response.json({ error: message, details: json }, { status: resp.status });
    }

    // Try to normalize to a single `text` field
    let outText = "";
    if (Array.isArray(json?.choices) && json.choices.length > 0) {
      const choice = json.choices[0];
      outText = choice?.message?.content ?? choice?.text ?? "";
    }
    if (!outText && typeof json?.content === "string") {
      outText = json.content;
    }
    if (!outText && typeof json?.output_text === "string") {
      outText = json.output_text;
    }

    return Response.json({ text: outText, usage: json?.usage ?? null });
  } catch (error) {
    console.error("/api/llm/chat error", error);
    return Response.json({ error: "Unexpected server error" }, { status: 500 });
  }
}

