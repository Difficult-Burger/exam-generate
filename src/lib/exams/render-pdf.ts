export const renderPdfFromMarkdown = async (markdown: string) => {
  const { default: mdToPdf } = await import("md-to-pdf");

  const result = await mdToPdf(
    { content: markdown },
    {
      pdf_options: {
        format: "A4",
        margin: "20mm",
        printBackground: true,
      },
      stylesheet: [],
      css: `
        html, body { font-family: "Helvetica Neue", Arial, sans-serif; }
        h1, h2, h3 { color: #0f172a; }
        code { background-color: #f1f5f9; padding: 0.2em 0.4em; border-radius: 4px; }
        table { border-collapse: collapse; width: 100%; }
        table, th, td { border: 1px solid #cbd5f5; padding: 8px; }
      `,
    },
  );

  const pdfBuffer =
    result?.pdf ??
    (result?.content instanceof Uint8Array
      ? Buffer.from(result.content)
      : typeof result?.content === "string"
        ? Buffer.from(result.content)
        : null);

  if (!pdfBuffer) {
    throw new Error("Markdown 转 PDF 失败。");
  }

  return Buffer.from(pdfBuffer);
};
