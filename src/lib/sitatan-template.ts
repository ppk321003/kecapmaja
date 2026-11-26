import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';

export const DOCX_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export async function renderSitatanDocxTemplate(
  template: Blob,
  placeholders: Record<string, string>,
): Promise<Blob> {
  const zip = new PizZip(await template.arrayBuffer());
  const document = new Docxtemplater(zip, {
    delimiters: { start: '<<', end: '>>' },
    linebreaks: true,
    paragraphLoop: true,
  });

  document.render(placeholders);

  return document.getZip().generate({
    type: 'blob',
    mimeType: DOCX_MIME_TYPE,
  });
}
