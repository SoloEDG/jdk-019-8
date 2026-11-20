export function download(text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "image/svg+xml" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "forma-artwork.svg";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
