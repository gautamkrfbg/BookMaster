export interface ReaderChapter {
  title: string;
  pages: string[];
}

const CHAPTER_BLUEPRINTS: { title: string; pages: string[] }[] = [
  {
    title: 'Opening the Cover',
    pages: [
      'Every library begins with a single shelf. Long before the doors open and the morning light reaches the reading tables, there is a quiet moment when the books sit close together, waiting for the first hand to reach in.',
      'The reader who finds a book here becomes part of a longer story than the one printed on its pages. Every title has traveled from some other collection, passed between hands, exchanged for something of equal value.',
    ],
  },
  {
    title: 'Chapter One — The Catalogue',
    pages: [
      'The catalogue is more than a list of names. It is a map of what a community holds dear — the stories it wants to keep close and the stories it is ready to give away.',
      'Each entry carries a small life: a title, an author, a category, a shelf. On their own the entries are dry facts, but woven together they describe a place full of intentions.',
    ],
  },
  {
    title: 'Chapter Two — The Exchange',
    pages: [
      'There is a particular pleasure in handing over a book you have finished and receiving one you have never seen. It is a trade of confidence — your old friend leaves your shelf and becomes a stranger on someone else\u2019s.',
      'Requests come in cautious at first. A note about the kind of book they are looking for. A promise that the book they offer has been well kept.',
    ],
  },
  {
    title: 'Chapter Three — New Owners',
    pages: [
      'A book that changes owners carries a little of its previous reader with it: a marker left at a favorite page, the softened spine of a passage read many times.',
      'The new reader opens it with care, curious about the hands that came before. There is no record of them, only the book itself.',
    ],
  },
  {
    title: 'Chapter Four — The Return',
    pages: [
      'Some books come back. After months away, a title reappears in the catalogue, offered once more by someone who has finished with it.',
      'To see a familiar name return is like greeting an old acquaintance. The cover may show new creases, the pages may carry a fresh scent.',
    ],
  },
  {
    title: 'Postscript — Turning the Last Page',
    pages: [
      'Every book eventually reaches its last page. The story ends, but the reader\u2019s work has only just begun — deciding where the book will go next.',
      'Whether it is kept on a shelf, passed along, or offered in trade, a finished book is never a finished story. It is simply ready for its next reader.',
    ],
  },
];

function hashCode(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function resolveReaderContent(bookId: string): ReaderChapter[] {
  const shift = hashCode(bookId) % CHAPTER_BLUEPRINTS.length;
  const rotated = [
    ...CHAPTER_BLUEPRINTS.slice(shift),
    ...CHAPTER_BLUEPRINTS.slice(0, shift),
  ];
  return rotated.map((chapter) => ({ title: chapter.title, pages: chapter.pages }));
}