import JSZip from 'jszip';

// Cross-platform XML parser: uses DOMParser in browser, @xmldom/xmldom in Node/React Native
let NodeDOMParser: any = null;
if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
  try {
    // Only require in non-browser environments
    NodeDOMParser = require('@xmldom/xmldom').DOMParser;
  } catch (e) {
    // Will throw if not installed; user must install @xmldom/xmldom for RN/Node
    throw new Error('Please install @xmldom/xmldom for XML parsing in React Native/Node.');
  }
}

function parseXml(xmlString: string): Document {
  if (typeof DOMParser !== 'undefined') {
    return new DOMParser().parseFromString(xmlString, 'application/xml');
  } else if (NodeDOMParser) {
    return new NodeDOMParser().parseFromString(xmlString, 'application/xml');
  } else {
    throw new Error('No XML parser available in this environment.');
  }
}

export type PPTXExtractFormat = 'text' | 'json';

export interface PPTXExtractOptions {
  format?: PPTXExtractFormat;
}

export interface PPTXSlide {
  slideIndex: number;
  text: string[];
}

export interface PPTXExtractedJSON {
  slides: PPTXSlide[];
}

// JSZip works in both web and React Native, but you may need a Buffer polyfill in RN for some features.
export class PPTXExtractor {
  static async extract(arrayBuffer: ArrayBuffer, options: PPTXExtractOptions = {}): Promise<string | PPTXExtractedJSON> {
    const format = options.format || 'text';
    const zip = await JSZip.loadAsync(arrayBuffer);
    // Find all slide XML files
    const slideFiles = Object.keys(zip.files)
      .filter(name => name.match(/^ppt\/slides\/slide\d+\.xml$/))
      .sort((a, b) => {
        // Sort numerically by slide number
        const aNum = parseInt(a.match(/slide(\d+)\.xml$/)?.[1] || '0', 10);
        const bNum = parseInt(b.match(/slide(\d+)\.xml$/)?.[1] || '0', 10);
        return aNum - bNum;
      });
    const slides: PPTXSlide[] = [];
    for (let i = 0; i < slideFiles.length; i++) {
      const slideFile = slideFiles[i];
      const xmlString = await zip.files[slideFile].async('string');
      const xmlDoc = parseXml(xmlString);
      // Extract all <a:t> elements (text runs)
      const textNodes = xmlDoc.getElementsByTagName('a:t');
      const textArr: string[] = [];
      for (let j = 0; j < textNodes.length; j++) {
        textArr.push(textNodes[j].textContent || '');
      }
      slides.push({ slideIndex: i + 1, text: textArr });
    }
    if (format === 'json') {
      return { slides };
    } else {
      // Plain text: join all text from all slides
      return slides.map(slide => slide.text.join(' ')).join('\n\n');
    }
  }
} 