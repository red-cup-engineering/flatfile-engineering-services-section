import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatCitationLabel, formatReferenceEntry, parseCitationItems } from '../src/csl-record-formatting.mjs';

test('parseCitationItems splits keys and locators on semicolons', () => {
  assert.deepEqual(parseCitationItems('@a, p. 12; @b'), [
    { key: 'a', locator: 'p. 12' },
    { key: 'b', locator: null },
  ]);
});

test('formatCitationLabel produces author-year labels for 0/1/2/3+ authors, with an optional locator', () => {
  const oneAuthor = { author: [{ family: 'Smith' }], issued: { 'date-parts': [[2020]] } };
  const twoAuthors = { author: [{ family: 'Smith' }, { family: 'Jones' }], issued: { 'date-parts': [[2020]] } };
  const threeAuthors = { author: [{ family: 'Smith' }, { family: 'Jones' }, { family: 'Lee' }], issued: { 'date-parts': [[2020]] } };
  assert.equal(formatCitationLabel(oneAuthor), 'Smith 2020');
  assert.equal(formatCitationLabel(twoAuthors), 'Smith & Jones 2020');
  assert.equal(formatCitationLabel(threeAuthors), 'Smith et al. 2020');
  assert.equal(formatCitationLabel(oneAuthor, 'p. 4'), 'Smith 2020, p. 4');
});

test('formatReferenceEntry renders each supported CSL type in a plain author-year style', () => {
  assert.equal(
    formatReferenceEntry({ type: 'report', title: 'Title of the Work', author: [{ given: 'Morgan', family: 'Sennhauser' }], publisher: 'Publication', issued: { 'date-parts': [[2026]] } }),
    'Morgan Sennhauser. <cite>Title of the Work</cite>. Publication, 2026.',
  );
  assert.equal(
    formatReferenceEntry({ type: 'book', title: 'A Book', author: [{ literal: 'Org Name' }], publisher: 'Press', issued: { 'date-parts': [[2020]] } }),
    'Org Name. <cite>A Book</cite>. Press, 2020.',
  );
  assert.equal(
    formatReferenceEntry({ type: 'article-journal', title: 'A Study', author: [{ given: 'A', family: 'B' }], 'container-title': 'Journal', volume: '3', issue: '2', page: '10-20', issued: { 'date-parts': [[2019]] } }),
    'A B. "A Study." <cite>Journal</cite> 3, no. 2 (2019): 10-20.',
  );
  assert.equal(
    formatReferenceEntry({ type: 'chapter', title: 'A Chapter', author: [{ given: 'A', family: 'B' }], editor: [{ given: 'C', family: 'D' }], 'container-title': 'The Book', page: '5-9', publisher: 'Press', issued: { 'date-parts': [[2021]] } }),
    'A B. "A Chapter." In <cite>The Book</cite>, ed. C D, 5-9, Press, 2021.',
  );
  assert.equal(
    formatReferenceEntry({ type: 'webpage', title: 'A Page', author: [{ literal: 'Org' }], 'container-title': 'Site', URL: 'https://example.test/', issued: { 'date-parts': [[2023]] } }),
    'Org. <cite>A Page</cite>. Site, 2023. <a href="https://example.test/">https://example.test/</a>',
  );
});
