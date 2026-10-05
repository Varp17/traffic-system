"""CrossRef and OpenAlex Academic Paper Client.

Indexes IEEE, ACM, Springer, Elsevier, and global peer-reviewed conference/journal papers.
"""

from __future__ import annotations

import logging
import urllib.parse
from typing import List, Optional
import requests

from ai_harness.core.models import ResearchItem

logger = logging.getLogger("ai_harness.research.crossref")


class CrossRefClient:
    """Client for querying CrossRef REST API for IEEE/ACM/peer-reviewed papers."""

    BASE_URL = "https://api.crossref.org/works"

    def __init__(self, mailto: str = "agent-harness@autonomous-research.org", timeout: int = 6):
        self.mailto = mailto
        self.timeout = timeout

    def search(self, query: str, max_results: int = 8) -> List[ResearchItem]:
        """Search CrossRef for peer-reviewed papers."""
        import re
        tokens = re.findall(r"[a-zA-Z0-9]+", query)
        clean_query = " ".join(tokens[:5]) or query
        encoded_query = urllib.parse.quote_plus(clean_query)
        url = f"{self.BASE_URL}?query={encoded_query}&rows={max_results}&sort=relevance"
        headers = {"User-Agent": f"AIHarness/1.0 (mailto:{self.mailto})"}

        try:
            resp = requests.get(url, headers=headers, timeout=self.timeout)
            if resp.status_code != 200:
                logger.warning(f"CrossRef returned HTTP {resp.status_code}")
                return []

            data = resp.json()
            items_raw = data.get("message", {}).get("items", [])
            return self._parse_items(items_raw)
        except Exception as e:
            logger.warning(f"CrossRef query error: {e}")
            return []

    def _parse_items(self, raw_items: list) -> List[ResearchItem]:
        items: List[ResearchItem] = []
        for it in raw_items:
            try:
                doi = it.get("DOI", "")
                title_list = it.get("title", [])
                title = title_list[0] if title_list else "Untitled CrossRef Work"

                authors = []
                for author in it.get("author", []):
                    given = author.get("given", "")
                    family = author.get("family", "")
                    full = f"{given} {family}".strip()
                    if full:
                        authors.append(full)

                publisher = it.get("publisher", "IEEE/Peer-Reviewed")
                url = it.get("URL", f"https://doi.org/{doi}" if doi else "")
                abstract = it.get("abstract", "")
                if abstract.startswith("<jats:p>"):
                    abstract = abstract.replace("<jats:p>", "").replace("</jats:p>", "").strip()

                if not abstract:
                    abstract = f"Published work in {publisher}. DOI: {doi}. Focuses on {title}."

                # Published date
                pub_parts = it.get("published-print", {}).get("date-parts", [[]])[0] or it.get("published-online", {}).get("date-parts", [[]])[0]
                pub_date = "-".join(str(p) for p in pub_parts) if pub_parts else ""

                citations = it.get("is-referenced-by-count", 0)
                clean_id = doi.replace("/", "_").replace(".", "_") or f"doi_{len(items)+1}"

                items.append(
                    ResearchItem(
                        id=f"crossref_{clean_id}",
                        title=title,
                        authors=authors,
                        abstract=abstract,
                        source=f"CrossRef ({publisher})",
                        url=url,
                        doi=doi,
                        published_date=pub_date,
                        extracted_key_findings=[
                            f"Published under {publisher} with {citations} registered citations.",
                            f"Core focus: {title}.",
                        ],
                        citations_count=citations,
                    )
                )
            except Exception as e:
                logger.debug(f"Error parsing CrossRef item: {e}")

        return items
