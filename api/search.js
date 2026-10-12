export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed"
    });
  }

  const query = String(req.query?.q || "").trim();

  if (!query) {
    return res.status(400).json({
      success: false,
      error: "Song name required",
      example: "/api/search?q=Kesariya"
    });
  }

  try {
    const apiUrl = new URL(
      "https://saavn.sumit.co/api/search/songs"
    );

    apiUrl.searchParams.set("query", query);

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        Accept: "application/json"
      },
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      return res.status(502).json({
        success: false,
        error: "Song search provider failed",
        status: response.status
      });
    }

    const payload = await response.json();

    const songs =
      payload?.data?.results ??
      payload?.data?.songs?.results ??
      payload?.results ??
      payload?.songs ??
      [];

    if (!Array.isArray(songs)) {
      return res.status(502).json({
        success: false,
        error: "Unexpected API response"
      });
    }

    const results = songs.map((song) => {
      const artists =
        song?.artists?.primary ??
        song?.artists?.all ??
        song?.artist ??
        [];

      const artist = Array.isArray(artists)
        ? artists
            .map((a) =>
              typeof a === "string"
                ? a
                : a?.name || a?.title || ""
            )
            .filter(Boolean)
            .join(", ")
        : String(artists || "");

      const images = song?.image ?? song?.images ?? [];
      const imageList = Array.isArray(images) ? images : [];

      const thumbnail = imageList.length
        ? imageList[imageList.length - 1]?.url ||
          imageList[imageList.length - 1]?.link ||
          ""
        : typeof images === "string"
          ? images
          : "";

      return {
        id: String(song?.id ?? song?.songId ?? ""),
        title: song?.name ?? song?.title ?? "Unknown",
        artist: artist || song?.primaryArtists || "Unknown",
        album:
          song?.album?.name ??
          song?.album ??
          "Unknown",
        duration: song?.duration ?? null,
        language: song?.language ?? null,
        thumbnail,
        source: "JioSaavn"
      };
    }).filter((song) => song.id);

    return res.status(200).json({
      success: true,
      query,
      count: results.length,
      results
    });

  } catch (error) {
    console.error("Search API error:", error);

    return res.status(500).json({
      success: false,
      error: "Search failed or provider timed out"
    });
  }
}