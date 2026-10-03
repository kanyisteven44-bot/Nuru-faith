# Books and courses

The book catalogue links to English editions in Project Gutenberg's Christianity bookshelf. The importer checks each edition page for English language, the USA public-domain statement, and explicit HTML/EPUB3 links. It records the Gutenberg edition ID, title, author, links and check date. No book text is republished, and no generated cover imagery is used. Historic works include differing theological traditions; listing is not an endorsement. Rights outside the USA may differ.

Sources:
- https://www.gutenberg.org/ebooks/bookshelf/119
- https://bibleproject.com/classroom/
- https://www.biblicaltraining.org/classes

The existing 60 Nuru study courses remain unchanged, including their signed-in lesson progress. The new BibleProject catalogue links to 16 classes extracted from its official Classroom page. Classes are hosted by BibleProject, and their account/progress requirements are separate. BiblicalTraining is an additional full-catalogue link, not counted as imported classes. Paid credentials are not promised for free.

Books are available at `/books` and in Library → Books. The course catalogue is public at `/faith-courses`; Nuru lesson progress still requires sign-in. Provider/category/text filters show matching entries; books progressively reveal 24 per page with no inaccessible cap. Saved/History remain available in Library. All additions use existing theme tokens for light and dark settings.

Refresh with `python3 scripts/learning/refresh_catalog.py` from the repository root. This requires network access; review the output before committing. Only successful source editions are included, so counts can change between refreshes. This is a bounded catalogue, not a claim that every Christian book/course has been indexed. Run `npm test`, `npm run typecheck` and `npm run build` after refreshing. A successful source-page request does not guarantee a provider stays available later.
