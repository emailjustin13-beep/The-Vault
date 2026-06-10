import { ParsedFilename, MediaType } from "@/types";

const TV_PATTERNS = [
  /^(.+?)[\s._-]+[Ss](\d{1,2})[Ee](\d{1,3})/,
  /^(.+?)[\s._-]+(\d{1,2})x(\d{1,3})/,
  /^(.+?)[\s._-]+[Ss]eason[\s._-]*(\d{1,2})[\s._-]+[Ee]p(?:isode)?[\s._-]*(\d{1,3})/i,
];

const YEAR_PATTERN = /[\s._(-](\d{4})[\s._)]/;
const RESOLUTION_PATTERN = /\b(2160p|4K|1080p|720p|480p|360p)\b/i;
const CODEC_PATTERN = /\b(x264|x265|H\.264|H\.265|HEVC|AVC|XviD|DivX|AV1|VP9)\b/i;
const SOURCE_PATTERN = /\b(BluRay|BDRip|BRRip|WEB-DL|WEBRip|HDTV|DVDRip|DVD|CAM|TS|REMUX|IMAX)\b/i;

const JUNK_TOKENS = [
  "2160p","4k","1080p","720p","480p","360p",
  "bluray","bdrip","brrip","web-dl","webrip","hdtv","dvdrip","dvd","cam","ts","remux","imax",
  "x264","x265","h264","h265","hevc","avc","xvid","divx","av1","vp9",
  "aac","ac3","dts","dts-hd","truehd","atmos","eac3","flac","mp3",
  "hdr","hdr10","hdr10+","dolby","vision","dv",
  "extended","theatrical","directors","cut","remastered","edition",
  "proper","repack","internal","readnfo","nfofix",
  "mkv","mp4","avi","mov","m4v",
];

function cleanTitle(raw: string): string {
  return raw.replace(/[._]/g, " ").replace(/\s+/g, " ").trim();
}

function extractResolution(filename: string): string | null {
  const match = filename.match(RESOLUTION_PATTERN);
  if (!match) return null;
  const val = match[1].toUpperCase();
  if (val === "4K") return "2160p";
  return val;
}

function extractCodec(filename: string): string | null {
  const match = filename.match(CODEC_PATTERN);
  return match ? match[1].toUpperCase().replace(".", "") : null;
}

function extractSource(filename: string): string | null {
  const match = filename.match(SOURCE_PATTERN);
  return match ? match[1] : null;
}

function stripExtension(filename: string): string {
  return filename.replace(/\.(mkv|mp4|avi|mov|m4v|ts|wmv|flv|webm)$/i, "");
}

function stripJunkTokens(title: string): string {
  const words = title.split(" ");
  const cleaned: string[] = [];
  for (const word of words) {
    const lower = word.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!JUNK_TOKENS.includes(lower) && !JUNK_TOKENS.includes(word.toLowerCase())) {
      cleaned.push(word);
    } else {
      break;
    }
  }
  return cleaned.join(" ").trim();
}

export function parseFilename(filename: string): ParsedFilename {
  const base = stripExtension(filename);
  const resolution = extractResolution(base);
  const codec = extractCodec(base);
  const source = extractSource(base);

  // Try TV patterns first
  for (const pattern of TV_PATTERNS) {
    const match = base.match(pattern);
    if (match) {
      const rawTitle = cleanTitle(match[1]);
      const title = stripJunkTokens(rawTitle);
      const season = parseInt(match[2], 10);
      const episode = parseInt(match[3], 10);
      const yearMatch = rawTitle.match(YEAR_PATTERN);
      const year = yearMatch ? parseInt(yearMatch[1], 10) : null;
      return { title, year, season, episode, type: "tv", resolution, codec, source, raw: filename };
    }
  }

  // Check if filename starts with SxxExx (no show name prefix)
  const bareEpisodeMatch = base.match(/^[Ss](\d{1,2})[Ee](\d{1,3})/);
  if (bareEpisodeMatch) {
    return {
      title: "",
      year: null,
      season: parseInt(bareEpisodeMatch[1], 10),
      episode: parseInt(bareEpisodeMatch[2], 10),
      type: "tv",
      resolution,
      codec,
      source,
      raw: filename,
    };
  }

  // Movie pattern
  const yearMatch = base.match(YEAR_PATTERN);
  let title = cleanTitle(base);
  if (yearMatch) {
    const yearIndex = title.indexOf(yearMatch[1]);
    if (yearIndex > 0) title = title.substring(0, yearIndex).trim();
  }
  title = stripJunkTokens(title);
  const year = yearMatch ? parseInt(yearMatch[1], 10) : null;
  const currentYear = new Date().getFullYear();
  const validYear = year && year >= 1900 && year <= currentYear + 2 ? year : null;

  return { title, year: validYear, season: null, episode: null, type: "movie", resolution, codec, source, raw: filename };
}

export function detectMediaType(filename: string, parsed: ParsedFilename): MediaType {
  const lower = filename.toLowerCase();

  // Anime indicators
  const animeKeywords = ["anime", "subbed", "dubbed", "[horriblesubs]", "[erai-raws]", "[subsplease]", "[judas]"];
  if (animeKeywords.some((k) => lower.includes(k))) return "anime";

  // TV show detected by parser (has season/episode)
  if (parsed.season !== null && parsed.episode !== null) return "tv";

  // Filename starts with SxxExx pattern
  if (/^[Ss]\d{1,2}[Ee]\d{1,3}/i.test(filename.trim())) return "tv";

  return "movie";
}
