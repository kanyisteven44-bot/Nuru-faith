"""Refresh linked metadata only. No copyrighted book/course content is copied.
Requires Python standard library. Run from repository root.
"""
import concurrent.futures
import html
import json
import re
import urllib.request
import urllib.parse
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

def get(url):
    with urllib.request.urlopen(url, timeout=25) as response:
        return response.read().decode('utf-8')

def clean(value):
    return ' '.join(html.unescape(re.sub('<[^>]+>', '', value)).split())

def verify_book(row):
    try:
        page = get(f"https://www.gutenberg.org/ebooks/{row['id']}")
        Path(f"/tmp/nuru-book-{row['id']}.html").write_text(page)
        if not re.search(r'itemprop="inLanguage"[^>]*content="en"', page):
            return None
        links = re.findall(r'href="([^"]+)"[^>]*>(.*?)</a>', page, re.S)
        read = next((url for url, text in links if 'Read online' in clean(text)), None)
        epub = next((url for url, text in links if 'EPUB3' in clean(text)), None)
        if not read or not epub or 'Public domain in the USA' not in page:
            return None
        row.update(sourceUrl=f"https://www.gutenberg.org/ebooks/{row['id']}",
                   readUrl=urllib.parse.urljoin('https://www.gutenberg.org', read),
                   epubUrl=urllib.parse.urljoin('https://www.gutenberg.org', epub),
                   language='English', category=category(row['title']),
                   source='Project Gutenberg', checkedOn='2026-10-03')
        return row
    except Exception as error:
        print(f"Skipped {row['id']}: {error}", flush=True)
        return None

def category(title):
    title = title.lower()
    if any(word in title for word in ['hymn', 'psalms of david', 'oratorio']): return 'Worship & hymns'
    if any(word in title for word in ['exposition', 'commentary', 'gospel of', 'bible stories']): return 'Bible study'
    if any(word in title for word in ['prayer', 'presence of god', 'imitation', 'quiet talks', 'devotion']): return 'Prayer & devotion'
    if any(word in title for word in ['history', 'life of', 'confessions', 'autobiography', 'story of a soul']): return 'History & biography'
    if any(word in title for word in ['sermon', 'preaching']): return 'Sermons'
    return 'Christian classics'

def main():
    candidates = {}
    for start in range(1, 177, 25):
        page = get(f'https://www.gutenberg.org/ebooks/bookshelf/119?start_index={start}')
        for block in re.findall(r'<li class="booklink">(.*?)</li>', page, re.S):
            id = re.search(r'href="/ebooks/(\d+)"', block)
            title = re.search(r'<span class="title">(.*?)</span>', block, re.S)
            author = re.search(r'<span class="subtitle">(.*?)</span>', block, re.S)
            if id and title:
                candidates[id[1]] = dict(id=int(id[1]), title=clean(title[1]), author=clean(author[1]) if author else 'Various authors')
    write_books(list(candidates.values()))
    page = get('https://bibleproject.com/classroom/')
    courses = {}
    for block in re.findall(r'<article class="class-block">(.*?)</article>', page, re.S):
        href = re.search(r'href="(/classroom/[^"#]+)"', block)
        title = re.search(r'<h4[^>]*>(.*?)</h4>', block, re.S)
        if href and title:
            url = 'https://bibleproject.com' + href[1]
            courses[url] = dict(title=clean(title[1]), url=url, provider='BibleProject', category='Bible study')
    (ROOT / 'src/data/externalCourses.json').write_text(json.dumps(list(courses.values()), ensure_ascii=False, indent=2) + '\n')

def write_books(candidates):
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as executor:
        books = [row for row in executor.map(verify_book, candidates) if row]
    if not books:
        raise RuntimeError('No books verified; existing catalogue was not replaced')
    books.sort(key=lambda row: row['title'].casefold())
    (ROOT / 'src/data/christianBooks.json').write_text(json.dumps(books, ensure_ascii=False, indent=2) + '\n')
    print(f'{len(books)} books with confirmed English HTML and EPUB links', flush=True)

if __name__ == '__main__': main()
