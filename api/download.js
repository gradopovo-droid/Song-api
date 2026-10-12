export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed"
    });
  }

  const id = String(req.query?.id || "").trim();

  if (!id) {
    return res.status(400).json({
      success: false,
      error: "Song ID required",
      example: "/api/download?id=SONG_ID"
    });
  }

  const apiBase = process.env.LICENSED_AUDIO_API;
  const allowedHosts = (
    process.env.AUTHORIZED_AUDIO_HOSTS || ""
  )
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);

  if (!apiBase) {
    return res.status(503).json({
      success: false,
      error: "Audio provider is not configured yet"
    });
  }

  try {
    const base = new URL(apiBase);

    if (base.protocol !== "https:") {
      return res.status(500).json({
        success: false,
        error: "Provider must use HTTPS"
      });
    }

    const endpoint = new URL(
      `tracks/${encodeURIComponent(id)}`,
      base.href.endsWith("/") ? base : `${base.href}/`
    );

    const response = await fetch(endpoint, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      return res.status(502).json({
        success: false,
        error: "Audio provider request failed"
      });
    }

    const data = await response.json();

    if (data?.authorized !== true || !data?.streamUrl) {
      return res.status(403).json({
        success: false,
        error: "Provider did not authorize this audio"
      });
    }

    const audioUrl = new URL(data.streamUrl);

    if (
      audioUrl.protocol !== "https:" ||
      !allowedHosts.includes(audioUrl.hostname.toLowerCase())
    ) {
      return res.status(403).json({
        success: false,
        error: "Audio host is not allowlisted"
      });
    }

    return res.status(200).json({
      success: true,
      id,
      audioUrl: audioUrl.href,
      title: data.title || "Audio",
      artist: data.artist || "Unknown"
    });
  } catch (error) {
    console.error("Download API error:", error);

    return res.status(500).json({
      success: false,
      error: "Could not get authorized audio URL"
    });
  }
}