/**
 * Charter N-05: text only, Arial 11 pt, no remote image, no tracking pixel,
 * no button. The HTML part is the same paragraphs, links written in full.
 */
export function textEmail(paragraphs: string[]): {
  text: string;
  html: string;
} {
  const html = paragraphs
    .map(
      (paragraph) =>
        `<p style="margin:0 0 12pt">${linkify(escape(paragraph))}</p>`,
    )
    .join('');
  return {
    text: paragraphs.join('\n\n'),
    html: `<div style="font-family:Arial,Helvetica,sans-serif;font-size:11pt;line-height:1.5;color:#222222">${html}</div>`,
  };
}

function escape(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll('\n', '<br>');
}

function linkify(escaped: string): string {
  return escaped.replace(
    /https?:\/\/[^\s<]+/g,
    (url) => `<a href="${url}">${url}</a>`,
  );
}
