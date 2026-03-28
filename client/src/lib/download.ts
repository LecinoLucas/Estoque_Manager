type DownloadOptions = {
  fileName: string;
};

export async function downloadFileFromUrl(url: string, options: DownloadOptions): Promise<void> {
  const response = await fetch(url, { credentials: "include" });
  if (!response.ok) {
    throw new Error(`Falha no download (${response.status})`);
  }

  const blob = await response.blob();
  const blobUrl = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = options.fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(blobUrl);
}
