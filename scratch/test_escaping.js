import { DOMParser, XMLSerializer } from '@xmldom/xmldom';

const doc = new DOMParser().parseFromString('<root xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:t>placeholder</w:t></root>', 'text/xml');
const t = doc.getElementsByTagName('w:t')[0];

const val1 = "A & B < C";
t.textContent = val1;
console.log("Without escapeXml:");
console.log("TextContent:", t.textContent);
console.log("Serialized XML:", new XMLSerializer().serializeToString(doc));

const escapeXml = (str) => str
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;');

const val2 = escapeXml("A & B < C");
t.textContent = val2;
console.log("\nWith escapeXml:");
console.log("TextContent:", t.textContent);
console.log("Serialized XML:", new XMLSerializer().serializeToString(doc));
