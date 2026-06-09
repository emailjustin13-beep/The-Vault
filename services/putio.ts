import { PutioFile, PutioFilesResponse } from "@/types";

const PUTIO_API_BASE = "https://api.put.io/v2";

export class PutioService {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${PUTIO_API_BASE}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Put.io API error ${response.status}: ${error}`);
    }

    return response.json() as Promise<T>;
  }

  async getFiles(
    parentId: number = 0,
    page: number = 1,
    perPage: number = 100
  ): Promise<PutioFilesResponse> {
    return this.request<PutioFilesResponse>(
      `/files/list?parent_id=${parentId}&page=${page}&per_page=${perPage}&sort_by=NAME_ASC`
    );
  }

  async getAllVideoFiles(parentId: number = 0): Promise<PutioFile[]> {
    const videoFiles: PutioFile[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await this.getFiles(parentId, page, 100);
      const files = response.files;

      for (const file of files) {
        if (file.file_type === "VIDEO") {
          videoFiles.push(file);
        } else if (file.file_type === "FOLDER") {
          const subFiles = await this.getAllVideoFiles(file.id);
          videoFiles.push(...subFiles);
        }
      }

      hasMore = files.length === 100;
      page++;
    }

    return videoFiles;
  }

  async getFile(fileId: number): Promise<PutioFile> {
    const response = await this.request<{ file: PutioFile }>(
      `/files/${fileId}`
    );
    return response.file;
  }

  async getStreamUrl(fileId: number): Promise<string> {
    return `${PUTIO_API_BASE}/files/${fileId}/stream?oauth_token=${this.accessToken}`;
  }

  async getSubtitles(fileId: number): Promise<
    Array<{
      key: string;
      language: string;
      name: string;
      source: string;
    }>
  > {
    try {
      const response = await this.request<{
        subtitles: Array<{
          key: string;
          language: string;
          name: string;
          source: string;
        }>;
      }>(`/files/${fileId}/subtitles`);
      return response.subtitles || [];
    } catch {
      return [];
    }
  }

  async getSubtitleUrl(fileId: number, key: string): Promise<string> {
    return `${PUTIO_API_BASE}/files/${fileId}/subtitles/${key}?oauth_token=${this.accessToken}`;
  }

  async verifyToken(): Promise<boolean> {
    try {
      await this.request("/account/info");
      return true;
    } catch {
      return false;
    }
  }

  async getAccountInfo(): Promise<{
    username: string;
    mail: string;
    disk: { avail: number; used: number; size: number };
  }> {
    const response = await this.request<{
      info: {
        username: string;
        mail: string;
        disk: { avail: number; used: number; size: number };
      };
    }>("/account/info");
    return response.info;
  }
}

export function createPutioService(accessToken: string): PutioService {
  return new PutioService(accessToken);
}
